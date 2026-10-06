# Collision-Free Subnet Architecture: The `10.240.0.0/24` Design

When running containerized network meshes inside virtualized Linux guests (such as VMware Workstation, Fusion, or ESXi), standard Docker network setups often conflict with host hypervisor routing tables.

`sentinel-matrix` deploys its simulation grid over a private, non-overlapping **`10.240.0.0/24`** subnet.

---

## 1. The VMware Route Collision Problem

By default, Docker assigns virtual bridge subnets within the `172.17.0.0/16` through `172.28.0.0/16` range. Concurrently, VMware Workstation uses `172.16.x.x` and `192.168.x.x` for its virtual host-only (`VMnet1`) and NAT (`VMnet8`) adapters:

```text
 ┌─────────────────────────────────────────────────────────────┐
 │ ROUTING COLLISION SCENARIO:                                 │
 │ VMware NAT Adapter (VMnet8)        : 172.28.0.1/16          │
 │ Default Docker Compose Bridge      : 172.28.0.0/16 (OVERLAP)│
 │                                                             │
 │ RESULT: Network routing loops, dropped gRPC packets, and     │
 │         "Pool overlaps with one of the existing subnets"     │
 └─────────────────────────────────────────────────────────────┘
```

---

## 2. The `10.240.0.0/24` Solution

`sentinel-matrix` specifies an isolated Class C subnet block in `docker-compose.yml`:

```yaml
networks:
  matrix_net:
    name: matrix_net
    driver: bridge
    ipam:
      driver: default
      config:
        - subnet: 10.240.0.0/24
          gateway: 10.240.0.1
```

### Static IP Allocation Map

```text
 Subnet: 10.240.0.0/24
 ├── 10.240.0.1   ──► Linux Host Virtual Bridge Gateway (matrix_net)
 ├── 10.240.0.10  ──► sentinel-nexus (Fleet Command Plane)
 ├── 10.240.0.20  ──► sentinel-forge (Continual Active Learning)
 ├── 10.240.0.50  ──► sentinel-traffic (OmniFlow Streamer & Malware Replay)
 ├── 10.240.0.60  ──► sentinel-monitor (Terminal TUI Collector)
 ├── 10.240.0.99  ──► sentinel-adversary (Live Wire Attacker)
 ├── 10.240.0.101 ──► sentinel-node-01 (Substation Alpha)
 ├── 10.240.0.102 ──► sentinel-node-02 (Hospital Enclave)
 └── 10.240.0.103 ──► sentinel-node-03 (Chemical Refinery)
```

---

## 3. Verifying Route Isolation

Verify that the subnet does not conflict with host routes using `ip route`:

```bash
ip route show | grep 10.240.0
# Expected Output: 10.240.0.0/24 dev br-matrix_net proto kernel scope link src 10.240.0.1
```

