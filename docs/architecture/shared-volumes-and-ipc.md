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

