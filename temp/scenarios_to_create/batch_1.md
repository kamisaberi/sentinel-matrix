### Instruction & Roadmap: Batch 1 Production Scenarios

We will now build, populate, and package the first **3 large-scale production scenarios**:

1. **Scenario 01: `water_utility_regional_grid`** (20 containers: 1 Nexus, 3 Edge Nodes, 4 PLCs, 12 Field Sensors, 1 Adversary, 1 Traffic-Gen).
2. **Scenario 02: `substation_500kv_transmission`** (20 containers: 1 Nexus, 3 Edge Nodes, 4 Grid IEDs, 11 Substation Sensors, 1 Adversary, 1 Traffic-Gen).
3. **Scenario 03: `smart_factory_5g_robotics`** (24 containers: 1 Nexus, 4 Edge Nodes, 1 5G UPF Gateway, 3 S7 PACs, 14 Factory Sensors, 1 Adversary, 1 Traffic-Gen).

---

# Scenario 01: Municipal Water Treatment & Regional Distribution Grid

### Step 1.1: Create Directory Tree
```bash
mkdir -p /home/kami/sentinel-matrix/scenarios/water_utility_regional_grid/{models,configs,pcaps}
```

### Step 1.2: Populate Models, Configs & PCAPs
```bash
# Copy verified models
cp /home/kami/sentinel-matrix/shared/models/network_threat_detector.onnx /home/kami/sentinel-matrix/scenarios/water_utility_regional_grid/models/
cp /home/kami/sentinel-matrix/shared/models/network_threat_int8.onnx /home/kami/sentinel-matrix/scenarios/water_utility_regional_grid/models/
cp /home/kami/sentinel-matrix/shared/models/power_quality_anomaly.onnx* /home/kami/sentinel-matrix/scenarios/water_utility_regional_grid/models/ 2>/dev/null || true

# Copy attack PCAP & register map
cp /home/kami/sentinel-matrix/shared/datasets/modbus_uiuc_scada_attack.pcap /home/kami/sentinel-matrix/scenarios/water_utility_regional_grid/pcaps/
cp /home/kami/sentinel-matrix/configs/plc_register_map.json /home/kami/sentinel-matrix/scenarios/water_utility_regional_grid/configs/ 2>/dev/null || true
```

### Step 1.3: Create `manifest.json`
Create `/home/kami/sentinel-matrix/scenarios/water_utility_regional_grid/manifest.json`:
```json
{
  "name": "water_utility_regional_grid",
  "slug": "water_utility_regional_grid",
  "title": "Municipal Water Treatment & Regional Distribution Grid",
  "version": "1.0.0",
  "asset_type": "scenario",
  "target_sector": "WATER_TREATMENT",
  "sector": "WATER_TREATMENT",
  "complexity": "ADVANCED",
  "category": "SCADA_ICS",
  "author": "Aryorithm Certified Engineer",
  "description": "20-node water utility digital twin: 3 Edge Appliances, 4 PLCs, 12 Field Sensors, Nexus C2, and physical multi-stage water treatment.",
  "dependencies": {
    "models": [
      "network_threat_detector.onnx",
      "network_threat_int8.onnx",
      "power_quality_anomaly.onnx"
    ],
    "pcaps": [
      "modbus_uiuc_scada_attack.pcap"
    ]
  },
  "compliance": ["IEC-62443-4-2", "NIS2", "WATER_ISAC"]
}
```

### Step 1.4: Create `scenario.yaml` (20 Containers)
Create `/home/kami/sentinel-matrix/scenarios/water_utility_regional_grid/scenario.yaml`:
```yaml
version: "1.0"
scenario:
  name: "water_utility_regional_grid"
  description: "20-Node Regional Drinking Water Production & Treatment Grid"

networks:
  enterprise_dmz_net:
    driver: bridge
    subnet: "192.168.10.0/24"
    gateway: "192.168.10.1"
    internal: false
  water_scada_core_net:
    driver: bridge
    subnet: "10.210.10.0/24"
    gateway: "10.210.10.1"
    internal: true
  water_fieldbus_net:
    driver: bridge
    subnet: "10.210.20.0/24"
    gateway: "10.210.20.1"
    internal: true

volumes:
  shared-models: { driver: local }
  shared-datasets: { driver: local }
  shared-logs: { driver: local }

services:
  # C2 COMMAND PLANE
  nexus:
    build: { context: ., dockerfile: docker/Dockerfile.nexus }
    container_name: matrix-water-nexus
    hostname: nexus.water.internal
    restart: unless-stopped
    privileged: true
    networks:
      enterprise_dmz_net: { ipv4_address: "192.168.10.10" }
      water_scada_core_net: { ipv4_address: "10.210.10.10" }
    ports: ["50051:50051", "9443:9443", "9444:9444"]
    volumes:
      - ./configs:/opt/sentinel-nexus/configs:ro
      - ./models:/opt/sentinel-nexus/models
      - ./shared/lib:/usr/local/lib/matrix-deps:ro
      - ./shared/bin/sentinel-nexus:/usr/local/bin/sentinel-nexus:ro
      - ./web:/opt/sentinel-nexus/web:ro
    environment:
      - LD_LIBRARY_PATH=/usr/local/lib/matrix-deps
      - VMWARE_ENVIRONMENT=true
      - NEXUS_ENV=simulation

  # 3 EDGE APPLIANCES
  sentinel-edge-intake:
    build: { context: ., dockerfile: docker/Dockerfile.sentinel }
    container_name: matrix-water-edge-intake
    hostname: edge-intake.water.internal
    restart: unless-stopped
    privileged: true
    cap_add: [NET_ADMIN, SYS_ADMIN, BPF]
    networks:
      water_scada_core_net: { ipv4_address: "10.210.10.101" }
      water_fieldbus_net: { ipv4_address: "10.210.20.101" }
    volumes:
      - ./configs:/etc/sentinel/configs:ro
      - ./models:/etc/sentinel/models:rw
      - ./shared/lib:/usr/local/lib/matrix-deps:ro
      - ./shared/bin/sentinel:/usr/local/bin/sentinel:ro
    environment:
      - LD_LIBRARY_PATH=/usr/local/lib/matrix-deps
      - NODE_IDENTIFIER=Edge-Water-Intake
      - PRIMARY_BACKEND=INTEL_OPENVINO
      - NEXUS_HOST=10.210.10.10
      - NEXUS_PORT=50051

  sentinel-edge-filtration:
    build: { context: ., dockerfile: docker/Dockerfile.sentinel }
    container_name: matrix-water-edge-filtration
    hostname: edge-filtration.water.internal
    restart: unless-stopped
    privileged: true
    cap_add: [NET_ADMIN, SYS_ADMIN, BPF]
    networks:
      water_scada_core_net: { ipv4_address: "10.210.10.102" }
      water_fieldbus_net: { ipv4_address: "10.210.20.102" }
    volumes:
      - ./configs:/etc/sentinel/configs:ro
      - ./models:/etc/sentinel/models:rw
      - ./shared/lib:/usr/local/lib/matrix-deps:ro
      - ./shared/bin/sentinel:/usr/local/bin/sentinel:ro
    environment:
      - LD_LIBRARY_PATH=/usr/local/lib/matrix-deps
      - NODE_IDENTIFIER=Edge-Water-Filtration
      - PRIMARY_BACKEND=NVIDIA_TENSORRT
      - NEXUS_HOST=10.210.10.10
      - NEXUS_PORT=50051

  sentinel-edge-distribution:
    build: { context: ., dockerfile: docker/Dockerfile.sentinel }
    container_name: matrix-water-edge-distribution
    hostname: edge-distribution.water.internal
    restart: unless-stopped
    privileged: true
    cap_add: [NET_ADMIN, SYS_ADMIN, BPF]
    networks:
      water_scada_core_net: { ipv4_address: "10.210.10.103" }
      water_fieldbus_net: { ipv4_address: "10.210.20.103" }
    volumes:
      - ./configs:/etc/sentinel/configs:ro
      - ./models:/etc/sentinel/models:rw
      - ./shared/lib:/usr/local/lib/matrix-deps:ro
      - ./shared/bin/sentinel:/usr/local/bin/sentinel:ro
    environment:
      - LD_LIBRARY_PATH=/usr/local/lib/matrix-deps
      - NODE_IDENTIFIER=Edge-Water-Distribution
      - PRIMARY_BACKEND=ROCKCHIP_RKNN
      - NEXUS_HOST=10.210.10.10
      - NEXUS_PORT=50051

  # 4 MOCK PLCS
  plc-intake-pump:
    image: sentinel-matrix/device-runtime:latest
    container_name: matrix-water-plc-intake
    networks: { water_fieldbus_net: { ipv4_address: "10.210.20.11" } }
    ports: ["15501:502"]
    command: ["--archetype", "plc", "--protocol", "modbus", "--port", "502", "--name", "Intake-Pump-PLC"]

  plc-filtration:
    image: sentinel-matrix/device-runtime:latest
    container_name: matrix-water-plc-filter
    networks: { water_fieldbus_net: { ipv4_address: "10.210.20.12" } }
    ports: ["15502:502"]
    command: ["--archetype", "plc", "--protocol", "modbus", "--port", "502", "--name", "Filtration-PLC"]

  plc-chlorine-dosing:
    image: sentinel-matrix/device-runtime:latest
    container_name: matrix-water-plc-chlorine
    networks: { water_fieldbus_net: { ipv4_address: "10.210.20.13" } }
    ports: ["15503:502"]
    command: ["--archetype", "plc", "--protocol", "modbus", "--port", "502", "--name", "Chlorine-Dosing-PLC"]

  plc-reservoir-booster:
    image: sentinel-matrix/device-runtime:latest
    container_name: matrix-water-plc-reservoir
    networks: { water_fieldbus_net: { ipv4_address: "10.210.20.14" } }
    ports: ["15102:102"]
    command: ["--archetype", "plc", "--protocol", "s7comm", "--port", "102", "--name", "Reservoir-S7-PLC"]

  # 12 FIELD SENSORS
  sensor-flow-intake:
    image: sentinel-matrix/device-runtime:latest
    container_name: matrix-water-sens-flow-intake
    networks: { water_fieldbus_net: { ipv4_address: "10.210.20.21" } }
    command: ["--archetype", "sensor", "--protocol", "stream_telemetry", "--port", "9001", "--name", "Intake-Flowmeter"]

  sensor-suction-pressure:
    image: sentinel-matrix/device-runtime:latest
    container_name: matrix-water-sens-suction-press
    networks: { water_fieldbus_net: { ipv4_address: "10.210.20.22" } }
    command: ["--archetype", "sensor", "--protocol", "modbus", "--port", "502", "--name", "Suction-Pressure-Sensor"]

  sensor-raw-turbidity:
    image: sentinel-matrix/device-runtime:latest
    container_name: matrix-water-sens-turbidity
    networks: { water_fieldbus_net: { ipv4_address: "10.210.20.23" } }
    command: ["--archetype", "sensor", "--protocol", "modbus", "--port", "502", "--name", "Turbidity-Probe"]

  sensor-filter-diffpress:
    image: sentinel-matrix/device-runtime:latest
    container_name: matrix-water-sens-diffpress
    networks: { water_fieldbus_net: { ipv4_address: "10.210.20.24" } }
    command: ["--archetype", "sensor", "--protocol", "modbus", "--port", "502", "--name", "Filter-DiffPressure"]

  sensor-filter-water-level:
    image: sentinel-matrix/device-runtime:latest
    container_name: matrix-water-sens-level
    networks: { water_fieldbus_net: { ipv4_address: "10.210.20.25" } }
    command: ["--archetype", "sensor", "--protocol", "stream_telemetry", "--port", "9002", "--name", "Filter-Water-Level"]

  sensor-backwash-flow:
    image: sentinel-matrix/device-runtime:latest
    container_name: matrix-water-sens-backwash
    networks: { water_fieldbus_net: { ipv4_address: "10.210.20.26" } }
    command: ["--archetype", "sensor", "--protocol", "modbus", "--port", "502", "--name", "Backwash-Flowmeter"]

  sensor-chlorine-residual:
    image: sentinel-matrix/device-runtime:latest
    container_name: matrix-water-sens-chlorine
    networks: { water_fieldbus_net: { ipv4_address: "10.210.20.27" } }
    command: ["--archetype", "sensor", "--protocol", "modbus", "--port", "502", "--name", "Chlorine-Residual-Analyzer"]

  sensor-water-ph:
    image: sentinel-matrix/device-runtime:latest
    container_name: matrix-water-sens-ph
    networks: { water_fieldbus_net: { ipv4_address: "10.210.20.28" } }
    command: ["--archetype", "sensor", "--protocol", "modbus", "--port", "502", "--name", "Water-pH-Sensor"]

  sensor-chem-tank-level:
    image: sentinel-matrix/device-runtime:latest
    container_name: matrix-water-sens-chem-tank
    networks: { water_fieldbus_net: { ipv4_address: "10.210.20.29" } }
    command: ["--archetype", "sensor", "--protocol", "stream_telemetry", "--port", "9003", "--name", "Chemical-Tank-Level"]

  sensor-booster-vibration:
    image: sentinel-matrix/device-runtime:latest
    container_name: matrix-water-sens-vibration
    networks: { water_fieldbus_net: { ipv4_address: "10.210.20.30" } }
    command: ["--archetype", "sensor", "--protocol", "modbus", "--port", "502", "--name", "Booster-Pump-Vibration"]

  sensor-discharge-pressure:
    image: sentinel-matrix/device-runtime:latest
    container_name: matrix-water-sens-discharge-press
    networks: { water_fieldbus_net: { ipv4_address: "10.210.20.31" } }
    command: ["--archetype", "sensor", "--protocol", "modbus", "--port", "502", "--name", "Discharge-Pressure-Transmitter"]

  sensor-substation-power:
    image: sentinel-matrix/device-runtime:latest
    container_name: matrix-water-sens-power
    networks: { water_fieldbus_net: { ipv4_address: "10.210.20.32" } }
    command: ["--archetype", "sensor", "--protocol", "modbus", "--port", "502", "--name", "PAC3200-Power-Meter"]

  # ATTACKERS & SIMULATORS
  traffic-gen:
    build: { context: ., dockerfile: docker/Dockerfile.traffic }
    container_name: matrix-water-traffic-gen
    hostname: traffic.water.internal
    restart: unless-stopped
    networks: { water_scada_core_net: { ipv4_address: "10.210.10.50" } }
    volumes:
      - ./configs:/configs:ro
      - ./src:/app/src:ro
      - ./pcaps:/shared/datasets:ro
    environment:
      - NEXUS_ENDPOINT=10.210.10.10:50051
      - TARGET_NODES=10.210.10.101,10.210.10.102,10.210.10.103

  adversary:
    build: { context: ., dockerfile: docker/Dockerfile.adversary }
    container_name: matrix-water-adversary
    hostname: adversary.water.internal
    restart: unless-stopped
    networks: { water_scada_core_net: { ipv4_address: "10.210.10.99" } }
    volumes:
      - ./configs:/configs:ro
      - ./src:/app/src:ro
    environment:
      - NEXUS_REST_URL=http://10.210.10.10:9443
      - TARGET_NODES=10.210.10.101,10.210.10.102,10.210.10.103
```

### Step 1.5: Create `run_demo.sh`
Create `/home/kami/sentinel-matrix/scenarios/water_utility_regional_grid/run_demo.sh`:
```bash
cat << 'EOF' > /home/kami/sentinel-matrix/scenarios/water_utility_regional_grid/run_demo.sh
#!/usr/bin/env bash
set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
echo -e "\033[1;36m[*] Launching 20-Node Regional Water Treatment Grid...\033[0m"
python3 /home/kami/sentinel-matrix/tools/scenario_engine.py load "${SCRIPT_DIR}/scenario.yaml"
EOF
chmod +x /home/kami/sentinel-matrix/scenarios/water_utility_regional_grid/run_demo.sh
```

---

# Scenario 02: High-Voltage Transmission Substation & Interconnection

### Step 2.1: Create Directory Tree
```bash
mkdir -p /home/kami/sentinel-matrix/scenarios/substation_500kv_transmission/{models,configs,pcaps}
```

### Step 2.2: Populate Models, Configs & PCAPs
```bash
cp /home/kami/sentinel-matrix/shared/models/network_threat_int8.onnx /home/kami/sentinel-matrix/scenarios/substation_500kv_transmission/models/
cp /home/kami/sentinel-matrix/shared/models/power_quality_anomaly.onnx* /home/kami/sentinel-matrix/scenarios/substation_500kv_transmission/models/ 2>/dev/null || true
cp /home/kami/sentinel-matrix/shared/models/vibration_spectral_ae.onnx* /home/kami/sentinel-matrix/scenarios/substation_500kv_transmission/models/ 2>/dev/null || true

cp /home/kami/sentinel-matrix/shared/datasets/industroyer2_substation.pcap /home/kami/sentinel-matrix/scenarios/substation_500kv_transmission/pcaps/
cp /home/kami/sentinel-matrix/configs/plc_register_map.json /home/kami/sentinel-matrix/scenarios/substation_500kv_transmission/configs/ 2>/dev/null || true
```

### Step 2.3: Create `manifest.json`
Create `/home/kami/sentinel-matrix/scenarios/substation_500kv_transmission/manifest.json`:
```json
{
  "name": "substation_500kv_transmission",
  "slug": "substation_500kv_transmission",
  "title": "High-Voltage 500kV Substation & Grid Interconnection",
  "version": "1.0.0",
  "asset_type": "scenario",
  "target_sector": "POWER_GRID",
  "sector": "POWER_GRID",
  "complexity": "ADVANCED",
  "category": "SCADA_ICS",
  "author": "Aryorithm Certified Engineer",
  "description": "20-node transmission substation digital twin: 3 Edge Protection Nodes, 4 IEDs (IEC-104 & DNP3), 11 PMU sensors, and Industroyer2 defense.",
  "dependencies": {
    "models": [
      "network_threat_int8.onnx",
      "power_quality_anomaly.onnx",
      "vibration_spectral_ae.onnx"
    ],
    "pcaps": [
      "industroyer2_substation.pcap"
    ]
  },
  "compliance": ["IEC-62443-4-2", "NERC-CIP", "NIS2"]
}
```

### Step 2.4: Create `scenario.yaml` (20 Containers)
Create `/home/kami/sentinel-matrix/scenarios/substation_500kv_transmission/scenario.yaml`:
```yaml
version: "1.0"
scenario:
  name: "substation_500kv_transmission"
  description: "20-Node 500kV Transmission Substation Protection Grid"

networks:
  tso_wan_net:
    driver: bridge
    subnet: "192.168.50.0/24"
    gateway: "192.168.50.1"
    internal: false
  station_bus_net:
    driver: bridge
    subnet: "10.240.10.0/24"
    gateway: "10.240.10.1"
    internal: true
  process_bus_net:
    driver: bridge
    subnet: "10.240.20.0/24"
    gateway: "10.240.20.1"
    internal: true

volumes:
  shared-models: { driver: local }
  shared-datasets: { driver: local }
  shared-logs: { driver: local }

services:
  # C2 COMMAND PLANE
  nexus:
    build: { context: ., dockerfile: docker/Dockerfile.nexus }
    container_name: matrix-grid-nexus
    hostname: nexus.grid.internal
    restart: unless-stopped
    privileged: true
    networks:
      tso_wan_net: { ipv4_address: "192.168.50.10" }
      station_bus_net: { ipv4_address: "10.240.10.10" }
    ports: ["50051:50051", "9443:9443", "9444:9444"]
    volumes:
      - ./configs:/opt/sentinel-nexus/configs:ro
      - ./models:/opt/sentinel-nexus/models
      - ./shared/lib:/usr/local/lib/matrix-deps:ro
      - ./shared/bin/sentinel-nexus:/usr/local/bin/sentinel-nexus:ro
      - ./web:/opt/sentinel-nexus/web:ro
    environment:
      - LD_LIBRARY_PATH=/usr/local/lib/matrix-deps
      - VMWARE_ENVIRONMENT=true
      - NEXUS_ENV=simulation

  # 3 EDGE APPLIANCES
  sentinel-edge-bay01:
    build: { context: ., dockerfile: docker/Dockerfile.sentinel }
    container_name: matrix-grid-edge-bay01
    hostname: edge-bay01.grid.internal
    restart: unless-stopped
    privileged: true
    cap_add: [NET_ADMIN, SYS_ADMIN, BPF]
    networks:
      station_bus_net: { ipv4_address: "10.240.10.101" }
      process_bus_net: { ipv4_address: "10.240.20.101" }
    volumes:
      - ./configs:/etc/sentinel/configs:ro
      - ./models:/etc/sentinel/models:rw
      - ./shared/lib:/usr/local/lib/matrix-deps:ro
      - ./shared/bin/sentinel:/usr/local/bin/sentinel:ro
    environment:
      - LD_LIBRARY_PATH=/usr/local/lib/matrix-deps
      - NODE_IDENTIFIER=Edge-Grid-Bay01
      - PRIMARY_BACKEND=INTEL_OPENVINO
      - NEXUS_HOST=10.240.10.10
      - NEXUS_PORT=50051

  sentinel-edge-bay02:
    build: { context: ., dockerfile: docker/Dockerfile.sentinel }
    container_name: matrix-grid-edge-bay02
    hostname: edge-bay02.grid.internal
    restart: unless-stopped
    privileged: true
    cap_add: [NET_ADMIN, SYS_ADMIN, BPF]
    networks:
      station_bus_net: { ipv4_address: "10.240.10.102" }
      process_bus_net: { ipv4_address: "10.240.20.102" }
    volumes:
      - ./configs:/etc/sentinel/configs:ro
      - ./models:/etc/sentinel/models:rw
      - ./shared/lib:/usr/local/lib/matrix-deps:ro
      - ./shared/bin/sentinel:/usr/local/bin/sentinel:ro
    environment:
      - LD_LIBRARY_PATH=/usr/local/lib/matrix-deps
      - NODE_IDENTIFIER=Edge-Grid-Bay02
      - PRIMARY_BACKEND=NVIDIA_TENSORRT
      - NEXUS_HOST=10.240.10.10
      - NEXUS_PORT=50051

  sentinel-edge-busbar:
    build: { context: ., dockerfile: docker/Dockerfile.sentinel }
    container_name: matrix-grid-edge-busbar
    hostname: edge-busbar.grid.internal
    restart: unless-stopped
    privileged: true
    cap_add: [NET_ADMIN, SYS_ADMIN, BPF]
    networks:
      station_bus_net: { ipv4_address: "10.240.10.103" }
      process_bus_net: { ipv4_address: "10.240.20.103" }
    volumes:
      - ./configs:/etc/sentinel/configs:ro
      - ./models:/etc/sentinel/models:rw
      - ./shared/lib:/usr/local/lib/matrix-deps:ro
      - ./shared/bin/sentinel:/usr/local/bin/sentinel:ro
    environment:
      - LD_LIBRARY_PATH=/usr/local/lib/matrix-deps
      - NODE_IDENTIFIER=Edge-Grid-Busbar
      - PRIMARY_BACKEND=ROCKCHIP_RKNN
      - NEXUS_HOST=10.240.10.10
      - NEXUS_PORT=50051

  # 4 SUBSTATION IEDS
  ied-relion-670:
    image: sentinel-matrix/device-runtime:latest
    container_name: matrix-grid-ied-relion
    networks: { process_bus_net: { ipv4_address: "10.240.20.11" } }
    ports: ["17401:2404"]
    command: ["--archetype", "ied", "--protocol", "iec104", "--port", "2404", "--name", "ABB-Relion-670-Relay"]

  ied-siprotec-5:
    image: sentinel-matrix/device-runtime:latest
    container_name: matrix-grid-ied-siprotec
    networks: { process_bus_net: { ipv4_address: "10.240.20.12" } }
    ports: ["17402:2404"]
    command: ["--archetype", "ied", "--protocol", "iec104", "--port", "2404", "--name", "Siemens-SIPROTEC-5"]

  ied-sel-411l:
    image: sentinel-matrix/device-runtime:latest
    container_name: matrix-grid-ied-sel
    networks: { process_bus_net: { ipv4_address: "10.240.20.13" } }
    ports: ["17403:20000"]
    command: ["--archetype", "ied", "--protocol", "modbus", "--port", "20000", "--name", "SEL-411L-DNP3-Relay"]

  ied-bus-coupler:
    image: sentinel-matrix/device-runtime:latest
    container_name: matrix-grid-ied-coupler
    networks: { process_bus_net: { ipv4_address: "10.240.20.14" } }
    ports: ["17404:2404"]
    command: ["--archetype", "ied", "--protocol", "iec104", "--port", "2404", "--name", "Busbar-Coupler-IED"]

  # 11 SUBSTATION SENSORS
  sensor-active-power-mw:
    image: sentinel-matrix/device-runtime:latest
    container_name: matrix-grid-sens-mw
    networks: { process_bus_net: { ipv4_address: "10.240.20.21" } }
    command: ["--archetype", "sensor", "--protocol", "stream_telemetry", "--port", "9101", "--name", "Active-Power-MW"]

  sensor-reactive-power-mvar:
    image: sentinel-matrix/device-runtime:latest
    container_name: matrix-grid-sens-mvar
    networks: { process_bus_net: { ipv4_address: "10.240.20.22" } }
    command: ["--archetype", "sensor", "--protocol", "stream_telemetry", "--port", "9102", "--name", "Reactive-Power-MVAR"]

  sensor-grid-frequency:
    image: sentinel-matrix/device-runtime:latest
    container_name: matrix-grid-sens-freq
    networks: { process_bus_net: { ipv4_address: "10.240.20.23" } }
    command: ["--archetype", "sensor", "--protocol", "modbus", "--port", "502", "--name", "Grid-Frequency-50Hz"]

  sensor-busbar-pt:
    image: sentinel-matrix/device-runtime:latest
    container_name: matrix-grid-sens-pt
    networks: { process_bus_net: { ipv4_address: "10.240.20.24" } }
    command: ["--archetype", "sensor", "--protocol", "modbus", "--port", "502", "--name", "Busbar-Voltage-PT"]

  sensor-feeder-ct:
    image: sentinel-matrix/device-runtime:latest
    container_name: matrix-grid-sens-ct
    networks: { process_bus_net: { ipv4_address: "10.240.20.25" } }
    command: ["--archetype", "sensor", "--protocol", "modbus", "--port", "502", "--name", "Feeder-Current-CT"]

  sensor-trafo-winding-temp:
    image: sentinel-matrix/device-runtime:latest
    container_name: matrix-grid-sens-trafo-temp
    networks: { process_bus_net: { ipv4_address: "10.240.20.26" } }
    command: ["--archetype", "sensor", "--protocol", "modbus", "--port", "502", "--name", "Trafo-Winding-Temp"]

  sensor-trafo-oil-level:
    image: sentinel-matrix/device-runtime:latest
    container_name: matrix-grid-sens-oil
    networks: { process_bus_net: { ipv4_address: "10.240.20.27" } }
    command: ["--archetype", "sensor", "--protocol", "stream_telemetry", "--port", "9103", "--name", "Trafo-Oil-Level"]

  sensor-sf6-gas-density:
    image: sentinel-matrix/device-runtime:latest
    container_name: matrix-grid-sens-sf6
    networks: { process_bus_net: { ipv4_address: "10.240.20.28" } }
    command: ["--archetype", "sensor", "--protocol", "modbus", "--port", "502", "--name", "SF6-Gas-Density"]

  sensor-trip-coil-current:
    image: sentinel-matrix/device-runtime:latest
    container_name: matrix-grid-sens-trip-coil
    networks: { process_bus_net: { ipv4_address: "10.240.20.29" } }
    command: ["--archetype", "sensor", "--protocol", "modbus", "--port", "502", "--name", "Trip-Coil-Current"]

  sensor-dc-battery-bank:
    image: sentinel-matrix/device-runtime:latest
    container_name: matrix-grid-sens-dc-battery
    networks: { process_bus_net: { ipv4_address: "10.240.20.30" } }
    command: ["--archetype", "sensor", "--protocol", "modbus", "--port", "502", "--name", "DC-Battery-Bank"]

  sensor-pmu-synchrophasor:
    image: sentinel-matrix/device-runtime:latest
    container_name: matrix-grid-sens-pmu
    networks: { process_bus_net: { ipv4_address: "10.240.20.31" } }
    command: ["--archetype", "sensor", "--protocol", "stream_telemetry", "--port", "9104", "--name", "PMU-C37-118-Phasor"]

  # ATTACKERS & SIMULATORS
  traffic-gen:
    build: { context: ., dockerfile: docker/Dockerfile.traffic }
    container_name: matrix-grid-traffic-gen
    hostname: traffic.grid.internal
    restart: unless-stopped
    networks: { station_bus_net: { ipv4_address: "10.240.10.50" } }
    volumes:
      - ./configs:/configs:ro
      - ./src:/app/src:ro
      - ./pcaps:/shared/datasets:ro
    environment:
      - NEXUS_ENDPOINT=10.240.10.10:50051
      - TARGET_NODES=10.240.10.101,10.240.10.102,10.240.10.103

  adversary:
    build: { context: ., dockerfile: docker/Dockerfile.adversary }
    container_name: matrix-grid-adversary
    hostname: adversary.grid.internal
    restart: unless-stopped
    networks: { station_bus_net: { ipv4_address: "10.240.10.99" } }
    volumes:
      - ./configs:/configs:ro
      - ./src:/app/src:ro
    environment:
      - NEXUS_REST_URL=http://10.240.10.10:9443
      - TARGET_NODES=10.240.10.101,10.240.10.102,10.240.10.103
```

### Step 2.5: Create `run_demo.sh`
```bash
cat << 'EOF' > /home/kami/sentinel-matrix/scenarios/substation_500kv_transmission/run_demo.sh
#!/usr/bin/env bash
set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
echo -e "\033[1;36m[*] Launching 20-Node 500kV Transmission Substation Grid...\033[0m"
python3 /home/kami/sentinel-matrix/tools/scenario_engine.py load "${SCRIPT_DIR}/scenario.yaml"
EOF
chmod +x /home/kami/sentinel-matrix/scenarios/substation_500kv_transmission/run_demo.sh
```

---

# Scenario 03: Private 5G Automotive Robot Assembly Gigafactory

### Step 3.1: Create Directory Tree
```bash
mkdir -p /home/kami/sentinel-matrix/scenarios/smart_factory_5g_robotics/{models,configs,pcaps}
```

### Step 3.2: Populate Models, Configs & PCAPs
```bash
cp /home/kami/sentinel-matrix/shared/models/network_threat_int8.onnx /home/kami/sentinel-matrix/scenarios/smart_factory_5g_robotics/models/
cp /home/kami/sentinel-matrix/shared/models/lidar_spatial_detector.onnx* /home/kami/sentinel-matrix/scenarios/smart_factory_5g_robotics/models/ 2>/dev/null || true
cp /home/kami/sentinel-matrix/shared/models/thermal_anomaly_vision.onnx /home/kami/sentinel-matrix/scenarios/smart_factory_5g_robotics/models/ 2>/dev/null || true

cp /home/kami/sentinel-matrix/shared/datasets/cve_2023_44487_rapid_reset.pcap /home/kami/sentinel-matrix/scenarios/smart_factory_5g_robotics/pcaps/
cp /home/kami/sentinel-matrix/shared/datasets/stuxnet_s7comm_injected.pcap /home/kami/sentinel-matrix/scenarios/smart_factory_5g_robotics/pcaps/
cp /home/kami/sentinel-matrix/configs/5g_slices.yaml /home/kami/sentinel-matrix/scenarios/smart_factory_5g_robotics/configs/ 2>/dev/null || true
```

### Step 3.3: Create `manifest.json`
Create `/home/kami/sentinel-matrix/scenarios/smart_factory_5g_robotics/manifest.json`:
```json
{
  "name": "smart_factory_5g_robotics",
  "slug": "smart_factory_5g_robotics",
  "title": "Private 5G Automotive Robotic Assembly Gigafactory",
  "version": "1.0.0",
  "asset_type": "scenario",
  "target_sector": "SMART_MANUFACTURING",
  "sector": "SMART_MANUFACTURING",
  "complexity": "ADVANCED",
  "category": "SCADA_ICS",
  "author": "Aryorithm Certified Engineer",
  "description": "24-node private 5G factory digital twin: 4 Edge Nodes, 1 5G UPF Gateway, 3 Siemens S7-1500 PACs, 14 Field Sensors, and in-kernel GTP-U slicing.",
  "dependencies": {
    "models": [
      "network_threat_int8.onnx",
      "lidar_spatial_detector.onnx",
      "thermal_anomaly_vision.onnx"
    ],
    "pcaps": [
      "cve_2023_44487_rapid_reset.pcap",
      "stuxnet_s7comm_injected.pcap"
    ]
  },
  "compliance": ["IEC-62443-4-2", "3GPP-REL-18", "NIS2"]
}
```

### Step 3.4: Create `scenario.yaml` (24 Containers)
Create `/home/kami/sentinel-matrix/scenarios/smart_factory_5g_robotics/scenario.yaml`:
```yaml
version: "1.0"
scenario:
  name: "smart_factory_5g_robotics"
  description: "24-Node Private 5G Automotive Assembly Gigafactory"

networks:
  factory_it_net:
    driver: bridge
    subnet: "172.16.10.0/24"
    gateway: "172.16.10.1"
    internal: false
  private_5g_n3_tunnel:
    driver: bridge
    subnet: "10.250.10.0/24"
    gateway: "10.250.10.1"
    internal: true
  urllc_robot_cell_net:
    driver: bridge
    subnet: "10.250.20.0/24"
    gateway: "10.250.20.1"
    internal: true

volumes:
  shared-models: { driver: local }
  shared-datasets: { driver: local }
  shared-logs: { driver: local }

services:
  # C2 COMMAND PLANE
  nexus:
    build: { context: ., dockerfile: docker/Dockerfile.nexus }
    container_name: matrix-5g-nexus
    hostname: nexus.factory.internal
    restart: unless-stopped
    privileged: true
    networks:
      factory_it_net: { ipv4_address: "172.16.10.10" }
      private_5g_n3_tunnel: { ipv4_address: "10.250.10.10" }
    ports: ["50051:50051", "9443:9443", "9444:9444"]
    volumes:
      - ./configs:/opt/sentinel-nexus/configs:ro
      - ./models:/opt/sentinel-nexus/models
      - ./shared/lib:/usr/local/lib/matrix-deps:ro
      - ./shared/bin/sentinel-nexus:/usr/local/bin/sentinel-nexus:ro
      - ./web:/opt/sentinel-nexus/web:ro
    environment:
      - LD_LIBRARY_PATH=/usr/local/lib/matrix-deps
      - VMWARE_ENVIRONMENT=true
      - NEXUS_ENV=simulation

  # 3GPP STANDALONE UPF GATEWAY
  upf-gateway:
    image: sentinel-matrix/device-runtime:latest
    container_name: matrix-5g-upf
    hostname: upf.factory.internal
    restart: unless-stopped
    networks:
      factory_it_net: { ipv4_address: "172.16.10.5" }
      private_5g_n3_tunnel: { ipv4_address: "10.250.10.5" }
    ports: ["2152:2152/udp"]
    command: ["--archetype", "5g_gateway", "--protocol", "gtpu", "--port", "2152", "--name", "N3-GTPU-UPF-Gateway"]

  # 4 EDGE APPLIANCES
  sentinel-edge-welding:
    build: { context: ., dockerfile: docker/Dockerfile.sentinel }
    container_name: matrix-5g-edge-welding
    hostname: edge-welding.factory.internal
    restart: unless-stopped
    privileged: true
    cap_add: [NET_ADMIN, SYS_ADMIN, BPF]
    networks:
      private_5g_n3_tunnel: { ipv4_address: "10.250.10.101" }
      urllc_robot_cell_net: { ipv4_address: "10.250.20.101" }
    volumes:
      - ./configs:/etc/sentinel/configs:ro
      - ./models:/etc/sentinel/models:rw
      - ./shared/lib:/usr/local/lib/matrix-deps:ro
      - ./shared/bin/sentinel:/usr/local/bin/sentinel:ro
    environment:
      - LD_LIBRARY_PATH=/usr/local/lib/matrix-deps
      - NODE_IDENTIFIER=Edge-5G-Welding
      - PRIMARY_BACKEND=INTEL_OPENVINO
      - NEXUS_HOST=10.250.10.10
      - NEXUS_PORT=50051

  sentinel-edge-paint:
    build: { context: ., dockerfile: docker/Dockerfile.sentinel }
    container_name: matrix-5g-edge-paint
    hostname: edge-paint.factory.internal
    restart: unless-stopped
    privileged: true
    cap_add: [NET_ADMIN, SYS_ADMIN, BPF]
    networks:
      private_5g_n3_tunnel: { ipv4_address: "10.250.10.102" }
      urllc_robot_cell_net: { ipv4_address: "10.250.20.102" }
    volumes:
      - ./configs:/etc/sentinel/configs:ro
      - ./models:/etc/sentinel/models:rw
      - ./shared/lib:/usr/local/lib/matrix-deps:ro
      - ./shared/bin/sentinel:/usr/local/bin/sentinel:ro
    environment:
      - LD_LIBRARY_PATH=/usr/local/lib/matrix-deps
      - NODE_IDENTIFIER=Edge-5G-Paint
      - PRIMARY_BACKEND=NVIDIA_TENSORRT
      - NEXUS_HOST=10.250.10.10
      - NEXUS_PORT=50051

  sentinel-edge-battery:
    build: { context: ., dockerfile: docker/Dockerfile.sentinel }
    container_name: matrix-5g-edge-battery
    hostname: edge-battery.factory.internal
    restart: unless-stopped
    privileged: true
    cap_add: [NET_ADMIN, SYS_ADMIN, BPF]
    networks:
      private_5g_n3_tunnel: { ipv4_address: "10.250.10.103" }
      urllc_robot_cell_net: { ipv4_address: "10.250.20.103" }
    volumes:
      - ./configs:/etc/sentinel/configs:ro
      - ./models:/etc/sentinel/models:rw
      - ./shared/lib:/usr/local/lib/matrix-deps:ro
      - ./shared/bin/sentinel:/usr/local/bin/sentinel:ro
    environment:
      - LD_LIBRARY_PATH=/usr/local/lib/matrix-deps
      - NODE_IDENTIFIER=Edge-5G-Battery
      - PRIMARY_BACKEND=ROCKCHIP_RKNN
      - NEXUS_HOST=10.250.10.10
      - NEXUS_PORT=50051

  sentinel-edge-agv:
    build: { context: ., dockerfile: docker/Dockerfile.sentinel }
    container_name: matrix-5g-edge-agv
    hostname: edge-agv.factory.internal
    restart: unless-stopped
    privileged: true
    cap_add: [NET_ADMIN, SYS_ADMIN, BPF]
    networks:
      private_5g_n3_tunnel: { ipv4_address: "10.250.10.104" }
      urllc_robot_cell_net: { ipv4_address: "10.250.20.104" }
    volumes:
      - ./configs:/etc/sentinel/configs:ro
      - ./models:/etc/sentinel/models:rw
      - ./shared/lib:/usr/local/lib/matrix-deps:ro
      - ./shared/bin/sentinel:/usr/local/bin/sentinel:ro
    environment:
      - LD_LIBRARY_PATH=/usr/local/lib/matrix-deps
      - NODE_IDENTIFIER=Edge-5G-AGV
      - PRIMARY_BACKEND=INTEL_OPENVINO
      - NEXUS_HOST=10.250.10.10
      - NEXUS_PORT=50051

  # 3 SIEMENS S7-1500 PACS
  pac-welding-turntable:
    image: sentinel-matrix/device-runtime:latest
    container_name: matrix-5g-pac-turntable
    networks: { urllc_robot_cell_net: { ipv4_address: "10.250.20.11" } }
    ports: ["15102:102"]
    command: ["--archetype", "plc", "--protocol", "s7comm", "--port", "102", "--name", "Welding-Turntable-S7"]

  pac-elevator-lift:
    image: sentinel-matrix/device-runtime:latest
    container_name: matrix-5g-pac-lift
    networks: { urllc_robot_cell_net: { ipv4_address: "10.250.20.12" } }
    ports: ["15103:102"]
    command: ["--archetype", "plc", "--protocol", "s7comm", "--port", "102", "--name", "Elevator-Lift-S7"]

  pac-chassis-transfer:
    image: sentinel-matrix/device-runtime:latest
    container_name: matrix-5g-pac-transfer
    networks: { urllc_robot_cell_net: { ipv4_address: "10.250.20.13" } }
    ports: ["15104:102"]
    command: ["--archetype", "plc", "--protocol", "s7comm", "--port", "102", "--name", "Chassis-Transfer-S7"]

  # 14 FIELD SENSORS & ACTUATORS
  sensor-kuka-torque:
    image: sentinel-matrix/device-runtime:latest
    container_name: matrix-5g-sens-torque
    networks: { urllc_robot_cell_net: { ipv4_address: "10.250.20.21" } }
    command: ["--archetype", "sensor", "--protocol", "stream_telemetry", "--port", "9201", "--name", "KUKA-Joint-Torque"]

  sensor-kuka-motor-temp:
    image: sentinel-matrix/device-runtime:latest
    container_name: matrix-5g-sens-temp
    networks: { urllc_robot_cell_net: { ipv4_address: "10.250.20.22" } }
    command: ["--archetype", "sensor", "--protocol", "modbus", "--port", "502", "--name", "KUKA-Motor-Temp"]

  sensor-laser-seam-cam:
    image: bluenviron/mediamtx:latest-ffmpeg
    container_name: matrix-5g-sens-camera
    hostname: camera.factory.internal
    restart: unless-stopped
    networks: { urllc_robot_cell_net: { ipv4_address: "10.250.20.23" } }
    ports: ["18554:8554"]
    environment:
      - MTX_WEBRTCADDITIONALHOSTS=127.0.0.1
      - MTX_PATHS_THERMAL_FEED_RUNONINIT=ffmpeg -re -f lavfi -i testsrc=size=640x360:rate=15 -pix_fmt yuv420p -c:v libx264 -preset ultrafast -tune zerolatency -f rtsp rtsp://127.0.0.1:8554/thermal_feed

  sensor-weld-pyrometer:
    image: sentinel-matrix/device-runtime:latest
    container_name: matrix-5g-sens-pyro
    networks: { urllc_robot_cell_net: { ipv4_address: "10.250.20.24" } }
    command: ["--archetype", "sensor", "--protocol", "modbus", "--port", "502", "--name", "Infrared-Weld-Pyrometer"]

  sensor-sick-microscan-lidar:
    image: sentinel-matrix/device-runtime:latest
    container_name: matrix-5g-sens-lidar
    networks: { urllc_robot_cell_net: { ipv4_address: "10.250.20.25" } }
    ports: ["12368:2368/udp"]
    command: ["--archetype", "vision", "--protocol", "stream_telemetry", "--port", "2368", "--name", "SICK-MicroScan-LiDAR"]

  sensor-light-curtain:
    image: sentinel-matrix/device-runtime:latest
    container_name: matrix-5g-sens-curtain
    networks: { urllc_robot_cell_net: { ipv4_address: "10.250.20.26" } }
    command: ["--archetype", "sensor", "--protocol", "modbus", "--port", "502", "--name", "Optical-Light-Curtain"]

  sensor-paint-voc-gas:
    image: sentinel-matrix/device-runtime:latest
    container_name: matrix-5g-sens-voc
    networks: { urllc_robot_cell_net: { ipv4_address: "10.250.20.27" } }
    command: ["--archetype", "sensor", "--protocol", "modbus", "--port", "502", "--name", "Paint-VOC-Gas-Sensor"]

  sensor-paint-airflow:
    image: sentinel-matrix/device-runtime:latest
    container_name: matrix-5g-sens-airflow
    networks: { urllc_robot_cell_net: { ipv4_address: "10.250.20.28" } }
    command: ["--archetype", "sensor", "--protocol", "modbus", "--port", "502", "--name", "Paint-Airflow-Transmitter"]

  sensor-agv-odometry:
    image: sentinel-matrix/device-runtime:latest
    container_name: matrix-5g-sens-agv-odom
    networks: { urllc_robot_cell_net: { ipv4_address: "10.250.20.29" } }
    command: ["--archetype", "sensor", "--protocol", "stream_telemetry", "--port", "9202", "--name", "AGV-Wheel-Odometry"]

  sensor-agv-proximity-lidar:
    image: sentinel-matrix/device-runtime:latest
    container_name: matrix-5g-sens-agv-lidar
    networks: { urllc_robot_cell_net: { ipv4_address: "10.250.20.30" } }
    command: ["--archetype", "vision", "--protocol", "stream_telemetry", "--port", "9203", "--name", "AGV-Proximity-LiDAR"]

  sensor-agv-battery-soc:
    image: sentinel-matrix/device-runtime:latest
    container_name: matrix-5g-sens-battery
    networks: { urllc_robot_cell_net: { ipv4_address: "10.250.20.31" } }
    command: ["--archetype", "sensor", "--protocol", "modbus", "--port", "502", "--name", "AGV-Battery-SoC"]

  sensor-battery-insertion-press:
    image: sentinel-matrix/device-runtime:latest
    container_name: matrix-5g-sens-insert-press
    networks: { urllc_robot_cell_net: { ipv4_address: "10.250.20.32" } }
    command: ["--archetype", "sensor", "--protocol", "modbus", "--port", "502", "--name", "Insertion-Pneumatic-Press"]

  sensor-conveyor-speed:
    image: sentinel-matrix/device-runtime:latest
    container_name: matrix-5g-sens-conveyor
    networks: { urllc_robot_cell_net: { ipv4_address: "10.250.20.33" } }
    command: ["--archetype", "sensor", "--protocol", "stream_telemetry", "--port", "9204", "--name", "Conveyor-Speed-Encoder"]

  sensor-compressed-air-header:
    image: sentinel-matrix/device-runtime:latest
    container_name: matrix-5g-sens-air-header
    networks: { urllc_robot_cell_net: { ipv4_address: "10.250.20.34" } }
    command: ["--archetype", "sensor", "--protocol", "modbus", "--port", "502", "--name", "Compressed-Air-Header"]

  # ATTACKERS & SIMULATORS
  traffic-gen:
    build: { context: ., dockerfile: docker/Dockerfile.traffic }
    container_name: matrix-5g-traffic-gen
    hostname: traffic.factory.internal
    restart: unless-stopped
    networks: { private_5g_n3_tunnel: { ipv4_address: "10.250.10.50" } }
    volumes:
      - ./configs:/configs:ro
      - ./src:/app/src:ro
      - ./pcaps:/shared/datasets:ro
    environment:
      - NEXUS_ENDPOINT=10.250.10.10:50051
      - TARGET_NODES=10.250.10.101,10.250.10.102,10.250.10.103,10.250.10.104

  adversary:
    build: { context: ., dockerfile: docker/Dockerfile.adversary }
    container_name: matrix-5g-adversary
    hostname: adversary.factory.internal
    restart: unless-stopped
    networks: { private_5g_n3_tunnel: { ipv4_address: "10.250.10.99" } }
    volumes:
      - ./configs:/configs:ro
      - ./src:/app/src:ro
    environment:
      - NEXUS_REST_URL=http://10.250.10.10:9443
      - TARGET_NODES=10.250.10.101,10.250.10.102,10.250.10.103,10.250.10.104
```

### Step 3.5: Create `run_demo.sh`
```bash
cat << 'EOF' > /home/kami/sentinel-matrix/scenarios/smart_factory_5g_robotics/run_demo.sh
#!/usr/bin/env bash
set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
echo -e "\033[1;36m[*] Launching 24-Node 5G Standalone Automotive Assembly Gigafactory...\033[0m"
python3 /home/kami/sentinel-matrix/tools/scenario_engine.py load "${SCRIPT_DIR}/scenario.yaml"
EOF
chmod +x /home/kami/sentinel-matrix/scenarios/smart_factory_5g_robotics/run_demo.sh
```

---

### Step 4: Pack Batch 1 Scenarios into Standalone `.tar.gz` (Rule 4)

Run these three commands to pack all three scenarios into verified `.tar.gz` bundles in your cache:

```bash
# 1. Pack Scenario 01: Water Utility (20 Containers)
aryo scenario pack /home/kami/sentinel-matrix/scenarios/water_utility_regional_grid --embed

# 2. Pack Scenario 02: 500kV Substation (20 Containers)
aryo scenario pack /home/kami/sentinel-matrix/scenarios/substation_500kv_transmission --embed

# 3. Pack Scenario 03: 5G Smart Factory (24 Containers)
aryo scenario pack /home/kami/sentinel-matrix/scenarios/smart_factory_5g_robotics --embed
```

---

### Step 5: Verification Check

Verify all three generated archives in your local cache:
```bash
ls -lh ~/.cache/sentinel/scenarios/scenario_water_utility_regional_grid.tar.gz
ls -lh ~/.cache/sentinel/scenarios/scenario_substation_500kv_transmission.tar.gz
ls -lh ~/.cache/sentinel/scenarios/scenario_smart_factory_5g_robotics.tar.gz
```

Once packed, you can launch any of them directly from the `.tar.gz` archive:
```bash
# Test launching Scenario 01
aryo matrix scenario load ~/.cache/sentinel/scenarios/scenario_water_utility_regional_grid.tar.gz
aryo matrix scenario status
aryo matrix scenario down --name water_utility_regional_grid
```

Execute these steps in your terminal, and confirm when Batch 1 is packed and verified so we can proceed to **Batch 2 (Scenarios 04, 05, and 06)**.