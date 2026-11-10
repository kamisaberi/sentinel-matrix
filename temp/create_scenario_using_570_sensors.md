### Operator & Engineer Guide: Building Industrial Digital Twin Scenarios Using the 570-Sensor Catalog

This handbook outlines the complete workflow for creating, configuring, executing, and promoting a multi-tier cyber-physical scenario in **Sentinel-Matrix** using the 570-sensor industrial catalog.

---

### The 6-Stage Scenario Lifecycle

```text
========================================================================================================================
                          SCENARIO CREATION & DEPLOYMENT LIFECYCLE
========================================================================================================================
 [STAGE 1: SELECTION]     Browse 570 catalog -> Identify physical sensors needed for the plant
 [STAGE 2: SCAFFOLDING]   Run 'aryo scenario new <name>' -> Creates Purdue topology & manifest
 [STAGE 3: BINDING]       Declare sensors in scenario.yaml -> Bind ports, Modbus registers & ODEs
 [STAGE 4: DEFENSE ATTACH]Add .spkg reflex rules & INT8 ONNX models -> Bind threat invariants
 [STAGE 5: EXECUTION]     Run 'aryo matrix scenario load' -> Simulate physics, inject faults & attacks
 [STAGE 6: PROMOTION]     Run 'aryo blueprint from-scenario' -> Convert verified twin to bare-metal
========================================================================================================
```

---

### Stage 1: Selecting Sensors from the 570-Sensor Catalog

Before writing the scenario manifest, identify which physical sensors match the target plant:

```bash
# 1. Search sensors relevant to your target sector (e.g. Water Treatment)
aryo sensor list --category PRESSURE
aryo sensor list --category CHEMICAL
aryo sensor list --category VIBRATION

# 2. Inspect the exact register mappings and physics of candidate sensors:
# Check Pressure Transmitter (#052):
aryo sensor inspect s052_high_frequency_piezoresistive_pressure_sensor

# Check Chemical pH/ORP Probe (#061):
aryo sensor inspect s061_inline_water_ph_oxidation_reduction_orp_probe

# Check Mechanical Bearing Accelerometer (#031):
aryo sensor inspect s031_3_axis_machine_bearing_vibration_accelerometer
```

Note their:
* **Sensor IDs:** `s052_...`, `s061_...`, `s031_...`
* **Default Ports:** `15052`, `15061`, `15031`
* **Holding Register Base Addresses:** (e.g. `40001`, `40011`, `40021`)
* **Available Fault Triggers:** (`step_increase`, `drop_to_val`, `harmonic_multiplier`)

---

### Stage 2: Scaffolding a Clean Scenario Project

Use the master CLI to generate a standardized scenario project skeleton:

```bash
cd /home/kami/sentinel-matrix/scenarios
aryo scenario new water_dosing_facility --sector WATER_TREATMENT
```

This generates:
```text
water_dosing_facility/
├── manifest.json            # Hub metadata, author key, dependency declarations
├── scenario.yaml            # Purdue multi-network layout & node configurations
├── configs/                 # Register maps & subsystem policies
│   └── plc_register_map.json
├── packages/                # Active Tier A/B/C reflex rules (.spkg)
├── models/                  # Neural anomaly models (.onnx)
└── run_demo.sh              # 1-Click execution script
```

---

### Stage 3: Declaring the Sensors in `scenario.yaml`

Open `water_dosing_facility/scenario.yaml` and configure:
1. **Purdue Model Networks:** Segment Level 3 (DMZ), Level 2 (SCADA), and Level 0/1 (Fieldbus).
2. **Sensor Nodes / Multiplexer:** Bind the selected sensors from the 570 catalog.
3. **Primary PLC & In-Line Edge Sentinel Appliance:** Attach in-line inspection.

#### Production-Grade `scenario.yaml` Example:

```yaml
version: "2.0"
scenario:
  name: "water_dosing_facility"
  description: "Chemical Dosing & Water Treatment Plant with 570-Catalog Multi-Physics Telemetry"
  author: "Aryorithm Certified Engineer"

# 1. Purdue Segregation (Multi-Network Mesh)
networks:
  dmz_net:
    driver: bridge
    subnet: "192.168.10.0/24"
    gateway: "192.168.10.1"
    internal: false
  scada_control_net:
    driver: bridge
    subnet: "10.240.1.0/24"
    gateway: "10.240.1.1"
    internal: true   # Air-gapped: no internet access
  fieldbus_net:
    driver: bridge
    subnet: "172.16.50.0/24"
    gateway: "172.16.50.1"
    internal: true   # Strict Level 0/1 process bus

# 2. Node Instances & Topology
nodes:
  # L3: In-Line Edge Security Appliance running Blackbox-Sentinel
  edge_sentinel_01:
    hostname: "sentinel01.dmz.internal"
    image: "sentinel-matrix/device-runtime:latest"
    networks:
      dmz_net:
        ip: "192.168.10.100"
      scada_control_net:
        ip: "10.240.1.100"
    capabilities: ["NET_ADMIN", "BPF"]
    environment:
      ROLE: "sentinel_appliance"
      INGEST_MODE: "generic_skb"

  # L2: Supervisory PLC
  primary_dosing_plc:
    hostname: "plc01.scada.internal"
    image: "sentinel-matrix/device-runtime:latest"
    networks:
      scada_control_net:
        ip: "10.240.1.10"
      fieldbus_net:
        ip: "172.16.50.10"
    ports:
      - "15500:502"
    environment:
      ARCHETYPE: "modular_plc"
      PROTOCOL: "modbus_tcp"
      POLL_INTERVAL_MS: 100

  # L0/L1: Physical Sensor Array (Sourced from 570 Catalog)
  sensor_telemetry_bus:
    hostname: "sensors.fieldbus.internal"
    image: "sentinel-matrix/device-runtime:latest"
    networks:
      fieldbus_net:
        ip: "172.16.50.50"
    ports:
      # Expose catalog sensor ports to host for operator inspection:
      - "15052:15052"  # #052: Pressure Sensor (bar)
      - "15061:15061"  # #061: Water pH/ORP Probe (pH)
      - "15031:15031"  # #031: 3-Axis Bearing Vibration (mm/s)
      - "8088:8088"    # Real-Time Chaos/Fault Injection Hook
    command: [
      "python3", "/home/kami/sentinel-matrix/tools/sensor_multiplexer.py"
    ]

# 3. Catalog Sensors Activated in this Twin
catalog_sensors:
  - sensor_id: "s052_high_frequency_piezoresistive_pressure_sensor"
    port: 15052
    role: "dosing_pump_discharge_pressure"
  - sensor_id: "s061_inline_water_ph_oxidation_reduction_orp_probe"
    port: 15061
    role: "finished_water_ph_monitoring"
  - sensor_id: "s031_3_axis_machine_bearing_vibration_accelerometer"
    port: 15031
    role: "dosing_pump_mechanical_health"
```

---

### Stage 4: Attaching Defense Rules & Neural Models

Link the defense artifacts that protect against the specific threats detected by those sensors:

```bash
cd /home/kami/sentinel-matrix/scenarios/water_dosing_facility

# 1. Add reflex rules targeting Modbus & pH poisoning:
aryo scenario add . modbus_safety_guard
aryo scenario add . s7_safety_guard

# 2. Add INT8 neural model for multi-sensor anomaly detection:
aryo scenario add . network_threat_detector

# 3. Verify that dependencies are registered in manifest.json:
cat manifest.json | jq .dependencies
```

---

### Stage 5: Loading the Scenario & Simulating Attacks

#### 1. Launch the Digital Twin Scenario:
```bash
aryo matrix scenario load /home/kami/sentinel-matrix/scenarios/water_dosing_facility/scenario.yaml
```

The scenario engine initializes the segmented bridge networks, boots the PLC and edge appliance, and starts the sensor multiplexer emitting continuous physical ODE telemetry.

#### 2. Query Live Field Telemetry:
```bash
# Query Pressure Sensor (#052 on :15052):
python3 -c "
import socket, struct
s = socket.socket(); s.connect(('127.0.0.1', 15052))
s.send(struct.pack('>HHHBBHH', 1, 0, 6, 1, 3, 0, 2))
val = struct.unpack('>f', s.recv(1024)[9:13])[0]
print(f'Discharge Pressure: {val:.3f} bar')
"

# Query pH Sensor (#061 on :15061):
python3 -c "
import socket, struct
s = socket.socket(); s.connect(('127.0.0.1', 15061))
s.send(struct.pack('>HHHBBHH', 1, 0, 6, 1, 3, 0, 2))
val = struct.unpack('>f', s.recv(1024)[9:13])[0]
print(f'Water pH: {val:.3f} pH')
"
```

#### 3. Inject Physical Chaos / Red-Team Attack:
Simulate the **Oldsmar Water Treatment cyber-attack** (forcing caustic soda dosing $\to$ chemical pH drops dangerously to 2.1):

```bash
# Inject chemical dosing runaway fault through master CLI:
aryo sensor fault s061_inline_water_ph_oxidation_reduction_orp_probe drop_to_val 2.1

# Query pH sensor to confirm physical drop:
# Water pH will read 2.100 pH!
```

#### 4. Assert Active In-Kernel Defense:
Observe `blackbox-sentinel` logs. Because the commanded network state (`"Normal Operating Conditions"`) contradicts the physical sensor invariant ($6.5 \le \text{pH} \le 8.5$), the **ThreatCorrelator** trips:
```text
[CORRELATOR VIOLATION] Sensor s061 reads 2.10 pH (Allowed: 6.5 - 8.5)
--> In-Kernel eBPF Action: Hard Drop on attacker IP executed in < 0.84 µs!
--> Plant Critical Clearing Time: T_crit = 38.4 ms preserved!
```

---

### Stage 6: Promoting the Proven Scenario to a Production Hardware Blueprint

Once the scenario proves that zero false positives occur and the physical safety barriers hold under simulated attack, promote the virtual twin to a **physical bare-metal blueprint**:

```bash
cd /home/kami/sentinel-matrix/scenarios

# 1. Convert scenario to production blueprint:
aryo blueprint from-scenario water_dosing_facility \
    --site "Water-Treatment-North-01" \
    --interface "ens160" \
    --af-xdp "ZEROCOPY" \
    --arch "x86_64" \
    --pack

# 2. Inspect the synthesized hardware bindings and 4-Stage DAG:
aryo blueprint inspect bp_water_dosing_facility.blueprint

# 3. Publish to Hub or deploy to the physical bare-metal edge IPC:
sudo aryo blueprint deploy bp_water_dosing_facility.blueprint
```

---

### Scenario Operator Cheat Sheet

| Task | Master CLI Command |
| :--- | :--- |
| **Search Catalog** | `aryo sensor list --category <CAT>` or `aryo sensor list --search <NAME>` |
| **Inspect Sensor Math** | `aryo sensor inspect <sensor_id>` |
| **Scaffold Scenario** | `aryo scenario new <name> --sector <SECTOR>` |
| **Add Assets to Scenario** | `aryo scenario add <scenario_dir> <asset_name>` |
| **Start Twin Mesh** | `aryo matrix scenario load <path/to/scenario.yaml>` |
| **Check Twin Status** | `aryo matrix scenario status` |
| **Inject Physical Fault** | `aryo sensor fault <sensor_id> <action> [value]` |
| **Tear Down Mesh** | `aryo matrix scenario down` |
| **Convert to Blueprint** | `aryo blueprint from-scenario <scenario_dir> --site <SITE> --interface <NIC>` |
| **Deploy to Bare-Metal** | `sudo aryo blueprint deploy <blueprint_file>` |