### Part 1: Root Configuration & Getting Started (`mkdocs.yml`, `index.md`, and `getting-started/*`)

This initial set of 7 files establishes the full documentation engine configuration, the executive digital-twin overview, and the complete onboarding track for **`sentinel-matrix`** (`sentinel-matrix`).

---

### File: `sentinel-matrix/docs/mkdocs.yml`

```yaml
site_name: Sentinel-Matrix Documentation
site_description: Autonomous Cyber-Range Digital Twin, OmniFlow Multi-Modal Traffic Engine, and Malware PCAP Replay Mesh (Tier 7)
site_author: Aryorithm Technologies B.V.
site_url: https://docs.aryorithm.com/matrix/
repo_name: kamisaberi/sentinel-matrix
repo_url: https://github.com/kamisaberi/sentinel-matrix

theme:
  name: material
  language: en
  palette:
    - scheme: slate
      primary: teal
      accent: green
      toggle:
        icon: material/weather-night
        name: Switch to light mode
    - scheme: default
      primary: teal
      accent: green
      toggle:
        icon: material/weather-sunny
        name: Switch to dark mode
  features:
    - navigation.instant
    - navigation.tracking
    - navigation.tabs
    - navigation.sections
    - navigation.expand
    - navigation.top
    - search.suggest
    - search.highlight
    - content.code.copy
    - content.code.annotate

plugins:
  - search

markdown_extensions:
  - admonition
  - pymdownx.details
  - pymdownx.superfences:
      custom_fences:
        - name: mermaid
          class: mermaid
          format: !!python/name:pymdownx.superfences.fence_code_format
  - pymdownx.highlight:
      anchor_linenums: true
      line_spans: __span
      pygments_lang_class: true
  - pymdownx.inlinehilite
  - pymdownx.tabbed:
      alternate_style: true
  - pymdownx.arithmatex:
      generic: true
  - tables
  - attr_list
  - md_in_html

extra_javascript:
  - https://polyfill.io/v3/polyfill.min.js?features=es6
  - https://cdn.jsdelivr.net/npm/mathjax@3/es5/tex-mml-chtml.js

nav:
  - Home: index.md
  - Getting Started:
      - Overview: getting-started/overview.md
      - System Requirements: getting-started/system-requirements.md
      - One-Command Quickstart: getting-started/quickstart-one-command-launch.md
      - Verifying Container Grid: getting-started/verifying-container-grid.md
      - Architecture at a Glance: getting-started/architecture-at-a-glance.md
  - Architecture:
      - Simulation Mesh Architecture: architecture/simulation-mesh-architecture.md
      - The Infinite Flywheel: architecture/the-infinite-flywheel.md
      - Container Topology Matrix: architecture/container-topology-matrix.md
      - Shared Volumes & IPC: architecture/shared-volumes-and-ipc.md
      - VMware Hypervisor Optimization: architecture/vmware-hypervisor-optimization.md
  - VMware & Networking:
      - 10.240.0.0/24 Subnet Design: vmware-and-networking/10-240-0-subnet-design.md
      - XDP Generic SKB Mode: vmware-and-networking/xdp-generic-skb-mode.md
      - vTPM & DMI Emulation: vmware-and-networking/vtpm-and-dmi-emulation.md
      - GLIBC 2.43 Alignment: vmware-and-networking/glibc-alignment-ubuntu-devel.md
      - Dynamic Library Bundling: vmware-and-networking/host-dynamic-library-bundling.md
      - Internal mTLS PKI: vmware-and-networking/internal-mtls-pki.md
  - OmniFlow Traffic Engine:
      - OmniFlow Architecture: omniflow-traffic-engine/omniflow-architecture.md
      - Channel 1 SCADA OT: omniflow-traffic-engine/channel-1-scada-ot.md
      - Channel 2 Edge Vision: omniflow-traffic-engine/channel-2-edge-vision.md
      - Channel 3 Web API & Bot: omniflow-traffic-engine/channel-3-web-api-bot.md
      - Channel 4 Identity & ATO: omniflow-traffic-engine/channel-4-identity-ato.md
      - Channel 5 Host Syscalls: omniflow-traffic-engine/channel-5-host-syscalls.md
      - Channel 6 Medical IoT: omniflow-traffic-engine/channel-6-medical-iot.md
      - Channel 7 NetFlow Blaster: omniflow-traffic-engine/channel-7-netflow-blaster.md
      - Declarative Tuning: omniflow-traffic-engine/declarative-traffic-tuning.md
  - Real Malware PCAP Replay:
      - Pipeline Overview: real-pcap-replay/pcap-replay-pipeline-overview.md
      - PCAP Streamer Engine: real-pcap-replay/pcap-streamer-engine.md
      - Git LFS Downloader: real-pcap-replay/git-lfs-downloader.md
      - Offline Binary Generator: real-pcap-replay/offline-binary-generator.md
      - Industroyer IEC-104: real-pcap-replay/pcap-catalog-industroyer-iec104.md
      - Triton TriStation: real-pcap-replay/pcap-catalog-triton-tristation.md
      - Stuxnet S7Comm: real-pcap-replay/pcap-catalog-stuxnet-s7comm.md
      - Modbus SCADA Replay: real-pcap-replay/pcap-catalog-modbus-scada.md
      - Rate Pacing & Injection: real-pcap-replay/rate-pacing-and-wire-injection.md
  - Live Adversary Node (10.240.0.99):
      - Adversary Node Architecture: live-adversary-node/adversary-node-architecture.md
      - Live Adversary Daemon: live-adversary-node/live-adversary-daemon.md
      - Nmap TCP SYN Sweeps: live-adversary-node/nmap-tcp-syn-sweeps.md
      - Mbpoll SCADA Overrides: live-adversary-node/mbpoll-scada-overrides.md
      - cURL API Abuse Bursts: live-adversary-node/curl-api-abuse-bursts.md
      - Observing Wire eBPF Drops: live-adversary-node/observing-wire-ebpf-drops.md
      - Custom Adversary Tooling: live-adversary-node/custom-adversary-tooling.md
  - Observability & TUI:
      - Observability Overview: observability-and-tui/observability-overview.md
      - Terminal Dashboard TUI: observability-and-tui/terminal-dashboard-tui.md
      - Split-Panel Layout: observability-and-tui/split-panel-layout.md
      - Real-Time XAI Panel: observability-and-tui/real-time-xai-panel.md
      - Web Command Center: observability-and-tui/web-command-center-integration.md
      - Streaming SSE Events: observability-and-tui/streaming-sse-events.md
      - Metrics Aggregation: observability-and-tui/metrics-aggregation.md
  - Closed-Loop Active Learning:
      - Flywheel Lifecycle: closed-loop-active-learning/flywheel-lifecycle.md
      - Forge Watcher Daemon: closed-loop-active-learning/forge-watcher-daemon.md
      - Staged Rollout Progression: closed-loop-active-learning/staged-rollout-progression.md
      - Zero-Downtime Hot Reload: closed-loop-active-learning/zero-downtime-hot-reload-validation.md
      - Continuous Drift Adaptation: closed-loop-active-learning/continuous-drift-adaptation.md
  - Chaos & Resilience:
      - Chaos Engineering Overview: chaos-and-resilience/chaos-engineering-overview.md
      - Latency Spike Injection: chaos-and-resilience/latency-spike-injection.md
      - Automated Rollback Verification: chaos-and-resilience/automated-rollback-verification.md
      - Node Sever Testing: chaos-and-resilience/node-sever-testing.md
      - Instant 0ms Disconnect: chaos-and-resilience/instant-0ms-disconnect-validation.md
      - Automated Recovery Testing: chaos-and-resilience/automated-recovery-testing.md
  - Operations & Makefile:
      - Makefile Reference: operations-and-makefile/makefile-reference.md
      - Common Workflows: operations-and-makefile/common-workflows.md
      - Configuring matrix.yaml: operations-and-makefile/configuring-matrix-yaml.md
      - Node Templates: operations-and-makefile/configuring-node-templates.md
      - Scenario Profiles: operations-and-makefile/configuring-scenario-profiles.md
      - Log Inspection: operations-and-makefile/log-inspection-and-debugging.md
  - Tutorials:
      - Full Closed-Loop Walkthrough: tutorials/full-closed-loop-walkthrough.md
      - Simulating Substation Blackout: tutorials/simulating-substation-blackout-attack.md
      - Simulating Hospital Ransomware: tutorials/simulating-hospital-ransomware-wave.md
      - Adding Custom Malware PCAP: tutorials/adding-custom-malware-pcap.md
      - Running Headless in ESXi: tutorials/running-matrix-in-esxi-headless.md
  - Troubleshooting:
      - Docker Subnet Overlaps: troubleshooting/docker-subnet-pool-overlaps.md
      - GLIBC Version Not Found: troubleshooting/glibc-version-not-found-errors.md
      - Missing Dynamic Libraries: troubleshooting/missing-host-libraries-absl-re2.md
      - Container Restarting Loops: troubleshooting/container-restarting-loops.md
      - TUI Empty Appliances: troubleshooting/tui-empty-appliances-debugging.md
      - PCAP LFS Pointer Corruption: troubleshooting/pcap-lfs-pointer-corruption.md
      - FAQ: troubleshooting/faq.md
      - Support & SLAs: troubleshooting/support.md
```

---

### File: `sentinel-matrix/docs/index.md`

```markdown
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
```

---

### File: `sentinel-matrix/docs/getting-started/overview.md`

```markdown
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
```

---

### File: `sentinel-matrix/docs/getting-started/system-requirements.md`

```markdown
# System Requirements & Host Sizing

`sentinel-matrix` is optimized for execution inside a single physical workstation or high-performance virtual machine running VMware.

---

## 1. Host Operating System & Hypervisor

* **Hypervisor:** VMware Workstation Pro 17+, VMware Fusion 13+, or VMware vSphere ESXi 8.0+.
* **Host Linux OS:** Ubuntu 24.04 LTS (Noble Numbat) or Ubuntu 26.04 (Devel).
* **Linux Kernel:** Version **>= 6.8** (with BPF, BTF, and raw socket support).
* **Container Runtime:** Docker Engine **>= 26.0** and Docker Compose **v2.24+**.

---

## 2. Hardware Resource Allocation

To run all 7+ containers concurrently with live malware streaming and AI retraining:

| Hardware Resource | Minimum (Lab Laptop) | Recommended (Research Server) |
| :--- | :--- | :--- |
| **CPU Allocation** | 8 vCPUs (Intel VT-x / AMD-V enabled) | 16 to 32 vCPUs (Core Pinning enabled) |
| **System Memory (RAM)**| 16 GB RAM (100% Reserved in VMware) | 32 GB to 64 GB ECC RAM |
| **Storage Space** | 40 GB Free NVMe SSD | 100 GB High-Endurance NVMe SSD |
| **Nested Virtualization**| Enabled ("Virtualize Intel VT-x/EPT")| Enabled |

---

## 3. Host Toolchain Prerequisites

Ensure the host environment possesses the build utilities required by `make init`:

```bash
sudo apt-get update && sudo apt-get install -y \
    build-essential \
    make \
    curl \
    git \
    python3-pip \
    libelf-dev \
    net-tools \
    iproute2
```
```

---

### File: `sentinel-matrix/docs/getting-started/quickstart-one-command-launch.md`

```markdown
# 3-Minute Quickstart: Launching the Simulation Mesh

This walkthrough guides you through harvesting dependencies, building container images, launching the 7-node digital twin grid, and opening the real-time TUI dashboard.

---

## 1. Single Command Execution (`make all`)

Navigate to the `sentinel-matrix` repository root and run:

```bash
cd /opt/sentinel-matrix

# 1. Initialize shared directories, certificates, and libraries
make init

# 2. Build and verify container images
make build

# 3. Launch the container grid in background mode
make up
```

---

## 2. What `make init` Executes Automatically

```text
 1. CREATES SHARED VOLUME DIRECTORIES:
    shared/models, shared/datasets, shared/logs, shared/certs, shared/lib
              │
              ▼
 2. HARVESTS HOST DYNAMIC LIBRARIES (ldd resolution):
    Copies libabsl, libre2, libgrpc++, and libprotobuf into shared/lib/
              │
              ▼
 3. RESOLVES AUTHENTIC MALWARE PCAPS:
    Executes tools/download_real_pcaps.py to fetch Industroyer, Triton, and S7
              │
              ▼
 4. GENERATES INTERNAL mTLS PKI:
    Creates internal CA, Nexus server certs, and node authentication keys
```

---

## 3. Launching the Live TUI Dashboard

Open the live split-panel monitoring console:

```bash
make tui
```

### Expected TUI Display:

```text
 ┌─ Sentinel-Matrix Cyber-Range Grid ────────────────── Top-3 XAI Residuals ─┐
 │ Node                 Status   Drops   SLA      │ Rank 1: MODBUS_REG_40001  │
 │ sentinel-node-01     ONLINE   1,420   0.82 µs  │  Delta: +7,750 PSI (64%)  │
 │ sentinel-node-02     ONLINE     840   0.81 µs  │ Rank 2: FLOW_PPS          │
 │ sentinel-node-03     ONLINE      12   0.84 µs  │  Delta: +81,850 pps (24%) │
 │ > sentinel-adversary ATTACK   nmap -sS running │ Rank 3: IAT_MEAN          │
 └────────────────────────────────────────────────┴───────────────────────────┘
```

Press **`Ctrl+C`** or **`q`** at any time to exit the dashboard (containers remain running in the background).
```

---

### File: `sentinel-matrix/docs/getting-started/verifying-container-grid.md`

```markdown
# Verifying Container Health & Network Mappings

Verify that all containers in the digital twin mesh are running, healthy, and communicating over the `10.240.0.0/24` subnet.

---

## 1. Querying Container Status

Run `docker compose ps` or `make status`:

```bash
make status
```

### Expected Output

```text
NAME                 IMAGE                     STATUS         PORTS
sentinel-nexus       aryorithm/nexus:2.4.0     Up (healthy)   0.0.0.0:50051->50051/tcp, 0.0.0.0:9443->9443/tcp, 0.0.0.0:9444->9444/tcp
sentinel-forge       aryorithm/forge:2.4.0     Up (healthy)   -
sentinel-traffic     aryorithm/traffic:2.4.0   Up             -
sentinel-adversary   aryorithm/adversary:2.4.0 Up             -
sentinel-node-01     aryorithm/sentinel:2.4.0  Up (healthy)   -
sentinel-node-02     aryorithm/sentinel:2.4.0  Up (healthy)   -
sentinel-node-03     aryorithm/sentinel:2.4.0  Up (healthy)   -
```

---

## 2. Inspecting Static IP Allocations

Verify that static IPs on `matrix_net` match the architecture:

```bash
docker inspect -f '{{.Name}} - {{range .NetworkSettings.Networks}}{{.IPAddress}}{{end}}' $(docker ps -aq)
```

### Expected Output:
```text
/sentinel-nexus     - 10.240.0.10
/sentinel-forge     - 10.240.0.20
/sentinel-traffic   - 10.240.0.50
/sentinel-adversary - 10.240.0.99
/sentinel-node-01   - 10.240.0.101
/sentinel-node-02   - 10.240.0.102
/sentinel-node-03   - 10.240.0.103
```

---

## 3. Testing Inter-Container Connectivity

Verify that edge node 1 can reach the Nexus gRPC service:

```bash
docker exec -it sentinel-node-01 nc -zv 10.240.0.10 50051
# Output: Connection to 10.240.0.10 50051 port [tcp/*] succeeded!
```
```

---

### File: `sentinel-matrix/docs/getting-started/architecture-at-a-glance.md`

```markdown
# Architecture at a Glance

The diagram below details the private subnet routing, shared storage mount points, traffic injection channels, and adversary attack vectors inside `sentinel-matrix`.

---

```text
 ┌──────────────────────────────────────────────────────────────────────────────────────────┐
 │ VMWARE LINUX GUEST HOST (Ubuntu 24.04 / 26.04)                                           │
 │                                                                                          │
 │  ┌────────────────────────────────────────────────────────────────────────────────────┐  │
 │  │ SHARED NVMe STORAGE VOLUMES (/opt/sentinel-matrix/shared/)                         │  │
 │  │  • /shared/models   : network_threat_v1.onnx & candidate weights                  │  │
 │  │  • /shared/datasets : Active learning curated forge_dataset_*.csv batches          │  │
 │  │  • /shared/lib      : Bundled host shared libraries (libabsl, libre2, libgrpc)     │  │
 │  │  • /shared/logs     : Centralized log aggregation                                  │  │
 │  └────────────────────────────────────────────────────────────────────────────────────┘  │
 │                                                                                          │
 │  ┌────────────────────────────────────────────────────────────────────────────────────┐  │
 │  │ ISOLATED DIGITAL TWIN DOCKER BRIDGE: matrix_net (Subnet: 10.240.0.0/24)            │  │
 │  │                                                                                    │  │
 │  │  ┌──────────────────────┐  ┌──────────────────────┐  ┌──────────────────────────┐  │  │
 │  │  │ sentinel-nexus       │  │ sentinel-forge       │  │ sentinel-adversary       │  │  │
 │  │  │ IP: 10.240.0.10      │  │ IP: 10.240.0.20      │  │ IP: 10.240.0.99          │  │  │
 │  │  │ • Port 50051 gRPC    │  │ • Continual MAE Loop │  │ • Live nmap SYN sweeps   │  │  │
 │  │  │ • Port 9443 Web SPA  │  │ • Safety Gate (100%) │  │ • Live mbpoll overrides  │  │  │
 │  │  │ • Port 9444 Real SSE │  │ • Auto ONNX Stager   │  │ • Live cURL API fuzzing  │  │  │
 │  │  └──────────┬───────────┘  └──────────▲───────────┘  └────────────┬─────────────┘  │  │
 │  │             │                         │                           │                │  │
 │  │             │ gRPC StreamFleetRules   │ Curation Watcher          │ Live Attacks   │  │
 │  │             ▼ (< 50ms Immunity)       │ (/shared/datasets)        ▼ on Wire        │  │
 │  │  ┌────────────────────────────────────┴───────────────────────────────────────┐  │  │
 │  │  │ 3x EDGE APPLIANCE NODES (blackbox-sentinel daemons)                         │  │  │
 │  │  │ • node-01 (10.240.0.101): Substation Alpha (IEC 104, S7, DNP3)              │  │  │
 │  │  │ • node-02 (10.240.0.102): Medical Clinic Enclave (DICOM PACS, HL7, MAVLink)│  │  │
 │  │  │ • node-03 (10.240.0.103): Chemical Refinery (Modbus TCP, BACnet, CIP)      │  │  │
 │  │  │ In-Kernel eBPF/XDP Filters drop attacks in < 0.84 µs at driver hook         │  │  │
 │  │  └────────────────────────────────────▲───────────────────────────────────────┘  │  │
 │  │                                       │ Synthetic Multi-Modal Streams & PCAP Replays│  │
 │  │  ┌────────────────────────────────────┴───────────────────────────────────────┐  │  │
 │  │  │ sentinel-traffic (10.240.0.50): OmniFlow 7-Channel Traffic Generation       │  │  │
 │  │  │  - Ch 1: SCADA OT Modbus/DNP3       - Ch 5: Container Syscalls              │  │  │
 │  │  │  - Ch 2: Edge Vision YOLO Tensors   - Ch 6: Medical DICOM Imaging           │  │  │
 │  │  │  - Ch 3: L7 REST & BAD Bot Traffic  - Ch 7: 32-dim Tabular NetFlow Blaster  │  │  │
 │  │  │  - Ch 4: Identity Kerberos / ATO    - REPLAY: Industroyer, Triton, Stuxnet  │  │  │
 │  │  └─────────────────────────────────────────────────────────────────────────────┘  │  │
 │  └────────────────────────────────────────────────────────────────────────────────────┘  │
 └──────────────────────────────────────────────────────────────────────────────────────────┘
```
```

---

### Complete in Part 1
- `sentinel-matrix/docs/mkdocs.yml`
- `sentinel-matrix/docs/index.md`
- `sentinel-matrix/docs/getting-started/overview.md`
- `sentinel-matrix/docs/getting-started/system-requirements.md`
- `sentinel-matrix/docs/getting-started/quickstart-one-command-launch.md`
- `sentinel-matrix/docs/getting-started/verifying-container-grid.md`
- `sentinel-matrix/docs/getting-started/architecture-at-a-glance.md`

All 7 root configuration and onboarding files are now generated.

---

### Files to be Generated in Part 2

The next phase covers **Deep Systems Design** (`architecture/` - 5 files):

1. `architecture/simulation-mesh-architecture.md` (Multi-container digital twin architecture and lifecycle)
2. `architecture/the-infinite-flywheel.md` (Continuous loop: Ambient $\to$ Exploit $\to$ Drop $\to$ Retrain $\to$ Hot-Reload)
3. `architecture/container-topology-matrix.md` (Master service inventory: Nexus, Forge, Nodes, Traffic, Adversary)
4. `architecture/shared-volumes-and-ipc.md` (Shared storage architecture: `/shared/models`, datasets, and logs)
5. `architecture/vmware-hypervisor-optimization.md` (Solving virtualization constraints inside VMware Linux guests)

Confirm when you are ready to proceed with Part 2.