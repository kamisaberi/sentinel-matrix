cat << 'EOF' > /home/kami/sentinel-matrix/generators/gen_05_container_terminal.sh
#!/usr/bin/env bash
set -euo pipefail
DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "${DIR}/common_env.sh"

NAME="container_terminal_port_mesh"
TMP_STAGE="/tmp/gen_${NAME}_$$"
mkdir -p "${TMP_STAGE}/models" "${TMP_STAGE}/configs" "${TMP_STAGE}/pcaps"
trap 'rm -rf "${TMP_STAGE}"' EXIT

cp "${MATRIX_ROOT}/shared/models/network_threat_int8.onnx" "${TMP_STAGE}/models/" 2>/dev/null || true
cp "${MATRIX_ROOT}/shared/models/lidar_spatial_detector.onnx"* "${TMP_STAGE}/models/" 2>/dev/null || true
cp "${MATRIX_ROOT}/shared/datasets/modbus_uiuc_scada_attack.pcap" "${TMP_STAGE}/pcaps/" 2>/dev/null || true

SRC_YAML="${MATRIX_ROOT}/scenarios/container_terminal_port_mesh/scenario.yaml"
pack_scenario_bundle "${NAME}" "Automated Container Port Logistics" "MARITIME_LOGISTICS" "ADVANCED" "19-node automated maritime terminal with STS cranes, AGVs, and 5G wireless" "${TMP_STAGE}" "${SRC_YAML}"
EOF
chmod +x /home/kami/sentinel-matrix/generators/gen_05_container_terminal.sh