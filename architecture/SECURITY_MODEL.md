# Cyberdeck Mesh Security & Cryptographic Model

## Threat Model & Design Principles

The Cyberdeck Mesh network is designed under an **adversarial, zero-trust ambient RF environment**:
1. **Adversary Capabilities:** Unrestricted eavesdropping on BLE advertisements and acoustic spectrum, active injection of malicious frames, replay attacks, node impersonation, and selective jamming.
2. **Zero Central Authority:** No PKI root certificates, no cloud servers, no phone number or identity binding. All trust is cryptographic and decentralized.

---

## 1. Key Agreement & Ephemeral Identity

* **Identity Keys:** Each node generates a static Curve25519 keypair $(sk_{\text{node}}, pk_{\text{node}})$ stored exclusively in hardware secure enclave / Android KeyStore / iOS Keychain.
* **Ephemeral Handshake (X25519):** For direct point-to-point communication, nodes derive a shared secret using Diffie-Hellman over Curve25519:
  $$K_{\text{shared}} = \text{X25519}(sk_A, pk_B)$$
* **Key Derivation (HKDF-SHA256):**
  $$K_{\text{session}}, IV_{\text{base}} = \text{HKDF-Expand}(\text{HKDF-Extract}(\text{salt}, K_{\text{shared}}), \text{"CYBERDECK-PAYLOAD-V1"}, 44)$$

---

## 2. Authenticated Encryption (AEAD)

Payloads are encrypted using **ChaCha20-Poly1305** (RFC 8439):
* **256-bit Key:** Derived from session secret.
* **96-bit Nonce:** Composed of a 32-bit connection epoch combined with the monotonic packet sequence counter, preventing nonce-reuse across reboots.
* **128-bit Poly1305 MAC:** Provides cryptographic authentication and tamper detection. Damaged or injected frames are dropped before entering the application layer.

---

## 3. Metadata Privacy & Traffic Analysis Resistance

* **Node Pseudonyms:** Public Node IDs are truncated 16-byte BLAKE3 hashes of the public key.
* **Padding:** Frame payloads are padded to constant length buckets (64, 128, 256, 512 bytes) to obscure linguistic patterns from passive RF interceptors.
* **Acoustic Jitter:** Ultrasonic packet transmission intervals include pseudo-random micro-jitter (15–50 ms) to defeat acoustic beamforming and time-of-arrival triangulation.
