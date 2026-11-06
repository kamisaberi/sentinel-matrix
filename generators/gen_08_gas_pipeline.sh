cat << 'EOF' > /home/kami/sentinel-matrix/generators/gen_08_gas_pipeline.sh
#!/usr/bin/env bash
set -euo pipefail
DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "${DIR}/common_env.sh"

NAME="transcontinental_gas_pipeline"
TMP_STAGE="/tmp/gen_${NAME}_$$"
mkdir -p "${TMP_STAGE}/models" "${TMP_STAGE}/configs" "${TMP_STAGE}/pcaps"
trap 'rm -rf "${TMP_STAGE}"' EXIT

cp "${MATRIX_ROOT}/shared/models/network_threat_int8.onnx" "${TMP_STAGE}/models/" 2>/dev/null || true
cp "${MATRIX_ROOT}/shared/models/vibration_spectral_ae.onnx"* "${TMP_STAGE}/models/" 2>/dev/null || true
cp "${MATRIX_ROOT}/shared/datasets/industroyer2_substation.pcap" "${TMP_STAGE}/pcaps/" 2>/dev/null || true

SRC_YAML="${MATRIX_ROOT}/scenarios/transcontinental_gas_pipeline/scenario.yaml"
pack_scenario_bundle "${NAME}" "Continental Gas Transmission Pipeline" "GAS_PIPELINE" "ADVANCED" "21-node high-pressure gas pipeline with 4 RTUs, compressor turbines, and DNP3 SCADA" "${TMP_STAGE}" "${SRC_YAML}"
EOF
chmod +x /home/kami/sentinel-matrix/generators/gen_08_gas_pipeline.sh