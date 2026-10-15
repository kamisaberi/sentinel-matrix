#!/usr/bin/env bash
set -e

MATRIX_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$MATRIX_ROOT"

print_help() {
    echo "matrix-ctl - Sentinel Matrix Digital Twin Cyber-Range Controller"
    echo ""
    echo "Usage:"
    echo "  matrix-ctl status                 Inspect running containers on 10.240.0.0/24"
    echo "  matrix-ctl sync-pcaps             Pull certified PCAPs from sentinel-hub"
    echo "  matrix-ctl scenario <name>        Load and unpack a digital twin scenario"
    echo "  matrix-ctl replay <pcap_name>     Stream PCAP on virtual interfaces via tcpreplay"
    echo ""
    echo "Available Scenarios:"
    echo "  power_grid_blackout, hospital_pacs_heist, refinery_disaster_triton"
}

if [ $# -lt 1 ]; then
    print_help
    exit 0
fi

CMD="$1"

case "$CMD" in
    status)
        echo "============================================================"
        echo "   SENTINEL-MATRIX DIGITAL TWIN MESH (10.240.0.0/24)        "
        echo "============================================================"
        docker ps --filter "network=matrix-net" --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}" 2>/dev/null || docker compose ps
        ;;
    sync-pcaps)
        make sync-hub-pcaps
        ;;
    scenario)
        if [ -z "$2" ]; then
            echo "[-] Error: Scenario name required."
            exit 1
        fi
        make scenario-pull NAME="$2"
        ;;
    replay)
        if [ -z "$2" ]; then
            echo "[-] Error: Specify PCAP filename in shared/datasets/."
            exit 1
        fi
        PCAP="shared/datasets/$2"
        if [ ! -f "$PCAP" ]; then
            echo "[-] Error: File not found: $PCAP"
            exit 1
        fi
        echo "[*] Replaying $PCAP at wire rate into cyber-range virtual wire..."
        # Replays into container network interface
        docker exec -it matrix-traffic-gen tcpreplay -i eth0 -t "$PCAP" 2>/dev/null || sudo tcpreplay -i lo -t "$PCAP"
        ;;
    *)
        print_help
        ;;
esac
