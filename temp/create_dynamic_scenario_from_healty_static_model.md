### Architecture & Plan: Packing the Full Master Grid with Tested Models

Based on your directory listings, you already have:
* **Tested Models:** `network_threat_detector.onnx`, `network_threat_int8.onnx`, `power_quality_anomaly.onnx`, `vibration_spectral_ae.onnx`
* **Node Profiles:** `node_01_substation_alpha.yaml`, `node_02_hospital_pacs.yaml`, `node_03_refinery_plc.yaml`
* **Real PCAPs:** `industroyer2_substation.pcap`, `stuxnet_s7comm_injected.pcap`, `triton_trisis_sis.pcap`

We will now bundle this **exact, tested production grid** (all 9 containers: `nexus`, `mock-plc`, `forge`, `sentinel-edge-01`, `02`, `03`, `traffic-gen`, `monitor`, and `adversary`) into a turnkey scenario: **`production_master_grid`**, pack it into a standalone `.tar.gz`, and launch it via `aryo matrix scenario load`.

---

### Step 1: Create the Composite Scenario Workspace

Create the directory hierarchy for the scenario bundle:

```bash
mkdir -p /home/kami/sentinel-matrix/scenarios/production_master_grid/{models,configs/nodes,pcaps}
```

---

### Step 2: Copy Tested Models, Configs, and PCAPs into the Scenario

Populate the bundle with the files you already tested:

```bash
# 1. Copy the tested neural models
cp /home/kami/sentinel-matrix/shared/models/network_threat_detector.onnx /home/kami/sentinel-matrix/scenarios/production_master_grid/models/
cp /home/kami/sentinel-matrix/shared/models/network_threat_int8.onnx /home/kami/sentinel-matrix/scenarios/production_master_grid/models/
cp /home/kami/sentinel-matrix/shared/models/power_quality_anomaly.onnx* /home/kami/sentinel-matrix/scenarios/production_master_grid/models/ 2>/dev/null || true
cp /home/kami/sentinel-matrix/shared/models/vibration_spectral_ae.onnx* /home/kami/sentinel-matrix/scenarios/production_master_grid/models/ 2>/dev/null || true

# 2. Copy the active node configs & register maps
cp /home/kami/sentinel-matrix/configs/nodes/node_01_substation_alpha.yaml /home/kami/sentinel-matrix/scenarios/production_master_grid/configs/nodes/
cp /home/kami/sentinel-matrix/configs/nodes/node_02_hospital_pacs.yaml /home/kami/sentinel-matrix/scenarios/production_master_grid/configs/nodes/
cp /home/kami/sentinel-matrix/configs/nodes/node_03_refinery_plc.yaml /home/kami/sentinel-matrix/scenarios/production_master_grid/configs/nodes/
cp /home/kami/sentinel-matrix/configs/plc_register_map.json /home/kami/sentinel-matrix/scenarios/production_master_grid/configs/ 2>/dev/null || true

# 3. Copy the real attack PCAP captures
cp /home/kami/sentinel-matrix/shared/datasets/industroyer2_substation.pcap /home/kami/sentinel-matrix/scenarios/production_master_grid/pcaps/
cp /home/kami/sentinel-matrix/shared/datasets/stuxnet_s7comm_injected.pcap /home/kami/sentinel-matrix/scenarios/production_master_grid/pcaps/
cp /home/kami/sentinel-matrix/shared/datasets/triton_trisis_sis.pcap /home/kami/sentinel-matrix/scenarios/production_master_grid/pcaps/
```

---

### Step 3: Create `manifest.json`

Create `/home/kami/sentinel-matrix/scenarios/production_master_grid/manifest.json`:

```bash
AUTH_KEY=$(cat /tmp/manifest.json 2>/dev/null | grep -o '"author_public_key": "[^"]*' | head -n 1 | cut -d'"' -f4 || echo "")

cat << EOF > /home/kami/sentinel-matrix/scenarios/production_master_grid/manifest.json
{
  "name": "production_master_grid",
  "slug": "production_master_grid",
  "title": "Full 8-Tier Production Grid with Tested Edge Nodes & Models",
  "version": "1.0.0",
  "asset_type": "scenario",
  "target_sector": "CRITICAL_INFRASTRUCTURE",
  "sector": "CRITICAL_INFRASTRUCTURE",
  "complexity": "ADVANCED",
  "category": "SCADA_ICS",
  "author": "Aryorithm Certified Engineer",
  "description": "Full-scale 9-container digital twin with 3 edge appliances, neural models, mock PLC, and malware replays.",
  "author_public_key": "$AUTH_KEY",
  "dependencies": {
    "models": [
      "network_threat_detector.onnx",
      "network_threat_int8.onnx",
      "power_quality_anomaly.onnx",
      "vibration_spectral_ae.onnx"
    ],
    "pcaps": [
      "industroyer2_substation.pcap",
      "stuxnet_s7comm_injected.pcap",
      "triton_trisis_sis.pcap"
    ]
  },
  "compliance": ["IEC-62443-4-2", "NIS2"]
}
EOF
```

---

### Step 4: Create `scenario.yaml` (Complete 9-Container Production Topology)

Create `/home/kami/sentinel-matrix/scenarios/production_master_grid/scenario.yaml`:

```yaml
version: "1.0"
scenario:
  name: "production_master_grid"
  description: "Tested Production Grid: Nexus, 3 Edge Appliances, Mock PLC, Forge, Adversary & Traffic-Gen"

networks:
  sentinel-grid-net:
    driver: bridge
    subnet: "10.240.0.0/24"
    gateway: "10.240.0.1"
    internal: false

volumes:
  shared-models:
    driver: local
  shared-datasets:
    driver: local
  shared-logs:
    driver: local

services:
  # 1. TIER 6: SENTINEL NEXUS (Master Command Plane)
  nexus:
    build:
      context: .
      dockerfile: docker/Dockerfile.nexus
    container_name: matrix-nexus
    hostname: nexus.matrix.internal
    restart: unless-stopped
    privileged: true
    networks:
      sentinel-grid-net:
        ipv4_address: "10.240.0.10"
    ports:
      - "50051:50051"
      - "9443:9443"
      - "9444:9444"
    volumes:
      - ./configs:/opt/sentinel-nexus/configs:ro
      - ./models:/opt/sentinel-nexus/models
      - shared-datasets:/var/lib/sentinel-nexus/forge_datasets
      - shared-logs:/var/log/sentinel-nexus
      - ./shared/lib:/usr/local/lib/matrix-deps:ro
      - ./shared/bin/sentinel-nexus:/usr/local/bin/sentinel-nexus:ro
      - ./web:/opt/sentinel-nexus/web:ro
    environment:
      - LD_LIBRARY_PATH=/usr/local/lib/matrix-deps
      - VMWARE_ENVIRONMENT=true
      - NEXUS_ENV=simulation
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:9443/api/v1/fleet/nodes"]
      interval: 5s
      timeout: 3s
      retries: 5
      start_period: 10s

  # 2. DIGITAL TWIN HARDWARE: MOCK PLC (SCADA Industrial Listener)
  mock-plc:
    build:
      context: .
      dockerfile: docker/Dockerfile.plc
    container_name: matrix-mock-plc
    hostname: plc.matrix.internal
    restart: unless-stopped
    networks:
      sentinel-grid-net:
        ipv4_address: "10.240.0.150"
    ports:
      - "502:502"
      - "102:102"
      - "2404:2404"
    volumes:
      - ./configs:/opt/sentinel-matrix/configs:ro
      - ./shared/bin/mock_plc:/usr/local/bin/mock_plc:ro
    command: ["/usr/local/bin/mock_plc", "-c", "/opt/sentinel-matrix/configs/plc_register_map.json"]

  # 3. TIER 4: XINFER FORGE (Continuous Learning Daemon)
  forge:
    build:
      context: .
      dockerfile: docker/Dockerfile.forge
    container_name: matrix-forge
    hostname: forge.matrix.internal
    restart: unless-stopped
    depends_on:
      nexus:
        condition: service_healthy
    networks:
      sentinel-grid-net:
        ipv4_address: "10.240.0.20"
    volumes:
      - shared-datasets:/var/lib/sentinel-nexus/forge_datasets:ro
      - ./models:/opt/sentinel-nexus/models:rw
      - shared-logs:/var/log/xinfer-forge
    environment:
      - NEXUS_REST_URL=http://10.240.0.10:9443
      - NEXUS_DATASET_DIR=/var/lib/sentinel-nexus/forge_datasets
      - NEXUS_MODELS_DIR=/opt/sentinel-nexus/models
      - VMWARE_CONTAINER=true

  # 4. TIER 3: EDGE APPLIANCE 01 (Industrial Substation - OpenVINO)
  sentinel-edge-01:
    build:
      context: .
      dockerfile: docker/Dockerfile.sentinel
    container_name: matrix-edge-substation-01
    hostname: substation-01.matrix.internal
    restart: unless-stopped
    privileged: true
    cap_add:
      - NET_ADMIN
      - SYS_ADMIN
      - BPF
    depends_on:
      nexus:
        condition: service_healthy
    networks:
      sentinel-grid-net:
        ipv4_address: "10.240.0.101"
    volumes:
      - ./configs/nodes/node_01_substation_alpha.yaml:/etc/sentinel/sentinel.yaml:ro
      - ./configs:/etc/sentinel/configs:ro
      - ./models:/etc/sentinel/models:rw
      - shared-logs:/var/log/sentinel
      - ./shared/lib:/usr/local/lib/matrix-deps:ro
      - ./shared/bin/sentinel:/usr/local/bin/sentinel:ro
    environment:
      - LD_LIBRARY_PATH=/usr/local/lib/matrix-deps
      - NODE_IDENTIFIER=Edge-Substation-01
      - SITE_IDENTIFIER=Edge-Substation-01
      - NODE_SITE=PowerGrid-North-01
      - PRIMARY_BACKEND=INTEL_OPENVINO
      - VMWARE_VIRTUAL_NIC=true
      - XDP_MODE=SKB
      - NEXUS_HOST=10.240.0.10
      - NEXUS_PORT=50051

  # 5. TIER 3: EDGE APPLIANCE 02 (Hospital PACS - TensorRT Emulation)
  sentinel-edge-02:
    build:
      context: .
      dockerfile: docker/Dockerfile.sentinel
    container_name: matrix-edge-hospital-02
    hostname: hospital-02.matrix.internal
    restart: unless-stopped
    privileged: true
    cap_add:
      - NET_ADMIN
      - SYS_ADMIN
      - BPF
    depends_on:
      nexus:
        condition: service_healthy
    networks:
      sentinel-grid-net:
        ipv4_address: "10.240.0.102"
    volumes:
      - ./configs/nodes/node_02_hospital_pacs.yaml:/etc/sentinel/sentinel.yaml:ro
      - ./configs:/etc/sentinel/configs:ro
      - ./models:/etc/sentinel/models:rw
      - shared-logs:/var/log/sentinel
      - ./shared/lib:/usr/local/lib/matrix-deps:ro
      - ./shared/bin/sentinel:/usr/local/bin/sentinel:ro
    environment:
      - LD_LIBRARY_PATH=/usr/local/lib/matrix-deps
      - NODE_IDENTIFIER=Edge-Hospital-PACS-02
      - SITE_IDENTIFIER=Edge-Hospital-PACS-02
      - NODE_SITE=Metro-General-Hospital
      - PRIMARY_BACKEND=NVIDIA_TENSORRT
      - VMWARE_VIRTUAL_NIC=true
      - XDP_MODE=SKB
      - NEXUS_HOST=10.240.0.10
      - NEXUS_PORT=50051

  # 6. TIER 3: EDGE APPLIANCE 03 (Refinery SCADA - RKNN Emulation)
  sentinel-edge-03:
    build:
      context: .
      dockerfile: docker/Dockerfile.sentinel
    container_name: matrix-edge-refinery-03
    hostname: refinery-03.matrix.internal
    restart: unless-stopped
    privileged: true
    cap_add:
      - NET_ADMIN
      - SYS_ADMIN
      - BPF
    depends_on:
      nexus:
        condition: service_healthy
    networks:
      sentinel-grid-net:
        ipv4_address: "10.240.0.103"
    volumes:
      - ./configs/nodes/node_03_refinery_plc.yaml:/etc/sentinel/sentinel.yaml:ro
      - ./configs:/etc/sentinel/configs:ro
      - ./models:/etc/sentinel/models:rw
      - shared-logs:/var/log/sentinel
      - ./shared/lib:/usr/local/lib/matrix-deps:ro
      - ./shared/bin/sentinel:/usr/local/bin/sentinel:ro
    environment:
      - LD_LIBRARY_PATH=/usr/local/lib/matrix-deps
      - NODE_IDENTIFIER=Edge-Refinery-PLC-03
      - SITE_IDENTIFIER=Edge-Refinery-PLC-03
      - NODE_SITE=Coastal-Refinery-ZoneB
      - PRIMARY_BACKEND=ROCKCHIP_RKNN
      - VMWARE_VIRTUAL_NIC=true
      - XDP_MODE=SKB
      - NEXUS_HOST=10.240.0.10
      - NEXUS_PORT=50051

  # 7. SYNTHETIC WIRE TRAFFIC & ATTACK WAVE GENERATOR
  traffic-gen:
    build:
      context: .
      dockerfile: docker/Dockerfile.traffic
    container_name: matrix-traffic-gen
    hostname: traffic.matrix.internal
    restart: unless-stopped
    depends_on:
      nexus:
        condition: service_healthy
    networks:
      sentinel-grid-net:
        ipv4_address: "10.240.0.50"
    volumes:
      - ./configs:/configs:ro
      - ./src:/app/src:ro
      - shared-logs:/var/log/traffic-gen
      - ./pcaps:/shared/datasets:ro
    environment:
      - NEXUS_ENDPOINT=10.240.0.10:50051
      - TARGET_NODES=10.240.0.101,10.240.0.102,10.240.0.103
      - VMWARE_SIMULATION_MODE=true

  # 8. TERMINAL REAL-TIME DASHBOARD (TUI)
  monitor:
    build:
      context: .
      dockerfile: docker/Dockerfile.monitor
    container_name: matrix-monitor
    restart: unless-stopped
    depends_on:
      nexus:
        condition: service_healthy
    networks:
      sentinel-grid-net:
        ipv4_address: "10.240.0.60"
    volumes:
      - ./src/monitor:/app/src/monitor:ro
    environment:
      - NEXUS_REST_URL=http://10.240.0.10:9443
      - NEXUS_STREAM_URL=http://10.240.0.10:9444
      - TERM=xterm-256color
    stdin_open: true
    tty: true

  # 9. LIVE ADVERSARY CONTAINER
  adversary:
    build:
      context: .
      dockerfile: docker/Dockerfile.adversary
    container_name: matrix-adversary
    hostname: adversary.matrix.internal
    restart: unless-stopped
    depends_on:
      nexus:
        condition: service_healthy
    networks:
      sentinel-grid-net:
        ipv4_address: "10.240.0.99"
    volumes:
      - ./configs:/configs:ro
      - ./src:/app/src:ro
      - shared-logs:/var/log/adversary
    environment:
      - NEXUS_REST_URL=http://10.240.0.10:9443
      - TARGET_NODES=10.240.0.101,10.240.0.102,10.240.0.103
```

---

### Step 5: Pack into a Standalone `.tar.gz` Bundle

Pack the entire directory, embedding the models, configs, and PCAPs:

```bash
aryo scenario pack /home/kami/sentinel-matrix/scenarios/production_master_grid --embed
```

This creates:
```text
~/.cache/sentinel/scenarios/scenario_production_master_grid.tar.gz
```

---

### Step 6: Load & Test the Scenario Directly from the `.tar.gz` Archive

Load the complete `.tar.gz` bundle:

```bash
# 1. Load the complete production scenario directly from the .tar.gz archive
aryo matrix scenario load ~/.cache/sentinel/scenarios/scenario_production_master_grid.tar.gz

# 2. Check the live status of all 9 production containers
aryo matrix scenario status

# 3. Clean up the scenario when finished
aryo matrix scenario down --name production_master_grid
```

Follow Steps 1 through 6 in your terminal, and confirm that all 9 production containers boot and report healthy.


---
---
---

cd /home/kami/sentinel-matrix

# 1. Launch default tested production grid (.tar.gz) in 1 command
make scenario-up

# 2. Check running status
make scenario-status

# 3. Restart the scenario cleanly
make scenario-restart

# 4. Tear down the scenario
make scenario-down

# 5. Launch a specific scenario archive
make scenario-up SCENARIO=~/.cache/sentinel/scenarios/scenario_water_treatment_facility.tar.gz
make scenario-down