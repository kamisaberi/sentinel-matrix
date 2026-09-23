#!/usr/bin/env bash
set -e

echo "=== [FORGE CONTAINER] Starting Continuous Retraining Daemon ==="
mkdir -p /var/lib/sentinel-nexus/forge_datasets /opt/sentinel-nexus/models /var/log/xinfer-forge

echo "[+] Listening for curated candidate batches from Nexus..."
exec python3 /app/forge_watcher.py