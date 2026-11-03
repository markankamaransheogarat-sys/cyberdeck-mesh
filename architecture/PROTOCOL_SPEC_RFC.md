# RFC 2026-CD-01: Cyberdeck Mesh Protocol & Acoustic FSK Specification

## Abstract
This document defines the framing, routing, cryptographic envelope, and physical-layer acoustic modulation specifications for the **Cyberdeck Mesh Network** (`CYBERDECK-MESH-V1`). The protocol operates without internet, cellular backhaul, or centralized coordination, executing opportunistic multi-hop message relay over Bluetooth Low Energy (BLE) and inaudible near-ultrasonic acoustic channels (18.5 kHz – 19.5 kHz).

---

## 1. Frame Architecture (Binary Wire Format)

Every transmission over BLE characteristic or acoustic packet burst is wrapped in a deterministic binary packet frame:

```
 0                   1                   2                   3
 0 1 2 3 4 5 6 7 8 9 0 1 2 3 4 5 6 7 8 9 0 1 2 3 4 5 6 7 8 9 0 1
+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+
|          MAGIC (0x5CDB)       |   VERSION (1) |  PACKET TYPE  |
+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+
|    HOP LIMIT  |    HOP COUNT  |         PAYLOAD LENGTH        |
+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+
|                     PACKET SEQUENCE ID (u32)                  |
+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+
|                   SOURCE NODE ID (16 bytes)                   |
|                              ...                              |
+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+
|                DESTINATION NODE ID (16 bytes)                 |
|             (0xFF..FF for broadcast flooding)                 |
+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+
|                      PAYLOAD DATA (0..512 B)                  |
|                              ...                              |
+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+
|                       CRC-32 CHECKSUM                         |
+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+
```

### Packet Types
* `0x01` — **DISCOVERY_BEACON**: Node broadcast containing node pseudonym, public key, and relay capability.
* `0x02` — **DIRECT_MESSAGE**: Point-to-point encrypted payload with ChaCha20-Poly1305 authentication.
* `0x03` — **BROADCAST_CHAT**: Flooded cleartext or group-cipher broadcast for tactical squad coordination.
* `0x04` — **TELEMETRY_PING**: Hop-by-hop latency and RSSI probe.
* `0x05` — **ROUTE_ACK**: Delivery receipt acknowledging packet arrival at destination.

---

## 2. Acoustic Ultrasonic Physical Layer (Air-Gap Audio FSK)

For completely air-gapped data transmission when RF radios are jammed or disabled, `cyberdeck-mesh` modulates raw binary frames into frequency-shift keying (BFSK) over sound waves:

* **Audio Sample Rate:** $44,100\text{ Hz}$ or $48,000\text{ Hz}$
* **Mark Frequency ($f_1$ - Bit 1):** $19,500\text{ Hz}$ (Inaudible to human ear)
* **Space Frequency ($f_0$ - Bit 0):** $18,500\text{ Hz}$ (Inaudible to human ear)
* **Preamble Sync Frequency ($f_p$):** $17,500\text{ Hz}$ (Burst of 16 baud for AGC & phase sync)
* **Symbol Duration ($\tau$):** $10\text{ ms}$ (100 baud / bps for acoustic robustness against multipath reverberation)
* **Detection Algorithm:** Discrete Goertzel Filter banks tuned to $17.5\text{ kHz}$, $18.5\text{ kHz}$, and $19.5\text{ kHz}$.

### Goertzel Power Formula
For target frequency $f_k$ and sample rate $f_s$:
$$\omega = \frac{2\pi f_k}{f_s}, \quad \text{Coeff} = 2 \cos(\omega)$$
$$s[n] = x[n] + \text{Coeff} \cdot s[n-1] - s[n-2]$$
$$\text{Power} = s[N-1]^2 + s[N-2]^2 - s[N-1] \cdot s[N-2] \cdot \text{Coeff}$$

---

## 3. Mesh Routing & Loop Suppression

1. **Deduplication LRU:** Every node maintains a sliding 64-entry LRU cache of `(SourceNodeID, SequenceID)`. If a packet is already observed, it is dropped silently.
2. **Hop Expiration:** Packets originate with `HopLimit = 5`. Each forwarding peer decrements `HopLimit` and increments `HopCount`. Packets reaching `HopLimit == 0` are discarded.
3. **RSSI Decay Heuristic:** Nodes prioritize forwarding packets received with RSSI $> -85\text{ dBm}$ to prevent packet storm over marginal links.
