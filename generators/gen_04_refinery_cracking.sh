#!/usr/bin/env bash
set -euo pipefail
DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "${DIR}/common_env.sh"

NAME="refinery_cracking_sis_triad"
TMP_STAGE="/tmp/gen_${NAME}_$$"
mkdir -p "${TMP_STAGE}/models" "${TMP_STAGE}/configs" "${TMP_STAGE}/pcaps"
trap 'rm -rf "${TMP_STAGE}"' EXIT

cp "${MATRIX_ROOT}/shared/models/network_threat_int8.onnx" "${TMP_STAGE}/models/" 2>/dev/null || true
cp "${MATRIX_ROOT}/shared/models/vibration_spectral_ae.onnx"* "${TMP_STAGE}/models/" 2>/dev/null || true
cp "${MATRIX_ROOT}/shared/datasets/triton_trisis_sis.pcap" "${TMP_STAGE}/pcaps/" 2>/dev/null || true

SRC_YAML="${MATRIX_ROOT}/scenarios/refinery_cracking_sis_triad/scenario.yaml"
pack_scenario_bundle "${NAME}" "Petrochemical Catalytic Cracker & SIS" "PETROCHEMICAL_REFINING" "ADVANCED" "19-node continuous refinery with Triconex SIL-3 SIS TMR safety protection" "${TMP_STAGE}" "${SRC_YAML}"
