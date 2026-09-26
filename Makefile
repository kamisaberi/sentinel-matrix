SHELL := /bin/bash
.DEFAULT_GOAL := help

# Color formatting
CYAN    := \033[36m
GREEN   := \033[32m
YELLOW  := \033[33m
RED     := \033[31m
BLUE    := \033[34m
BOLD    := \033[1m
RESET   := \033[0m

# ==============================================================================
# HELP MENU (Interactive Colorized Documentation)
# ==============================================================================
help:
	@echo -e "${CYAN}${BOLD}"
	@echo "  ____             _   _            _     __  __       _        _      "
	@echo " / ___|  ___ _ __ | |_(_)_ __   ___| |   |  \/  | __ _| |_ _ __(_)_  __"
	@echo " \___ \ / _ \ '_ \| __| | '_ \ / _ \ |   | |\/| |/ _\` | __| '__| \ \/ /"
	@echo "  ___) |  __/ | | | |_| | | | |  __/ |   | |  | | (_| | |_| |  | |>  < "
	@echo " |____/ \___|_| |_|\__|_|_| |_|\___|_|   |_|  |_|\__,_|\__|_|  |_/_/\_\\"
	@echo -e "         ${YELLOW}Autonomous Cyber-Physical Range & Simulation Mesh${RESET}\n"
	@echo -e "${BOLD}USAGE:${RESET}"
	@echo -e "  make ${CYAN}<command>${RESET}  or  sudo make ${CYAN}<command>${RESET}\n"
	
	@echo -e "${GREEN}${BOLD}1. GRID LIFECYCLE & CORE OPS${RESET}"
	@printf "  ${CYAN}%-22s${RESET} %s\n" "init" "Prepare shared directories, certs, and auto-bundle host dynamic libs"
	@printf "  ${CYAN}%-22s${RESET} %s\n" "build" "Build/rebuild all container images (Nexus, Sentinel, Forge, Adversary)"
	@printf "  ${CYAN}%-22s${RESET} %s\n" "up" "Launch entire 8-node simulation mesh in background (10.240.0.0/24)"
	@printf "  ${CYAN}%-22s${RESET} %s\n" "down" "Gracefully stop and dismantle the simulation grid"
	@printf "  ${CYAN}%-22s${RESET} %s\n" "restart" "Perform full teardown and clean launch of the grid"
	@printf "  ${CYAN}%-22s${RESET} %s\n" "status" "Display container health, runtime status, and port bindings"
	@printf "  ${CYAN}%-22s${RESET} %s\n" "logs" "Stream unified real-time logs from all running containers"
	@printf "  ${CYAN}%-22s${RESET} %s\n" "clean" "Purge temporary datasets, model candidates, and execution logs"
	@echo ""

	@echo -e "${GREEN}${BOLD}2. OBSERVABILITY & MONITORING${RESET}"
	@printf "  ${CYAN}%-22s${RESET} %s\n" "tui" "Launch live split-panel Terminal UI (Edge Appliances + MITRE ATT&CK)"
	@printf "  ${CYAN}%-22s${RESET} %s\n" "adversary-logs" "Stream live output from the active Red-Team adversary node"
	@echo ""

	@echo -e "${GREEN}${BOLD}3. LIVE ADVERSARY ON-THE-WIRE ATTACKS (Container 10.240.0.99)${RESET}"
	@printf "  ${CYAN}%-22s${RESET} %s\n" "live-nmap" "Execute real nmap TCP SYN port discovery sweep across edge nodes (T1046)"
	@printf "  ${CYAN}%-22s${RESET} %s\n" "live-scada" "Execute real Modbus FC05 coil override command via mbpoll (T0855)"
	@printf "  ${CYAN}%-22s${RESET} %s\n" "live-api" "Execute real high-velocity HTTP API abuse queries with curl (T1190)"
	@echo ""

	@echo -e "${GREEN}${BOLD}4. REAL-WORLD PCAP REPLAY STREAMS (Genuine Historical Captures)${RESET}"
	@printf "  ${CYAN}%-22s${RESET} %s\n" "download-pcaps" "Fetch real-world PCAP datasets from Nozomi, CISA, and university labs"
	@printf "  ${CYAN}%-22s${RESET} %s\n" "attack-real-triton" "Replay Nozomi Networks genuine TRITON / Trisis SIS attack capture (T0843)"
	@printf "  ${CYAN}%-22s${RESET} %s\n" "attack-real-modbus" "Replay University of Illinois genuine Modbus TCP SCADA capture (T0855)"
	@printf "  ${CYAN}%-22s${RESET} %s\n" "attack-real-s7" "Replay genuine Siemens S7Comm PLC memory read/write capture (T0831)"
	@printf "  ${CYAN}%-22s${RESET} %s\n" "attack-real-dnp3" "Replay University of Illinois genuine DNP3 substation capture (T0855)"
	@printf "  ${CYAN}%-22s${RESET} %s\n" "attack-real-iec104" "Replay genuine IEC 60870-5-104 power grid telecontrol capture (T0855)"
	@echo ""

	@echo -e "${GREEN}${BOLD}5. OFFLINE PCAP GENERATION & REPLAY (Zero-Network / Air-Gapped)${RESET}"
	@printf "  ${CYAN}%-22s${RESET} %s\n" "generate-pcaps" "Locally generate binary .pcap captures without internet connection"
	@printf "  ${CYAN}%-22s${RESET} %s\n" "attack-industroyer" "Replay Industroyer IEC-104 high-voltage circuit breaker trip"
	@printf "  ${CYAN}%-22s${RESET} %s\n" "attack-triton" "Replay synthetic Triton TriStation 1131 safety override stream"
	@printf "  ${CYAN}%-22s${RESET} %s\n" "attack-stuxnet" "Replay synthetic Stuxnet S7Comm centrifuge frequency tamper"
	@echo ""

	@echo -e "${GREEN}${BOLD}6. CHAOS ENGINEERING & RESILIENCE VALIDATION${RESET}"
	@printf "  ${CYAN}%-22s${RESET} %s\n" "chaos-latency" "Inject simulated inference latency breach (>1000us) to verify auto-rollback"
	@printf "  ${CYAN}%-22s${RESET} %s\n" "chaos-sever" "Abruptly terminate Edge Node 01 to test 0ms graceful disconnect in Nexus"
	@echo ""

# ==============================================================================
# TARGET IMPLEMENTATIONS
# ==============================================================================

init:
	@mkdir -p shared/certs shared/datasets shared/models shared/logs/nexus shared/logs/nodes shared/logs/forge shared/bin shared/proto shared/lib web
	@if [ ! -f .env ]; then cp .env.example .env; fi
	@if [ -f /home/kami/sentinel-nexus/build/sentinel-nexus ]; then cp /home/kami/sentinel-nexus/build/sentinel-nexus shared/bin/; fi
	@if [ -f /home/kami/sentinel-nexus/build/nexus-ctl ]; then cp /home/kami/sentinel-nexus/build/nexus-ctl shared/bin/; fi
	@if [ -f /home/kami/blackbox-sentinel/build/sentinel ]; then cp /home/kami/blackbox-sentinel/build/sentinel shared/bin/; fi
	@if [ -d /home/kami/sentinel-nexus/web ]; then cp -r /home/kami/sentinel-nexus/web/* web/ 2>/dev/null || true; fi
	@if [ -d /home/kami/sentinel-nexus/proto ]; then cp /home/kami/sentinel-nexus/proto/*.proto shared/proto/ 2>/dev/null || true; fi
	@chmod +x shared/certs/gen_matrix_certs.sh 2>/dev/null || true
	@echo -e "${YELLOW}[*] Collecting host dynamic libraries (Abseil, gRPC, Protobuf, RE2)...${RESET}"
	@ldd shared/bin/sentinel-nexus shared/bin/sentinel 2>/dev/null | grep "=> /" | awk '{print $$3}' | grep -vE "libc\.so|libm\.so|libpthread|ld-linux|libdl" | sort -u | xargs -I {} cp -L -u {} shared/lib/ 2>/dev/null || true
	@echo -e "${GREEN}[+] Environment initialized and host artifacts synchronized.${RESET}"

build: init
	docker compose build

up: init
	docker compose up -d --build
	@echo ""
	@echo -e "${GREEN}${BOLD}[+] Sentinel-Matrix is actively executing inside VMware!${RESET}"
	@echo -e "    • Web Command Center  : ${CYAN}http://localhost:9443${RESET}"
	@echo -e "    • gRPC Nexus Service  : ${CYAN}10.240.0.10:50051${RESET}"
	@echo -e "    • Live Adversary Node : ${CYAN}10.240.0.99${RESET}"
	@echo -e "    • Real-Time TUI       : ${CYAN}make tui${RESET}"
	@echo ""

down:
	docker compose down --remove-orphans

restart: down up

status:
	docker compose ps

logs:
	docker compose logs -f --tail=100

clean: down
	@rm -rf shared/datasets/* shared/logs/nexus/* shared/logs/nodes/* shared/logs/forge/*
	@echo -e "${GREEN}[+] Purged shared temporary datasets, caches, and logs.${RESET}"

tui:
	docker compose exec monitor python3 /app/src/monitor/live_dashboard.py

# Live Adversary Targets
adversary-logs:
	docker compose logs -f adversary

live-nmap:
	docker compose exec adversary nmap -sS -Pn -p 80,443,502,102,2404 10.240.0.101

live-scada:
	docker compose exec adversary mbpoll -m tcp -a 1 -r 105 -t 0 10.240.0.101 1

live-api:
	docker compose exec adversary curl -v -X POST http://10.240.0.101:8443/api/v1/auth/login -d '{"user":"admin","token":"test"}'

# PCAP Dataset Tools
download-pcaps:
	python3 tools/download_real_pcaps.py

generate-pcaps:
	python3 tools/generate_real_pcaps.py

# Real-World Downloaded PCAP Replays
attack-real-triton: download-pcaps
	docker compose exec traffic-gen python3 /app/src/traffic/pcap_streamer.py \
		--pcap /configs/pcaps/downloaded/real_triton_trisis.pcap \
		--node Edge-Hospital-PACS-02 \
		--tactic T0843 \
		--name "Nozomi Networks Real TRITON/Trisis Safety Controller Attack"

attack-real-modbus: download-pcaps
	docker compose exec traffic-gen python3 /app/src/traffic/pcap_streamer.py \
		--pcap /configs/pcaps/downloaded/real_modbus_ics.pcap \
		--node Edge-Substation-01 \
		--tactic T0855 \
		--name "University of Illinois Real Modbus TCP SCADA Capture"

attack-real-dnp3: download-pcaps
	docker compose exec traffic-gen python3 /app/src/traffic/pcap_streamer.py \
		--pcap /configs/pcaps/downloaded/real_dnp3_scada.pcap \
		--node Edge-Substation-01 \
		--tactic T0855 \
		--name "University of Illinois Real DNP3 Substation SCADA Capture"

attack-real-s7: download-pcaps
	docker compose exec traffic-gen python3 /app/src/traffic/pcap_streamer.py \
		--pcap /configs/pcaps/downloaded/real_s7comm_plc.pcap \
		--node Edge-Refinery-PLC-03 \
		--tactic T0831 \
		--name "Real Siemens S7Comm Industrial PLC Capture"

attack-real-iec104: download-pcaps
	docker compose exec traffic-gen python3 /app/src/traffic/pcap_streamer.py \
		--pcap /configs/pcaps/downloaded/real_iec104_grid.pcap \
		--node Edge-Substation-01 \
		--tactic T0855 \
		--name "Real IEC 60870-5-104 High-Voltage Grid Telecontrol Capture"

# Offline Synthetic PCAP Replays
attack-industroyer: generate-pcaps
	docker compose exec traffic-gen python3 /app/src/traffic/pcap_streamer.py \
		--pcap /configs/pcaps/industroyer_iec104.pcap \
		--node Edge-Substation-01 \
		--tactic T0855 \
		--name "Industroyer IEC-104 Circuit Breaker Trip"

attack-triton: generate-pcaps
	docker compose exec traffic-gen python3 /app/src/traffic/pcap_streamer.py \
		--pcap /configs/pcaps/triton_tristation.pcap \
		--node Edge-Hospital-PACS-02 \
		--tactic T0843 \
		--name "Triton/Trisis TriStation Safety Override"

attack-stuxnet: generate-pcaps
	docker compose exec traffic-gen python3 /app/src/traffic/pcap_streamer.py \
		--pcap /configs/pcaps/stuxnet_s7comm.pcap \
		--node Edge-Refinery-PLC-03 \
		--tactic T0831 \
		--name "Stuxnet Siemens S7Comm Frequency Tamper"

# Chaos Testing Targets
chaos-latency:
	docker compose exec traffic-gen python3 /app/tools/inject_chaos.py --type latency_spike --node node-01 --latency 1650.0

chaos-sever:
	docker compose stop sentinel-edge-01
	@echo -e "${YELLOW}[+] Node 01 severed. Check TUI/Web UI for instant 0ms OFFLINE transition.${RESET}"