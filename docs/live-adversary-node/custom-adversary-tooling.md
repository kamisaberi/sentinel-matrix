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

