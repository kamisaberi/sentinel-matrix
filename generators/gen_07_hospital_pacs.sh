#!/usr/bin/env bash
set -euo pipefail
DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "${DIR}/common_env.sh"

NAME="hospital_pacs_surgical_microgrid"
TMP_STAGE="/tmp/gen_${NAME}_$$"
mkdir -p "${TMP_STAGE}/models" "${TMP_STAGE}/configs" "${TMP_STAGE}/pcaps"
trap 'rm -rf "${TMP_STAGE}"' EXIT

bundle_model "network_threat_int8.onnx" "${TMP_STAGE}/models"
bundle_model "thermal_anomaly_vision.onnx" "${TMP_STAGE}/models"
bundle_model "power_quality_anomaly.onnx" "${TMP_STAGE}/models"
bundle_config "plc_register_map.json" "${TMP_STAGE}/configs"
bundle_pcap "cve_2023_44487_rapid_reset.pcap" "${TMP_STAGE}/pcaps"
bundle_pcap "modbus_uiuc_scada_attack.pcap" "${TMP_STAGE}/pcaps"

SRC_YAML="${MATRIX_ROOT}/scenarios/hospital_pacs_surgical_microgrid/scenario.yaml"
pack_scenario_bundle "${NAME}" "Hospital Clinical PACS & Surgical Microgrid" "HEALTHCARE_IOMT" "ADVANCED" "18-node clinical hospital microgrid with DICOM C-STORE and MRI cryo monitoring" "${TMP_STAGE}" "${SRC_YAML}"
