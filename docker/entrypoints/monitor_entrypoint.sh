#!/usr/bin/env bash
set -e

echo "=== [MONITOR CONTAINER] Launching Live Terminal Dashboard ==="
exec python3 /app/src/monitor/live_dashboard.py