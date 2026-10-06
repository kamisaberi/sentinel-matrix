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

