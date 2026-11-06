cat << 'EOF' > /home/kami/sentinel-matrix/generators/gen_09_satellite_ground.sh
#!/usr/bin/env bash
set -euo pipefail
DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "${DIR}/common_env.sh"

NAME="orbital_satellite_ground_station"
TMP_STAGE="/tmp/gen_${NAME}_$$"
mkdir -p "${TMP_STAGE}/models" "${TMP_STAGE}/configs" "${TMP_STAGE}/pcaps"
trap 'rm -rf "${TMP_STAGE}"' EXIT

cp "${MATRIX_ROOT}/shared/models/network_threat_int8.onnx" "${TMP_STAGE}/models/" 2>/dev/null || true
cp "${MATRIX_ROOT}/shared/models/power_quality_anomaly.onnx"* "${TMP_STAGE}/models/" 2>/dev/null || true
cp "${MATRIX_ROOT}/configs/space_telemetry.yaml" "${TMP_STAGE}/configs/" 2>/dev/null || true

SRC_YAML="${MATRIX_ROOT}/scenarios/orbital_satellite_ground_station/scenario.yaml"
pack_scenario_bundle "${NAME}" "Orbital Satellite Ground Link & MOC C2" "AEROSPACE_DEFENSE" "ADVANCED" "18-node satellite ground station with sub-120ns CCSDS Space Packet and STANAG defense" "${TMP_STAGE}" "${SRC_YAML}"
EOF
chmod +x /home/kami/sentinel-matrix/generators/gen_09_satellite_ground.sh