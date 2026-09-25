### Part 10: Operations & Makefile Reference (`operations-and-makefile/*`)

This section contains 6 technical reference manuals and operational configuration guides for `sentinel-matrix`: the comprehensive Makefile command cheat sheet, daily development and testing workflows, customizing `matrix.yaml`, scaling the mesh from 3 to 20 edge nodes, authoring scenario profile manifests, and centralized log inspection.

---

### File: `sentinel-matrix/docs/operations-and-makefile/makefile-reference.md`

```markdown
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
```

---

### File: `sentinel-matrix/docs/operations-and-makefile/common-workflows.md`

```markdown
# Common Operational Workflows

This guide outlines routine operational workflows for developers, security researchers, and test engineers working within `sentinel-matrix`.

---

## Workflow 1: Standard Developer Sandbox Launch

Use this workflow to boot the environment, verify connectivity, and inspect live operations:

```bash
# Step 1: Initialize dependencies and start the grid
make init
make build
make up

# Step 2: Confirm container health
make status

# Step 3: Open the terminal dashboard in a dedicated window
make tui
```

---

## Workflow 2: Validating an Attack & In-Kernel eBPF Drop

Use this workflow to test whether a newly developed detection rule drops malicious packets on the wire:

```bash
# Step 1: In Terminal 1, watch active kernel drops on Node 01
docker exec -it sentinel-node-01 sentinel --dump-drops -f

# Step 2: In Terminal 2, launch a Modbus override attack from the adversary node
make attack-modbus

# Step 3: Observe in Terminal 1 that the adversary IP (10.240.0.99) is dropped in < 0.84 µs
```

---

## Workflow 3: Validating Closed-Loop Active Learning

Use this workflow to test that ambiguous traffic triggers retraining and canary deployment:

```bash
# Step 1: Follow Forge continual learning logs
make logs-forge

# Step 2: Trigger an uncertainty burst on Channel 7
docker exec -it sentinel-traffic python3 /app/src/traffic/channels/netflow_channel.py \
    --burst 5000 --uncertainty 1.0

# Step 3: Observe Forge detecting the curated batch, training TabularMAE, passing the safety gate, and staging to Nexus
```
```

---

### File: `sentinel-matrix/docs/operations-and-makefile/configuring-matrix-yaml.md`

```markdown
# Customizing the Grid Topology (`configs/matrix.yaml`)

The primary simulation grid topology, container network parameters, and scenario timings are declared in `configs/matrix.yaml`.

---

## 1. Master Configuration Schema (`configs/matrix.yaml`)

```yaml
version: "2.4.0"

mesh_network:
  bridge_name: "matrix_net"
  subnet: "10.240.0.0/24"
  gateway: "10.240.0.1"
  dns_server: "10.240.0.10"

nodes:
  nexus_hub:
    name: "sentinel-nexus"
    ip_address: "10.240.0.10"
    grpc_port: 50051
    web_port: 9443
    sse_port: 9444

  forge_trainer:
    name: "sentinel-forge"
    ip_address: "10.240.0.20"
    auto_cycle: true
    poll_interval_sec: 5

  traffic_streamer:
    name: "sentinel-traffic"
    ip_address: "10.240.0.50"
    omniflow_active: true
    pcap_replay_speed: 1.0

  adversary:
    name: "sentinel-adversary"
    ip_address: "10.240.0.99"
    attack_interval_sec: 15
    auto_attack_cycle: true

  edge_appliances:
    - name: "sentinel-node-01"
      ip_address: "10.240.0.101"
      profile: "substation_alpha"
      target_protocol: "IEC_60870_5_104"
    - name: "sentinel-node-02"
      ip_address: "10.240.0.102"
      profile: "hospital_enclave"
      target_protocol: "DICOM_PACS"
    - name: "sentinel-node-03"
      ip_address: "10.240.0.103"
      profile: "chemical_refinery"
      target_protocol: "MODBUS_TCP"

simulation_parameters:
  tick_interval_ms: 100
  log_level: "INFO"
  evidence_retention_days: 7
```
```

---

### File: `sentinel-matrix/docs/operations-and-makefile/configuring-node-templates.md`

```markdown
# Scaling the Mesh: Provisioning from 3 to 20 Nodes

While `sentinel-matrix` boots with 3 edge appliances by default, researchers can scale the simulation mesh to **20 concurrent edge nodes** using modular node templates.

---

## 1. Node Template Definition (`templates/node_template.yaml`)

```yaml
# templates/node_template.yaml
node:
  template_version: "1.0"
  base_image: "aryorithm/sentinel:2.4.0"
  resource_limits:
    cpus: "1.5"
    memory: "2048M"
  capabilities:
    - "CAP_NET_ADMIN"
    - "CAP_NET_RAW"
    - "CAP_BPF"
    - "CAP_SYS_RESOURCE"
  env_defaults:
    XDP_MODE: "SKB"
    NEXUS_HOST: "10.240.0.10"
    NEXUS_PORT: "50051"
```

---

## 2. Automated Node Scaling Script (`scripts/scale_nodes.sh`)

Use the scale script to expand the Docker Compose file:

```bash
# Scale the mesh to 10 edge appliances
./scripts/scale_nodes.sh --count 10
```

### Script Execution Logic:
1. Generates entries for `sentinel-node-04` through `sentinel-node-10` in `docker-compose.override.yml`.
2. Assigns sequential static IP addresses (`10.240.0.104` through `10.240.0.110`).
3. Generates signed mTLS client certificates for each new node.
4. Relaunches the grid:
   ```bash
   make up
   ```
```

---

### File: `sentinel-matrix/docs/operations-and-makefile/configuring-scenario-profiles.md`

```markdown
# Authoring Attack Scenarios (`configs/scenarios/`)

`sentinel-matrix` executes reproducible cyber-physical simulation scenarios defined as YAML profiles in `configs/scenarios/`.

---

## 1. Blackout Scenario Profile (`scenario_blackout.yaml`)

```yaml
scenario:
  name: "Regional Grid Blackout Simulation"
  id: "SCEN-BLACKOUT-01"
  duration_minutes: 10
  description: "Replays Industroyer2 switchgear trips followed by high-volume C2 exfiltration."

timeline:
  - time_offset_sec: 10
    action: "TRAFFIC_BURST"
    source: "sentinel-traffic"
    channel: "scada_ot"
    rate_multiplier: 2.0

  - time_offset_sec: 45
    action: "MALWARE_REPLAY"
    source: "sentinel-traffic"
    pcap: "/shared/pcaps/industroyer_iec104.pcap"
    target: "10.240.0.101"

  - time_offset_sec: 90
    action: "ADVERSARY_ATTACK"
    source: "sentinel-adversary"
    attack_type: "NMAP_SWEEP"
    target_subnet: "10.240.0.0/24"

  - time_offset_sec: 180
    action: "CHAOS_INJECTION"
    target: "sentinel-node-01"
    chaos_type: "LATENCY_SPIKE"
    delay_us: 1420

  - time_offset_sec: 300
    action: "VERIFY_METRICS"
    assert_min_drops: 1000
    assert_rollback_triggered: true
```

---

## 2. Launching a Scenario

Run a scenario using the testbed runner:

```bash
python3 src/traffic/scenario_runner.py --scenario configs/scenarios/scenario_blackout.yaml
```
```

---

### File: `sentinel-matrix/docs/operations-and-makefile/log-inspection-and-debugging.md`

```markdown
# Centralized Log Inspection & Debugging (`shared/logs/`)

All containers inside `sentinel-matrix` write unbuffered stdout streams and structured JSON log journals to the host mount `/opt/sentinel-matrix/shared/logs/`.

---

## 1. Centralized Log Inventory

```text
/opt/sentinel-matrix/shared/logs/
├── nexus_stdout.log        # Core Fleet Orchestrator output
├── nexus_state.json        # Active fleet node registry journal
├── forge_stdout.log        # Continual training loss logs
├── traffic_stdout.log      # OmniFlow streaming records
├── adversary_stdout.log    # Red-Team attack execution traces
├── node_01_stdout.log      # Substation Alpha XDR engine logs
├── node_02_stdout.log      # Hospital Enclave XDR engine logs
└── node_03_stdout.log      # Chemical Refinery XDR engine logs
```

---

## 2. Live Log Traversal Recipes

### 1. Tail All Drops Across the Entire Mesh:
```bash
tail -f shared/logs/node_*.log | grep "XDP_DROP"
```

### 2. Follow Continual Learning Training Loss:
```bash
tail -f shared/logs/forge_stdout.log | grep -E 'Epoch|Loss'
```

### 3. Monitor Collective Defense Rule Broadcasts:
```bash
tail -f shared/logs/nexus_stdout.log | grep "CollectiveDefense"
```
```

---

### Complete in Part 10
- `sentinel-matrix/docs/operations-and-makefile/makefile-reference.md`
- `sentinel-matrix/docs/operations-and-makefile/common-workflows.md`
- `sentinel-matrix/docs/operations-and-makefile/configuring-matrix-yaml.md`
- `sentinel-matrix/docs/operations-and-makefile/configuring-node-templates.md`
- `sentinel-matrix/docs/operations-and-makefile/configuring-scenario-profiles.md`
- `sentinel-matrix/docs/operations-and-makefile/log-inspection-and-debugging.md`

All 6 Operations & Makefile documentation files for `sentinel-matrix` are now generated.

---

### Files to be Generated in Part 11

The next phase covers **Hands-On Simulation Walkthroughs & Tutorials** (`tutorials/` - 5 files):

1. `tutorials/full-closed-loop-walkthrough.md` (End-to-end demonstration: Attack $\to$ Mitigation $\to$ Retrain $\to$ Hot-Reload)
2. `tutorials/simulating-substation-blackout-attack.md` (Replaying Industroyer against simulated electrical protection relays)
3. `tutorials/simulating-hospital-ransomware-wave.md` (Injecting DICOM exfiltration and high-entropy encryption bursts)
4. `tutorials/adding-custom-malware-pcap.md` (Importing your own Wireshark capture into the replay streamer)
5. `tutorials/running-matrix-in-esxi-headless.md` (Headless deployment on enterprise VMware ESXi clusters)

Confirm when you are ready to proceed with Part 11.