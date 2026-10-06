# Real Malware PCAP Replay vs. Synthetic Mocking

Most cybersecurity testbeds rely on synthetic mock generators that assemble superficial packet strings (e.g., passing `"DROP"` or mock regex strings). These mocks fail to replicate the complex protocol framing, fragmentation, and TCP window behaviors of real-world malware.

`sentinel-matrix` streams **authentic binary packet captures (PCAP)** from historical critical-infrastructure malware campaigns directly across the virtual wire.

---

## 1. Architectural Fidelity Comparison

```text
 SYNTHETIC MOCKING (Low Fidelity):
  • Assembles synthetic JSON/HTTP strings in user space.
  • Fails to replicate real TPKT, COTP, or ASN.1 BER framing.
  • Does not exercise edge protocol dissector boundary bugs.

 REAL MALWARE PCAP REPLAY (Sentinel-Matrix Invariant):
  • Streams exact byte-for-byte binary payloads captured during authentic attacks.
  • Exercises the entire networking stack: Ethernet -> IP -> TCP -> APDU.
  • Replays authentic malware: Industroyer (IEC 104), Triton (TriStation), Stuxnet (S7).
```

---

## 2. Ingress Replay Architecture

```text
 ┌─────────────────────────────────────────────────────────────┐
 │ Authentic PCAP Archive (/opt/sentinel-matrix/shared/pcaps/) │
 └──────────────────────────────┬──────────────────────────────┘
                                │ Binary Frame Stream
                                ▼
 ┌─────────────────────────────────────────────────────────────┐
 │ pcap_streamer.py (sentinel-traffic Container - 10.240.0.50)  │
 │  - Rewrites Destination IP to Target Node (e.g. 10.240.0.101)│
 │  - Recalculates IPv4 and TCP Checksums on-the-fly           │
 │  - Enforces Timestamp Rate Pacing                           │
 └──────────────────────────────┬──────────────────────────────┘
                                │ Live Wire Transmission (matrix_net)
                                ▼
 ┌─────────────────────────────────────────────────────────────┐
 │ Target Appliance: sentinel-node-01 (In-Kernel XDP Filter)   │
 │  - Evaluates live packet bytes                              │
 │  - Drops exploit in driver ring in < 0.84 µs                │
 └─────────────────────────────────────────────────────────────┘
```

