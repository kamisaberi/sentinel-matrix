#!/usr/bin/env bash
set -e

echo "=== [SENTINEL CONTAINER] Initializing Edge Appliance: ${NODE_IDENTIFIER} ==="

mkdir -p /etc/sentinel/models /var/log/sentinel /sys/fs/bpf

# Export dynamic library paths for host-compiled dependencies
export LD_LIBRARY_PATH=/usr/local/lib/matrix-deps:/usr/local/lib:/usr/local/lib64:$LD_LIBRARY_PATH
ldconfig /usr/local/lib/matrix-deps 2>/dev/null || true

# Ensure Generic SKB mode for VMware veth / virtual NIC
if command -v ip >/dev/null 2>&1; then
    ip link set dev eth0 promisc on 2>/dev/null || true
fi

# Configure synthetic vTPM & DMI identities for VMware validation
mkdir -p /sys/class/dmi/id 2>/dev/null || true
if [ ! -f /sys/class/dmi/id/product_uuid ]; then
    echo "VMware-42 1a 88 fc 54 b2 9a e4-99 a0 12 d4 33 ${NODE_IDENTIFIER}" > /tmp/virtual_uuid 2>/dev/null || true
fi

CONFIG_FILE="/etc/sentinel/sentinel.yaml"
if [ ! -f "$CONFIG_FILE" ]; then
    cat << EOF > "$CONFIG_FILE"
nexus:
  enabled: true
  host: "10.240.0.10"
  port: 50051
  nexus_http_port: 9443
  sentinel_local_api_port: 8443
  heartbeat_interval_sec: 5
  site_identifier: "${NODE_SITE:-Industrial-Enclave}"
  active_model_name: "network_threat_v1.onnx"
  local_models_dir: "/etc/sentinel/models"
EOF
fi

echo "[+] Booting Blackbox Sentinel engine with in-kernel XDP (SKB Mode)..."
exec /usr/local/bin/sentinel "$CONFIG_FILE"