#!/usr/bin/env bash
set -euo pipefail
DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "${DIR}/common_env.sh"

NAME="smart_factory_5g_robotics"
TMP_STAGE="/tmp/gen_${NAME}_$$"
mkdir -p "${TMP_STAGE}/models" "${TMP_STAGE}/configs" "${TMP_STAGE}/pcaps"
trap 'rm -rf "${TMP_STAGE}"' EXIT

bundle_model "network_threat_int8.onnx" "${TMP_STAGE}/models"
bundle_model "lidar_spatial_detector.onnx" "${TMP_STAGE}/models"
bundle_model "thermal_anomaly_vision.onnx" "${TMP_STAGE}/models"
bundle_config "5g_slices.yaml" "${TMP_STAGE}/configs"
bundle_config "plc_register_map.json" "${TMP_STAGE}/configs"
bundle_pcap "stuxnet_s7comm_injected.pcap" "${TMP_STAGE}/pcaps"
bundle_pcap "cve_2023_44487_rapid_reset.pcap" "${TMP_STAGE}/pcaps"

SRC_YAML="${MATRIX_ROOT}/scenarios/smart_factory_5g_robotics/scenario.yaml"
pack_scenario_bundle "${NAME}" "Private 5G Robotic Assembly Plant" "SMART_MANUFACTURING" "ADVANCED" "24-node private 5G SA factory with S7Comm PACs and in-kernel GTP-U slicing" "${TMP_STAGE}" "${SRC_YAML}"
