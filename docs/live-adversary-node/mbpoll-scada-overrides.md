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

