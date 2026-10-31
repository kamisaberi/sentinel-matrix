# Sentinel-Matrix: Autonomous Cyber-Physical Cyber-Range & Digital Twin Mesh
### Tier 7 of the Aryorithm Technologies Active Defense Ecosystem

[![Ecosystem Health](https://img.shields.io/badge/System%20Health-21%2F21%20PASSED-10B981?style=for-the-badge)](https://aryorithm.com)
[![eBPF Kernel Drop](https://img.shields.io/badge/eBPF%20Drop-0.84%20%C2%B5s-00F0FF?style=for-the-badge)](https://aryorithm.com)
[![Line Rate](https://img.shields.io/badge/AF__XDP%20Throughput-40M%2B%20EPS-00B4D8?style=for-the-badge)](https://aryorithm.com)
[![License](https://img.shields.io/badge/License-Apache%202.0-blue?style=for-the-badge)](LICENSE)
[![DOI](https://img.shields.io/badge/CERN%2FZenodo%20DOI-10.5281%2Fzenodo.23598779-A855F7?style=for-the-badge)](https://doi.org/10.5281/zenodo.23598779)

---

## 1. Executive Overview

**Sentinel-Matrix** is an autonomous, self-sovereign Cyber-Physical Systems (CPS) and Industrial Control Systems (ICS) digital twin range. It provides a multi-container network simulation environment designed to evaluate in-kernel eBPF active defenses, hardware-accelerated neural inference, and continuous physical plant dynamics under live, wire-speed cyber-attacks.

### Core Architectural Differentiators:
* **Continuous Numerical ODE Physics Coupling:** Embeds a native C 4th-Order Runge-Kutta (RK4) numerical ODE solver (`plant_ode.c`) directly into mock PLCs, asserting formal Control Barrier Functions ($h(x) \ge 0$) and Lyapunov stability ($\lambda \le 0$).
* **8 Universal Device Archetypes:** Replaces hundreds of static vendor Dockerfiles with a single parameterized runtime container (`Dockerfile.device_runtime` + `universal_device.py`), emulating any sensor, PLC, or IED via runtime configuration.
* **Self-Sovereign Multi-Network Scenarios:** Completely decoupled from static Compose files. The dynamic scenario compiler (`tools/scenario_engine.py`) compiles standalone, multi-subnet topologies with configurable air-gaps (`internal: true`) and network impairments.
* **Heterogeneous Multi-Silicon Fleet:** Concurrently runs three isolated Edge XDR Sentries emulating **Intel OpenVINO**, **NVIDIA TensorRT**, and **Rockchip RKNN** hardware backends.
* **Multi-Modal Industrial Sensor Array:** Emulates real-time thermal vision (MediaMTX WebRTC/RTSP), multi-axis bearing vibration, SICK LiDAR spatial range scanning, and Siemens power quality metering.
* **Deterministic Malware Replay:** Replays genuine, full-fidelity industrial attack PCAPs (Industroyer2, TRITON/Trisis, Stuxnet) directly onto virtual wire interfaces.

---

## 2. Complete Mesh Topology & Network Map

By default, the master range operates across the `sentinel-grid-net` bridge network (`10.240.0.0/24`), interconnecting 13 distinct containers:

```text
                               ┌─────────────────────────────────────────────────────────────┐
                               │                    HOST BROWSER / OPERATOR                  │
                               │  • Web C2: http://localhost:9443                            │
                               │  • Live WebRTC Video: http://localhost:8889/thermal_feed    │
                               │  • Real-Time SSE Event Stream: http://localhost:9444        │
                               └──────────────┬───────────────────────────────▲──────────────┘
                                              │                               │
                                              ▼                               │
═══════════════════════════════════════════ WIRE BOUNDARY (sentinel-grid-net: 10.240.0.0/24) ═════════════════════════════════════════════
                                              │                               │
         ┌────────────────────────────────────┼───────────────────────────────┴────────────────────────────────────┐
         │                                    │                                                                    │
         ▼                                    ▼                                                                    ▼
 ┌──────────────────────┐             ┌──────────────────────┐                                             ┌──────────────────────┐
 │ matrix-nexus         │◄──(Models)──┤ matrix-forge         │                                             │ matrix-monitor       │
 │ 10.240.0.10          │             │ 10.240.0.20          │                                             │ 10.240.0.60          │
 │ [C2 Fleet Commander] │──(Dataset)─►│ [Continual AI Forge] │                                             │ [Terminal UI - TUI]  │
 └──────────▲───────────┘             └──────────────────────┘                                             └──────────▲───────────┘
            │                                                                                                         │
            │ gRPC 50051 Telemetry & Rules                                                                            │
            ├─────────────────────────────────────────┬────────────────────────────────────────┐                      │
            │                                         │                                        │                      │
            ▼                                         ▼                                        ▼                      │
 ┌──────────────────────┐             ┌──────────────────────┐             ┌──────────────────────┐                   │
 │ matrix-edge-         │             │ matrix-edge-         │             │ matrix-edge-         │                   │
 │ substation-01        │             │ hospital-02          │             │ refinery-03          │                   │
 │ 10.240.0.101         │             │ 10.240.0.102         │             │ 10.240.0.103         │                   │
 │ Backend: OpenVINO    │             │ Backend: TensorRT    │             │ Backend: RKNN        │                   │
 │ Cap: eBPF/NET_ADMIN  │             │ Cap: eBPF/NET_ADMIN  │             │ Cap: eBPF/NET_ADMIN  │                   │
 └──────────▲───────────┘             └──────────▲───────────┘             └──────────▲───────────┘                   │
            │                                    │                                    │                               │
            └────────────────────────────────────┼────────────────────────────────────┴───────────────────────────────┘
                                                 │
                                                 │ Protected Industrial Network & Direct Sensor Interfaces
            ┌────────────────────────────────────┴────────────────────────────────────┐
            ▼                                                                         ▼
 ┌────────────────────────────────────────────────────────┐         ┌─────────────────────────────────────────────────┐
 │ SENSOR & I/O ARRAY (Data Generation)                   │         │ INJECTION & ADVERSARY PLANE (Active Red Team)   │
 ├────────────────────────────────────────────────────────┤         ├─────────────────────────────────────────────────┤
 │ • matrix-sensor-camera (10.240.0.75):                  │         │ • matrix-adversary (10.240.0.99):               │
 │   FLIR Thermal Camera (RTSP :8554, WebRTC :8889)       │         │   Live attack generator (nmap, mbpoll, exploit) │
 │ • matrix-sensor-vibration (10.240.0.76):               │         │                                                 │
 │   IFM Vibration & Temp Probe (Modbus :502 -> :15502)   │         │ • matrix-traffic-gen (10.240.0.50):             │
 │ • matrix-sensor-lidar (10.240.0.77):                   │         │   Deterministic replay of certified PCAPs       │
 │   SICK LiDAR Spatial Scanner (UDP :2368)               │         │   (Industroyer2, TRITON, Stuxnet)               │
 │ • matrix-sensor-power (10.240.0.78):                   │         └─────────────────────────────────────────────────┘
 │   PAC3200 Power Quality Meter (Modbus :502 -> :15501)  │
 │ • matrix-mock-plc (10.240.0.150):                      │
 │   Continuous RK4 ODE Plant Physics Twin (:502,102,2404)│
 └────────────────────────────────────────────────────────┘
```

---

## 3. Network Addressing & Node Matrix

| Container Name | Service Key | IP Address | Internal Ports | Host Port Forward | Function & Emulated Hardware |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `matrix-nexus` | `nexus` | `10.240.0.10` | 50051, 9443, 9444 | `50051`, `9443`, `9444` | Fleet Orchestration C2, Web Console, and SSE Stream |
| `matrix-forge` | `forge` | `10.240.0.20` | — | Internal Only | Continual ML Adaptation (PyTorch, Tabular MAE + InfoNCE) |
| `matrix-traffic-gen` | `traffic-gen` | `10.240.0.50` | — | Internal Only | Synthetic Wire Traffic & Real-World PCAP Replay Blaster |
| `matrix-monitor` | `monitor` | `10.240.0.60` | — | TTY Console | Split-Panel Terminal User Interface (TUI) Dashboard |
| `matrix-sensor-camera`| `sensor-camera` | `10.240.0.75` | 8554, 8889, 8189/udp | `8554`, `8889`, `8189/udp`| FLIR Thermal Camera (MediaMTX RTSP / WebRTC WHEP) |
| `matrix-sensor-vibration`| `sensor-vibration` | `10.240.0.76` | 502 | `15502` | IFM Multi-Axis Bearing Vibration & Temp Transmitter |
| `matrix-sensor-lidar` | `sensor-lidar` | `10.240.0.77` | 2368/udp | `2368/udp` | SICK microScan3 / Velodyne LiDAR Spatial Scanner |
| `matrix-sensor-power` | `sensor-power` | `10.240.0.78` | 502 | `15501` | Siemens PAC3200 High-Voltage Power Quality Meter |
| `matrix-adversary` | `adversary` | `10.240.0.99` | — | Internal Only | Red-Team Live Attack Generator (`nmap`, `mbpoll`) |
| `matrix-edge-substation-01`| `sentinel-edge-01`| `10.240.0.101` | — | Internal Only | Substation Alpha Edge Sentry (Intel OpenVINO) |
| `matrix-edge-hospital-02` | `sentinel-edge-02`| `10.240.0.102` | — | Internal Only | Metro General Hospital PACS Sentry (NVIDIA TensorRT) |
| `matrix-edge-refinery-03` | `sentinel-edge-03`| `10.240.0.103` | — | Internal Only | Coastal Refinery Zone B Sentry (Rockchip RKNN) |
| `matrix-mock-plc` | `mock-plc` | `10.240.0.150` | 502, 102, 2404 | `502`, `102`, `2404` | RK4 Continuous ODE Physics Twin (Modbus, S7, IEC-104) |

---

## 4. The 6 Functional Layers

### Layer 1: Fleet Command & Visibility Plane
* **`nexus` (Tier 6):** Central orchestrator. Exposes **gRPC 50051** for sub-50ms rule deployment, **REST 9443** for the mission control dashboard, and **SSE 9444** for real-time telemetry streaming.
* **`monitor`:** Lightweight terminal UI (`src/monitor/live_dashboard.py`) rendering ANSI status meters, active drops, and live MITRE ATT&CK tactical classifications directly in console.

### Layer 2: Continual AI Retraining Engine
* **`forge` (Tier 4):** Monitors `/var/lib/sentinel-nexus/forge_datasets` for high-entropy anomaly tensors emitted by edge sentries. Controlled by `FORGE_AUTO_RETRAIN=false` to prevent runaway model generation. Operates via `aryo forge run` for controlled local adaptation or asymmetric remote GPU offloading.

### Layer 3: Heterogeneous Edge XDR Sentries
Three physical archetypes operating with full Linux capabilities (`NET_ADMIN`, `SYS_ADMIN`, `BPF`):
* **`sentinel-edge-01` (Substation Alpha):** Emulates an Intel x86 IPC running **Intel OpenVINO**. Guards `network_threat_int8.onnx` and `power_quality_anomaly.onnx` over IEC 60870-5-104 and Modbus.
* **`sentinel-edge-02` (Hospital PACS):** Emulates an AI appliance running **NVIDIA TensorRT**. Guards `thermal_anomaly_vision.onnx` and `lidar_spatial_detector.onnx` over RTSP and DICOM.
* **`sentinel-edge-03` (Refinery Zone B):** Emulates an industrial embedded ARM node running **Rockchip RKNN**. Guards `network_threat_int8.onnx` and `vibration_spectral_ae.onnx` over Modbus and Siemens S7Comm.

### Layer 4: Physical Plant & Numerical Physics Twin
* **`mock-plc`:** High-speed POSIX listener running an integrated 4th-Order Runge-Kutta numerical solver (`plant_ode.c`). Simulates physical heating, pressure dynamics, and mechanical vibration with an integration step $\Delta t = 100\,\text{ms}$, evaluating Nagumo forward-invariance inequality:
$$\dot{h}(x) + \alpha(h(x)) \ge 0$$

### Layer 5: Industrial Multi-Modal Sensor Array
* **`sensor-camera`:** MediaMTX container looping an authentic thermal infrared video feed over RTSP (port 8554) and WebRTC WHEP (port 8889) for zero-latency browser rendering.
* **`sensor-vibration`:** Emulates an IFM bearing accelerometer on Modbus port 15502.
* **`sensor-lidar`:** Emulates a 360-degree perimeter LiDAR scanner streaming UDP packets on port 2368.
* **`sensor-power`:** Emulates a digital power quality meter measuring grid frequency (50 Hz) and load (kW) on Modbus port 15501.

### Layer 6: Red-Team Adversary & Traffic Replay Plane
* **`traffic-gen`:** Replays clean and malicious PCAP traffic streams directly onto edge node IP addresses.
* **`adversary`:** Active attacker container equipped with network reconnaissance and industrial exploit scripts (`nmap`, `mbpoll`, `curl`).

---

## 5. The 8 Universal Device Archetypes

To eliminate the need for hundreds of static vendor Dockerfiles, `sentinel-matrix` uses **`Dockerfile.device_runtime`** and **`universal_device.py`**. A single base image emulates all 8 industrial device classes via runtime parameters:

```text
 ┌────────────────────────────────────────────────────────────────────────────────────────┐
 │                      THE UNIVERSAL DEVICE CONTAINER ARCHITECTURE                       │
 ├────────────────────────────────────────────────────────────────────────────────────────┤
 │ [Archetype 1: Constrained Sensor]  --archetype sensor --protocol modbus --port 502     │
 │ [Archetype 2: Industrial PLC/PAC]  --archetype plc --protocol s7comm --port 102        │
 │ [Archetype 3: Substation IED Relay]--archetype ied --protocol iec104 --port 2404       │
 │ [Archetype 4: Safety SIS System]   --archetype sis --protocol modbus --port 502        │
 │ [Archetype 5: Edge IPC / Gateway]  --archetype ipc --protocol tcp --port 8080          │
 │ [Archetype 6: Vision / LiDAR]      --archetype vision --protocol stream_telemetry      │
 │ [Archetype 7: 5G UPF Gateway]      --archetype 5g_gateway --protocol gtpu --port 2152  │
 │ [Archetype 8: Space Transceiver]   --archetype space_telemetry --protocol ccsds        │
 └────────────────────────────────────────────────────────────────────────────────────────┘
```

Build the universal base image once:
```bash
make build-device-runtime
```

---

## 6. Self-Sovereign Multi-Network Scenarios

Scenarios in `sentinel-matrix` are **100% self-sovereign**. They do not depend on the static `docker-compose.yml` and can declare custom subnets, gateways, and air-gapped zones:

### Scenario Directory Structure:
```text
scenarios/water_blackout_defense/
├── manifest.json            # Declares dependencies (.spkg, .onnx, .pcap) and compliance tags
├── scenario.yaml            # Sovereign topology, custom subnets, and node definitions
├── packages/                # (Optional / Embedded) Defense reflex packages (.spkg)
├── models/                  # (Optional / Embedded) Quantized neural weights (.onnx)
├── configs/                 # Companion register maps & ODE parameters
├── pcaps/                   # Ground-truth malware captures
└── run_demo.sh              # 1-Click turnkey orchestration script
```

### Scenario CLI Commands:
```bash
# Scaffold a new turnkey scenario
aryo scenario new water_grid_v2 --sector WATER_TREATMENT

# Add dependencies by simple name (resolves automatically without paths!)
aryo scenario add water_grid_v2 modbus_rate_limiter
aryo scenario add water_grid_v2 industrial_anomaly_detector
aryo scenario add water_grid_v2 modbus_unauthorized_write

# Pack scenario (Mode 1: Declarative ~15KB for Hub | Mode 2: Standalone Air-Gapped)
aryo scenario pack water_grid_v2          # Declarative
aryo scenario pack water_grid_v2 --embed  # Embedded Standalone

# Load, monitor, and dismantle custom scenarios dynamically
aryo matrix scenario load scenarios/water_grid_v2/scenario.yaml
aryo matrix scenario status
aryo matrix scenario down --name water_grid_v2
```

---

## 7. The 5 Active Frontier Engines in Matrix

1. **3GPP 5G/6G N3 GTP-U Slicing Guard (Idea B):**
   * Decapsulates 3GPP GTP-U (UDP 2152) tunnels in-kernel on `sentinel-edge-01`.
   * Cross-checks 32-bit TEIDs against `teid_slice_map` and drops slice-hopping attempts in $< 0.84\,\mu\text{s}$.
   * Drill: `aryo 5g blast-test lo`
2. **Live-SBOM In-Kernel Memory Integrity Engine (Idea C):**
   * Enforces strict $W\oplus X$ memory invariants via `sys_enter_mprotect` tracepoints.
   * Terminate unauthorized executable memory allocations with instant `SIGKILL` ($< 1.0\,\mu\text{s}$).
   * Drill: `aryo sbom test-drift`
3. **Autonomous Deception Honeynet & Fleet Vaccine Synthesis (Idea D):**
   * Transparently diverts attackers via eBPF DNAT into `mock-plc`.
   * Automatically synthesizes signed Ed25519 `.spkg` reflex rules and broadcasts fleet-wide via Nexus in $< 50\text{ ms}$.
   * Drill: `aryo matrix honeynet-autohunt`
4. **Industrial AI TRiSM Prompt Injection Firewall (Idea A):**
   * Inline streaming token firewall ($< 150\,\text{ns}$) neutralizing prompt jailbreaks and delimiter smuggling.
   * Autonomous tool-call governor blocking physical PLC write commands (`write_single_coil`, `s7_plc_cpu_stop`).
   * Drill: `aryo trism test-jailbreak`
5. **Orbital & Space Telemetry Guard (Idea E):**
   * Sub-120ns C++20 dissector for CCSDS Space Packet Protocol (133.0-B-2) and NATO STANAG 4586.
   * Enforces sliding-window sequence monotonicity and directional air-gapping to prevent rogue thruster telecommands.
   * Drill: `aryo space blast-sim`

---

## 8. Quickstart & Installation

### Prerequisites:
* Linux Host (Ubuntu 22.04 / 24.04 LTS or Debian 12 Bookworm)
* Docker Engine 24.0+ and Docker Compose v2
* GCC 10+ / Clang 14+, Make, Python 3.10+

### 1-Click Initialization:
```bash
# 1. Clone and navigate to matrix repository
cd /home/kami/sentinel-matrix

# 2. Build mock_plc, verify all 5 ONNX models, and sync host dependencies
make init

# 3. Build the universal device runtime image
make build-device-runtime

# 4. Launch the full 13-node simulation grid in background
make up

# 5. Verify all containers are healthy
make status
```

---

## 9. Full Operational Playbook (Makefile Targets)

```bash
# Lifecycle & Core Operations
make init                   # Sync models, compile mock_plc, bundle host shared libraries
make build                  # Build/rebuild all container images
make up                     # Launch 13-container grid in background (10.240.0.0/24)
make down                   # Gracefully dismantle all containers and networks
make restart                # Clean teardown and launch
make status                 # Display container health and port bindings
make logs                   # Stream unified real-time logs (tail=100)
make clean                  # Purge shared datasets, candidate models, and logs

# Observability
make tui                    # Launch split-panel Terminal UI (MITRE ATT&CK & Node Health)
make adversary-logs         # Stream live output from the Red-Team adversary node

# Live Wire Attacks (Attacker Container 10.240.0.99)
make live-nmap              # Real TCP SYN port scan across edge sentries (T1046)
make live-scada             # Real Modbus FC05 coil override via mbpoll (T0855)
make live-api               # High-velocity API abuse attack via curl (T1190)

# Real-World PCAP Replay Streams
make download-pcaps         # Fetch certified PCAP captures from secure repository
make attack-real-triton     # Replay genuine TRITON / Trisis SIS attack capture (T0843)
make attack-real-modbus     # Replay University of Illinois Modbus SCADA capture (T0855)
make attack-real-s7         # Replay genuine Siemens S7Comm PLC capture (T0831)
make attack-real-dnp3       # Replay genuine DNP3 substation capture (T0855)
make attack-real-iec104     # Replay genuine IEC 60870-5-104 grid telecontrol capture (T0855)

# Offline Synthetic PCAP Replays
make attack-industroyer     # Synthetic Industroyer breaker trip
make attack-triton          # Synthetic TriStation safety override
make attack-stuxnet         # Synthetic Stuxnet S7 frequency tamper

# Chaos Engineering & Resilience
make chaos-latency          # Inject simulated inference latency spike (> 1000 µs)
make chaos-sever            # Sever Edge Node 01 to verify 0ms graceful disconnect in Nexus

# Extensible Scenario Engine
make scenario-load SCENARIO=<path.yaml> [MODE=air-gapped]
make scenario-down
make scenario-status
make sim-finetune [MODE=local|air-gapped|cloud]
```

---

## 10. Cross-Modal Physics & Sensor Fusion Deep-Dive

Traditional firewalls inspect packets as isolated, stateless bytes. Blackbox Sentinel couples packet semantics directly to continuous physical laws inside the `ThreatCorrelator` engine:

```text
                        ┌────────────────────────────────────────────────────────┐
                        │      sentinel-edge-03 (Edge XDR Appliance)             │
                        │      IP: 10.240.0.103                                  │
                        └─────────────▲────────────────────────────▲─────────────┘
                                      │                            │
             Stream A: Cyber Telemetry│                            │Stream B: Physical Telemetry
             (SCADA Commands on :502) │                            │(Continuous RK4 ODE Probes)
                                      │                            │
 ┌────────────────────────────────────┴────────────────────────────┴─────────────────────────────┐
 │                      mock-plc (RK4 ODE Physics Digital Twin)                                  │
 │                      IP: 10.240.0.150                                                         │
 ├───────────────────────────────────────────────────────────────────────────────────────────────┤
 │ 1. Modbus Server (Port 502):                                                                  │
 │    • Coil 0x0000 : Main Electric Heater Element (ON = 1.0, OFF = 0.2)                         │
 │    • Coil 0x0001 : Coolant Drain Emergency Valve (OPEN = 0.8, CLOSED = 0.1)                   │
 │    • Register 40001: Hydraulic Circulation Pump RPM Speed (0 - 1000 RPM)                     │
 ├───────────────────────────────────────────────────────────────────────────────────────────────┤
 │ 2. Live Physical Sensor Registers (Calculated by plant_ode.c every 100 ms):                   │
 │    • Register 40002 -> Sensor 1: Thermal Probe (Temperature in °C)                            │
 │    • Register 40003 -> Sensor 2: Accelerometer (Vibration in mm/s)                            │
 │    • Register 40004 -> Sensor 3: Pressure Transducer (Pressure in PSI)                        │
 └───────────────────────────────────────────────────────────────────────────────────────────────┘
```

### Stuxnet / Triton Blinding Neutralization:
1. An attacker writes Modbus **Coil 0 (Heater) = ON**.
2. Simultaneously, the attacker injects spoofed response packets reporting that temperature is a nominal $25^\circ\text{C}$ (False Data Injection Attack - FDIA).
3. `sentinel-edge-03` monitors **Sensor Stream B** directly from the physical ODE solver, calculating that true temperature is climbing past $85^\circ\text{C}$ ($\dot{h}(x) < 0$).
4. The **ThreatCorrelator** identifies the divergence, invalidates the spoofed packet, and orders an in-kernel eBPF drop in **$< 0.84\,\mu\text{s}$**, preserving Lyapunov stability ($\lambda \le 0$) before physical equipment trips.

---

## 11. Directory Tree & File Inventory

```text
sentinel-matrix/
├── docker-compose.yml                  # 13-node master production mesh
├── Makefile                            # Full lifecycle, attack replay & chaos target suite
│
├── docker/                             # Hardened container definitions
│   ├── Dockerfile.nexus                # Tier 6 Command Plane
│   ├── Dockerfile.sentinel             # Tier 3 Edge XDR Appliance (eBPF capabilities)
│   ├── Dockerfile.plc                  # Physical RK4 ODE Mock PLC
│   ├── Dockerfile.forge                # Tier 4 Continual AI Retraining Daemon
│   ├── Dockerfile.device_runtime       # The 8 Universal Device Archetypes Base Image
│   ├── Dockerfile.traffic              # Wire Traffic & PCAP Replay Blaster
│   ├── Dockerfile.adversary            # Live Red-Team Attack Generator
│   ├── Dockerfile.monitor              # Terminal User Interface Dashboard
│   └── entrypoints/                    # Specialized entrypoint shell scripts
│
├── src/                                # Core matrix source implementations
│   ├── mock_plc.c                      # Multi-threaded POSIX socket listener (502, 102, 2404)
│   ├── plant_ode.c                     # 4th-order Runge-Kutta continuous numerical solver
│   ├── device_runtime/                 # Universal device engine (universal_device.py)
│   ├── loop/                           # Forge watcher daemon (forge_watcher.py)
│   └── monitor/                        # TUI live dashboard (live_dashboard.py)
│
├── include/                            # Header definitions
│   └── plant_ode.h                     # Physics state structures & CBF invariance headers
│
├── configs/                            # System configurations
│   ├── plc_register_map.json           # Modbus register-to-physics map
│   ├── model_routes.yaml               # 4-stage ModelRouter pipeline configuration
│   ├── archetypes/                     # Universal device vendor profiles
│   ├── nodes/                          # Node-specific routing DAG profiles (01, 02, 03)
│   └── pcaps/                          # Stored certified attack PCAPs
│
├── scenarios/                          # Self-sovereign multi-network scenarios
│   ├── master_grid_scenario.yaml       # Standalone 13-node master mesh
│   ├── finetune_simulation.yaml        # Local vs. air-gapped vs. cloud training scenario
│   ├── universal_archetypes_grid.yaml  # 5 device archetypes running on 1 base image
│   ├── purdue_segmented_grid.yaml      # Multi-zone DMZ / SCADA / Fieldbus mesh
│   └── water_blackout_defense/         # Turnkey composite scenario bundle
│
├── tools/                              # Automation & orchestrator toolchains
│   ├── scenario_engine.py              # Standalone sovereign scenario compiler
│   ├── download_real_pcaps.py          # Secure PCAP vault downloader
│   └── generate_real_pcaps.py          # Offline synthetic PCAP generator
│
└── shared/                             # Zero-copy shared host mount volumes
    ├── bin/                            # Pre-compiled binaries (sentinel, nexus, mock_plc)
    ├── lib/                            # Host dynamic dependencies (matrix-deps)
    ├── models/                         # Active ONNX models (the 5 sensor weights)
    ├── datasets/                       # SLAB binary datasets & curated telemetry
    └── logs/                           # Persistent multi-tier execution logs
```

---

## 12. Scientific Citation & Licensing

Sentinel-Matrix is released under the **Apache License 2.0**.

If you utilize Sentinel-Matrix in your research, academic publications, or cyber-range evaluations, please cite the permanent Zenodo research preprint:

### BibTeX:
```bibtex
@article{saberifard2026sentinelbench,
  title={{Sentinel-Bench: A 14-Dimensional Unified Benchmark Standard for Hardware-Aware, Closed-Loop CPS Active Defense}},
  author={Saberifard, Kamran},
  journal={CERN / Zenodo Digital Repository},
  year={2026},
  doi={10.5281/zenodo.23598779},
  url={https://doi.org/10.5281/zenodo.23598779}
}
```

### IEEE Citation:
> K. Saberifard, "Sentinel-Bench: A 14-Dimensional Unified Benchmark Standard for Hardware-Aware, Closed-Loop CPS Active Defense," *CERN / Zenodo Digital Repository*, doi: 10.5281/zenodo.23598779, Oct. 2026.

---

**Developed & Maintained by:**  
**Aryorithm Technologies B.V.**  
*Autonomous Sub-Microsecond Edge Defense for Critical Cyber-Physical Infrastructure*  
Amsterdam, The Netherlands \quad\textbar\quad Website: [https://aryorithm.com](https://aryorithm.com) \quad\textbar\quad Direct Inquiries: `kamran@aryorithm.com`
