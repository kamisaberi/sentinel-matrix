#!/usr/bin/env bash
set -euo pipefail
DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "${DIR}/common_env.sh"

NAME="nuclear_turbine_island_cooling"
TMP_STAGE="/tmp/gen_${NAME}_$$"
mkdir -p "${TMP_STAGE}/models" "${TMP_STAGE}/configs" "${TMP_STAGE}/pcaps"
trap 'rm -rf "${TMP_STAGE}"' EXIT

bundle_model "network_threat_int8.onnx" "${TMP_STAGE}/models"
bundle_model "power_quality_anomaly.onnx" "${TMP_STAGE}/models"
bundle_model "vibration_spectral_ae.onnx" "${TMP_STAGE}/models"
bundle_config "plc_register_map.json" "${TMP_STAGE}/configs"
bundle_pcap "stuxnet_s7comm_injected.pcap" "${TMP_STAGE}/pcaps"

SRC_YAML="${MATRIX_ROOT}/scenarios/nuclear_turbine_island_cooling/scenario.yaml"
pack_scenario_bundle "${NAME}" "Nuclear Turbine Island & Secondary Cooling" "NUCLEAR_ENERGY" "ADVANCED" "22-node nuclear secondary island with 4 Teleperm XS controllers and 14 sensors" "${TMP_STAGE}" "${SRC_YAML}"
