#!/usr/bin/env bash
set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
echo -e "\033[1;36m[*] Launching 20-Node Exothermic Reactor with AI Copilot & Live-SBOM...\033[0m"
python3 /home/kami/sentinel-matrix/tools/scenario_engine.py load "${SCRIPT_DIR}/scenario.yaml"
