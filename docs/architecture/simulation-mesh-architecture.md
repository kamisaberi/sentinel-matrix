# Multi-Container Digital Twin Simulation Mesh Architecture

`sentinel-matrix` encapsulates an entire enterprise and industrial defense ecosystem inside a multi-container Docker bridge (`matrix_net`) running within a single VMware virtual machine. It eliminates external physical testbed dependencies while preserving line-rate kernel execution fidelity.

---

## 1. High-Level Subnet Architecture

All containers communicate over an isolated **`10.240.0.0/24`** Class C private subnet with deterministic static IP addressing:

```text
 ┌─────────────────────────────────────────────────────────────────────────────┐
 │ ISOLATED DIGITAL TWIN BRIDGE: matrix_net (Subnet: 10.240.0.0/24)            │
 ├─────────────────────────────────────────────────────────────────────────────┤
 │                                                                             │
 │  [ .10 ] sentinel-nexus       : Tier 6 Fleet Command, gRPC 50051, Web 9443  │
 │  [ .20 ] sentinel-forge       : Tier 4 Continual AI, MAE Training Daemon    │
 │  [ .50 ] sentinel-traffic     : OmniFlow 7-Channel Streamer & PCAP Replays  │
 │  [ .60 ] sentinel-monitor     : Real-Time Dual-Panel TUI Metrics Collector  │
 │  [ .99 ] sentinel-adversary   : Live Wire Red-Team Attacker (nmap/mbpoll)   │
 │                                                                             │
 │  [ .101 ] sentinel-node-01    : Edge Appliance 01 (Substation Alpha)        │
 │  [ .102 ] sentinel-node-02    : Edge Appliance 02 (Medical Clinic Enclave)  │
 │  [ .103 ] sentinel-node-03    : Edge Appliance 03 (Chemical Refinery)       │
 │                                                                             │
 └─────────────────────────────────────────────────────────────────────────────┘
```

---

## 2. In-Kernel Fidelity Inside Containers

Unlike traditional network simulators (e.g., Mininet or NS-3) that mock networking behavior in user space:
* Each `sentinel-node-XX` container runs a native C++ **`sentinel`** daemon.
* The containers are granted Linux capabilities (`CAP_NET_ADMIN`, `CAP_NET_RAW`, `CAP_BPF`, `CAP_SYS_RESOURCE`).
* Packet mitigation occurs inside the host Linux kernel via real **eBPF/XDP driver hooks** (`xdp_filter.o`), executing live drops on container `veth` interfaces in $< 0.84\,\mu\text{s}$.

---

## 3. Container Lifecycle State Machine

```text
 ┌─────────────────┐
 │   INITIALIZED   │ make init: Creates /shared/ mounts, PKI certs, bundles libs
 └────────┬────────┘
          │ make build
          ▼
 ┌─────────────────┐
 │   IMAGE_BUILT   │ Dockerfile inheritance from ubuntu:devel (GLIBC 2.43 parity)
 └────────┬────────┘
          │ make up
          ▼
 ┌─────────────────┐
 │   MESH_ACTIVE   │◄─────────────────────────────┐
 └────────┬────────┘                              │ Continuous Traffic & Attacks
          │ Traffic flows, attacks blocked,       │ Models updated via OTA Canary
          │ active learning curator triggers      │
          ▼                                       │
 ┌─────────────────┐                              │
 │ ADAPTATION_LOOP │──────────────────────────────┘
 └────────┬────────┘
          │ make down
          ▼
 ┌─────────────────┐
 │   TERMINATED    │ 0ms instant disconnect sent to Nexus; interfaces unhooked
 └─────────────────┘
```

