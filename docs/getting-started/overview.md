# Autonomous Multi-Tier Cyber-Physical Range Introduction

Security operations centers (SOCs) and industrial control engineers face a common dilemma: testing active threat mitigation on production networks risks plant outages, while synthetic testing inside Python unit tests fails to replicate line-rate network dynamics, driver descriptor allocations, and bus latencies.

`sentinel-matrix` provides an **encapsulated, multi-tier digital twin cyber-range** that runs entirely within a single VMware Linux host.

---

## 1. Why a Multi-Tier Digital Twin?

```text
 ┌─────────────────────────────────────────────────────────────┐
 │ LIMITATION OF MOCK TESTING:                                 │
 │ Mock scripts pass JSON payloads over loopback sockets.      │
 │ • No real eBPF driver hooks                                 │
 │ • No hardware packet dropping                               │
 │ • No kernel-to-userspace memory bus contention              │
 └──────────────────────────────┬──────────────────────────────┘
                                │
                                ▼ TRANSITION TO DIGITAL TWIN MESH
 ┌─────────────────────────────────────────────────────────────┐
 │ SENTINEL-MATRIX REAL-WORLD FIDELITY:                        │
 │ • Real in-kernel eBPF filters (xdp_filter.o) drop packets   │
 │ • Real TCP/IP handshakes, SYN floods, and Modbus APDUs      │
 │ • Real malware packet captures replayed at line rate        │
 │ • Real continual AI retraining on uncertainty batches       │
 └─────────────────────────────────────────────────────────────┘
```

---

## 2. Master Node Inventory

| Node Name | Container Identifier | Static IP | Operational Role |
| :--- | :--- | :--- | :--- |
| **Fleet Hub** | `sentinel-nexus` | `10.240.0.10` | Tier 6 Central Command, Collective Defense Bus, Web UI. |
| **Continual AI** | `sentinel-forge` | `10.240.0.20` | Tier 4 Active Learning Daemon, Tabular MAE, Safety Gate. |
| **Traffic Engine** | `sentinel-traffic` | `10.240.0.50` | OmniFlow 7-Channel Generator & Malware PCAP Streamer. |
| **Monitor / TUI** | `sentinel-monitor` | `10.240.0.60` | Live Dual-Panel Curses TUI Dashboard & Metrics Aggregator.|
| **Red Adversary** | `sentinel-adversary`| `10.240.0.99` | Active Wire Attacker (`nmap`, `mbpoll`, `curl` sweeps). |
| **Edge Appliance 1**| `sentinel-node-01` | `10.240.0.101`| High-Voltage Substation Node (IEC 104, DNP3, S7Comm). |
| **Edge Appliance 2**| `sentinel-node-02` | `10.240.0.102`| Hospital Healthcare Enclave (DICOM PACS, HL7, MAVLink).|
| **Edge Appliance 3**| `sentinel-node-03` | `10.240.0.103`| Refinery Chemical Process (Modbus TCP, BACnet, EtherNet/IP).|

