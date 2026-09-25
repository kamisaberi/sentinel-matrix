### Part 6: Live Red-Team Adversary Node (`live-adversary-node/*`)

This section contains 7 technical implementation guides detailing the active Red-Team adversary container in `sentinel-matrix`: the containerized attack workstation architecture, the autonomous attack loop daemon, live `nmap` port sweeps, live `mbpoll` SCADA coil overrides, high-velocity `curl` API fuzzing bursts, wire-level eBPF drop verification (ports transitioning from `open` to `filtered`), and custom adversary tooling integration.

---

### File: `sentinel-matrix/docs/live-adversary-node/adversary-node-architecture.md`

```markdown
# Live Red-Team Adversary Node Architecture (`10.240.0.99`)

In addition to playing back passive PCAP files, `sentinel-matrix` deploys an active, containerized Red-Team attacker node: **`sentinel-adversary`**, statically bound to **`10.240.0.99`** on the `10.240.0.0/24` network. 

This node acts as a hostile machine directly on the wire, generating live interactive TCP handshakes, Modbus coil overrides, port sweeps, and web application fuzzing bursts.

---

## 1. Network Routing & Attacker Topology

```text
 ┌─────────────────────────────────────────────────────────────┐
 │ RED-TEAM ATTACK WORKSTATION: sentinel-adversary             │
 │ Static IP: 10.240.0.99 | MAC: 02:42:0a:f0:00:63            │
 ├─────────────────────────────────────────────────────────────┤
 │ • Tooling: nmap, mbpoll, curl, hping3, scapy, hydra         │
 │ • Autonomous Daemon: live_adversary_daemon.py               │
 └──────────────────────────────┬──────────────────────────────┘
                                │ Physical Ingress on matrix_net (10.240.0.0/24)
        ┌───────────────────────┼───────────────────────┐
        ▼                       ▼                       ▼
 ┌──────────────┐        ┌──────────────┐        ┌──────────────┐
 │ Target 1:    │        │ Target 2:    │        │ Target 3:    │
 │ Substation   │        │ Hospital     │        │ Refinery     │
 │ 10.240.0.101 │        │ 10.240.0.102 │        │ 10.240.0.103 │
 └──────────────┘        └──────────────┘        └──────────────┘
```

---

## 2. Realistic Adversarial Feedback Loop

Because the adversary executes against real network sockets:
1. **Interactive State:** It initiates real three-way handshakes (`SYN` $\to$ `SYN-ACK` $\to$ `ACK`).
2. **Immediate Feedback:** When `sentinel-node-01` detects an attack and adds `10.240.0.99` to `blocked_ip_map`, subsequent packets from the adversary receive zero response on the wire.
3. **Observability:** Attack tools report connection timeouts or socket resets (`ECONNREFUSED` / `filtered`) in real time.
```

---

### File: `sentinel-matrix/docs/live-adversary-node/live-adversary-daemon.md`

```markdown
# Autonomous Adversary Daemon (`src/traffic/live_adversary_daemon.py`)

The `live_adversary_daemon.py` script runs continuously inside `sentinel-adversary`. It cycles through automated attack phases—interleaving reconnaissance sweeps, SCADA overrides, and API bursts—to continuously test edge defenses.

---

## 1. Automated Execution Loop

```text
 ┌─────────────────────────────────────────────────────────────┐
 │ PHASE 1: RECONNAISSANCE SWEEP                               │
 │  - Executes nmap -sS port discovery against all edge nodes  │
 └──────────────────────────────┬──────────────────────────────┘
                                │ Wait 10 Seconds
                                ▼
 ┌─────────────────────────────────────────────────────────────┐
 │ PHASE 2: SCADA COIL OVERRIDE BURST                          │
 │  - Executes mbpoll FC05 write against Substation (.101:502) │
 └──────────────────────────────┬──────────────────────────────┘
                                │ Wait 15 Seconds
                                ▼
 ┌─────────────────────────────────────────────────────────────┐
 │ PHASE 3: L7 WEB API EXPLOITATION                            │
 │  - Executes cURL SQL injection bursts against Web UI (8443) │
 └──────────────────────────────┬──────────────────────────────┘
                                │
                                └──► Repeats Cycle Continuously
```

---

## 2. Daemon Source Code (`live_adversary_daemon.py`)

```python
import subprocess
import time
import random
import sys

TARGET_NODES = ["10.240.0.101", "10.240.0.102", "10.240.0.103"]

def run_nmap_sweep():
    target = random.choice(TARGET_NODES)
    print(f"[*] [Adversary] Launching live nmap SYN sweep against {target}...")
    cmd = ["nmap", "-sS", "-Pn", "-p", "80,102,502,8443,20000", target]
    subprocess.run(cmd, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)

def run_mbpoll_override():
    target = "10.240.0.101" # Substation Alpha
    print(f"[*] [Adversary] Attempting malicious Modbus FC05 coil override on {target}:502...")
    # Attempt to write 1 to Coil 0 (Emergency Bypass)
    cmd = ["mbpoll", "-m", "tcp", "-a", "1", "-r", "1", "-0", "-1", target, "1"]
    subprocess.run(cmd, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)

def run_curl_sqli():
    target = "10.240.0.101"
    print(f"[*] [Adversary] Injecting SQLi payload via cURL against {target}:8443...")
    cmd = ["curl", "-k", "-s", f"https://{target}:8443/api/v1/telemetry?query=SELECT%20*%20FROM%20users"]
    subprocess.run(cmd, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)

def main():
    print("[*] Sentinel-Matrix Red-Team Adversary Node (10.240.0.99) Armed.")
    attacks = [run_nmap_sweep, run_mbpoll_override, run_curl_sqli]
    
    while True:
        attack_func = random.choice(attacks)
        try:
            attack_func()
        except Exception as e:
            print(f"[-] Execution fault: {e}", file=sys.stderr)
        
        # Jittered sleep interval
        time.sleep(random.uniform(5.0, 12.0))

if __name__ == "__main__":
    main()
```
```

---

### File: `sentinel-matrix/docs/live-adversary-node/nmap-tcp-syn-sweeps.md`

```markdown
# Live `nmap -sS` TCP SYN Sweeps (MITRE T1046)

The adversary executes live TCP SYN scans against edge nodes to simulate adversarial reconnaissance mapped to **MITRE ATT&CK T1046 (Network Service Discovery)**.

---

## 1. Scan Execution Command

Execute an interactive scan directly from the adversary container:

```bash
docker exec -it sentinel-adversary nmap -sS -Pn -p 80,102,502,8443,20000 10.240.0.101
```

---

## 2. In-Kernel Defense Reaction

1. During the first two probed ports (e.g., 80 and 102), `sentinel-node-01` observes an anomalous flow rate burst with high `TCP_SYN` flag density.
2. Subsystem `04_ids_ips` and `TabularMAE` flag the reconnaissance signature.
3. Tier 2 `libblackbox` writes `10.240.0.99` into the in-kernel `blocked_ip_map` with a 60-second TTL.
4. Subsequent SYN packets for ports 502, 8443, and 20000 are dropped in driver memory ($< 0.84\,\mu\text{s}$).

---

## 3. Terminal Output Observed by the Attacker

```text
Starting Nmap 7.94 ( https://nmap.org )
Nmap scan report for 10.240.0.101
Host is up (0.00042s latency).

PORT      STATE    SERVICE
80/tcp    open     http
102/tcp   open     iso-tsap
502/tcp   filtered modbus   <-- DROPPED IN-KERNEL!
8443/tcp  filtered https-alt <-- DROPPED IN-KERNEL!
20000/tcp filtered dnp3     <-- DROPPED IN-KERNEL!

Nmap done: 1 IP address (1 host up) scanned in 2.12 seconds
```

The transition to `filtered` provides direct visual confirmation that the kernel XDP drop gate engaged mid-scan.
```

---

### File: `sentinel-matrix/docs/live-adversary-node/mbpoll-scada-overrides.md`

```markdown
# Live Modbus Coil & Register Overrides via `mbpoll`

Using the standard industrial utility `mbpoll`, the adversary attempts live write mutations against field controllers to evaluate Subsystem `18_cps_sec`.

---

## 1. Attack Execution Command

Execute an unauthorized Modbus Function Code `05` (Write Single Coil) command:

```bash
docker exec -it sentinel-adversary mbpoll -m tcp -a 1 -r 1 -0 -1 10.240.0.101 1
```

* `-m tcp`: Modbus TCP encapsulation.
* `-a 1`: Target Slave / Unit ID `1`.
* `-r 1 -0`: Coil index `1` (0-based addressing).
* `-1`: Write operation (forcing coil value to `1`).

---

## 2. Expected In-Kernel Rejection

```text
mbpoll 1.0-0 - FieldTalk(tm) Modbus(R) Master Simulator
Copyright (c) 2011-2023 Pascal JEAN, https://github.com/epsilonrt/mbpoll
Web: https://www.epsilonrt.fr/en/

Set 1 reference at address 1: 1
Write failed: Connection timed out
```

The connection times out because Subsystem `18_cps_sec` trapped the unauthorized coil override and executed `XDP_DROP` before the command reached the virtual PLC logic.
```

---

### File: `sentinel-matrix/docs/live-adversary-node/curl-api-abuse-bursts.md`

```markdown
# High-Velocity cURL API Abuse & SQL Injection Bursts

The adversary targets the Web Command Center and REST endpoints on edge nodes using high-velocity HTTP request bursts and SQL injection strings to evaluate Subsystems `05_waf` and `10_bad`.

---

## 1. Attack Execution

Execute an API fuzzing burst:

```bash
docker exec -it sentinel-adversary python3 -c "
import urllib.request, time
url = 'http://10.240.0.101:8080/api/v1/sensor?id=1%20OR%201=1'
for i in range(50):
    try:
        urllib.request.urlopen(url, timeout=0.5)
    except Exception as e:
        print(f'Request {i}: Blocked by in-kernel WAF gate ({e})')
        break
"
```

---

## 2. Observation

* Requests 1 through 3 pass through to the WAF inspection engine.
* At Request 4, `05_waf` flags the repeated SQL syntax violation (`1 OR 1=1`).
* The source IP `10.240.0.99` is added to `blocked_ip_map`.
* Requests 5 through 50 time out immediately at the socket layer.
```

---

### File: `sentinel-matrix/docs/live-adversary-node/observing-wire-ebpf-drops.md`

```markdown
# Real-Time Mitigation Verification: Open to Filtered Transition

A key verification capability of `sentinel-matrix` is observing network port states transition from **`open`** to **`filtered`** under active attack conditions.

---

## 1. Pre-Attack vs. Post-Mitigation Port Scans

```text
 1. PRE-ATTACK BASELINE SCAN:
    $ nmap -sS -p 502 10.240.0.101
    PORT    STATE SERVICE
    502/tcp open  modbus

 2. ATTACK EXECUTION (Adversary issues illegal register write)
    $ mbpoll -m tcp -r 40001 10.240.0.101 9999
    [!] In-Kernel XDP Filter executes drop in 0.81 µs.

 3. POST-ATTACK VERIFICATION SCAN:
    $ nmap -sS -p 502 10.240.0.101
    PORT    STATE    SERVICE
    502/tcp filtered modbus  <-- CONFIRMED IN-KERNEL DROP!
```

---

## 2. Inspecting Kernel State on Edge Node 01

To confirm the drop occurred in driver space without user-space socket allocation:

```bash
docker exec -it sentinel-node-01 sentinel --dump-drops
```

### Output:
```text
Target IP       Rule ID   Triggering Subsystem   Drop Count   TTL Left
10.240.0.99     1802      18_cps_sec (Modbus)    42 pkts      58 seconds
```
```

---

### File: `sentinel-matrix/docs/live-adversary-node/custom-adversary-tooling.md`

```markdown
# Adding Custom Red-Team Tooling to `Dockerfile.adversary`

Security researchers can extend `sentinel-adversary` with custom exploit frameworks, traffic blasters, or proprietary fuzzers.

---

## 1. Customizing `Dockerfile.adversary`

Edit `/opt/sentinel-matrix/docker/Dockerfile.adversary` to include additional tools (such as `hping3`, `scapy`, or `hydra`):

```dockerfile
FROM ubuntu:devel

ENV DEBIAN_FRONTEND=noninteractive

RUN apt-get update && apt-get install -y \
    python3-minimal \
    python3-pip \
    nmap \
    mbpoll \
    curl \
    iproute2 \
    net-tools \
    hping3 \
    hydra \
    tshark \
    && rm -rf /var/lib/apt/lists/*

RUN pip3 install --no-cache-dir --break-system-packages scapy requests

COPY src/traffic/live_adversary_daemon.py /app/adversary_daemon.py

ENTRYPOINT ["python3", "/app/adversary_daemon.py"]
```

---

## 2. Rebuilding the Adversary Container

Rebuild and restart the container:

```bash
make build-adversary
docker compose restart adversary
```
```

---

### Complete in Part 6
- `sentinel-matrix/docs/live-adversary-node/adversary-node-architecture.md`
- `sentinel-matrix/docs/live-adversary-node/live-adversary-daemon.md`
- `sentinel-matrix/docs/live-adversary-node/nmap-tcp-syn-sweeps.md`
- `sentinel-matrix/docs/live-adversary-node/mbpoll-scada-overrides.md`
- `sentinel-matrix/docs/live-adversary-node/curl-api-abuse-bursts.md`
- `sentinel-matrix/docs/live-adversary-node/observing-wire-ebpf-drops.md`
- `sentinel-matrix/docs/live-adversary-node/custom-adversary-tooling.md`

All 7 Live Adversary Node files for `sentinel-matrix` are now generated.

---

### Files to be Generated in Part 7

The next phase covers **Real-Time Observability & Consoles** (`observability-and-tui/` - 7 files):

1. `observability-and-tui/observability-overview.md` (Dual-console monitoring: Terminal TUI vs. Web Command Center)
2. `observability-and-tui/terminal-dashboard-tui.md` (High-density curses/rich dashboard architecture, `live_dashboard.py`)
3. `observability-and-tui/split-panel-layout.md` (Screen design: Connected Appliances + MITRE Heatmap + XAI Panel)
4. `observability-and-tui/real-time-xai-panel.md` (Live inspection of top-3 physical deviations and audit notes)
5. `observability-and-tui/web-command-center-integration.md` (Connecting browser to localhost:9443 HTML5 Canvas Topology)
6. `observability-and-tui/streaming-sse-events.md` (Server-Sent Events multiplexing on port 9444)
7. `observability-and-tui/metrics-aggregation.md` (Calculating live microsecond latency percentiles p50, p95, p99)

Confirm when you are ready to proceed with Part 7.