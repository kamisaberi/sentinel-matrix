#!/usr/bin/env bash
set -euo pipefail
DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "${DIR}/common_env.sh"

NAME="transcontinental_gas_pipeline"
TMP_STAGE="/tmp/gen_${NAME}_$$"
mkdir -p "${TMP_STAGE}/models" "${TMP_STAGE}/configs" "${TMP_STAGE}/pcaps"
trap 'rm -rf "${TMP_STAGE}"' EXIT

bundle_model "network_threat_int8.onnx" "${TMP_STAGE}/models"
bundle_model "vibration_spectral_ae.onnx" "${TMP_STAGE}/models"
bundle_config "plc_register_map.json" "${TMP_STAGE}/configs"
bundle_pcap "industroyer2_substation.pcap" "${TMP_STAGE}/pcaps"
bundle_pcap "modbus_uiuc_scada_attack.pcap" "${TMP_STAGE}/pcaps"

SRC_YAML="${MATRIX_ROOT}/scenarios/transcontinental_gas_pipeline/scenario.yaml"
pack_scenario_bundle "${NAME}" "Continental Gas Transmission Pipeline" "GAS_PIPELINE" "ADVANCED" "21-node high-pressure gas pipeline with 4 RTUs, compressor turbines, and DNP3 SCADA" "${TMP_STAGE}" "${SRC_YAML}"
