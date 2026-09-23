#!/usr/bin/env bash
set -e

echo "=== [TRAFFIC CONTAINER] Initializing Autonomous Simulation Loop ==="

# Wait for Nexus gRPC to be fully responsive
echo "[*] Waiting for Sentinel Nexus at 10.240.0.10:50051..."
while ! nc -z 10.240.0.10 50051 2>/dev/null; do
    sleep 1
done
echo "[+] Connected to Sentinel Nexus!"

exec python3 /app/src/orchestrator/master_controller.py