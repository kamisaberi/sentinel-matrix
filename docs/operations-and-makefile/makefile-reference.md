# Makefile Command Reference & Automation Targets

The `sentinel-matrix` `Makefile` automates environment provisioning, container compilation, live attack generation, and chaos testing across the digital twin mesh.

---

## 1. Quick Command Summary (`make help`)

Run `make help` to inspect all registered targets categorized by functional domain:

```bash
make help
```

---

## 2. Categorized Command Cheat Sheet

### Lifecycle & Cluster Provisioning
* **`make init`**: Prepares host directories (`shared/{models,datasets,lib,logs,certs}`), harvests dynamic libraries (`libabsl`, `libre2`, `libgrpc`), resolves Git LFS PCAPs, and generates internal mTLS PKI.
* **`make build`**: Compiles all container images (`nexus`, `forge`, `nodes`, `traffic`, `adversary`, `monitor`) using `Dockerfile` specs with `ubuntu:devel` bases.
* **`make up`**: Launches the entire 7-container digital twin mesh in background mode over `10.240.0.0/24`.
* **`make down`**: Stops and tears down the container grid, gracefully unhooking interfaces.
* **`make restart`**: Restarts the entire mesh while preserving shared volume state.
* **`make status`**: Displays health status, static IPs, and port bindings across all mesh containers.
* **`make clean`**: Clears temporary test artifacts, candidate weights, and un-archived datasets.

### Observability & Monitoring
* **`make tui`**: Launches the live dual-panel terminal Curses/Rich monitoring dashboard (`live_dashboard.py`).
* **`make logs`**: Tails combined real-time logging output across all 7 containers.
* **`make logs-nexus`**: Tails logs specifically from the Tier 6 Fleet Command Hub.
* **`make logs-forge`**: Tails logs from the Tier 4 Active Learning engine.

### Red-Team Attacks & Malware Replays
* **`make attack-nmap`**: Commands `sentinel-adversary` (`.99`) to launch a live TCP SYN sweep against edge nodes.
* **`make attack-modbus`**: Commands `sentinel-adversary` to execute an unauthorized Modbus FC05 coil override.
* **`make attack-sqli`**: Blasts SQL injection payloads against edge node web management interfaces.
* **`make replay-industroyer`**: Streams authentic Industroyer IEC 60870-5-104 switchgear trip captures.
* **`make replay-triton`**: Streams authentic Triton Triconex TriStation safety system override captures.
* **`make replay-stuxnet`**: Streams authentic Stuxnet Siemens S7Comm centrifuge tampering captures.

### Chaos Engineering & Resilience
* **`make chaos-latency`**: Injects artificial $1{,}420\,\mu\text{s}$ compute delays to test `RollbackGuard`.
* **`make chaos-sever`**: Forcibly terminates `sentinel-node-02` (`SIGKILL`) to evaluate 15s liveness timeouts.
* **`make chaos-disconnect`**: Gracefully terminates `sentinel-node-01` to verify 0ms instant disconnects.
* **`make recover`**: Restarts severed edge nodes and verifies automated re-enrollment.

