cat << 'EOF' > /home/kami/sentinel-matrix/generators/gen_03_smart_factory_5g.sh
#!/usr/bin/env bash
set -euo pipefail
DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "${DIR}/common_env.sh"

NAME="smart_factory_5g_robotics"
TMP_STAGE="/tmp/gen_${NAME}_$$"
mkdir -p "${TMP_STAGE}/models" "${TMP_STAGE}/configs" "${TMP_STAGE}/pcaps"
trap 'rm -rf "${TMP_STAGE}"' EXIT

cp "${MATRIX_ROOT}/shared/models/network_threat_int8.onnx" "${TMP_STAGE}/models/" 2>/dev/null || true
cp "${MATRIX_ROOT}/shared/models/lidar_spatial_detector.onnx"* "${TMP_STAGE}/models/" 2>/dev/null || true
cp "${MATRIX_ROOT}/shared/datasets/stuxnet_s7comm_injected.pcap" "${TMP_STAGE}/pcaps/" 2>/dev/null || true

SRC_YAML="${MATRIX_ROOT}/scenarios/smart_factory_5g_robotics/scenario.yaml"
pack_scenario_bundle "${NAME}" "Private 5G Robotic Assembly Plant" "SMART_MANUFACTURING" "ADVANCED" "24-node private 5G SA factory with S7Comm PACs and in-kernel GTP-U slicing" "${TMP_STAGE}" "${SRC_YAML}"
EOF
chmod +x /home/kami/sentinel-matrix/generators/gen_03_smart_factory_5g.sh