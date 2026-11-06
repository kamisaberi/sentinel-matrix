#!/usr/bin/env bash
set -euo pipefail
DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "${DIR}/common_env.sh"

NAME="water_utility_regional_grid"
TMP_STAGE="/tmp/gen_${NAME}_$$"
mkdir -p "${TMP_STAGE}/models" "${TMP_STAGE}/configs" "${TMP_STAGE}/pcaps"
trap 'rm -rf "${TMP_STAGE}"' EXIT

bundle_model "network_threat_detector.onnx" "${TMP_STAGE}/models"
bundle_model "network_threat_int8.onnx" "${TMP_STAGE}/models"
bundle_model "power_quality_anomaly.onnx" "${TMP_STAGE}/models"
bundle_config "plc_register_map.json" "${TMP_STAGE}/configs"
bundle_pcap "modbus_uiuc_scada_attack.pcap" "${TMP_STAGE}/pcaps"

SRC_YAML="${MATRIX_ROOT}/scenarios/water_utility_regional_grid/scenario.yaml"
pack_scenario_bundle "${NAME}" "Municipal Water Treatment Grid" "WATER_TREATMENT" "ADVANCED" "20-node regional water grid with 3 Edge nodes, 4 PLCs, and 12 sensors" "${TMP_STAGE}" "${SRC_YAML}"
