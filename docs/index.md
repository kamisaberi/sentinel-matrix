# Sentinel-Matrix (`sentinel-matrix`)

**Autonomous Cyber-Range Mesh, Digital Twin Simulator & OmniFlow Traffic Engine**  
*Tier 7 Emulation & Live Validation Grid of the Aryorithm / Blackbox Sentinel Ecosystem*

---

## Executive Architectural Overview

`sentinel-matrix` is an encapsulated, containerized cyber-physical digital twin range. Operating entirely within a single VMware Workstation/ESXi Linux host, it deploys a production-grade multi-tier defense mesh over an isolated, collision-free **`10.240.0.0/24`** virtual network bridge.

It simulates a full enterprise and industrial critical infrastructure deployment: managing central command (`sentinel-nexus`), continual AI retraining (`xinfer-forge`), multi-node edge XDR appliances (`blackbox-sentinel`), continuous multi-modal traffic generation (**OmniFlow**), authentic malware PCAP streaming (**Industroyer, Triton, Stuxnet**), and an active Red-Team adversary node executing live attacks on the wire.

```text
====================================================================================================
                        SENTINEL-MATRIX 10.240.0.0/24 DIGITAL TWIN TOPOLOGY
====================================================================================================
 [CORE ORCHESTRATION]          [CONTINUAL LEARNING]          [RED-TEAM ADVERSARY]
  sentinel-nexus (10.240.0.10)  sentinel-forge (10.240.0.20)  sentinel-adversary (10.240.0.99)
  • Port 50051 (Fleet gRPC)     • forge-cli auto-cycle        • Live nmap -sS port sweeps
  • Port 9443  (Web SPA)        • Tabular MAE + InfoNCE       • Live mbpoll FC05 overrides
  • Port 9444  (Real-Time SSE)  • Golden Attacks Safety Gate  • Live cURL API fuzzing bursts
        │                              │                              │
        └──────────────────────────────┼──────────────────────────────┘
                                       │ Isolated Docker Bridge: 10.240.0.0/24
        ┌──────────────────────────────┼──────────────────────────────┐
        ▼                              ▼                              ▼
 [EDGE APPLIANCE 01]           [EDGE APPLIANCE 02]           [EDGE APPLIANCE 03]
  sentinel-node-01 (.101)       sentinel-node-02 (.102)       sentinel-node-03 (.103)
  • In-Kernel eBPF XDP Drops    • In-Kernel eBPF XDP Drops    • In-Kernel eBPF XDP Drops
  • 26 Decoupled Subsystems     • 26 Decoupled Subsystems     • 26 Decoupled Subsystems
  • Substation SCADA OT S7/DNP3 • Hospital PACS Enclave DICOM • Refinery Pipeline Modbus
        ▲                              ▲                              ▲
        └──────────────────────────────┼──────────────────────────────┘
                                       │ Wire Ingress Traffic Streams
 ┌─────────────────────────────────────┴───────────────────────────────────────────────────────────┐
 │ OMNIFLOW TRAFFIC & MALWARE STREAMER (10.240.0.50: sentinel-traffic)                             │
 │  • 7 Concurrent Multi-Modal Worker Channels (SCADA, Vision, L7 Web, Identity, Syscalls, IoT, Flow)│
 │  • Real Binary Malware Replays: Industroyer (IEC 104), Triton (TriStation), Stuxnet (S7Comm)     │
 └─────────────────────────────────────────────────────────────────────────────────────────────────┘
                                       │ Real-Time Socket Interrogation
                                       ▼
 [OBSERVABILITY TUI]           sentinel-monitor (10.240.0.60) / make tui
                               • Split-Panel Curses TUI • Top-3 XAI Residuals • Sub-50ms Sync Proof
====================================================================================================
```

---

## Core Invariants

1. **Subnet Isolation (`10.240.0.0/24`):** Eliminates Docker default subnet collisions (`172.17.x` / `172.28.x`) with VMware host adapters (`VMnet1` and `VMnet8`).
2. **GLIBC 2.43 Host-Container Parity:** Container Dockerfiles inherit from **`ubuntu:devel`** to align with the host toolchain (Ubuntu 26.04), preventing dynamic linker crashes.
3. **Hardware Library Harvesting:** Extracts and bundles host-compiled dynamic dependencies (`libabsl`, `libre2`, `libgrpc++`, `libprotobuf`) into `/shared/lib/` automatically via `make init`.
4. **Authentic Binary Malware Replay:** Streams real packet payloads extracted from historical critical-infrastructure malware incidents, avoiding synthetic string-matching mocks.
5. **Closed-Loop Adaptation Flywheel:** Validates the entire edge loop—from attack detection through in-kernel eBPF drop, uncertainty curation, MAE retraining, safety gating, and zero-downtime hot-reload—in under 60 seconds.

