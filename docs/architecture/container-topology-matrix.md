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

