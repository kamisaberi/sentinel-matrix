---

### File: `sentinel-matrix/docs/architecture/container-topology-matrix.md`

```markdown
# Container Topology Matrix & Resource Allocations

Every service in the `sentinel-matrix` digital twin grid is statically mapped to avoid resource starvation, port collisions, or IP address drift.

---

## 1. Master Service Allocation Table

| Service Name | Docker Container | Static IP | CPU Limit | RAM Limit | Exposed Ports | Linux Capabilities |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **Nexus Hub** | `sentinel-nexus` | `10.240.0.10` | 4.0 Cores | 8.0 GB | `50051`, `9443`, `9444` | Standard |
| **Forge AI** | `sentinel-forge` | `10.240.0.20` | 4.0 Cores | 8.0 GB | Internal Only | `SYS_NICE` |
| **Traffic Engine** | `sentinel-traffic` | `10.240.0.50` | 2.0 Cores | 4.0 GB | Internal Only | `NET_RAW`, `NET_ADMIN` |
| **Monitor / TUI** | `sentinel-monitor` | `10.240.0.60` | 1.0 Core | 2.0 GB | Internal Only | Standard |
| **Red Adversary** | `sentinel-adversary`| `10.240.0.99` | 2.0 Cores | 2.0 GB | Internal Only | `NET_RAW`, `NET_ADMIN` |
| **Node 01 (Substation)**| `sentinel-node-01` | `10.240.0.101`| 2.0 Cores | 4.0 GB | Internal Only | `NET_ADMIN`, `BPF`, `SYS_RESOURCE` |
| **Node 02 (Medical)** | `sentinel-node-02` | `10.240.0.102`| 2.0 Cores | 4.0 GB | Internal Only | `NET_ADMIN`, `BPF`, `SYS_RESOURCE` |
| **Node 03 (Refinery)** | `sentinel-node-03` | `10.240.0.103`| 2.0 Cores | 4.0 GB | Internal Only | `NET_ADMIN`, `BPF`, `SYS_RESOURCE` |

$$\text{Total Host Allocation Budget} = 19.0\text{ vCPUs} \quad \mid \quad 36.0\text{ GB RAM}$$

*(Note: On systems with 16GB RAM, Docker dynamic memory limits throttle smoothly without thrashing).*
```

---

### File: `sentinel-matrix/docs/architecture/shared-volumes-and-ipc.md`

```markdown
# Shared Storage Architecture & Inter-Process File Exchange

`sentinel-matrix` uses high-speed host NVMe volume mounts (`/opt/sentinel-matrix/shared/`) to exchange large model weights, training datasets, and harvested shared libraries without network serialization overhead.

---

## 1. Shared Volume Directory Layout

```text
/opt/sentinel-matrix/shared/
├── models/                  # Shared Neural Model Storage
│   ├── network_threat_v1.onnx
│   ├── network_threat_v1.manifest.json
│   └── network_threat_v2_canary.onnx
├── datasets/                # Active Learning Curated Batches
│   ├── forge_dataset_8f1c2a04.csv
│   ├── forge_dataset_8f1c2a04.manifest.json
│   └── processed/
├── lib/                     # Harvested Host Shared Libraries (GLIBC 2.43)
│   ├── libabsl_synchronization.so.20260107
│   ├── libre2.so.11
│   ├── libgrpc++.so.1.62
│   └── libprotobuf.so.32
├── certs/                   # Internal mTLS PKI Certificates
│   ├── ca.crt / ca.key
│   ├── server.crt / server.key
│   └── node.crt / node.key
└── logs/                    # Centralized Diagnostic Logs
    ├── nexus.log
    ├── forge.log
    └── node-01.log
```

---

## 2. Docker Compose Volume Mount Bindings

```yaml
volumes:
  # Model sharing between Nexus Stager, Forge Compiler, and Edge Nodes
  - ./shared/models:/var/lib/sentinel-nexus/models:rw
  # Dataset exchange between Nexus Curator and Forge Inotify Watcher
  - ./shared/datasets:/var/lib/sentinel-nexus/forge_datasets:rw
  # Shared dynamic library dependencies mounted to container search paths
  - ./shared/lib:/usr/local/lib/matrix-deps:ro
  # Mutual TLS certificates mounted read-only to all containers
  - ./shared/certs:/etc/sentinel/certs:ro
```
```

---

### File: `sentinel-matrix/docs/architecture/vmware-hypervisor-optimization.md`

```markdown
# VMware Hypervisor Optimization & Nested Virtualization

Running containerized eBPF filters, raw packet injection, and neural network compilation inside a Linux virtual machine hosted on VMware Workstation Pro or ESXi requires specific hypervisor configuration to avoid nested virtualization bottlenecks.

---

## 1. VMware Virtual Machine Settings (`.vmx`)

Ensure the following configuration flags are set in your VMware guest configuration:

```ini
# Enable hardware virtualization extensions (VT-x / AMD-V)
vhv.enable = "TRUE"
vpmc.enable = "TRUE"

# Enforce 100% memory reservation (Eliminates ESXi memory ballooning)
sched.mem.min = "16384"
sched.mem.pin = "TRUE"

# Disable memory trimming and background page sharing
MemTrimRate = "0"
sched.mem.pshare.enable = "FALSE"

# Assign high-performance vNIC adapter
ethernet0.virtualDev = "vmxnet3"
```

---

## 2. Virtual Switch Security Policies

If testing multi-NIC bridging or Promiscuous taps:
1. In VMware ESXi or Workstation Virtual Network Editor, locate the active virtual network bridge (`VMnet0` or Port Group).
2. Set **Promiscuous Mode**, **MAC Address Changes**, and **Forged Transmits** to **`Accept`**.
3. This allows `sentinel-adversary` and `sentinel-traffic` to inject synthetic packets with diverse source IP and MAC addresses without hypervisor dropping.
```

