cat << 'EOF' > /home/kami/sentinel-matrix/generators/gen_06_nuclear_turbine.sh
#!/usr/bin/env bash
set -euo pipefail
DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "${DIR}/common_env.sh"

NAME="nuclear_turbine_island_cooling"
TMP_STAGE="/tmp/gen_${NAME}_$$"
mkdir -p "${TMP_STAGE}/models" "${TMP_STAGE}/configs" "${TMP_STAGE}/pcaps"
trap 'rm -rf "${TMP_STAGE}"' EXIT

cp "${MATRIX_ROOT}/shared/models/network_threat_int8.onnx" "${TMP_STAGE}/models/" 2>/dev/null || true
cp "${MATRIX_ROOT}/shared/models/power_quality_anomaly.onnx"* "${TMP_STAGE}/models/" 2>/dev/null || true
cp "${MATRIX_ROOT}/shared/datasets/stuxnet_s7comm_injected.pcap" "${TMP_STAGE}/pcaps/" 2>/dev/null || true

SRC_YAML="${MATRIX_ROOT}/scenarios/nuclear_turbine_island_cooling/scenario.yaml"
pack_scenario_bundle "${NAME}" "Nuclear Turbine Island & Secondary Cooling" "NUCLEAR_ENERGY" "ADVANCED" "22-node nuclear secondary island with 4 Teleperm XS controllers and 14 sensors" "${TMP_STAGE}" "${SRC_YAML}"
EOF
chmod +x /home/kami/sentinel-matrix/generators/gen_06_nuclear_turbine.sh