#!/usr/bin/env bash
set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

echo "[*] [Step 1] Deploying .spkg rules (Embedded or Cache-Resolved)..."
if [ -d "packages" ] && [ "$(ls -A packages/*.spkg 2>/dev/null)" ]; then
    sudo aryo appliance install packages/*.spkg
fi

echo "[*] [Step 2] Staging AI models..."
sudo mkdir -p /etc/sentinel/models
if [ -d "models" ] && [ "$(ls -A models/*.onnx 2>/dev/null)" ]; then
    sudo cp -u models/*.onnx /etc/sentinel/models/
fi

echo "[*] [Step 3] Launching digital twin scenario mesh..."
aryo matrix scenario load scenario.yaml

echo "[+] SUCCESS: Scenario 'water_grid_v2' is running!"
