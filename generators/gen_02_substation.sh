#!/usr/bin/env bash
set -euo pipefail
DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "${DIR}/common_env.sh"

NAME="substation_500kv_transmission"
TMP_STAGE="/tmp/gen_${NAME}_$$"
mkdir -p "${TMP_STAGE}/models" "${TMP_STAGE}/configs" "${TMP_STAGE}/pcaps"
trap 'rm -rf "${TMP_STAGE}"' EXIT

bundle_model "network_threat_int8.onnx" "${TMP_STAGE}/models"
bundle_model "power_quality_anomaly.onnx" "${TMP_STAGE}/models"
bundle_model "vibration_spectral_ae.onnx" "${TMP_STAGE}/models"
bundle_config "plc_register_map.json" "${TMP_STAGE}/configs"
bundle_pcap "industroyer2_substation.pcap" "${TMP_STAGE}/pcaps"

SRC_YAML="${MATRIX_ROOT}/scenarios/substation_500kv_transmission/scenario.yaml"
pack_scenario_bundle "${NAME}" "500kV High-Voltage Substation" "POWER_GRID" "ADVANCED" "20-node transmission grid with IEC-104/DNP3 IEDs and PMU telemetry" "${TMP_STAGE}" "${SRC_YAML}"
