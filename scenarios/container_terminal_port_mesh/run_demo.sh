#!/usr/bin/env bash
set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
echo -e "\033[1;36m[*] Launching 19-Node Automated Maritime Port Terminal...\033[0m"
python3 /home/kami/sentinel-matrix/tools/scenario_engine.py load "${SCRIPT_DIR}/scenario.yaml"
