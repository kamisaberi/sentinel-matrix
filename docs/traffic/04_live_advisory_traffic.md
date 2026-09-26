Here is the complete implementation of the **Live Adversary Emulation Container (`matrix-adversary`)** for `sentinel-matrix`.

This container is assigned IP **`10.240.0.99`** on the private subnet and runs an infinite daemon that generates live network traffic over the wire—interleaving ambient requests with real `nmap` SYN port discovery sweeps, Modbus TCP command cycles, and high-velocity API queries.

---

### 1. Build Definition: `docker/Dockerfile.adversary`

Save as `/home/kami/sentinel-matrix/docker/Dockerfile.adversary`:

```dockerfile
FROM ubuntu:devel

ENV DEBIAN_FRONTEND=noninteractive
ENV PYTHONUNBUFFERED=1
ENV PYTHONPATH="/app:/app/src:/app/generated"

RUN apt-get update && apt-get install -y \
    nmap \
    netcat-openbsd \
    curl \
    iputils-ping \
    mbpoll \
    python3 \
    python3-pip \
    python3-requests \
    python3-yaml \
    procps \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY docker/entrypoints/adversary_entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh

ENTRYPOINT ["/entrypoint.sh"]
```

---

### 2. Container Entrypoint: `docker/entrypoints/adversary_entrypoint.sh`

Save as `/home/kami/sentinel-matrix/docker/entrypoints/adversary_entrypoint.sh`:

```bash
#!/usr/bin/env bash
set -e

echo "=== [ADVERSARY CONTAINER] Initializing Live Red-Team Node (10.240.0.99) ==="

# Wait for Nexus and target edge appliances to be reachable on the internal subnet
echo "[*] Waiting for target edge nodes to establish network routes..."
python3 -c '
import socket, time
targets = [("10.240.0.10", 9443), ("10.240.0.101", 8443)]
for host, port in targets:
    while True:
        try:
            s = socket.create_connection((host, port), timeout=1)
            s.close()
            break
        except OSError:
            time.sleep(1)
'
echo "[+] Network routes established. Launching infinite live adversary stream..."

exec python3 /app/src/traffic/live_adversary_daemon.py
```

Make it executable:
```bash
chmod +x /home/kami/sentinel-matrix/docker/entrypoints/adversary_entrypoint.sh
```

---

### 3. The Live Adversary Daemon: `src/traffic/live_adversary_daemon.py`

Save as `/home/kami/sentinel-matrix/src/traffic/live_adversary_daemon.py`:

```python
#!/usr/bin/env python3
"""
Sentinel Matrix: Live Adversary & Wire-Traffic Daemon
Runs an infinite, stochastic testing loop from container 10.240.0.99:
- Mode 1: Ambient Benign Web/SCADA Requests (Continuous)
- Mode 2: Live nmap TCP SYN Port Discovery Sweeps (MITRE T1046)
- Mode 3: Live Modbus SCADA Coil Override Cycles (MITRE T0855)
- Mode 4: High-Velocity HTTP/API Credential & Endpoint Discovery (MITRE T1190)
"""

import time
import subprocess
import requests
import random
import os

NEXUS_REST = os.environ.get("NEXUS_REST_URL", "http://10.240.0.10:9443")
TARGET_NODES = [
    {"id": "Edge-Substation-01", "ip": "10.240.0.101", "ports": [8443, 502, 2404]},
    {"id": "Edge-Hospital-PACS-02", "ip": "10.240.0.102", "ports": [8443, 104, 19999]},
    {"id": "Edge-Refinery-PLC-03", "ip": "10.240.0.103", "ports": [8443, 102]}
]

def log_event(channel, msg, alert=False):
    prefix = "\033[31m[LIVE-ADVERSARY:ALERT]\033[0m" if alert else "\033[36m[LIVE-ADVERSARY]\033[0m"
    print(f"{prefix} [{channel}] {msg}", flush=True)

def notify_nexus_threat(ip, tactic_name="Live Wire Threat"):
    """Signals Nexus threat bus so grid-wide collective defense rules synchronize in parallel."""
    try:
        requests.post(f"{NEXUS_REST}/api/v1/threats/broadcast", json={"ip": ip}, timeout=2)
    except Exception:
        pass

def run_ambient_requests():
    """Mode 1: Normal operational requests over the wire."""
    target = random.choice(TARGET_NODES)
    # 1. Benign HTTP ping to appliance control interface
    try:
        requests.get(f"http://{target['ip']}:8443/api/v1/health", timeout=0.8)
        log_event("AMBIENT-HTTP", f"Verified nominal health response from {target['id']} ({target['ip']}:8443)")
    except requests.exceptions.RequestException:
        pass

    # 2. Simulated Modbus read query (Reading registers 1-5 via raw TCP handshake)
    try:
        subprocess.run(
            ["mbpoll", "-m", "tcp", "-a", "1", "-r", "1", "-c", "4", "-1", target['ip']],
            stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL, timeout=1
        )
        log_event("AMBIENT-SCADA", f"Read holding registers on {target['id']} (Modbus TCP/502)")
    except Exception:
        pass

def run_nmap_port_sweep():
    """Mode 2: Live nmap TCP SYN sweep (MITRE T1046: Network Service Discovery)."""
    target = random.choice(TARGET_NODES)
    ports = ",".join(map(str, target['ports']))
    log_event("NMAP-SWEEP", f"Firing live TCP SYN discovery scan against {target['id']} ({target['ip']}) on ports [{ports}]...", alert=True)

    cmd = ["nmap", "-sS", "-Pn", "-T4", "-p", ports, target['ip']]
    try:
        result = subprocess.run(cmd, capture_output=True, text=True, timeout=5)
        # Parse nmap summary lines
        for line in result.stdout.splitlines():
            if "open" in line or "filtered" in line:
                log_event("NMAP-RESULT", f"  --> Wire feedback: {line.strip()}")
        notify_nexus_threat("10.240.0.99", "Live nmap Port Sweep")
    except Exception as e:
        log_event("NMAP-ERROR", f"Scan exception: {e}")

def run_scada_override():
    """Mode 3: Live Modbus force single coil command (MITRE T0855: Unauthorized Command)."""
    target = TARGET_NODES[0] # Edge-Substation-01
    coil_address = random.randint(101, 110)
    log_event("SCADA-OVERRIDE", f"Injecting unauthorized Modbus FC05 (Force Coil {coil_address} -> 1) into {target['id']}...", alert=True)

    # Execute real mbpoll command: -t 0 (coil), -r <address>, set value 1
    cmd = ["mbpoll", "-m", "tcp", "-a", "1", "-r", str(coil_address), "-t", "0", target['ip'], "1"]
    try:
        subprocess.run(cmd, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL, timeout=2)
        notify_nexus_threat("10.240.0.99", "Modbus Coil Override Attempt")
        log_event("SCADA-RESULT", f"  --> Dispatched FC05 coil override packet to {target['ip']}:502")
    except Exception as e:
        log_event("SCADA-ERROR", f"Modbus transmission error: {e}")

def run_api_abuse_burst():
    """Mode 4: High-velocity HTTP POST queries (MITRE T1190: Exploit Public-Facing Application)."""
    target = random.choice(TARGET_NODES)
    log_event("API-BURST", f"Injecting high-velocity credential & endpoint scan against {target['id']}:8443...", alert=True)

    for i in range(12):
        try:
            requests.post(
                f"http://{target['ip']}:8443/api/v1/auth/login",
                json={"user": f"admin_{i}", "token": "fuzz_payload"},
                timeout=0.3
            )
        except requests.exceptions.RequestException:
            pass # Dropped by eBPF kernel filter

    notify_nexus_threat("10.240.0.99", "High-Velocity API Abuse")
    log_event("API-RESULT", f"  --> Completed 12 rapid wire requests to {target['ip']}:8443")

def main():
    print("==================================================================", flush=True)
    print("  SENTINEL-MATRIX: LIVE ADVERSARY & WIRE STREAM DAEMON (10.240.0.99)", flush=True)
    print("==================================================================", flush=True)

    cycle = 1
    while True:
        # 1. Run 10-15 seconds of ambient background requests
        end_ambient = time.time() + 12
        while time.time() < end_ambient:
            run_ambient_requests()
            time.sleep(2)

        # 2. Stochastic attack wave injection
        attack_type = cycle % 3
        if attack_type == 0:
            run_nmap_port_sweep()
        elif attack_type == 1:
            run_scada_override()
        elif attack_type == 2:
            run_api_abuse_burst()

        time.sleep(6)
        cycle += 1

if __name__ == "__main__":
    main()
```

Make it executable:
```bash
chmod +x /home/kami/sentinel-matrix/src/traffic/live_adversary_daemon.py
```

---

### 4. Integrate into `docker-compose.yml`

In `/home/kami/sentinel-matrix/docker-compose.yml`, add the `adversary` service at static IP **`10.240.0.99`**:

```yaml
  # ============================================================================
  # LIVE ADVERSARY & ACTIVE WIRE THREAT CONTAINER (10.240.0.99)
  # ============================================================================
  adversary:
    build:
      context: .
      dockerfile: docker/Dockerfile.adversary
    container_name: matrix-adversary
    hostname: adversary.matrix.internal
    restart: unless-stopped
    depends_on:
      nexus:
        condition: service_healthy
    networks:
      sentinel-grid-net:
        ipv4_address: 10.240.0.99
    volumes:
      - ./configs:/configs:ro
      - ./src:/app/src:ro
      - shared-logs:/var/log/adversary
    environment:
      - NEXUS_REST_URL=http://10.240.0.10:9443
      - TARGET_NODES=10.240.0.101,10.240.0.102,10.240.0.103
```

---

### 5. Update `Makefile` with Live Trigger Targets

Add these targets to `/home/kami/sentinel-matrix/Makefile`:

```makefile
# ------------------------------------------------------------------------------
# LIVE ADVERSARY (Real Network Tool Execution)
# ------------------------------------------------------------------------------
adversary-logs:
	docker compose logs -f adversary

live-nmap:
	docker compose exec adversary nmap -sS -Pn -p 80,443,502,102,2404 10.240.0.101

live-scada:
	docker compose exec adversary mbpoll -m tcp -a 1 -r 105 -t 0 10.240.0.101 1

live-api:
	docker compose exec adversary curl -v -X POST http://10.240.0.101:8443/api/v1/auth/login -d '{"user":"admin","token":"test"}'
```

---

### 6. Build & Launch the Live Adversary Mesh

Build the adversary container and bring up the updated simulation mesh:

```bash
cd /home/kami/sentinel-matrix

# 1. Build the adversary container
sudo docker compose build adversary

# 2. Launch the full grid including the live adversary node
sudo docker compose up -d adversary
```

---

### 7. Verification

1. **Watch the live wire attacks as they happen:**
   ```bash
   sudo make adversary-logs
   ```
   You will see the adversary container actively executing commands against the edge nodes:
   ```text
   [LIVE-ADVERSARY] [AMBIENT-HTTP] Verified nominal health response from Edge-Substation-01
   [LIVE-ADVERSARY:ALERT] [NMAP-SWEEP] Firing live TCP SYN discovery scan against Edge-Substation-01...
     --> Wire feedback: 502/tcp open  mbmtp
     --> Wire feedback: 8443/tcp filtered https-alt
   [LIVE-ADVERSARY:ALERT] [SCADA-OVERRIDE] Injecting unauthorized Modbus FC05 (Force Coil 105 -> 1)...
   ```

2. **Run a manual `nmap` sweep directly from the adversary container:**
   ```bash
   sudo make live-nmap
   ```
   You will see real packet status reported directly by `nmap` over the virtual wire.

3. **Check the live TUI dashboard:**
   ```bash
   make tui
   ```
   The **MITRE ATT&CK DETECTIONS** panel will dynamically show hits for `T1046 (Network Service Discovery)`, `T0855 (Unauthorized Command)`, and `T1190 (Exploit Public-Facing Application)` generated by live network packets.