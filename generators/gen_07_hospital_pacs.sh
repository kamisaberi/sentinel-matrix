cat << 'EOF' > /home/kami/sentinel-matrix/generators/gen_07_hospital_pacs.sh
#!/usr/bin/env bash
set -euo pipefail
DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "${DIR}/common_env.sh"

NAME="hospital_pacs_surgical_microgrid"
TMP_STAGE="/tmp/gen_${NAME}_$$"
mkdir -p "${TMP_STAGE}/models" "${TMP_STAGE}/configs" "${TMP_STAGE}/pcaps"
trap 'rm -rf "${TMP_STAGE}"' EXIT

cp "${MATRIX_ROOT}/shared/models/network_threat_int8.onnx" "${TMP_STAGE}/models/" 2>/dev/null || true
cp "${MATRIX_ROOT}/shared/models/power_quality_anomaly.onnx"* "${TMP_STAGE}/models/" 2>/dev/null || true
cp "${MATRIX_ROOT}/shared/datasets/cve_2023_44487_rapid_reset.pcap" "${TMP_STAGE}/pcaps/" 2>/dev/null || true

SRC_YAML="${MATRIX_ROOT}/scenarios/hospital_pacs_surgical_microgrid/scenario.yaml"
pack_scenario_bundle "${NAME}" "Hospital Clinical PACS & Surgical Microgrid" "HEALTHCARE_IOMT" "ADVANCED" "18-node clinical hospital microgrid with DICOM C-STORE and MRI cryo monitoring" "${TMP_STAGE}" "${SRC_YAML}"
EOF
chmod +x /home/kami/sentinel-matrix/generators/gen_07_hospital_pacs.sh