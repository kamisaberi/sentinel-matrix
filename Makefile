SHELL := /bin/bash
.PHONY: help init build up down restart logs status attack-modbus attack-c2 chaos-latency chaos-sever tui clean

help:
	@echo "=========================================================================="
	@echo "  SENTINEL-MATRIX: VMWARE AUTONOMOUS SIMULATION MESH CONTROLLER"
	@echo "=========================================================================="
	@echo "  make init           - Prepare shared directories, binaries, certs, and libs"
	@echo "  make build          - Build all container images (Nexus, Sentinel, Forge)"
	@echo "  make up             - Launch infinite autonomous simulation mesh"
	@echo "  make down           - Graceful shutdown of all appliances and services"
	@echo "  make restart        - Restart all containers with fresh state"
	@echo "  make status         - Display running container matrix and health status"
	@echo "  make logs           - Stream aggregated logs from all tiers"
	@echo "  make attack-modbus  - Inject SCADA Modbus coil override attack (T0855)"
	@echo "  make attack-c2      - Inject periodic C2 beacon exfiltration wave (T1071)"
	@echo "  make chaos-latency  - Inject SLA latency spike (>1000us) to test rollback"
	@echo "  make chaos-sever    - Abruptly terminate edge node to test 0ms disconnect"
	@echo "  make tui            - Launch real-time Terminal Dashboard inside container"
	@echo "  make clean          - Purge shared datasets, model artifacts, and caches"
	@echo "=========================================================================="

init:
	@mkdir -p shared/certs shared/datasets shared/models shared/logs/nexus shared/logs/nodes shared/logs/forge shared/bin shared/proto shared/lib web
	@if [ ! -f .env ]; then cp .env.example .env; fi
	@if [ -f /home/kami/sentinel-nexus/build/sentinel-nexus ]; then cp /home/kami/sentinel-nexus/build/sentinel-nexus shared/bin/; fi
	@if [ -f /home/kami/sentinel-nexus/build/nexus-ctl ]; then cp /home/kami/sentinel-nexus/build/nexus-ctl shared/bin/; fi
	@if [ -f /home/kami/blackbox-sentinel/build/sentinel ]; then cp /home/kami/blackbox-sentinel/build/sentinel shared/bin/; fi
	@if [ -d /home/kami/sentinel-nexus/web ]; then cp -r /home/kami/sentinel-nexus/web/* web/ 2>/dev/null || true; fi
	@if [ -d /home/kami/sentinel-nexus/proto ]; then cp /home/kami/sentinel-nexus/proto/*.proto shared/proto/ 2>/dev/null || true; fi
	@chmod +x shared/certs/gen_matrix_certs.sh 2>/dev/null || true
	@echo "[*] Bundling all host dynamic libraries..."
	@ldd shared/bin/sentinel-nexus shared/bin/sentinel 2>/dev/null | grep "=> /" | awk '{print $$3}' | grep -vE "libc\.so|libm\.so|libpthread|ld-linux|libdl" | sort -u | xargs -I {} cp -L -u {} shared/lib/ 2>/dev/null || true
	@echo "[+] Environment initialized and host artifacts synchronized."


	
build: init
	docker compose build

up: init
	docker compose up -d
	@echo ""
	@echo "[+] Sentinel-Matrix is actively executing inside VMware!"
	@echo "    - Web Command Center : http://localhost:9443"
	@echo "    - gRPC Nexus Service : localhost:50051"
	@echo "    - Real-Time SSE Stream: http://localhost:9444"
	@echo "    - Nodes Online       : 3 Heterogeneous Appliances (Substation, Hospital, Refinery)"
	@echo ""

down:
	docker compose down --remove-orphans

restart: down up

status:
	docker compose ps

logs:
	docker compose logs -f --tail=100

attack-modbus:
	docker compose exec traffic-gen python3 /app/src/traffic/attack_generator.py --scenario /configs/scenarios/02_scada_modbus_tamper.yaml

attack-c2:
	docker compose exec traffic-gen python3 /app/src/traffic/attack_generator.py --scenario /configs/scenarios/03_c2_beacon_exfil.yaml

chaos-latency:
	docker compose exec traffic-gen python3 /app/tools/inject_chaos.py --type latency_spike --node node-01 --latency 1650.0

chaos-sever:
	docker compose stop sentinel-edge-01
	@echo "[+] Node 01 severed. Observe instant 0ms OFFLINE transition in Nexus UI."

tui:
	docker compose exec monitor python3 /app/src/monitor/live_dashboard.py

clean: down
	@rm -rf shared/datasets/* shared/logs/nexus/* shared/logs/nodes/* shared/logs/forge/*
	@echo "[+] Purged shared temporary datasets and logs."