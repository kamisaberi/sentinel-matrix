# Sentinel Matrix: Autonomous Cyber-Range & Simulation Mesh

```text
====================================================================================================
                        SENTINEL-MATRIX: THE INFINITE DEFENSE FLYWHEEL
====================================================================================================
                                              │
         ┌────────────────────────────────────┴────────────────────────────────────┐
         ▼                                                                         ▼
  [ PHASE 1: AMBIENT TELEMETRY ]                                         [ PHASE 2: ADVERSARIAL ATTACK ]
  • Continuous 5,000 EPS baseline NetFlow                                • Exploit wave hits Node #01
  • Sub-microsecond local scoring                                        • In-kernel XDP drop (< 1µs)
  • High-uncertainty vectors [0.40 - 0.60]                               • ThreatIndicator emitted to Nexus
         │                                                                         │
         ▼                                                                         ▼
  [ PHASE 3: COLLECTIVE DEFENSE ]                                        [ PHASE 4: DATASET CURATION ]
  • Nexus fans out FleetDefenseRule                                      • Nexus batches candidate vectors
  • Nodes #02-#05 inject IP into eBPF                                    • Generates forge_dataset_*.csv
  • Attacker blocked grid-wide in < 50ms                                 • ForgeTrigger quota tripped
         │                                                                         │
         └────────────────────────────────────┬────────────────────────────────────┘
                                              │
                                              ▼
                               [ PHASE 5: CONTINUOUS ADAPTATION ]
                               • Forge trains MAE/InfoNCE on edge vectors
                               • Evaluates against golden_attacks.yaml
                               • Exports network_threat_v2.onnx to Nexus
                               • Nexus executes Canary Staged Rollout
                               • Edge appliances auto-pull & hot-reload
                                              │
                                              ▼
                               (Cycle repeats indefinitely with v3, v4...)
```

---

## 1. Overview

**`sentinel-matrix`** is an encapsulated, fully autonomous, containerized cyber-range and simulation mesh designed to test, validate, and demonstrate the **Aryorithm / Blackbox Sentinel** ecosystem.

Running in an isolated virtual network environment, it creates an end-to-end digital twin of enterprise, industrial, and defense infrastructure:
* **Tier 6 Command Plane (`sentinel-nexus`):** Centralized fleet management, live telemetry streaming, and collective defense fan-out.
* **Tier 4 Continual Learning (`xinfer-forge`):** Autonomous background retraining on ambient site telemetry with safety-gated model promotion.
* **Tier 3 Edge Appliances (`blackbox-sentinel`):** Multiple heterogeneous edge appliances running local eBPF/XDP kernel drop engines and neural threat classifiers.
* **Traffic & Attack Engine (`traffic-gen`):** Generates high-throughput ambient NetFlow and injects multi-vector cyber-physical attack scenarios on demand.
* **Live Observability Console (`monitor`):** Real-time dual-panel terminal UI (TUI) and air-gapped web command center.

---

## 2. VMware Virtualization & Encapsulation Architecture

To ensure 100% stability, safety, and compatibility inside virtualized environments (such as **VMware Workstation Pro, ESXi, and Fusion**), `sentinel-matrix` incorporates specialized hypervisor adaptations:

1. **Collision-Free Subnet (`10.240.0.0/24`):**  
   Avoids standard Docker bridge blocks (`172.17.0.0/16` – `172.31.0.0/16`) that frequently conflict with VMware virtual network adapters (VMnet1 / VMnet8).
2. **Generic SKB Mode eBPF (`XDP_FLAGS_SKB_MODE`):**  
   VMware virtual network interfaces (`ens33`, `vmxnet3`) and container `veth` pairs do not support native driver-level XDP. Containers use Generic SKB mode with `NET_ADMIN` and `BPF` capabilities, achieving line-rate drops in $< 1\,\mu\text{s}$ without requiring dedicated physical SRIOV hardware.
3. **vTPM & DMI Hypervisor Identity:**  
   Emulates physical TPM 2.0 / vTPM hardware attributes (`/sys/class/dmi/id/product_uuid` with VMware hypervisor signatures), satisfying the hardware attestation engine in `blackbox-essential`.
4. **Host Dynamic Library Bundling (`shared/lib/`):**  
   Automatically extracts host-compiled shared libraries (`libabsl_*`, `libre2`, `libgrpc++`, `libprotobuf`) into `shared/lib/` and binds them to the container via `LD_LIBRARY_PATH=/usr/local/lib/matrix-deps`, preventing dynamic linker mismatches.

---

## 3. Container Network Topology & IP Allocations

All containers communicate over the isolated internal bridge network **`sentinel-grid-net`** (`10.240.0.0/24`):

| Container Name | Role / Subsystem | IP Address | Host Port Mappings | Capabilities / Features |
| :--- | :--- | :--- | :--- | :--- |
| **`matrix-nexus`** | Central Command Plane (Tier 6) | `10.240.0.10` | `50051`, `9443`, `9444` | Web SPA, gRPC services, SSE streamer |
| **`matrix-forge`** | Continuous Retraining (Tier 4) | `10.240.0.20` | Internal | PyTorch MAE, ONNX exporter, dataset watcher |
| **`matrix-traffic-gen`** | Traffic & Scenario Generator | `10.240.0.50` | Internal | Ambient NetFlow & scenario wave dispatcher |
| **`matrix-monitor`** | Terminal UI Dashboard (TUI) | `10.240.0.60` | Internal (TTY) | Real-time dual-panel terminal monitor |
| **`matrix-edge-substation-01`** | Industrial SCADA Substation | `10.240.0.101` | Internal | OpenVINO, Modbus/DNP3, XDP SKB drop |
| **`matrix-edge-hospital-02`** | Healthcare PACS Medical Enclave | `10.240.0.102` | Internal | TensorRT, DICOM/HL7, XDP SKB drop |
| **`matrix-edge-refinery-03`** | Refinery Critical Infrastructure| `10.240.0.103` | Internal | RKNN, PROFINET/S7Comm, XDP SKB drop |

---

## 4. Complete Repository Tree

```text
sentinel-matrix/
├── .env.example                               # Default environment configuration (ports, subnets)
├── .gitignore                                 # Git exclusions for models, logs, datasets
├── Makefile                                   # One-touch control automation (init, build, up, attacks)
├── README.md                                  # This master architecture and operations guide
├── docker-compose.yml                         # Master container orchestration mesh
│
├── configs/                                   # Declarative Simulation Parameters
│   ├── matrix.yaml                            # Master controller configuration (timelines, thresholds)
│   ├── nodes/                                 # Node Profile Customizations
│   │   ├── default_node_template.yaml         # Base template for dynamic scaling
│   │   ├── node_01_substation_alpha.yaml      # Industrial SCADA profile (OpenVINO, Modbus/DNP3)
│   │   ├── node_02_hospital_pacs.yaml         # Healthcare PACS profile (TensorRT, DICOM/HL7)
│   │   └── node_03_refinery_plc.yaml          # Critical infrastructure profile (RKNN, PROFINET/S7)
│   ├── scenarios/                             # Declarative Attack Scenarios
│   │   ├── 01_ambient_baseline.yaml           # Benign ambient NetFlow background
│   │   ├── 02_scada_modbus_tamper.yaml        # Unauthorized coil manipulation (T0855)
│   │   ├── 03_c2_beacon_exfil.yaml            # High-entropy C2 egress beacons (T1071)
│   │   ├── 04_exploit_public_facing.yaml      # Zero-day remote code execution (T1190)
│   │   ├── 05_distributed_brute_force.yaml    # Line-rate SSH/RDP credential sweep (T1110)
│   │   ├── 06_sla_latency_breach.yaml         # Latency degradation chaos profile (>1000µs)
│   │   └── 07_adversarial_poisoning.yaml      # Malicious training sample injection test
│   └── traffic/                               # Traffic Distribution Profiles
│       ├── netflow_distributions.yaml         # 32-dimensional normal traffic bounds
│       └── uncertainty_profile.yaml           # Target distribution for active learning [0.40, 0.60]
│
├── docker/                                    # Container Definitions & Build Contexts
│   ├── Dockerfile.nexus                       # Builds Sentinel Nexus command plane image
│   ├── Dockerfile.sentinel                    # Builds Blackbox Sentinel edge appliance image
│   ├── Dockerfile.forge                       # Builds xInfer Forge continuous retraining image
│   ├── Dockerfile.traffic                     # Builds High-Throughput traffic & attack generator
│   ├── Dockerfile.monitor                     # Builds Live Terminal Dashboard (TUI)
│   └── entrypoints/                           # Initialization Scripts (Pre-boot hooks)
│       ├── nexus_entrypoint.sh                # Sets up bpffs, mounts web assets, starts Nexus
│       ├── sentinel_entrypoint.sh             # Sets up virtual NIC, vTPM/DMI UUID, starts Sentinel
│       ├── forge_entrypoint.sh                # Launches continuous dataset watcher daemon
│       ├── traffic_entrypoint.sh              # Probes Nexus socket, executes master orchestrator
│       └── monitor_entrypoint.sh              # Boots live curses/rich dashboard
│
├── src/                                       # Core Simulation & Orchestration Logic
│   ├── orchestrator/                          # Simulation Lifecycle
│   │   ├── __init__.py
│   │   ├── master_controller.py               # Autonomous ambient/attack scheduling loop
│   │   ├── scenario_runner.py                 # Loads and parses scenario YAMLs
│   │   ├── process_supervisor.py              # Container process watchdog
│   │   ├── topology_builder.py                # Maps virtual network connections
│   │   └── chaos_injector.py                  # Injects latency spikes, packet loss, node drops
│   │
│   ├── traffic/                               # Traffic Generation Subsystem
│   │   ├── __init__.py
│   │   ├── ambient_generator.py               # Produces benign 32-dim NetFlow vectors
│   │   ├── attack_generator.py                # Dispatches attack waves & broadcasts threats
│   │   ├── socket_streamer.py                 # Injects frames directly to network sockets
│   │   └── vector_synthesizer.py              # Active learning uncertainty synthesizer
│   │
│   ├── loop/                                  # Continuous Retraining Automation
│   │   ├── __init__.py
│   │   ├── forge_watcher.py                   # Monitors /shared/datasets/ for curated batches
│   │   ├── canary_progression_engine.py       # Advances model stages (Shadow -> 5% -> Fleet)
│   │   ├── closed_loop_validator.py           # Validates model v2 catches v1 zero-days
│   │   └── model_sync_agent.py                # Verifies SHA-256 and copies ONNX to nodes
│   │
│   └── monitor/                               # Real-Time Observability
│       ├── __init__.py
│       ├── live_dashboard.py                  # Dual-panel Rich terminal UI (Nodes + MITRE)
│       ├── metrics_aggregator.py              # Computes latency percentiles (p50, p95, p99)
│       ├── ascii_visualizer.py                # Terminal ASCII network map
│       └── alert_stream_consumer.py           # SSE stream client for Nexus port 9444
│
├── tools/                                     # Operator CLI & Trigger Utilities
│   ├── inject_attack.py                       # CLI tool to fire an attack wave on demand
│   ├── inject_chaos.py                        # CLI tool to inject latency breaches or sever nodes
│   ├── trigger_retrain.py                     # CLI tool to force Forge retraining
│   ├── dump_simulation_report.py              # CLI tool to export CMMC/IEC 62443 audit reports
│   └── inspect_mesh_health.py                 # CLI tool to query node drop tallies
│
└── shared/                                    # Mounted Volumes (Host-to-Container Sync)
    ├── bin/                                   # Compiled host binaries (nexus, sentinel, nexus-ctl)
    ├── lib/                                   # Extracted host dynamic libraries (absl, re2, grpc)
    ├── proto/                                 # Protobuf wire definitions (.proto)
    ├── certs/                                 # Internal mTLS PKI (CA, server, and client certs)
    │   └── gen_matrix_certs.sh
    ├── datasets/                              # Curated NetFlow batches (forge_dataset_*.csv)
    ├── models/                                # Versioned ONNX model storage (.onnx / .sha256)
    └── logs/                                  # Centralized simulation runtime traces
        ├── nexus/
        ├── nodes/
        └── forge/
```

---

## 5. Quickstart: Installation & Build Instructions

### Prerequisites
On your VMware Ubuntu machine, verify that Docker and Docker Compose v2 are installed:
```bash
sudo apt-get update && sudo apt-get install -y docker.io docker-compose-v2 make
sudo usermod -aG docker $USER
```

### Step 1: Initialize Workspace & Extract Libraries
The `make init` command creates the shared directories, synchronizes the compiled host binaries (`sentinel-nexus`, `sentinel`, `nexus-ctl`), and automatically bundles all host-compiled dynamic libraries (`libabsl_*`, `libre2`, `libgrpc++`, `libprotobuf`) into `shared/lib/`:

```bash
cd /home/kami/sentinel-matrix
make init
```

### Step 2: Generate Internal mTLS Certificates
Generate the internal container PKI:
```bash
./shared/certs/gen_matrix_certs.sh
```

### Step 3: Build the Container Images
Build the 5 container images:
```bash
sudo make build
```

---

## 6. Running the Simulation Mesh

### Launch the Grid
Start all 7 containers in the background:
```bash
sudo make up
```

### Verify Container Status
Check that all containers are online and `matrix-nexus` has passed its health check:
```bash
sudo docker compose ps
```

Expected output:
```text
NAME                         STATUS                    PORTS
matrix-nexus                 Up (healthy) (2s)         0.0.0.0:50051->50051/tcp, 0.0.0.0:9443->9443/tcp, 0.0.0.0:9444->9444/tcp
matrix-forge                 Up                        
matrix-traffic-gen           Up                        
matrix-monitor               Up                        
matrix-edge-substation-01    Up                        
matrix-edge-hospital-02      Up                        
matrix-edge-refinery-03      Up                        
```

---

## 7. Observability Consoles

### A. Air-Gapped Web Command Center
Open any browser on your host machine (or guest):
```text
http://localhost:9443
```
* **Active Node Matrix:** Live telemetry from all edge appliances (CPU, RAM, NPU temp, eBPF drop counters, microsecond mitigation latency).
* **Radial Topology Canvas:** Dynamic HTML5 Canvas rendering radial link connections between edge nodes and Nexus.
* **Aggregated MITRE ATT&CK Matrix:** Color-coded heatmap showing active tactic hit counters (`T0855`, `T1071`, `T1190`, `T1110`).
* **Canary Staging Pipeline:** 1-Click controls to promote candidate models (`Shadow Mode` $\rightarrow$ `5% Canary` $\rightarrow$ `Fleet-Wide`) or trigger an immediate Emergency Rollback.

### B. Live Terminal Dashboard (TUI)
To monitor the simulation in your terminal:
```bash
make tui
```
Displays a real-time split screen:
* **Left Panel:** Connected Edge Appliances table (Node ID, Site, CPU, Drops, Microsecond Latency SLA).
* **Right Panel:** MITRE ATT&CK Detections table with live tactic hit counts.

*(Press `Ctrl+C` to exit the dashboard view without stopping the simulation).*

---

## 8. Triggering Attack Waves & Chaos Scenarios

The mesh runs continuous ambient traffic in the background. You can trigger targeted attacks and chaos conditions on demand:

### 1. SCADA Modbus PLC Override Attack (T0855)
Simulates an attacker attempting an unauthorized valve coil override on `Edge-Substation-01`:
```bash
make attack-modbus
```
* **What happens:** 
  1. Substation Node 01 intercepts the packet, executes an in-kernel eBPF drop in $< 1\,\mu\text{s}$, and emits a `ThreatIndicator` upstream to Nexus.
  2. Nexus broadcasts a `FleetDefenseRule` fleet-wide via bidirectional gRPC.
  3. Hospital Node 02 and Refinery Node 03 inject the attacker's IP (`198.51.100.44`) into their local kernel's `blocked_ip_map` in **$< 50\,\text{ms}$**.
  4. The adversary is blocked grid-wide before ever reaching the other two sites.

### 2. C2 Egress Beacon Wave (T1071)
Simulates high-entropy encrypted C2 outbound traffic from `Edge-Hospital-PACS-02`:
```bash
make attack-c2
```
* **What happens:** Nexus registers the detection, the MITRE ATT&CK panel in the Web UI and TUI turns red on `T1071 (C2 Application Protocol)`, and the drop counter increments immediately.

### 3. SLA Latency Breach & Automated Rollback
Simulates a candidate model causing inference degradation ($> 1{,}000\,\mu\text{s}$):
```bash
make chaos-latency
```
* **What happens:** Nexus's `RollbackGuard` detects the SLA latency breach ($1{,}650\,\mu\text{s} > 1{,}000\,\mu\text{s}$ SLA limit), logs an emergency alert, purges the candidate model, and rolls back the fleet to stable weights.

### 4. Instant 0 ms Graceful Disconnect
Simulates an edge node abruptly shutting down:
```bash
make chaos-sever
```
* **What happens:** Node 01 emits a `DeregistrationRequest` frame on `SIGINT`. In the Web Command Center and TUI, Node 01 turns **`OFFLINE` (Red) in 0 milliseconds**, bypassing the standard 15-second heartbeat timeout.

To bring the node back online:
```bash
sudo docker compose start sentinel-edge-01
```

---

## 9. Continuous Retraining (The Closed-Loop Flywheel)

The simulation mesh autonomously adapts to site-specific traffic without internet access:

1. As ambient traffic runs, edge nodes identify vectors with prediction uncertainty between $0.40$ and $0.60$ and stream them to Nexus.
2. Nexus curates these vectors into `/shared/datasets/forge_dataset_*.csv`.
3. To watch `xinfer-forge` detect the batch, train, and stage the updated model:
   ```bash
   sudo docker compose logs -f forge
   ```
4. **Automated Sequence:**
   * Forge trains the self-supervised Masked Autoencoder (MAE).
   * Forge evaluates against `configs/safety/golden_attacks.yaml` (100% attack retention verified).
   * Forge compiles `network_threat_v2.onnx` and stages it to Nexus in `SHADOW_MODE`.
   * Nexus promotes it to `FLEET_WIDE`.
   * All edge nodes pull the weights, verify the SHA-256 hash, and execute live zero-downtime hot-reloads.

---

## 10. Customization Guide

### Scaling the Edge Fleet
To scale from 3 edge appliances to 10 appliances:
```bash
sudo docker compose up -d --scale sentinel-edge-01=10
```

### Adding Custom Attack Scenarios
Drop a new scenario file into `configs/scenarios/` (e.g., `08_custom_ransomware.yaml`):
```yaml
scenario:
  name: "Industrial Ransomware IOPS Burst"
  type: "ADVERSARIAL_WAVE"
  duration_seconds: 15
  traffic_eps: 20000
  target_nodes: ["Edge-Refinery-PLC-03"]
  mitre_tactic: "T1486"
  mitre_name: "Data Encrypted for Impact"
  attacker_ip: "198.51.100.199"
  target_port: 445
  expected_outcome:
    edge_ebpf_drop_us: 0.84
    threat_broadcast_verified: true
```
Execute it immediately:
```bash
docker compose exec traffic-gen python3 /app/src/traffic/attack_generator.py --scenario /configs/scenarios/08_custom_ransomware.yaml
```

---

## 11. Troubleshooting Reference

| Issue / Error | Root Cause | Resolution |
| :--- | :--- | :--- |
| `Pool overlaps with other one on this address space` | Docker or VMware previously assigned a conflicting `172.x` route block. | `sentinel-matrix` uses `10.240.0.0/24`. Run `sudo docker network prune -f` and restart. |
| `error while loading shared libraries: libabsl_...` or `libre2...` | Host-compiled binaries require specific dynamic libraries not present in stock container. | Run `make init` to copy host `.so` files into `shared/lib/`. The container mounts them to `/usr/local/lib/matrix-deps` with `LD_LIBRARY_PATH`. |
| `mkdir /usr/local/lib: read-only file system` | Docker daemon attempted to mount host root path in an environment with AppArmor/Snap confinement. | `docker-compose.yml` mounts local `./shared/lib:/usr/local/lib/matrix-deps:ro`. Do not mount host `/usr/local/lib`. |
| `Container matrix-nexus is unhealthy` | Port `50051` or `9443` is already held by a host process from prior testing. | Run `sudo pkill -f sentinel-nexus` and `sudo pkill -f sentinel` on the host, then run `sudo make restart`. |
| `attack-c2` hangs or `make tui` shows 0 threats | Old container image was running without live `./src` mount. | Ensure `- ./src:/app/src:ro` is in `docker-compose.yml` for `traffic-gen` and `monitor`, then run `sudo docker compose up -d --force-recreate traffic-gen monitor`. |
| `Permission denied` on BPF map injection | Virtual container lacks Linux kernel capabilities. | Ensure `privileged: true` and `cap_add: [NET_ADMIN, SYS_ADMIN, BPF]` are enabled in `docker-compose.yml`. |

---

## 12. Teardown & Maintenance

```bash
# Stop all containers (preserves models and logs)
sudo make down

# Restart the entire mesh fresh
sudo make restart

# View aggregated logs across all tiers
sudo make logs

# Purge all temporary datasets, trained model candidates, and caches
sudo make clean
```