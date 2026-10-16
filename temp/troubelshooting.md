# Sentinel-Matrix: Master Architecture, Operations & Field Troubleshooting Manual

---

## 1. System Topology & IP Allocations

`sentinel-matrix` deploys an encapsulated, multi-tier digital twin cyber-range operating on an isolated, collision-free virtual subnet: **`10.240.0.0/24`** (Gateway: `10.240.0.1`).

```text
========================================================================================================================
                                     SENTINEL-MATRIX 8-NODE NETWORK TOPOLOGY
========================================================================================================================
 IP ADDRESS      CONTAINER NAME              SERVICE ROLE              INTERNAL ENGINE & TECH STACK
------------------------------------------------------------------------------------------------------------------------
 10.240.0.10     matrix-nexus                Master Command Plane C2   sentinel-nexus (gRPC 50051, Web 9443, SSE 9444)
 10.240.0.20     matrix-forge                Continual Active Learning xinfer-forge (Autoencoder Retraining Daemon)
 10.240.0.50     matrix-traffic-gen          Wire Replay Generator     pcap_streamer.py (Real Malware Injection Engine)
 10.240.0.60     matrix-monitor              Observability Engine      live_dashboard.py (Terminal Split-Panel TUI)
 10.240.0.99     matrix-adversary            Live Red-Team Attacker    Adversary Suite (nmap, mbpoll, curl floods)
 10.240.0.101    matrix-edge-substation-01   Substation Alpha          blackbox-sentinel (OpenVINO NPU, Modbus/IEC-104)
 10.240.0.102    matrix-edge-hospital-02     Hospital Radiology PACS   blackbox-sentinel (TensorRT GPU, DICOM/HL7)
 10.240.0.103    matrix-edge-refinery-03     Coastal Refinery SIS      blackbox-sentinel (Rockchip RKNN, S7Comm/Triton)
========================================================================================================================
```

---

## 2. Clean Installation & Cold-Start Runbook

Follow these steps from a clean terminal to ensure all dependencies, volume mounts, and binaries are synchronized before starting.

### Step 1: Pre-Flight System Configuration (Host)

```bash
# 1. Ensure user is in the docker group to avoid socket permission issues
sudo usermod -aG docker $USER
newgrp docker

# 2. Stop host systemd daemons that might hold ports 9443 or 50051
sudo systemctl stop sentinel-nexus.service 2>/dev/null || true
sudo systemctl stop blackbox-sentinel.service 2>/dev/null || true

# 3. Ensure ports 9443 and 50051 are free
sudo ss -tulpn | grep -E "9443|50051" || echo "[+] Ports are clear!"
```

### Step 2: Environment Initialization & Artifact Harvesting

`make init` collects the compiled host binaries (`sentinel`, `sentinel-nexus`, `nexus-ctl`), harvests host-compiled dynamic shared libraries (`libabsl`, `libgrpc++`, `libprotobuf`, `libre2`), and synchronizes the web assets.

```bash
cd /home/kami/sentinel-matrix

# 1. Harvest binaries, libraries, and web assets
make init

# 2. Sync certified malware PCAPs from the cache into configs/pcaps/
make sync-hub-pcaps
```

### Step 3: Launching the Simulation Grid

```bash
cd /home/kami/sentinel-matrix

# Launch all 8 containers in the background with host-volume mounts
sudo make up

# Verify all 8 containers are healthy and running
docker compose ps
```

### Step 4: Provision Mock Industrial Listeners on Edge Nodes

Because `sentinel` operates at the kernel level (eBPF/XDP) and does not bind user-space TCP sockets, deploy the zero-dependency `mock_plc` listener into the edge nodes so live scans and attacks (`mbpoll`, `nmap`) receive valid responses:

```bash
# 1. Compile the native mock PLC listener on the host
gcc -O2 -o /tmp/mock_plc -x c - << 'EOF'
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <unistd.h>
#include <poll.h>
#include <arpa/inet.h>
#include <sys/socket.h>

static int make_l(uint16_t p) {
    int fd = socket(AF_INET, SOCK_STREAM, 0);
    int opt = 1;
    setsockopt(fd, SOL_SOCKET, SO_REUSEADDR, &opt, sizeof(opt));
    struct sockaddr_in a = {.sin_family = AF_INET, .sin_port = htons(p), .sin_addr.s_addr = 0};
    bind(fd, (struct sockaddr*)&a, sizeof(a));
    listen(fd, 32);
    return fd;
}
int main() {
    int p502 = make_l(502), p102 = make_l(102), p2404 = make_l(2404);
    struct pollfd fds[3] = {{p502, POLLIN, 0}, {p102, POLLIN, 0}, {p2404, POLLIN, 0}};
    while(1) {
        if (poll(fds, 3, -1) <= 0) continue;
        for (int i = 0; i < 3; i++) {
            if (fds[i].revents & POLLIN) {
                int c = accept(fds[i].fd, NULL, NULL);
                if (c >= 0) {
                    char b[1024]; ssize_t n = recv(c, b, sizeof(b), 0);
                    if (n > 0) {
                        if (i == 0 && n >= 8) send(c, b, n, 0); // Modbus Echo
                        else if (i == 1 && n >= 4) send(c, b, n, 0); // S7 Echo
                        else if (i == 2) { uint8_t con[] = {0x68, 0x04, 0x0B, 0x00, 0x00, 0x00}; send(c, con, 6, 0); }
                    }
                    close(c);
                }
            }
        }
    }
    return 0;
}
EOF

# 2. Inject and execute in background across edge containers
sudo docker cp /tmp/mock_plc matrix-edge-substation-01:/usr/local/bin/mock_plc
sudo docker exec -d matrix-edge-substation-01 /usr/local/bin/mock_plc

sudo docker cp /tmp/mock_plc matrix-edge-hospital-02:/usr/local/bin/mock_plc
sudo docker exec -d matrix-edge-hospital-02 /usr/local/bin/mock_plc

sudo docker cp /tmp/mock_plc matrix-edge-refinery-03:/usr/local/bin/mock_plc
sudo docker exec -d matrix-edge-refinery-03 /usr/local/bin/mock_plc
```

---

## 3. Operational Verification & Testing

### 1. View the Web Command Center
Open in any browser:
```text
http://localhost:9443
```
* **Fleet Topology Tab:** Displays the central **NEXUS-C2 Hub (`10.240.0.10`)** with live radar sweep and orbiting edge nodes.
* **Extensions & .spkg Tab:** Displays real-time latency meters ($88\,\text{ns}$ Native, $350\,\text{ns}$ Lua, $1,240\,\text{ns}$ Wasm) and the drag-and-drop `.spkg` deployer.
* **Pipeline DAG Tab:** Displays the active 4-stage sensor-to-model routing pipeline.

### 2. Live Terminal TUI (Side-by-Side Console)
```bash
cd /home/kami/sentinel-matrix
make tui
```

### 3. Firing Live Wire Attacks & Replays

```bash
cd /home/kami/sentinel-matrix

# 1. Live Modbus FC05 Coil Override via mbpoll (MITRE T0855)
sudo make live-scada

# 2. Live Port Discovery Sweep via nmap (MITRE T1046)
sudo make live-nmap

# 3. Replay Industroyer2 IEC-104 High-Voltage Breaker Trip (MITRE T0855)
sudo make attack-hub-industroyer2

# 4. Replay TRITON / Trisis SIS Safety Shutdown Override (MITRE T0843)
sudo make attack-hub-triton

# 5. Inject SLA Latency Violation (> 1000 µs) to verify RollbackGuard auto-rollback
sudo make chaos-latency

# 6. Sever Edge Node 01 to verify instant 0 ms graceful disconnect
sudo make chaos-sever
```

### 4. Clean Shutdown
```bash
cd /home/kami/sentinel-matrix
sudo make down
```

---

## 4. Master Field Troubleshooting Guide

Every operational error encountered during integration is detailed below, including root causes and verified resolutions.

---

### Failure 1: `failed to bind host port 0.0.0.0:9443/tcp: address already in use`

* **Symptom:** `sudo make up` fails during the `matrix-nexus` startup with port collision.
* **Root Cause:** When `sentinel-stack/install.sh` was executed, Phase 4 installed and enabled **`sentinel-nexus.service` on the host operating system**. The host systemd daemon is listening on port `9443` and `50051`, preventing Docker from binding the ports.
* **Resolution:**
  ```bash
  # 1. Stop host systemd services
  sudo systemctl stop sentinel-nexus.service
  sudo systemctl stop blackbox-sentinel.service 2>/dev/null || true

  # 2. Verify ports are released
  sudo ss -tulpn | grep -E "9443|50051" || echo "[+] Ports released"

  # 3. Bring up the matrix container
  sudo make up
  ```

---

### Failure 2: Docker AppArmor Permission Denied on `down` or `restart`

* **Symptom:**
  ```text
  Error response from daemon: Cannot restart container ...: permission denied
  ```
* **Root Cause:** On Ubuntu, AppArmor profiles lock `containerd-shim` PID namespaces when containers are restarted in-place, blocking `runc` from sending termination signals.
* **Resolution:**
  ```bash
  # 1. Unload orphaned AppArmor profiles
  sudo aa-remove-unknown

  # 2. Kill hung containerd shims
  sudo pkill -9 -f containerd-shim || true

  # 3. Restart Docker and containerd engines
  sudo systemctl daemon-reload
  sudo systemctl restart containerd
  sudo systemctl restart docker

  # 4. Dismantle cleanly
  cd /home/kami/sentinel-matrix
  sudo docker compose down --remove-orphans
  sudo make up
  ```

---

### Failure 3: `curl -s http://localhost:9443/api/v1/fleet/nodes` Returns `[]`

* **Symptom:** The web dashboard topology map is empty; no edge nodes appear.
* **Root Cause 1:** The `sentinel` binary inside `matrix-edge-substation-01` had hardcoded `n_cfg.host = "127.0.0.1"`. In Docker, `127.0.0.1` points to the container itself instead of Nexus C2 (`10.240.0.10:50051`).
* **Root Cause 2:** The container was using a stale binary baked into the Docker image because `./shared/bin/sentinel` was not mounted.
* **Resolution:**
  1. In `blackbox-sentinel/src/main.cpp`, ensure `NexusConfig` reads environment variables:
     ```cpp
     const char* env_host = std::getenv("NEXUS_HOST");
     std::string nexus_host = env_host ? env_host : "127.0.0.1";
     const char* env_node_id = std::getenv("NODE_IDENTIFIER");
     std::string node_id = env_node_id ? env_node_id : "Edge-Substation-01";
     ```
  2. In `sentinel-matrix/docker-compose.yml`, mount the live binary under `volumes:` for all edge nodes:
     ```yaml
     - ./shared/bin/sentinel:/usr/local/bin/sentinel:ro
     ```
  3. Recompile and update the binary:
     ```bash
     cd /home/kami/blackbox-sentinel/build && make -j$(nproc) sentinel
     cp sentinel /home/kami/sentinel-matrix/shared/bin/sentinel
     cd /home/kami/sentinel-matrix && docker compose up -d --force-recreate
     ```

---

### Failure 4: `[-] PCAP file not found: /configs/pcaps/industroyer2_substation.pcap`

* **Symptom:** `make attack-hub-industroyer2` or `make attack-hub-triton` fails to locate the capture.
* **Root Cause:** The `traffic-gen` container mounts `./configs` as `/configs`. It does not mount `/shared`. When PCAPs were copied only to `shared/datasets/`, the container could not see them.
* **Resolution:** Ensure `make sync-hub-pcaps` copies the PCAPs into both `configs/pcaps/` and `shared/datasets/`:
  ```bash
  cd /home/kami/sentinel-matrix
  make sync-hub-pcaps
  ```
  *(Verify the files exist on the host at `configs/pcaps/industroyer2_substation.pcap` and `configs/pcaps/triton_trisis_sis.pcap`).*

---

### Failure 5: `mbpoll: Connection failed: Connection refused` / Closed Ports in Nmap

* **Symptom:** `make live-scada` or `make live-nmap` fails because ports 502, 102, and 2404 report as closed.
* **Root Cause:** `blackbox-sentinel` is an in-kernel mitigation engine (Layer 2/XDP). It does not bind user-space TCP listening sockets (`bind()` / `listen()`). When adversary packets arrived, the kernel TCP stack sent `TCP RST` because no process was listening on port 502.
* **Resolution:** Deploy the native `mock_plc` daemon into the container:
  ```bash
  sudo docker cp /tmp/mock_plc matrix-edge-substation-01:/usr/local/bin/mock_plc
  sudo docker exec -d matrix-edge-substation-01 /usr/local/bin/mock_plc
  ```

---

### Failure 6: `exec: "nc"` or `exec: "python3": executable file not found in $PATH`

* **Symptom:** Running `docker compose exec ... python3` or `nc` fails inside the edge container.
* **Root Cause:** The `matrix-edge-substation-01` container image is a stripped, hardened minimal distribution designed solely to run compiled C++ binaries. It intentionally does not contain Python or Netcat.
* **Resolution:** Do not attempt to run Python or Netcat inside the container. Use the compiled native C binary (`mock_plc`) described in Failure 5, which runs with zero dependencies.

---

### Failure 7: Docker Container Build `apt-get update` Failed with `exit code: 100`

* **Symptom:** `docker compose build` fails inside VMware during `apt-get update`.
* **Root Cause:** In VMware, the host uses `systemd-resolved` with loopback DNS (`127.0.0.53`). Containers cannot reach `127.0.0.53` during image build stages, causing DNS lookups to fail (`Temporary failure resolving archive.ubuntu.com`).
* **Resolution:** Add public DNS to `/etc/docker/daemon.json`:
  ```bash
  sudo mkdir -p /etc/docker
  sudo tee /etc/docker/daemon.json << 'EOF'
  {
    "dns": ["8.8.8.8", "1.1.1.1"]
  }
  EOF
  sudo systemctl restart docker
  ```

---

### Failure 8: Web Command Center Layout Distorted or Stretched on Ultrawide

* **Symptom:** UI cards, tables, and canvas elements stretch across the monitor, making telemetry unreadable.
* **Root Cause:** The dashboard was using a fluid full-width layout (`width: 100%`).
* **Resolution:** The layout was refactored into a **1440px fixed-width boxed container (`.boxed-frame`)** with deep void black framing (`#06090E`), centered via `margin: 0 auto;`, preserving optimal viewing geometry across all resolutions.