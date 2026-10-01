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

