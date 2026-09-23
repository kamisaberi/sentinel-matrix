Here is the complete, self-contained Markdown runbook. You can save this directly as **`INSTALL_AND_RUN.md`** inside your `sentinel-matrix` repository.

***

# Sentinel Matrix: Autonomous Cyber-Range & Simulation Mesh
## Complete Installation, Build & Operations Runbook (VMware Environment)

This document provides step-by-step instructions to compile, containerize, and run the entire **Blackbox Sentinel** ecosystem (`sentinel-nexus`, `blackbox-sentinel`, `xinfer-forge`) in an encapsulated, infinite simulation mesh inside a VMware Linux environment.

---

## 1. System Requirements & Host Prerequisites

### Hardware Requirements
* **Hypervisor:** VMware Workstation Pro / ESXi / Fusion
* **Guest OS:** Ubuntu 24.04 LTS (x86_64)
* **vCPU Allocation:** Minimum 4 vCPUs (8 recommended)
* **RAM Allocation:** Minimum 8 GB (16 GB recommended)
* **Virtualization Feature:** *"Virtualize Intel VT-x/EPT or AMD-V/RVI"* enabled in VMware VM Processor Settings.

### Host Dependencies
Install the required compilers, build systems, Linux kernel headers, Docker, and gRPC/Protobuf packages on the host machine:

```bash
sudo apt-get update && sudo apt-get install -y \
    build-essential \
    cmake \
    clang \
    llvm \
    libelf-dev \
    libssl-dev \
    libprotobuf-dev \
    protobuf-compiler \
    libgrpc++-dev \
    protobuf-compiler-grpc \
    iproute2 \
    iptables \
    net-tools \
    curl \
    python3-pip \
    docker.io \
    docker-compose-v2

# Add current user to Docker group (log out and back in if running non-root)
sudo usermod -aG docker $USER
```

---

## 2. Compile Core Ecosystem Binaries

Before launching the simulation mesh, verify that the native C++20 daemons (`sentinel-nexus` and `blackbox-sentinel`) compile on the host.

### A. Build `sentinel-nexus` (Command Plane)
```bash
cd /home/kami/sentinel-nexus
mkdir -p build && cd build
cmake ..
make -j$(nproc)

# Verify binaries exist:
ls -la sentinel-nexus nexus-ctl
```

### B. Build `blackbox-sentinel` (Edge Appliance)
```bash
cd /home/kami/blackbox-sentinel
mkdir -p build && cd build
cmake ..
make -j$(nproc)

# Verify edge binary exists:
ls -la sentinel
```

---

## 3. Initialize `sentinel-matrix` Mesh

Initialize the simulation workspace, generate mTLS certificates, synchronize binaries, and bundle host dynamic libraries (`absl`, `grpc`, `protobuf`, `re2`):

```bash
cd /home/kami/sentinel-matrix

# 1. Initialize folders, environment, and synchronize binaries/libraries
make init

# 2. Verify dynamic libraries were collected into shared/lib/
ls -lh shared/lib/
# (Ensure libabsl_synchronization, libre2, libgrpc++, and libprotobuf are listed)

# 3. Generate internal mTLS certificates
./shared/certs/gen_matrix_certs.sh
```

---

## 4. Build Container Images

Build the 5 custom simulation images (`nexus`, `sentinel`, `forge`, `traffic`, `monitor`):

```bash
cd /home/kami/sentinel-matrix
sudo make build
```

---

## 5. Launch the Autonomous Simulation Mesh

Start the entire 8-component container grid in background mode:

```bash
cd /home/kami/sentinel-matrix
sudo make up
```

### Check Container Status
Verify that all services are online and `matrix-nexus` has passed its healthcheck:

```bash
sudo docker compose ps
```

You should see:
* `matrix-nexus` — **Up (healthy)** on ports `50051`, `9443`, `9444`
* `matrix-forge` — **Up** (Continuous Retraining Daemon)
* `matrix-traffic-gen` — **Up** (Autonomous Traffic & Attack Generator)
* `matrix-monitor` — **Up** (Terminal Observability TUI)
* `matrix-edge-substation-01` — **Up** (Industrial OpenVINO Appliance)
* `matrix-edge-hospital-02` — **Up** (Healthcare TensorRT Appliance)
* `matrix-edge-refinery-03` — **Up** (Refinery RKNN Appliance)

---

## 6. Access Observability Interfaces

### A. Air-Gapped Web Command Center
Open any web browser on your host machine (or guest):
```text
http://localhost:9443
```
* **Fleet Grid:** View all 3 edge appliances reporting live telemetry.
* **Radial Topology Canvas:** Interactive visual map of appliances connected to Nexus.
* **Aggregated MITRE ATT&CK Matrix:** Dynamic tiles showing detected adversary tactics.
* **Canary Staging:** Real-time visibility into continuous learning model progression.

### B. Live Terminal Dashboard (TUI)
To view the terminal dashboard inside the mesh:
```bash
cd /home/kami/sentinel-matrix
make tui
```
*(Press `Ctrl+C` to exit the dashboard view without stopping the simulation).*

---

## 7. Operational Testing & Attack Scenarios

The simulation mesh runs continuous benign traffic in the background. You can inject targeted cyber-physical attacks and chaos conditions on demand:

### A. Inject SCADA Modbus PLC Override (T0855)
Simulates an unauthorized Modbus coil manipulation against `Edge-Substation-01`:
```bash
make attack-modbus
```
* **Expected Result:** Edge Node 01 executes an in-kernel eBPF drop ($< 1\,\mu\text{s}$) and emits a `ThreatIndicator`. Nexus receives it and fans out an eBPF drop rule to Nodes 02 and 03 in $< 50\,\text{ms}$.

### B. Inject C2 Beacon Exfiltration Wave (T1071)
Simulates encrypted high-entropy egress beacons from `Edge-Hospital-PACS-02`:
```bash
make attack-c2
```
* **Expected Result:** MITRE tile `T1071` increments on the Web UI, and the attacker's IP is added to the active drop table.

### C. Test SLA Latency Breach & Automated Rollback
Simulates a candidate model causing inference degradation ($> 1{,}000\,\mu\text{s}$):
```bash
make chaos-latency
```
* **Expected Result:** Nexus's `RollbackGuard` detects the SLA breach, logs an alert, and automatically rolls back the candidate weights to stable.

### D. Test Instant 0 ms Graceful Disconnect
Simulates an edge node cleanly shutting down:
```bash
make chaos-sever
```
* **Expected Result:** Node 01 terminates and transmits a graceful disconnect frame. On the Web UI, its badge immediately turns **`OFFLINE` (Red)** with 0 ms delay.

To bring Node 01 back online:
```bash
sudo docker compose start sentinel-edge-01
```

---

## 8. Continuous Retraining (Closing the Loop)

1. Let the simulation run for ~1–2 minutes so ambient traffic streams candidate vectors into `/var/lib/sentinel-nexus/forge_datasets/`.
2. Inspect the Forge container logs to watch the active learning loop in real time:
   ```bash
   sudo docker compose logs -f forge
   ```
3. **What happens automatically:**
   * Forge detects a new curated batch (`forge_dataset_*.csv`).
   * It trains the self-supervised Masked Autoencoder (MAE).
   * It validates against `golden_attacks.yaml`.
   * It compiles `network_threat_v2.onnx` and stages it to Nexus in `SHADOW_MODE`.
   * Nexus promotes it to `FLEET_WIDE`.
   * All edge nodes pull the weights and execute live zero-downtime hot-reloads.

---

## 9. Teardown & Maintenance

### Stop the Mesh
```bash
cd /home/kami/sentinel-matrix
sudo make down
```

### Restart Fresh
```bash
sudo make restart
```

### Purge All Caches, Models & Datasets
```bash
sudo make clean
```

---

## 10. VMware Troubleshooting Reference

| Symptom | Cause | Solution |
| :--- | :--- | :--- |
| `Pool overlaps with other one on this address space` | Docker / VMware assigned conflicting IP block | Ensure `docker-compose.yml` uses `10.240.0.0/24`, then run `sudo docker network prune -f`. |
| `error while loading shared libraries: ...` | Binary requires dynamic libs not present in stock container | Run `make init` to auto-bundle host `.so` files into `shared/lib/`, then run `sudo make build`. |
| `Container matrix-nexus is unhealthy` | Port `50051` or `9443` is already held by a host process | Run `sudo pkill -f sentinel-nexus` on the host, then run `sudo make restart`. |
| `Permission denied` on BPF maps | Non-privileged container access | Ensure `privileged: true` and `cap_add: [NET_ADMIN, SYS_ADMIN, BPF]` are present in `docker-compose.yml`. |