### Instruction & Roadmap: Batch 2 Production Scenarios

We now construct, configure, and package **Batch 2** of the production scenarios:

1. **Scenario 04: `refinery_cracking_sis_triad`** (19 containers: 1 Nexus, 3 Edge Nodes, 1 Triconex Safety Instrumented System [TMR], 3 PLCs, 13 Field Sensors, 1 Adversary).
2. **Scenario 05: `container_terminal_port_mesh`** (19 containers: 1 Nexus, 3 Edge Nodes, 1 5G/LoRa Gateway, 3 Crane PLCs, 11 Field Sensors, 1 Adversary).
3. **Scenario 06: `nuclear_turbine_island_cooling`** (22 containers: 1 Nexus, 3 Edge Nodes, 4 Nuclear I&C Controllers, 14 Sensors, 1 Adversary, 1 Traffic-Gen).

---

# Scenario 04: Petrochemical Refinery & Catalytic Cracker Complex

### Step 4.1: Create Directory Tree
```bash
mkdir -p /home/kami/sentinel-matrix/scenarios/refinery_cracking_sis_triad/{models,configs,pcaps}
```

### Step 4.2: Populate Models, Configs & PCAPs
```bash
cp /home/kami/sentinel-matrix/shared/models/network_threat_int8.onnx /home/kami/sentinel-matrix/scenarios/refinery_cracking_sis_triad/models/
cp /home/kami/sentinel-matrix/shared/models/thermal_anomaly_vision.onnx /home/kami/sentinel-matrix/scenarios/refinery_cracking_sis_triad/models/ 2>/dev/null || true
cp /home/kami/sentinel-matrix/shared/models/vibration_spectral_ae.onnx* /home/kami/sentinel-matrix/scenarios/refinery_cracking_sis_triad/models/ 2>/dev/null || true

cp /home/kami/sentinel-matrix/shared/datasets/triton_trisis_sis.pcap /home/kami/sentinel-matrix/scenarios/refinery_cracking_sis_triad/pcaps/
cp /home/kami/sentinel-matrix/configs/plc_register_map.json /home/kami/sentinel-matrix/scenarios/refinery_cracking_sis_triad/configs/ 2>/dev/null || true
```

### Step 4.3: Create `manifest.json`
Create `/home/kami/sentinel-matrix/scenarios/refinery_cracking_sis_triad/manifest.json`:
```json
{
  "name": "refinery_cracking_sis_triad",
  "slug": "refinery_cracking_sis_triad",
  "title": "Petrochemical Refinery Catalytic Cracker & SIS Safety Triad",
  "version": "1.0.0",
  "asset_type": "scenario",
  "target_sector": "PETROCHEMICAL_REFINING",
  "sector": "PETROCHEMICAL_REFINING",
  "complexity": "ADVANCED",
  "category": "SCADA_ICS",
  "author": "Aryorithm Certified Engineer",
  "description": "19-node continuous refinery digital twin: 3 Edge Nodes, 1 Triconex SIL-3 SIS TMR Controller, 3 Process PLCs, 13 Sensors, and TRITON malware defense.",
  "dependencies": {
    "models": [
      "network_threat_int8.onnx",
      "thermal_anomaly_vision.onnx",
      "vibration_spectral_ae.onnx"
    ],
    "pcaps": [
      "triton_trisis_sis.pcap"
    ]
  },
  "compliance": ["IEC-62443-4-2", "IEC-61511-SIL3", "NIS2"]
}
```

### Step 4.4: Create `scenario.yaml` (19 Containers)
Create `/home/kami/sentinel-matrix/scenarios/refinery_cracking_sis_triad/scenario.yaml`:
```yaml
version: "1.0"
scenario:
  name: "refinery_cracking_sis_triad"
  description: "19-Node Continuous Catalytic Cracking Refinery with SIL-3 SIS Safety Loop"

networks:
  refinery_dmz_net:
    driver: bridge
    subnet: "192.168.30.0/24"
    gateway: "192.168.30.1"
    internal: false
  dcs_process_net:
    driver: bridge
    subnet: "10.180.1.0/24"
    gateway: "10.180.1.1"
    internal: true
  sis_safety_net:
    driver: bridge
    subnet: "10.180.99.0/24"
    gateway: "10.180.99.1"
    internal: true

volumes:
  shared-models: { driver: local }
  shared-datasets: { driver: local }
  shared-logs: { driver: local }

services:
  # C2 COMMAND PLANE
  nexus:
    build: { context: ., dockerfile: docker/Dockerfile.nexus }
    container_name: matrix-refinery-nexus
    hostname: nexus.refinery.internal
    restart: unless-stopped
    privileged: true
    networks:
      refinery_dmz_net: { ipv4_address: "192.168.30.10" }
      dcs_process_net: { ipv4_address: "10.180.1.10" }
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

  # TRIPLE MODULAR REDUNDANT SAFETY SYSTEM (SIL-3 SIS)
  triconex-sis:
    image: sentinel-matrix/device-runtime:latest
    container_name: matrix-refinery-sis
    hostname: sis.refinery.internal
    restart: unless-stopped
    networks:
      dcs_process_net: { ipv4_address: "10.180.1.99" }
      sis_safety_net: { ipv4_address: "10.180.99.99" }
    ports: ["11502:502"]
    command: ["--archetype", "sis", "--protocol", "modbus", "--port", "502", "--name", "Schneider-Triconex-TMR-3008"]

  # 3 EDGE APPLIANCES
  sentinel-edge-distillation:
    build: { context: ., dockerfile: docker/Dockerfile.sentinel }
    container_name: matrix-refinery-edge-distillation
    hostname: edge-distill.refinery.internal
    restart: unless-stopped
    privileged: true
    cap_add: [NET_ADMIN, SYS_ADMIN, BPF]
    networks:
      dcs_process_net: { ipv4_address: "10.180.1.101" }
    volumes:
      - ./configs:/etc/sentinel/configs:ro
      - ./models:/etc/sentinel/models:rw
      - ./shared/lib:/usr/local/lib/matrix-deps:ro
      - ./shared/bin/sentinel:/usr/local/bin/sentinel:ro
    environment:
      - LD_LIBRARY_PATH=/usr/local/lib/matrix-deps
      - NODE_IDENTIFIER=Edge-Refinery-Distillation
      - PRIMARY_BACKEND=INTEL_OPENVINO
      - NEXUS_HOST=10.180.1.10
      - NEXUS_PORT=50051

  sentinel-edge-fccu:
    build: { context: ., dockerfile: docker/Dockerfile.sentinel }
    container_name: matrix-refinery-edge-fccu
    hostname: edge-fccu.refinery.internal
    restart: unless-stopped
    privileged: true
    cap_add: [NET_ADMIN, SYS_ADMIN, BPF]
    networks:
      dcs_process_net: { ipv4_address: "10.180.1.102" }
      sis_safety_net: { ipv4_address: "10.180.99.102" }
    volumes:
      - ./configs:/etc/sentinel/configs:ro
      - ./models:/etc/sentinel/models:rw
      - ./shared/lib:/usr/local/lib/matrix-deps:ro
      - ./shared/bin/sentinel:/usr/local/bin/sentinel:ro
    environment:
      - LD_LIBRARY_PATH=/usr/local/lib/matrix-deps
      - NODE_IDENTIFIER=Edge-Refinery-FCCU
      - PRIMARY_BACKEND=NVIDIA_TENSORRT
      - NEXUS_HOST=10.180.1.10
      - NEXUS_PORT=50051

  sentinel-edge-hydrocracker:
    build: { context: ., dockerfile: docker/Dockerfile.sentinel }
    container_name: matrix-refinery-edge-hydrocracker
    hostname: edge-hydro.refinery.internal
    restart: unless-stopped
    privileged: true
    cap_add: [NET_ADMIN, SYS_ADMIN, BPF]
    networks:
      dcs_process_net: { ipv4_address: "10.180.1.103" }
      sis_safety_net: { ipv4_address: "10.180.99.103" }
    volumes:
      - ./configs:/etc/sentinel/configs:ro
      - ./models:/etc/sentinel/models:rw
      - ./shared/lib:/usr/local/lib/matrix-deps:ro
      - ./shared/bin/sentinel:/usr/local/bin/sentinel:ro
    environment:
      - LD_LIBRARY_PATH=/usr/local/lib/matrix-deps
      - NODE_IDENTIFIER=Edge-Refinery-Hydrocracker
      - PRIMARY_BACKEND=ROCKCHIP_RKNN
      - NEXUS_HOST=10.180.1.10
      - NEXUS_PORT=50051

  # 3 PROCESS PLCS
  plc-reflux-control:
    image: sentinel-matrix/device-runtime:latest
    container_name: matrix-refinery-plc-reflux
    networks: { dcs_process_net: { ipv4_address: "10.180.1.21" } }
    ports: ["15511:502"]
    command: ["--archetype", "plc", "--protocol", "modbus", "--port", "502", "--name", "Reflux-Column-PLC"]

  plc-steam-injection:
    image: sentinel-matrix/device-runtime:latest
    container_name: matrix-refinery-plc-steam
    networks: { dcs_process_net: { ipv4_address: "10.180.1.22" } }
    ports: ["15512:502"]
    command: ["--archetype", "plc", "--protocol", "modbus", "--port", "502", "--name", "Steam-Boiler-PLC"]

  plc-fuel-gas:
    image: sentinel-matrix/device-runtime:latest
    container_name: matrix-refinery-plc-fuelgas
    networks: { dcs_process_net: { ipv4_address: "10.180.1.23" } }
    ports: ["15112:102"]
    command: ["--archetype", "plc", "--protocol", "s7comm", "--port", "102", "--name", "Fuel-Gas-S7-PLC"]

  # 13 REFINERY SENSORS
  sensor-bed-temp-pyro:
    image: sentinel-matrix/device-runtime:latest
    container_name: matrix-refinery-sens-bed-temp
    networks: { dcs_process_net: { ipv4_address: "10.180.1.41" } }
    command: ["--archetype", "sensor", "--protocol", "stream_telemetry", "--port", "9301", "--name", "Reactor-Bed-Pyrometer-550C"]

  sensor-cyclone-temp:
    image: sentinel-matrix/device-runtime:latest
    container_name: matrix-refinery-sens-cyclone-temp
    networks: { dcs_process_net: { ipv4_address: "10.180.1.42" } }
    command: ["--archetype", "sensor", "--protocol", "modbus", "--port", "502", "--name", "Regenerator-Cyclone-Temp"]

  sensor-riser-diffpress:
    image: sentinel-matrix/device-runtime:latest
    container_name: matrix-refinery-sens-diffpress
    networks: { dcs_process_net: { ipv4_address: "10.180.1.43" } }
    command: ["--archetype", "sensor", "--protocol", "modbus", "--port", "502", "--name", "Riser-Differential-Pressure"]

  sensor-column-overhead-press:
    image: sentinel-matrix/device-runtime:latest
    container_name: matrix-refinery-sens-overhead-press
    networks: { dcs_process_net: { ipv4_address: "10.180.1.44" } }
    command: ["--archetype", "sensor", "--protocol", "modbus", "--port", "502", "--name", "Fractionator-Overhead-Pressure"]

  sensor-reflux-drum-level:
    image: sentinel-matrix/device-runtime:latest
    container_name: matrix-refinery-sens-drum-level
    networks: { dcs_process_net: { ipv4_address: "10.180.1.45" } }
    command: ["--archetype", "sensor", "--protocol", "stream_telemetry", "--port", "9302", "--name", "Reflux-Drum-Level"]

  sensor-blower-flow:
    image: sentinel-matrix/device-runtime:latest
    container_name: matrix-refinery-sens-blower-flow
    networks: { dcs_process_net: { ipv4_address: "10.180.1.46" } }
    command: ["--archetype", "sensor", "--protocol", "modbus", "--port", "502", "--name", "Air-Blower-Suction-Flow"]

  sensor-blower-vibration:
    image: sentinel-matrix/device-runtime:latest
    container_name: matrix-refinery-sens-blower-vib
    networks: { dcs_process_net: { ipv4_address: "10.180.1.47" } }
    command: ["--archetype", "sensor", "--protocol", "modbus", "--port", "502", "--name", "Turbine-Blower-Vibration"]

  sensor-gas-oil-flow:
    image: sentinel-matrix/device-runtime:latest
    container_name: matrix-refinery-sens-gasoil-flow
    networks: { dcs_process_net: { ipv4_address: "10.180.1.48" } }
    command: ["--archetype", "sensor", "--protocol", "modbus", "--port", "502", "--name", "Heavy-Gas-Oil-Flowmeter"]

  sensor-flare-combustion-temp:
    image: sentinel-matrix/device-runtime:latest
    container_name: matrix-refinery-sens-flare-temp
    networks: { dcs_process_net: { ipv4_address: "10.180.1.49" } }
    command: ["--archetype", "sensor", "--protocol", "stream_telemetry", "--port", "9303", "--name", "Flare-Stack-Temp"]

  sensor-lel-gas-detector:
    image: sentinel-matrix/device-runtime:latest
    container_name: matrix-refinery-sens-lel
    networks: { sis_safety_net: { ipv4_address: "10.180.99.41" } }
    command: ["--archetype", "sensor", "--protocol", "modbus", "--port", "502", "--name", "Hydrocarbon-LEL-Sniffer"]

  sensor-h2s-toxic-gas:
    image: sentinel-matrix/device-runtime:latest
    container_name: matrix-refinery-sens-h2s
    networks: { sis_safety_net: { ipv4_address: "10.180.99.42" } }
    command: ["--archetype", "sensor", "--protocol", "modbus", "--port", "502", "--name", "H2S-Toxic-Gas-Detector"]

  sensor-esd-valve-position:
    image: sentinel-matrix/device-runtime:latest
    container_name: matrix-refinery-sens-esd-valve
    networks: { sis_safety_net: { ipv4_address: "10.180.99.43" } }
    command: ["--archetype", "sensor", "--protocol", "modbus", "--port", "502", "--name", "ESD-Depressurization-Valve"]

  sensor-cooling-water-return:
    image: sentinel-matrix/device-runtime:latest
    container_name: matrix-refinery-sens-coolant-return
    networks: { dcs_process_net: { ipv4_address: "10.180.1.50" } }
    command: ["--archetype", "sensor", "--protocol", "modbus", "--port", "502", "--name", "Cooling-Water-Return-Temp"]

  # ATTACKER CONTAINER
  adversary:
    build: { context: ., dockerfile: docker/Dockerfile.adversary }
    container_name: matrix-refinery-adversary
    hostname: adversary.refinery.internal
    restart: unless-stopped
    networks: { dcs_process_net: { ipv4_address: "10.180.1.98" } }
    volumes:
      - ./configs:/configs:ro
      - ./src:/app/src:ro
    environment:
      - NEXUS_REST_URL=http://10.180.1.10:9443
      - TARGET_NODES=10.180.1.101,10.180.1.102,10.180.1.103
```

### Step 4.5: Create `run_demo.sh`
```bash
cat << 'EOF' > /home/kami/sentinel-matrix/scenarios/refinery_cracking_sis_triad/run_demo.sh
#!/usr/bin/env bash
set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
echo -e "\033[1;36m[*] Launching 19-Node Continuous Catalytic Cracking Refinery with SIL-3 SIS...\033[0m"
python3 /home/kami/sentinel-matrix/tools/scenario_engine.py load "${SCRIPT_DIR}/scenario.yaml"
EOF
chmod +x /home/kami/sentinel-matrix/scenarios/refinery_cracking_sis_triad/run_demo.sh
```

---

# Scenario 05: Automated Maritime Container Terminal & Port Logistics

### Step 5.1: Create Directory Tree
```bash
mkdir -p /home/kami/sentinel-matrix/scenarios/container_terminal_port_mesh/{models,configs,pcaps}
```

### Step 5.2: Populate Models, Configs & PCAPs
```bash
cp /home/kami/sentinel-matrix/shared/models/network_threat_int8.onnx /home/kami/sentinel-matrix/scenarios/container_terminal_port_mesh/models/
cp /home/kami/sentinel-matrix/shared/models/lidar_spatial_detector.onnx* /home/kami/sentinel-matrix/scenarios/container_terminal_port_mesh/models/ 2>/dev/null || true
cp /home/kami/sentinel-matrix/shared/models/thermal_anomaly_vision.onnx /home/kami/sentinel-matrix/scenarios/container_terminal_port_mesh/models/ 2>/dev/null || true

cp /home/kami/sentinel-matrix/shared/datasets/modbus_uiuc_scada_attack.pcap /home/kami/sentinel-matrix/scenarios/container_terminal_port_mesh/pcaps/
cp /home/kami/sentinel-matrix/configs/plc_register_map.json /home/kami/sentinel-matrix/scenarios/container_terminal_port_mesh/configs/ 2>/dev/null || true
```

### Step 5.3: Create `manifest.json`
Create `/home/kami/sentinel-matrix/scenarios/container_terminal_port_mesh/manifest.json`:
```json
{
  "name": "container_terminal_port_mesh",
  "slug": "container_terminal_port_mesh",
  "title": "Automated Maritime Container Terminal & Port Logistics",
  "version": "1.0.0",
  "asset_type": "scenario",
  "target_sector": "MARITIME_LOGISTICS",
  "sector": "MARITIME_LOGISTICS",
  "complexity": "ADVANCED",
  "category": "SCADA_ICS",
  "author": "Aryorithm Certified Engineer",
  "description": "19-node automated port digital twin: 3 Edge Cranes/AGVs, 1 5G/LoRa Gateway, 3 Crane PLCs, 11 Maritime Sensors, and GPS/AIS anti-spoofing.",
  "dependencies": {
    "models": [
      "network_threat_int8.onnx",
      "lidar_spatial_detector.onnx",
      "thermal_anomaly_vision.onnx"
    ],
    "pcaps": [
      "modbus_uiuc_scada_attack.pcap"
    ]
  },
  "compliance": ["IEC-62443-4-2", "ISPS-CODE", "NIS2"]
}
```

### Step 5.4: Create `scenario.yaml` (19 Containers)
Create `/home/kami/sentinel-matrix/scenarios/container_terminal_port_mesh/scenario.yaml`:
```yaml
version: "1.0"
scenario:
  name: "container_terminal_port_mesh"
  description: "19-Node Automated Maritime Port Terminal: STS Cranes, AGV Fleet & 5G Slicing"

networks:
  terminal_ops_net:
    driver: bridge
    subnet: "172.20.0.0/24"
    gateway: "172.20.0.1"
    internal: false
  port_5g_wireless_net:
    driver: bridge
    subnet: "10.230.1.0/24"
    gateway: "10.230.1.1"
    internal: true
  crane_fieldbus_net:
    driver: bridge
    subnet: "10.230.10.0/24"
    gateway: "10.230.10.1"
    internal: true

volumes:
  shared-models: { driver: local }
  shared-datasets: { driver: local }
  shared-logs: { driver: local }

services:
  # C2 COMMAND PLANE
  nexus:
    build: { context: ., dockerfile: docker/Dockerfile.nexus }
    container_name: matrix-port-nexus
    hostname: nexus.port.internal
    restart: unless-stopped
    privileged: true
    networks:
      terminal_ops_net: { ipv4_address: "172.20.0.10" }
      port_5g_wireless_net: { ipv4_address: "10.230.1.10" }
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

  # 5G/LORA TERMINAL GATEWAY
  port-5g-gateway:
    image: sentinel-matrix/device-runtime:latest
    container_name: matrix-port-5g-gateway
    hostname: gateway.port.internal
    restart: unless-stopped
    networks:
      terminal_ops_net: { ipv4_address: "172.20.0.5" }
      port_5g_wireless_net: { ipv4_address: "10.230.1.5" }
    ports: ["12152:2152/udp"]
    command: ["--archetype", "5g_gateway", "--protocol", "gtpu", "--port", "2152", "--name", "Port-N3-GTPU-Gateway"]

  # 3 EDGE APPLIANCES
  sentinel-edge-quay-crane:
    build: { context: ., dockerfile: docker/Dockerfile.sentinel }
    container_name: matrix-port-edge-sts-crane
    hostname: edge-crane.port.internal
    restart: unless-stopped
    privileged: true
    cap_add: [NET_ADMIN, SYS_ADMIN, BPF]
    networks:
      port_5g_wireless_net: { ipv4_address: "10.230.1.101" }
      crane_fieldbus_net: { ipv4_address: "10.230.10.101" }
    volumes:
      - ./configs:/etc/sentinel/configs:ro
      - ./models:/etc/sentinel/models:rw
      - ./shared/lib:/usr/local/lib/matrix-deps:ro
      - ./shared/bin/sentinel:/usr/local/bin/sentinel:ro
    environment:
      - LD_LIBRARY_PATH=/usr/local/lib/matrix-deps
      - NODE_IDENTIFIER=Edge-Port-STS-Crane01
      - PRIMARY_BACKEND=INTEL_OPENVINO
      - NEXUS_HOST=10.230.1.10
      - NEXUS_PORT=50051

  sentinel-edge-stacking-crane:
    build: { context: ., dockerfile: docker/Dockerfile.sentinel }
    container_name: matrix-port-edge-asc-crane
    hostname: edge-asc.port.internal
    restart: unless-stopped
    privileged: true
    cap_add: [NET_ADMIN, SYS_ADMIN, BPF]
    networks:
      port_5g_wireless_net: { ipv4_address: "10.230.1.102" }
      crane_fieldbus_net: { ipv4_address: "10.230.10.102" }
    volumes:
      - ./configs:/etc/sentinel/configs:ro
      - ./models:/etc/sentinel/models:rw
      - ./shared/lib:/usr/local/lib/matrix-deps:ro
      - ./shared/bin/sentinel:/usr/local/bin/sentinel:ro
    environment:
      - LD_LIBRARY_PATH=/usr/local/lib/matrix-deps
      - NODE_IDENTIFIER=Edge-Port-ASC-Crane02
      - PRIMARY_BACKEND=NVIDIA_TENSORRT
      - NEXUS_HOST=10.230.1.10
      - NEXUS_PORT=50051

  sentinel-edge-agv-fleet:
    build: { context: ., dockerfile: docker/Dockerfile.sentinel }
    container_name: matrix-port-edge-agv-fleet
    hostname: edge-agv.port.internal
    restart: unless-stopped
    privileged: true
    cap_add: [NET_ADMIN, SYS_ADMIN, BPF]
    networks:
      port_5g_wireless_net: { ipv4_address: "10.230.1.103" }
    volumes:
      - ./configs:/etc/sentinel/configs:ro
      - ./models:/etc/sentinel/models:rw
      - ./shared/lib:/usr/local/lib/matrix-deps:ro
      - ./shared/bin/sentinel:/usr/local/bin/sentinel:ro
    environment:
      - LD_LIBRARY_PATH=/usr/local/lib/matrix-deps
      - NODE_IDENTIFIER=Edge-Port-AGV-Fleet
      - PRIMARY_BACKEND=ROCKCHIP_RKNN
      - NEXUS_HOST=10.230.1.10
      - NEXUS_PORT=50051

  # 3 CRANE DRIVE PLCS
  plc-hoist-winch:
    image: sentinel-matrix/device-runtime:latest
    container_name: matrix-port-plc-hoist
    networks: { crane_fieldbus_net: { ipv4_address: "10.230.10.21" } }
    ports: ["15521:502"]
    command: ["--archetype", "plc", "--protocol", "modbus", "--port", "502", "--name", "Crane-Hoist-Winch-PLC"]

  plc-gantry-travel:
    image: sentinel-matrix/device-runtime:latest
    container_name: matrix-port-plc-gantry
    networks: { crane_fieldbus_net: { ipv4_address: "10.230.10.22" } }
    ports: ["15522:502"]
    command: ["--archetype", "plc", "--protocol", "modbus", "--port", "502", "--name", "Gantry-Travel-PLC"]

  plc-spreader-twistlock:
    image: sentinel-matrix/device-runtime:latest
    container_name: matrix-port-plc-twistlock
    networks: { crane_fieldbus_net: { ipv4_address: "10.230.10.23" } }
    ports: ["15123:102"]
    command: ["--archetype", "plc", "--protocol", "s7comm", "--port", "102", "--name", "Spreader-Twistlock-S7-PLC"]

  # 11 MARITIME PORT SENSORS
  sensor-wind-anemometer:
    image: sentinel-matrix/device-runtime:latest
    container_name: matrix-port-sens-anemometer
    networks: { crane_fieldbus_net: { ipv4_address: "10.230.10.41" } }
    command: ["--archetype", "sensor", "--protocol", "stream_telemetry", "--port", "9401", "--name", "Gale-Cutoff-Anemometer"]

  sensor-twistlock-engage:
    image: sentinel-matrix/device-runtime:latest
    container_name: matrix-port-sens-twistlock
    networks: { crane_fieldbus_net: { ipv4_address: "10.230.10.42" } }
    command: ["--archetype", "sensor", "--protocol", "modbus", "--port", "502", "--name", "Twistlock-Engagement-Sensor"]

  sensor-hoist-load-cell:
    image: sentinel-matrix/device-runtime:latest
    container_name: matrix-port-sens-load-cell
    networks: { crane_fieldbus_net: { ipv4_address: "10.230.10.43" } }
    command: ["--archetype", "sensor", "--protocol", "modbus", "--port", "502", "--name", "Hoist-Load-Cell-Tons"]

  sensor-hoist-motor-temp:
    image: sentinel-matrix/device-runtime:latest
    container_name: matrix-port-sens-motor-temp
    networks: { crane_fieldbus_net: { ipv4_address: "10.230.10.44" } }
    command: ["--archetype", "sensor", "--protocol", "modbus", "--port", "502", "--name", "Hoist-Motor-Thermistor"]

  sensor-rail-anticollision-lidar:
    image: sentinel-matrix/device-runtime:latest
    container_name: matrix-port-sens-lidar
    networks: { crane_fieldbus_net: { ipv4_address: "10.230.10.45" } }
    ports: ["12369:2368/udp"]
    command: ["--archetype", "vision", "--protocol", "stream_telemetry", "--port", "2368", "--name", "Gantry-AntiCollision-LiDAR"]

  sensor-laser-spreader-align:
    image: sentinel-matrix/device-runtime:latest
    container_name: matrix-port-sens-align
    networks: { crane_fieldbus_net: { ipv4_address: "10.230.10.46" } }
    command: ["--archetype", "sensor", "--protocol", "stream_telemetry", "--port", "9402", "--name", "Laser-Spreader-Alignment"]

  sensor-agv-rpm-encoder:
    image: sentinel-matrix/device-runtime:latest
    container_name: matrix-port-sens-agv-rpm
    networks: { port_5g_wireless_net: { ipv4_address: "10.230.1.41" } }
    command: ["--archetype", "sensor", "--protocol", "modbus", "--port", "502", "--name", "AGV-Drive-RPM-Encoder"]

  sensor-agv-steer-angle:
    image: sentinel-matrix/device-runtime:latest
    container_name: matrix-port-sens-agv-steer
    networks: { port_5g_wireless_net: { ipv4_address: "10.230.1.42" } }
    command: ["--archetype", "sensor", "--protocol", "modbus", "--port", "502", "--name", "AGV-Steering-Angle-Pot"]

  sensor-agv-radar-proximity:
    image: sentinel-matrix/device-runtime:latest
    container_name: matrix-port-sens-agv-radar
    networks: { port_5g_wireless_net: { ipv4_address: "10.230.1.43" } }
    command: ["--archetype", "sensor", "--protocol", "stream_telemetry", "--port", "9403", "--name", "AGV-Radar-Proximity"]

  sensor-reefer-temp:
    image: sentinel-matrix/device-runtime:latest
    container_name: matrix-port-sens-reefer
    networks: { port_5g_wireless_net: { ipv4_address: "10.230.1.44" } }
    command: ["--archetype", "sensor", "--protocol", "modbus", "--port", "502", "--name", "Reefer-Container-Temp"]

  sensor-high-mast-lighting:
    image: sentinel-matrix/device-runtime:latest
    container_name: matrix-port-sens-lighting
    networks: { terminal_ops_net: { ipv4_address: "172.20.0.41" } }
    command: ["--archetype", "sensor", "--protocol", "modbus", "--port", "502", "--name", "Terminal-Lighting-Substation"]

  # ATTACKER CONTAINER
  adversary:
    build: { context: ., dockerfile: docker/Dockerfile.adversary }
    container_name: matrix-port-adversary
    hostname: adversary.port.internal
    restart: unless-stopped
    networks: { port_5g_wireless_net: { ipv4_address: "10.230.1.99" } }
    volumes:
      - ./configs:/configs:ro
      - ./src:/app/src:ro
    environment:
      - NEXUS_REST_URL=http://10.230.1.10:9443
      - TARGET_NODES=10.230.1.101,10.230.1.102,10.230.1.103
```

### Step 5.5: Create `run_demo.sh`
```bash
cat << 'EOF' > /home/kami/sentinel-matrix/scenarios/container_terminal_port_mesh/run_demo.sh
#!/usr/bin/env bash
set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
echo -e "\033[1;36m[*] Launching 19-Node Automated Maritime Port Terminal...\033[0m"
python3 /home/kami/sentinel-matrix/tools/scenario_engine.py load "${SCRIPT_DIR}/scenario.yaml"
EOF
chmod +x /home/kami/sentinel-matrix/scenarios/container_terminal_port_mesh/run_demo.sh
```

---

# Scenario 06: Commercial Nuclear Power Plant Secondary Cooling & Turbine Island

### Step 6.1: Create Directory Tree
```bash
mkdir -p /home/kami/sentinel-matrix/scenarios/nuclear_turbine_island_cooling/{models,configs,pcaps}
```

### Step 6.2: Populate Models, Configs & PCAPs
```bash
cp /home/kami/sentinel-matrix/shared/models/network_threat_int8.onnx /home/kami/sentinel-matrix/scenarios/nuclear_turbine_island_cooling/models/
cp /home/kami/sentinel-matrix/shared/models/power_quality_anomaly.onnx* /home/kami/sentinel-matrix/scenarios/nuclear_turbine_island_cooling/models/ 2>/dev/null || true
cp /home/kami/sentinel-matrix/shared/models/vibration_spectral_ae.onnx* /home/kami/sentinel-matrix/scenarios/nuclear_turbine_island_cooling/models/ 2>/dev/null || true

cp /home/kami/sentinel-matrix/shared/datasets/stuxnet_s7comm_injected.pcap /home/kami/sentinel-matrix/scenarios/nuclear_turbine_island_cooling/pcaps/
cp /home/kami/sentinel-matrix/configs/plc_register_map.json /home/kami/sentinel-matrix/scenarios/nuclear_turbine_island_cooling/configs/ 2>/dev/null || true
```

### Step 6.3: Create `manifest.json`
Create `/home/kami/sentinel-matrix/scenarios/nuclear_turbine_island_cooling/manifest.json`:
```json
{
  "name": "nuclear_turbine_island_cooling",
  "slug": "nuclear_turbine_island_cooling",
  "title": "Nuclear Power Plant Secondary Island & Turbine Cooling",
  "version": "1.0.0",
  "asset_type": "scenario",
  "target_sector": "NUCLEAR_ENERGY",
  "sector": "NUCLEAR_ENERGY",
  "complexity": "ADVANCED",
  "category": "SCADA_ICS",
  "author": "Aryorithm Certified Engineer",
  "description": "22-node nuclear secondary island: 3 Edge Nodes, 4 Teleperm XS/S7 Nuclear I&C Controllers, 14 Field Sensors, and Stuxnet rotor overspeed defense.",
  "dependencies": {
    "models": [
      "network_threat_int8.onnx",
      "power_quality_anomaly.onnx",
      "vibration_spectral_ae.onnx"
    ],
    "pcaps": [
      "stuxnet_s7comm_injected.pcap"
    ]
  },
  "compliance": ["IEC-62443-4-2", "IAEA-NSS-17", "NIS2"]
}
```

### Step 6.4: Create `scenario.yaml` (22 Containers)
Create `/home/kami/sentinel-matrix/scenarios/nuclear_turbine_island_cooling/scenario.yaml`:
```yaml
version: "1.0"
scenario:
  name: "nuclear_turbine_island_cooling"
  description: "22-Node Nuclear Power Plant Secondary Loop & Turbine Island Protection"

networks:
  plant_computer_net:
    driver: bridge
    subnet: "192.168.10.0/24"
    gateway: "192.168.10.1"
    internal: false
  operational_ic_net:
    driver: bridge
    subnet: "10.190.1.0/24"
    gateway: "10.190.1.1"
    internal: true
  turbine_trip_net:
    driver: bridge
    subnet: "10.190.2.0/24"
    gateway: "10.190.2.1"
    internal: true

volumes:
  shared-models: { driver: local }
  shared-datasets: { driver: local }
  shared-logs: { driver: local }

services:
  # C2 COMMAND PLANE
  nexus:
    build: { context: ., dockerfile: docker/Dockerfile.nexus }
    container_name: matrix-nuclear-nexus
    hostname: nexus.nuclear.internal
    restart: unless-stopped
    privileged: true
    networks:
      plant_computer_net: { ipv4_address: "192.168.10.10" }
      operational_ic_net: { ipv4_address: "10.190.1.10" }
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
  sentinel-edge-secondary-steam:
    build: { context: ., dockerfile: docker/Dockerfile.sentinel }
    container_name: matrix-nuclear-edge-steam
    hostname: edge-steam.nuclear.internal
    restart: unless-stopped
    privileged: true
    cap_add: [NET_ADMIN, SYS_ADMIN, BPF]
    networks:
      operational_ic_net: { ipv4_address: "10.190.1.101" }
    volumes:
      - ./configs:/etc/sentinel/configs:ro
      - ./models:/etc/sentinel/models:rw
      - ./shared/lib:/usr/local/lib/matrix-deps:ro
      - ./shared/bin/sentinel:/usr/local/bin/sentinel:ro
    environment:
      - LD_LIBRARY_PATH=/usr/local/lib/matrix-deps
      - NODE_IDENTIFIER=Edge-Nuclear-SecondarySteam
      - PRIMARY_BACKEND=INTEL_OPENVINO
      - NEXUS_HOST=10.190.1.10
      - NEXUS_PORT=50051

  sentinel-edge-turbine-generator:
    build: { context: ., dockerfile: docker/Dockerfile.sentinel }
    container_name: matrix-nuclear-edge-turbine
    hostname: edge-turbine.nuclear.internal
    restart: unless-stopped
    privileged: true
    cap_add: [NET_ADMIN, SYS_ADMIN, BPF]
    networks:
      operational_ic_net: { ipv4_address: "10.190.1.102" }
      turbine_trip_net: { ipv4_address: "10.190.2.102" }
    volumes:
      - ./configs:/etc/sentinel/configs:ro
      - ./models:/etc/sentinel/models:rw
      - ./shared/lib:/usr/local/lib/matrix-deps:ro
      - ./shared/bin/sentinel:/usr/local/bin/sentinel:ro
    environment:
      - LD_LIBRARY_PATH=/usr/local/lib/matrix-deps
      - NODE_IDENTIFIER=Edge-Nuclear-TurbineGenerator
      - PRIMARY_BACKEND=NVIDIA_TENSORRT
      - NEXUS_HOST=10.190.1.10
      - NEXUS_PORT=50051

  sentinel-edge-condenser-cooling:
    build: { context: ., dockerfile: docker/Dockerfile.sentinel }
    container_name: matrix-nuclear-edge-cooling
    hostname: edge-cooling.nuclear.internal
    restart: unless-stopped
    privileged: true
    cap_add: [NET_ADMIN, SYS_ADMIN, BPF]
    networks:
      operational_ic_net: { ipv4_address: "10.190.1.103" }
    volumes:
      - ./configs:/etc/sentinel/configs:ro
      - ./models:/etc/sentinel/models:rw
      - ./shared/lib:/usr/local/lib/matrix-deps:ro
      - ./shared/bin/sentinel:/usr/local/bin/sentinel:ro
    environment:
      - LD_LIBRARY_PATH=/usr/local/lib/matrix-deps
      - NODE_IDENTIFIER=Edge-Nuclear-CondenserCooling
      - PRIMARY_BACKEND=ROCKCHIP_RKNN
      - NEXUS_HOST=10.190.1.10
      - NEXUS_PORT=50051

  # 4 NUCLEAR I&C CONTROLLERS (Teleperm XS / S7)
  ic-steam-generator:
    image: sentinel-matrix/device-runtime:latest
    container_name: matrix-nuclear-ic-sg
    networks: { operational_ic_net: { ipv4_address: "10.190.1.21" } }
    ports: ["15131:102"]
    command: ["--archetype", "plc", "--protocol", "s7comm", "--port", "102", "--name", "Steam-Generator-Level-I&C"]

  ic-turbine-speed-governor:
    image: sentinel-matrix/device-runtime:latest
    container_name: matrix-nuclear-ic-governor
    networks: { turbine_trip_net: { ipv4_address: "10.190.2.22" } }
    ports: ["15132:102"]
    command: ["--archetype", "plc", "--protocol", "s7comm", "--port", "102", "--name", "Turbine-Speed-Governor"]

  ic-feedwater-pumps:
    image: sentinel-matrix/device-runtime:latest
    container_name: matrix-nuclear-ic-feedwater
    networks: { operational_ic_net: { ipv4_address: "10.190.1.23" } }
    ports: ["15533:502"]
    command: ["--archetype", "plc", "--protocol", "modbus", "--port", "502", "--name", "Aux-Feedwater-Pumps-PLC"]

  ic-cooling-circulator:
    image: sentinel-matrix/device-runtime:latest
    container_name: matrix-nuclear-ic-circulator
    networks: { operational_ic_net: { ipv4_address: "10.190.1.24" } }
    ports: ["15534:502"]
    command: ["--archetype", "plc", "--protocol", "modbus", "--port", "502", "--name", "Condenser-Circulator-PLC"]

  # 14 NUCLEAR SECONDARY SENSORS
  sensor-main-steam-press:
    image: sentinel-matrix/device-runtime:latest
    container_name: matrix-nuclear-sens-steam-press
    networks: { operational_ic_net: { ipv4_address: "10.190.1.41" } }
    command: ["--archetype", "sensor", "--protocol", "modbus", "--port", "502", "--name", "Main-Steam-Pressure-70bar"]

  sensor-main-steam-temp:
    image: sentinel-matrix/device-runtime:latest
    container_name: matrix-nuclear-sens-steam-temp
    networks: { operational_ic_net: { ipv4_address: "10.190.1.42" } }
    command: ["--archetype", "sensor", "--protocol", "modbus", "--port", "502", "--name", "Main-Steam-Temp-280C"]

  sensor-sg-water-level:
    image: sentinel-matrix/device-runtime:latest
    container_name: matrix-nuclear-sens-sg-level
    networks: { operational_ic_net: { ipv4_address: "10.190.1.43" } }
    command: ["--archetype", "sensor", "--protocol", "stream_telemetry", "--port", "9501", "--name", "SG-Narrow-Range-Level"]

  sensor-feedwater-venturi-flow:
    image: sentinel-matrix/device-runtime:latest
    container_name: matrix-nuclear-sens-feedwater-flow
    networks: { operational_ic_net: { ipv4_address: "10.190.1.44" } }
    command: ["--archetype", "sensor", "--protocol", "modbus", "--port", "502", "--name", "Feedwater-Venturi-Flow"]

  sensor-turbine-stop-valve:
    image: sentinel-matrix/device-runtime:latest
    container_name: matrix-nuclear-sens-stop-valve
    networks: { turbine_trip_net: { ipv4_address: "10.190.2.41" } }
    command: ["--archetype", "sensor", "--protocol", "modbus", "--port", "502", "--name", "Turbine-Inlet-Stop-Valve"]

  sensor-rotor-rpm-pickup:
    image: sentinel-matrix/device-runtime:latest
    container_name: matrix-nuclear-sens-rpm-pickup
    networks: { turbine_trip_net: { ipv4_address: "10.190.2.42" } }
    command: ["--archetype", "sensor", "--protocol", "stream_telemetry", "--port", "9502", "--name", "Rotor-Speed-3000RPM"]

  sensor-shaft-radial-vibration:
    image: sentinel-matrix/device-runtime:latest
    container_name: matrix-nuclear-sens-radial-vib
    networks: { turbine_trip_net: { ipv4_address: "10.190.2.43" } }
    command: ["--archetype", "sensor", "--protocol", "modbus", "--port", "502", "--name", "Shaft-Radial-Vibration-Probe"]

  sensor-shaft-axial-thrust:
    image: sentinel-matrix/device-runtime:latest
    container_name: matrix-nuclear-sens-axial-thrust
    networks: { turbine_trip_net: { ipv4_address: "10.190.2.44" } }
    command: ["--archetype", "sensor", "--protocol", "modbus", "--port", "502", "--name", "Shaft-Axial-Thrust-Position"]

  sensor-generator-h2-coolant-press:
    image: sentinel-matrix/device-runtime:latest
    container_name: matrix-nuclear-sens-h2-press
    networks: { operational_ic_net: { ipv4_address: "10.190.1.45" } }
    command: ["--archetype", "sensor", "--protocol", "modbus", "--port", "502", "--name", "Generator-H2-Coolant-Pressure"]

  sensor-condenser-vacuum:
    image: sentinel-matrix/device-runtime:latest
    container_name: matrix-nuclear-sens-condenser-vac
    networks: { operational_ic_net: { ipv4_address: "10.190.1.46" } }
    command: ["--archetype", "sensor", "--protocol", "stream_telemetry", "--port", "9503", "--name", "Condenser-Vacuum-Transmitter"]

  sensor-circulating-intake-flow:
    image: sentinel-matrix/device-runtime:latest
    container_name: matrix-nuclear-sens-intake-flow
    networks: { operational_ic_net: { ipv4_address: "10.190.1.47" } }
    command: ["--archetype", "sensor", "--protocol", "modbus", "--port", "502", "--name", "Circulating-Water-Intake-Flow"]

  sensor-trash-rack-difflevel:
    image: sentinel-matrix/device-runtime:latest
    container_name: matrix-nuclear-sens-trashrack
    networks: { operational_ic_net: { ipv4_address: "10.190.1.48" } }
    command: ["--archetype", "sensor", "--protocol", "modbus", "--port", "502", "--name", "Trash-Rack-Diff-Water-Level"]

  sensor-n16-steam-radiation:
    image: sentinel-matrix/device-runtime:latest
    container_name: matrix-nuclear-sens-n16-rad
    networks: { operational_ic_net: { ipv4_address: "10.190.1.49" } }
    command: ["--archetype", "sensor", "--protocol", "stream_telemetry", "--port", "9504", "--name", "N16-Gamma-Radiation-Monitor"]

  sensor-aux-feedwater-discharge-press:
    image: sentinel-matrix/device-runtime:latest
    container_name: matrix-nuclear-sens-aux-feedwater
    networks: { operational_ic_net: { ipv4_address: "10.190.1.50" } }
    command: ["--archetype", "sensor", "--protocol", "modbus", "--port", "502", "--name", "Aux-Feedwater-Discharge-Press"]

  # ATTACKERS & SIMULATORS
  traffic-gen:
    build: { context: ., dockerfile: docker/Dockerfile.traffic }
    container_name: matrix-nuclear-traffic-gen
    hostname: traffic.nuclear.internal
    restart: unless-stopped
    networks: { operational_ic_net: { ipv4_address: "10.190.1.55" } }
    volumes:
      - ./configs:/configs:ro
      - ./src:/app/src:ro
      - ./pcaps:/shared/datasets:ro
    environment:
      - NEXUS_ENDPOINT=10.190.1.10:50051
      - TARGET_NODES=10.190.1.101,10.190.1.102,10.190.1.103

  adversary:
    build: { context: ., dockerfile: docker/Dockerfile.adversary }
    container_name: matrix-nuclear-adversary
    hostname: adversary.nuclear.internal
    restart: unless-stopped
    networks: { operational_ic_net: { ipv4_address: "10.190.1.99" } }
    volumes:
      - ./configs:/configs:ro
      - ./src:/app/src:ro
    environment:
      - NEXUS_REST_URL=http://10.190.1.10:9443
      - TARGET_NODES=10.190.1.101,10.190.1.102,10.190.1.103
```

### Step 6.5: Create `run_demo.sh`
```bash
cat << 'EOF' > /home/kami/sentinel-matrix/scenarios/nuclear_turbine_island_cooling/run_demo.sh
#!/usr/bin/env bash
set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
echo -e "\033[1;36m[*] Launching 22-Node Nuclear Secondary Island & Turbine Protection Grid...\033[0m"
python3 /home/kami/sentinel-matrix/tools/scenario_engine.py load "${SCRIPT_DIR}/scenario.yaml"
EOF
chmod +x /home/kami/sentinel-matrix/scenarios/nuclear_turbine_island_cooling/run_demo.sh
```

---

### Step 7: Pack Batch 2 Scenarios into Standalone `.tar.gz` (Rule 4)

Run these three commands to pack all three scenarios into verified `.tar.gz` bundles in your cache:

```bash
# 1. Pack Scenario 04: Catalytic Cracker & SIS Triad (19 Containers)
aryo scenario pack /home/kami/sentinel-matrix/scenarios/refinery_cracking_sis_triad --embed

# 2. Pack Scenario 05: Automated Container Port (19 Containers)
aryo scenario pack /home/kami/sentinel-matrix/scenarios/container_terminal_port_mesh --embed

# 3. Pack Scenario 06: Nuclear Turbine Island (22 Containers)
aryo scenario pack /home/kami/sentinel-matrix/scenarios/nuclear_turbine_island_cooling --embed
```

---

### Step 8: Verify Cached Bundles

Verify that all three archives exist in your cache:
```bash
ls -lh ~/.cache/sentinel/scenarios/scenario_refinery_cracking_sis_triad.tar.gz
ls -lh ~/.cache/sentinel/scenarios/scenario_container_terminal_port_mesh.tar.gz
ls -lh ~/.cache/sentinel/scenarios/scenario_nuclear_turbine_island_cooling.tar.gz
```

Once confirmed, you will have **6 out of 10 large-scale production scenarios packed and ready**. 

When ready, say **"Proceed with Batch 3"** to construct the final four scenarios (Hospital Surgical Microgrid, Gas Transmission Pipeline, Satellite Ground Station, and Chemical AI Copilot).