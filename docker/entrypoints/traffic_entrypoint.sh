#!/usr/bin/env bash
set -e

echo "=== [TRAFFIC CONTAINER] Initializing Autonomous Simulation Loop ==="

export PYTHONPATH="/app:/app/src:/app/generated:${PYTHONPATH}"

# Pure Python socket probe (avoids netcat flavor incompatibilities)
echo "[*] Waiting for Sentinel Nexus at 10.240.0.10:50051..."
python3 -c '
import socket, time
while True:
    try:
        s = socket.create_connection(("10.240.0.10", 50051), timeout=1)
        s.close()
        break
    except OSError:
        time.sleep(1)
'
echo "[+] Connected to Sentinel Nexus gRPC interface!"

exec python3 /app/src/orchestrator/master_controller.py