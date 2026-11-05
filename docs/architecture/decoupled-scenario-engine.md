# Decoupled Multi-Network Scenario Engine (`scenario_engine.py`)

`sentinel-matrix` decouples scenario orchestration from monolithic Docker Compose limits using a standalone Python engine (`tools/scenario_engine.py`).

The scenario engine parses declarative YAML manifests to synthesize multi-network Purdue Model topologies on the fly, creating isolated bridge networks, assigning IP addresses across DMZ, SCADA, and Fieldbus segments, and managing container lifecycles dynamically.

---

## 1. Multi-Network Purdue Model Architecture

```text
 ┌─────────────────────────────────────────────────────────────┐
 │ Level 3: IT/OT DMZ Subnet (192.168.10.0/24 - External)     │
 │  - Edge Appliance Gateways, Web Management Consoles        │
 └──────────────────────────────┬──────────────────────────────┘
                                │ Firewall Bridge
                                ▼
 ┌─────────────────────────────────────────────────────────────┐
 │ Level 1/2: SCADA Control Network (10.240.1.0/24 - Internal) │
 │  - Supervisory PLCs, HMIs, Master Outstations               │
 │  - Configured with internal: true (Air-gapped from WAN)     │
 └──────────────────────────────┬──────────────────────────────┘
                                │ Fieldbus Bridge
                                ▼
 ┌─────────────────────────────────────────────────────────────┐
 │ Level 0: Fieldbus Process Subnet (172.16.50.0/24 - Air-Gap) │
 │  - Smart Sensors, Actuator Relays, Safety SIS Controllers   │
 └─────────────────────────────────────────────────────────────┘
```

---

## 2. Declarative Scenario Schema (`scenario.yaml`)

```yaml
schema_version: "2.0"
scenario:
  name: "water_treatment_cyber_physical_breach"
  version: "1.0.0"
  target_sector: "CRITICAL_INFRASTRUCTURE"

networks:
  dmz_net:
    subnet: "192.168.10.0/24"
    gateway: "192.168.10.1"
    internal: false
  scada_control_net:
    subnet: "10.240.1.0/24"
    gateway: "10.240.1.1"
    internal: true   # Air-gapped Level 1/2 Control Subnet
  fieldbus_net:
    subnet: "172.16.50.0/24"
    gateway: "172.16.50.1"
    internal: true   # Level 0 Fieldbus

devices:
  scada_plc_master:
    archetype: "modular_plc"
    image: "sentinel-matrix/device-runtime:latest"
    networks:
      scada_control_net: "10.240.1.10"
      fieldbus_net: "172.16.50.10"
    ports:
      - "502:502"
    env:
      PROTOCOL: "modbus_tcp"
      SLAVE_ID: 1
      PHYSICS_SIMULATION: "chemical_dosing_rk4"
```

---

## 3. CLI Orchestration Commands

Manage dynamic scenarios directly via `aryo matrix scenario`:

```bash
# Inspect scenario manifest structure
aryo matrix scenario inspect scenarios/water_treatment.yaml

# Load and launch dynamic Purdue network mesh
aryo matrix scenario load scenarios/water_treatment.yaml

# Query active scenario container status
aryo matrix scenario status

# Tear down dynamic scenario networks and containers
aryo matrix scenario down
```
