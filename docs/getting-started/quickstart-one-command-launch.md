# 3-Minute Quickstart: Launching the Simulation Mesh

This walkthrough guides you through harvesting dependencies, building container images, launching the 7-node digital twin grid, and opening the real-time TUI dashboard.

---

## 1. Single Command Execution (`make all`)

Navigate to the `sentinel-matrix` repository root and run:

```bash
cd /opt/sentinel-matrix

# 1. Initialize shared directories, certificates, and libraries
make init

# 2. Build and verify container images
make build

# 3. Launch the container grid in background mode
make up
```

---

## 2. What `make init` Executes Automatically

```text
 1. CREATES SHARED VOLUME DIRECTORIES:
    shared/models, shared/datasets, shared/logs, shared/certs, shared/lib
              │
              ▼
 2. HARVESTS HOST DYNAMIC LIBRARIES (ldd resolution):
    Copies libabsl, libre2, libgrpc++, and libprotobuf into shared/lib/
              │
              ▼
 3. RESOLVES AUTHENTIC MALWARE PCAPS:
    Executes tools/download_real_pcaps.py to fetch Industroyer, Triton, and S7
              │
              ▼
 4. GENERATES INTERNAL mTLS PKI:
    Creates internal CA, Nexus server certs, and node authentication keys
```

---

## 3. Launching the Live TUI Dashboard

Open the live split-panel monitoring console:

```bash
make tui
```

### Expected TUI Display:

```text
 ┌─ Sentinel-Matrix Cyber-Range Grid ────────────────── Top-3 XAI Residuals ─┐
 │ Node                 Status   Drops   SLA      │ Rank 1: MODBUS_REG_40001  │
 │ sentinel-node-01     ONLINE   1,420   0.82 µs  │  Delta: +7,750 PSI (64%)  │
 │ sentinel-node-02     ONLINE     840   0.81 µs  │ Rank 2: FLOW_PPS          │
 │ sentinel-node-03     ONLINE      12   0.84 µs  │  Delta: +81,850 pps (24%) │
 │ > sentinel-adversary ATTACK   nmap -sS running │ Rank 3: IAT_MEAN          │
 └────────────────────────────────────────────────┴───────────────────────────┘
```

Press **`Ctrl+C`** or **`q`** at any time to exit the dashboard (containers remain running in the background).

