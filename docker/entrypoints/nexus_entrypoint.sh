#!/usr/bin/env bash
set -e

echo "=== [NEXUS CONTAINER] Initializing Command Plane ==="
mkdir -p /var/lib/sentinel-nexus/forge_datasets /opt/sentinel-nexus/models /var/log/sentinel-nexus /sys/fs/bpf

# Mount bpffs if not already mounted
if ! mount | grep -q "/sys/fs/bpf"; then
    mount -t bpf bpf /sys/fs/bpf 2>/dev/null || true
fi

# Fallback: if web folder is not present locally, link from host volume
if [ ! -f "web/index.html" ]; then
    mkdir -p web
    cat << 'EOF' > web/index.html
<!DOCTYPE html>
<html><head><title>Sentinel Nexus Matrix</title></head>
<body style="background:#090c10;color:#fff;font-family:monospace;padding:2rem;">
<h2>SENTINEL NEXUS - VMWARE MESH CONTAINER ACTIVE</h2>
<p>Status: All systems nominal.</p>
</body></html>
EOF
fi

echo "[+] Launching sentinel-nexus daemon..."
exec /usr/local/bin/sentinel-nexus /opt/sentinel-nexus/configs/nexus.yaml