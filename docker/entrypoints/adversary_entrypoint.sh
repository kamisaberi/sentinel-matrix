#!/usr/bin/env bash
set -e

echo "=== [ADVERSARY CONTAINER] Initializing Live Red-Team Node (10.240.0.99) ==="

# Wait for Nexus and target edge appliances to be reachable on the internal subnet
echo "[*] Waiting for target edge nodes to establish network routes..."
python3 -c '
import socket, time
targets = [("10.240.0.10", 9443), ("10.240.0.101", 8443)]
for host, port in targets:
    while True:
        try:
            s = socket.create_connection((host, port), timeout=1)
            s.close()
            break
        except OSError:
            time.sleep(1)
'
echo "[+] Network routes established. Launching infinite live adversary stream..."

exec python3 /app/src/traffic/live_adversary_daemon.py