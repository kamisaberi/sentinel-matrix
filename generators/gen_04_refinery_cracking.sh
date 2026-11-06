#!/usr/bin/env bash
set -euo pipefail
DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "${DIR}/common_env.sh"

NAME="refinery_cracking_sis_triad"
TMP_STAGE="/tmp/gen_${NAME}_$$"
mkdir -p "${TMP_STAGE}/models" "${TMP_STAGE}/configs" "${TMP_STAGE}/pcaps"
trap 'rm -rf "${TMP_STAGE}"' EXIT

bundle_model "network_threat_int8.onnx" "${TMP_STAGE}/models"
bundle_model "thermal_anomaly_vision.onnx" "${TMP_STAGE}/models"
bundle_model "vibration_spectral_ae.onnx" "${TMP_STAGE}/models"
bundle_config "plc_register_map.json" "${TMP_STAGE}/configs"
bundle_pcap "triton_trisis_sis.pcap" "${TMP_STAGE}/pcaps"

SRC_YAML="${MATRIX_ROOT}/scenarios/refinery_cracking_sis_triad/scenario.yaml"
pack_scenario_bundle "${NAME}" "Petrochemical Catalytic Cracker & SIS" "PETROCHEMICAL_REFINING" "ADVANCED" "19-node continuous refinery with Triconex SIL-3 SIS TMR safety protection" "${TMP_STAGE}" "${SRC_YAML}"
