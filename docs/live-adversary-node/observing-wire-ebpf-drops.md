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

