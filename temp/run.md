### Binary Preparation & Permissions

Make all scripts and entrypoints executable:

```bash
chmod +x /home/kami/sentinel-matrix/docker/entrypoints/*.sh
chmod +x /home/kami/sentinel-matrix/src/traffic/*.py
chmod +x /home/kami/sentinel-matrix/src/loop/*.py
chmod +x /home/kami/sentinel-matrix/src/orchestrator/*.py
chmod +x /home/kami/sentinel-matrix/src/monitor/*.py
chmod +x /home/kami/sentinel-matrix/tools/*.py
```

Copy the compiled binaries into `shared/bin/` so the Docker build stages can package them:

```bash
mkdir -p /home/kami/sentinel-matrix/shared/bin
cp /home/kami/sentinel-nexus/build/sentinel-nexus /home/kami/sentinel-matrix/shared/bin/
cp /home/kami/sentinel-nexus/build/nexus-ctl /home/kami/sentinel-matrix/shared/bin/
cp /home/kami/blackbox-sentinel/build/sentinel /home/kami/sentinel-matrix/shared/bin/

# Copy web dashboard assets into sentinel-matrix
cp -r /home/kami/sentinel-nexus/web /home/kami/sentinel-matrix/

# Copy proto definitions for python stub compilation in Docker
mkdir -p /home/kami/sentinel-matrix/shared/proto
cp /home/kami/sentinel-nexus/proto/*.proto /home/kami/sentinel-matrix/shared/proto/
```

---

### Verification: Launching the Simulation Inside VMware

```bash
cd /home/kami/sentinel-matrix

# 1. Build all 5 container images
make build

# 2. Start the autonomous simulation mesh
make up
```

Once running:
* **Web UI:** Open your browser to `http://localhost:9443` (or the VMware guest IP).
* **Live Terminal TUI:** Run `make tui` to launch the live dashboard inside your terminal.
* **Test Attacks & Chaos:**
  * Run `make attack-modbus` to trigger an in-kernel SCADA drop and collective defense fan-out.
  * Run `make chaos-latency` to verify the automated SLA rollback.
  * Run `make chaos-sever` to verify the instant 0ms disconnect.