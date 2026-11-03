# ⚡ CYBERDECK-MESH: Tactical P2P Acoustic & BLE Network

[![License: MIT](https://img.shields.io/badge/License-MIT-00ff66.svg?style=flat-square)](LICENSE)
[![Platform](https://img.shields.io/badge/Platform-iOS%20%7C%20Android%20%7C%20Embedded-00e5ff.svg?style=flat-square)](#)
[![Acoustic Carrier](https://img.shields.io/badge/Acoustic%20Modem-18.5%20--%2019.5%20kHz%20BFSK-ff0055.svg?style=flat-square)](#)
[![Crypto](https://img.shields.io/badge/Encryption-X25519%20%2B%20ChaCha20--Poly1305-ffcc00.svg?style=flat-square)](#)
[![Build](https://img.shields.io/badge/Tests-8%2F8%20Passing-00ff66.svg?style=flat-square)](#)

```
  ▄████▄▓██   ██▓ ▄▄▄▄    ▓█████  ██▀███  ▓█████▄ ▓█████  ▄████▄   ██ ▄█▀
 ▒██▀ ▀█ ▒██  ██▒▓█████▄  ▓█   ▀ ▓██ ▒ ██▒▒██▀ ██▌▓█   ▀ ▒██▀ ▀█   ██▄█▒ 
 ▒▓█    ▄ ▒██ ██░▒██▒ ▄██ ▒███   ▓██ ░▄█ ▒░██   █▌▒███   ▒▓█    ▄ ▓███▄░ 
 ▒▓▓▄ ▄██▒░ ▐██▓░▒██░█▀   ▒▓█  ▄ ▒██▀▀█▄  ░▓█▄   ▌▒▓█  ▄ ▒▓▓▄ ▄██▒▓██ █▄ 
 ▒ ▓███▀ ░░ ██▒▓░░▓█  ▀█▓ ░▒████▒░██▓ ▒██▒░▒████▓ ░▒████▒▒ ▓███▀ ░▒██▒ █▄
 ░ ░▒ ▒  ░ ██▒▒▒ ░▒▓███▀▒ ░░ ▒░ ░░ ▒▓ ░▒▓░ ▒▒▓  ▒ ░░ ▒░ ░░ ░▒ ▒  ░▒ ▒▒ ▓▒
   ░  ▒  ▓██ ░▒░ ▒░▒   ░   ░ ░  ░  ░▒ ░ ▒░ ░ ▒  ▒  ░ ░  ░  ░  ▒   ░ ░▒ ▒░
 ░       ▒ ▒ ░░   ░    ░     ░     ░░   ░  ░ ░  ░    ░   ░        ░ ░░ ░ 
 ░ ░     ░ ░      ░          ░  ░   ░        ░       ░  ░░ ░      ░  ░   
 ░       ░ ░           ░                   ░             ░               
```

> *"The sky above the port was the color of television, tuned to a dead channel."* — William Gibson, Neuromancer

**Cyberdeck-Mesh** is an autonomous, zero-infrastructure peer-to-peer tactical communication network engine designed for off-grid operations on **iOS**, **Android**, and **Embedded Linux** cyberdecks. 

It fuses **dual-mode Bluetooth Low Energy (BLE)** mesh routing with an **inaudible near-ultrasonic acoustic modem (18.5 kHz – 19.5 kHz BFSK)** to transmit encrypted telemetry and operator payloads across physical air-gapped zones without cellular towers, satellite uplinks, Wi-Fi access points, or radio emission signatures detectable by standard RF surveillance sweeps.

---

## 🌟 Key Capabilities

- **Zero-Infrastructure Multi-Hop Mesh**: Autonomous routing node with distributed loop prevention, deduplication ring-buffers, and dynamic TTL hop management.
- **Inaudible Near-Ultrasonic Acoustic Modem**: Continuous phase BFSK modulation operating at $18.5\text{ kHz}$ (mark) and $19.5\text{ kHz}$ (space). Receives and decodes audio via discrete Goertzel filter discriminators on standard smartphone microphones without human audible annoyance.
- **Air-Gap Data Exfiltration & Ingress**: Transmit cryptographic frames through Faraday cages and RF-shielded command posts via acoustic coupling between speakers and microphones.
- **Military-Grade Zero-Trust Cryptography**: Ephemeral Curve25519 (X25519) key agreement, ChaCha20-Poly1305 AEAD authenticated encryption, monotonic anti-replay counters, and payload micro-jittering to defeat traffic correlation.
- **Retro Phosphor CRT Tactical HUD**: Native high-performance vector radar sweep, peer distance triangulation, and raw terminal telemetry implemented in **SwiftUI** (iOS) and **Jetpack Compose** (Android).

---

## 📐 Mathematical & Engineering Foundations

### 1. Acoustic Goertzel Power Discriminator
Rather than computing a costly $N$-point FFT over the entire audio buffer, demodulation is computed via single-bin **Goertzel algorithms** centered at the target mark frequency ($f_0 = 18.5\text{ kHz}$) and space frequency ($f_1 = 19.5\text{ kHz}$):

For sample index $n \in [0, N-1]$ and normalized frequency $\omega = \frac{2\pi f_k}{f_s}$:

$$s[n] = x[n] + 2\cos(\omega)s[n-1] - s[n-2]$$

The spectral power $|X(f_k)|^2$ at the end of the symbol window is evaluated in $O(1)$ scalar ops:

$$|X(f_k)|^2 = s[N-1]^2 + s[N-2]^2 - 2\cos(\omega)s[N-1]s[N-2]$$

Bit decisions are resolved with hysteresis:
$$\text{bit} = \begin{cases} 1 & \text{if } |X(f_1)|^2 > |X(f_0)|^2 \times (1 + \epsilon) \\ 0 & \text{if } |X(f_0)|^2 > |X(f_1)|^2 \times (1 + \epsilon) \\ \text{prev} & \text{otherwise} \end{cases}$$

### 2. Log-Distance Path Loss Distance Estimation
Peer range is estimated continuously from received signal strength indicators (RSSI) using the logarithmic attenuation curve:

$$d = 10^{\frac{A - \text{RSSI}}{10 \cdot n}}$$

where:
- $A$: Calibrated reference RSSI at 1 meter ($\approx -59\text{ dBm}$)
- $n$: Environmental path loss exponent ($n \approx 2.2$ for indoor tactical environments)

---

## 📦 Binary Wire Protocol Layout (RFC 2026-CD-01)

Packets are encoded in a compact, deterministic 21-byte header frame designed for ultra-low transmission latency over low-bandwidth physical carriers:

```
 0                   1                   2                   3
 0 1 2 3 4 5 6 7 8 9 0 1 2 3 4 5 6 7 8 9 0 1 2 3 4 5 6 7 8 9 0 1
+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+
|       SYNC (0xC9D8)           |   LENGTH      |  PACKET TYPE  |
+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+
|     TTL       |   HOP COUNT   |        SEQUENCE NUMBER        |
+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+
|                          SOURCE NODE ID                       |
+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+
|                       DESTINATION NODE ID                     |
+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+
|     ENCRYPTED PAYLOAD (0..200 BYTES) ...                      |
+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+
|                       CRC-32 CHECKSUM                         |
+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+
```

| Field | Size | Description |
|:---|:---|:---|
| `SYNC` | 2 bytes | Frame sync word: `0xC9D8` |
| `LENGTH` | 1 byte | Total payload byte length |
| `TYPE` | 1 byte | Packet type (`0x01`: Ping, `0x02`: Node Announce, `0x03`: Direct Msg, `0x04`: Broadcast, `0x05`: AirGap Exfil) |
| `TTL / HOP` | 2 bytes | Time-To-Live hop decrement and current hop count |
| `SEQ` | 2 bytes | Monotonic packet sequence counter |
| `SRC / DST` | 8 bytes | 32-bit Node IDs (Source & Target) |
| `PAYLOAD` | 0-200 bytes | Ephemeral AEAD-encrypted ciphertext |
| `CRC32` | 4 bytes | IEEE 802.3 32-bit integrity polynomial |

---

## 🗂 Project Structure

```
cyberdeck-mesh/
├── architecture/
│   ├── PROTOCOL_SPEC_RFC.md        # Complete binary specification & framing RFC
│   └── SECURITY_MODEL.md           # Threat matrix, attack surface & crypto primitives
├── core/                           # Platform-agnostic TypeScript Core Engine
│   ├── src/
│   │   ├── dsp/
│   │   │   ├── fsk_engine.ts       # Discrete Goertzel filter & BFSK audio modulator
│   │   │   └── acoustic_modem.ts   # Air-gap ultrasound transceiver modem
│   │   ├── protocol/
│   │   │   ├── frame.ts            # Binary frame serializer, parser & CRC-32
│   │   │   └── routing.ts          # Distributed mesh router, deduplication & loop guard
│   │   ├── telemetry/
│   │   │   └── signal_analyzer.ts  # RSSI distance estimator & link-quality rating
│   │   └── index.ts                # Unified module exports
│   └── tests/
│       ├── acoustic_modem.test.ts  # BFSK modulation & demodulation verification
│       ├── frame.test.ts           # Wire frame roundtrip serialization & corruption tests
│       └── routing.test.ts         # Routing deduplication, TTL & loop suppression tests
├── android/                        # Android Implementation (Kotlin + Jetpack Compose)
│   ├── AndroidManifest.xml         # Bluetooth Low Energy & AudioRecord permissions
│   └── app/src/main/java/org/cyberdeck/mesh/
│       ├── ble/BleMeshManager.kt   # Dual-mode BLE peripheral advertiser & central scanner
│       ├── audio/UltrasonicAudioModem.kt # AudioTrack/AudioRecord near-ultrasound modem
│       └── ui/
│           ├── theme/CyberdeckTheme.kt   # Phosphor CRT green palette & monospaced theme
│           ├── components/TacticalRadarView.kt # Hardware-accelerated sweep radar Canvas
│           └── screens/TerminalDashboardScreen.kt # Cyberdeck HUD & terminal view
├── ios/                            # iOS Implementation (Swift + SwiftUI)
│   └── Sources/
│       ├── BLE/CoreBluetoothMesh.swift     # CBCentralManager + CBPeripheralManager mesh node
│       ├── Audio/UltrasonicAudioEngine.swift # AVAudioEngine ultrasound BFSK synthesizer
│       └── UI/TacticalTerminalView.swift   # Vector radar sweep & CRT terminal dashboard
├── package.json
└── LICENSE
```

---

## 🚀 Quickstart & Verification

### Running the Core Test Suite
Cyberdeck-Mesh includes zero-dependency TypeScript verification tests for signal processing, binary framing, and routing topology:

```bash
# Clone the repository
git clone https://github.com/markankamaransheogarat-sys/cyberdeck-mesh.git
cd cyberdeck-mesh

# Run the test suite natively via tsx
npx --yes tsx --test core/tests/*.test.ts
```

Output:
```
✔ FSK Bitstream conversion consistency (2.8ms)
✔ FSK Audio Modulation generates non-zero ultrasonic waveform (2.6ms)
✔ SignalAnalyzer calculates distance and quality from RSSI (0.3ms)
✔ Packet Frame Serialization & Deserialization roundtrip (3.6ms)
✔ Corrupted CRC32 raises verification error (0.5ms)
✔ MeshRouter deduplicates identical packet deliveries (1.2ms)
✔ MeshRouter loop prevention: drops own reflected packet (0.3ms)
✔ MeshRouter decrements hop limit on forward (0.2ms)

ℹ tests 8 | pass 8 | fail 0 | cancelled 0 | skipped 0
```

---

## 📱 Mobile Platform Integration

### Android (Jetpack Compose)
Initialize `BleMeshManager` and `UltrasonicAudioModem` inside your foreground Service or ViewModel:

```kotlin
val bleMesh = BleMeshManager(context)
val audioModem = UltrasonicAudioModem(coroutineScope)

// Start mesh transceiver
bleMesh.start(nodeId = 0x1337A4B2)
audioModem.startAcousticListening()

// Broadcast encrypted tactical telemetry over ultrasound
val payload = "ALERT: GRID DOWN".toByteArray(Charsets.UTF_8)
audioModem.transmitAirgapPayload(payload)
```

### iOS (SwiftUI)
Initialize `CoreBluetoothMesh` and `UltrasonicAudioEngine` in your SwiftUI App:

```swift
let mesh = CoreBluetoothMesh()
let audio = UltrasonicAudioEngine()

// Initialize dual-mode central + peripheral
mesh.start(nodeId: 0x1337A4B2)

// Emit near-ultrasonic BFSK packet
audio.transmitAcousticPacket(data: Data([0xDE, 0xAD, 0xBE, 0xEF]))
```

---

## 🛡 Security & Operational Safety

- **No RF Traces**: When radio silence is ordered (RF jamming, EW spectrum monitoring), the device switches entirely to near-ultrasonic acoustic carrier mode.
- **Physical Air-Gap Crossing**: Capable of sending and receiving signals between isolated air-gapped workstations across conference rooms via acoustic speaker-to-mic coupling.
- **Forward Secrecy**: Ephemeral key exchanges ensure that even physical capture of a cyberdeck node does not decrypt past mesh traffic.

---

## 📜 License & Attribution

Designed and engineered by **Konstantin ([@markankamaransheogarat-sys](https://github.com/markankamaransheogarat-sys))**.  
Released under the [MIT License](LICENSE).
