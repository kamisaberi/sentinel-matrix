# File: /home/kami/sentinel-matrix/Makefile

SHELL := /bin/bash
.DEFAULT_GOAL := help

export DOCKER_BUILDKIT          := 1
export COMPOSE_DOCKER_CLI_BUILD := 1
export BUILDKIT_PROGRESS        := plain
export IMAGE_TAG                ?= devel
export SENTINEL_CACHE_DIR       ?= /var/cache/sentinel
export FALLBACK_HUB_DIR         ?= /home/kami/sentinel-hub/dist

CYAN    := \033[36m
GREEN   := \033[32m
YELLOW  := \033[33m
RED     := \033[31m
BOLD    := \033[1m
RESET   := \033[0m

DEFAULT_DYNAMIC_SCENARIO := scenarios/reference_minimal


help:
	@echo -e "${CYAN}${BOLD}SENTINEL-MATRIX: DOMAIN-AGNOSTIC CYBER-PHYSICAL SIMULATION ENGINE${RESET}\n"
	@echo -e "  make init                    Sync binaries, host libs, ONNX models & web UI"
	@echo -e "  make build-device-runtime    Build sentinel-matrix/device-runtime:latest"
	@echo -e "  make build-apparatus-runtime Build sentinel-matrix/apparatus-runtime:latest"
	@echo -e "  make scenario-up             Launch scenario (default: reference_minimal; pass SCENARIO=<path>)"
	@echo -e "  make scenario-down           Dismantle active scenario containers & subnets"
	@echo -e "  make scenario-status         Show active scenario containers"
	@echo -e "  make scenario-restart        Restart active scenario"
	@echo -e "  make scenario-pack NAME=...  Pack scenario folder into distributable .tar.gz"
	@echo -e "  make fix-docker              Reset AppArmor profiles & restart Docker/containerd"
	@echo -e "  make clean                   Purge shared logs and temporary datasets\n"

init: sync-models
	@mkdir -p shared/certs shared/datasets shared/models shared/logs/nexus shared/logs/nodes shared/logs/forge shared/bin shared/proto shared/lib web/plugins configs
	@if [ ! -f .env ] && [ -f .env.example ]; then cp .env.example .env; fi
	@if [ -f /home/kami/sentinel-nexus/build/sentinel-nexus ]; then cp /home/kami/sentinel-nexus/build/sentinel-nexus shared/bin/; fi
	@if [ -f /home/kami/sentinel-nexus/build/nexus-ctl ]; then cp /home/kami/sentinel-nexus/build/nexus-ctl shared/bin/; fi
	@if [ -f /home/kami/blackbox-sentinel/build/sentinel ]; then cp /home/kami/blackbox-sentinel/build/sentinel shared/bin/; fi
	@if [ -d /home/kami/sentinel-nexus/web ]; then cp -r /home/kami/sentinel-nexus/web/* web/ 2>/dev/null || true; fi
	@if [ -d /home/kami/sentinel-nexus/proto ]; then cp /home/kami/sentinel-nexus/proto/*.proto shared/proto/ 2>/dev/null || true; fi
	@chmod +x shared/certs/gen_matrix_certs.sh 2>/dev/null || true
	@ldd shared/bin/sentinel-nexus shared/bin/sentinel 2>/dev/null | grep "=> /" | awk '{print $$3}' | grep -vE "libc\.so|libm\.so|libpthread|ld-linux|libdl" | sort -u | xargs -I {} cp -L -u {} shared/lib/ 2>/dev/null || true
	@echo -e "${GREEN}[+] Sentinel-Matrix framework initialized.${RESET}"

sync-models:
	@mkdir -p shared/models /etc/sentinel/models /var/cache/sentinel/models 2>/dev/null || true
	@if [ -d "/etc/sentinel/models" ] && [ "$$(ls -A /etc/sentinel/models/*.onnx 2>/dev/null)" ]; then cp -u /etc/sentinel/models/*.onnx* shared/models/ 2>/dev/null || true; fi
	@if [ -d "$(SENTINEL_CACHE_DIR)/models" ] && [ "$$(ls -A $(SENTINEL_CACHE_DIR)/models/*.onnx 2>/dev/null)" ]; then cp -u $(SENTINEL_CACHE_DIR)/models/*.onnx* shared/models/ 2>/dev/null || true; fi

build-device-runtime:
	docker build --build-arg BUILDKIT_INLINE_CACHE=1 \
		-t sentinel-matrix/device-runtime:devel \
		-t sentinel-matrix/device-runtime:latest \
		-f docker/Dockerfile.device_runtime .

build-apparatus-runtime:
	docker build --build-arg BUILDKIT_INLINE_CACHE=1 \
		-t sentinel-matrix/apparatus-runtime:devel \
		-t sentinel-matrix/apparatus-runtime:latest \
		-f docker/Dockerfile.apparatus_runtime .

port-clean:
	@sudo systemctl stop sentinel-nexus.service 2>/dev/null || true
	@sudo pkill -9 -x sentinel-nexus 2>/dev/null || true
	@sudo fuser -k 9443/tcp 9444/tcp 50051/tcp 15501/tcp 15502/tcp 8554/tcp 8889/tcp 2>/dev/null || true

fix-docker:
	@sudo aa-remove-unknown 2>/dev/null || true
	@sudo systemctl restart containerd docker
	@sudo docker rm -f $$(docker ps -aq --filter "name=matrix-") 2>/dev/null || true

clean:
	@rm -rf shared/datasets/* shared/logs/nexus/* shared/logs/nodes/* shared/logs/forge/*
	@echo -e "${GREEN}[+] Purged shared temporary datasets and logs.${RESET}"

scenario-up:
	@TARGET_SCENARIO="$(SCENARIO)"; \
	if [ -z "$$TARGET_SCENARIO" ]; then TARGET_SCENARIO="$(DEFAULT_DYNAMIC_SCENARIO)"; fi; \
	echo -e "${CYAN}[*] Launching dynamic scenario: $${TARGET_SCENARIO}...${RESET}"; \
	python3 tools/scenario_engine.py load "$$TARGET_SCENARIO" $(if $(MODE),--mode $(MODE),)

scenario-load: scenario-up

scenario-down:
	@python3 tools/scenario_engine.py down $(if $(NAME),--name $(NAME),)

scenario-restart: scenario-down scenario-up

scenario-status:
	@python3 tools/scenario_engine.py status $(if $(NAME),--name $(NAME),)

scenario-pack:
	@if [ -z "$(NAME)" ]; then echo -e "${RED}[-] Usage: make scenario-pack NAME=<scenario_folder> [EMBED=1]${RESET}"; exit 1; fi
	@EMBED_FLAG=""; if [ "$(EMBED)" = "1" ] || [ "$(EMBED)" = "true" ]; then EMBED_FLAG="--embed"; fi; \
	aryo scenario pack scenarios/$(NAME) $${EMBED_FLAG}
