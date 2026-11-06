#!/usr/bin/env bash
set -euo pipefail
DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "${DIR}/common_env.sh"

NAME="orbital_satellite_ground_station"
TMP_STAGE="/tmp/gen_${NAME}_$$"
mkdir -p "${TMP_STAGE}/models" "${TMP_STAGE}/configs" "${TMP_STAGE}/pcaps"
trap 'rm -rf "${TMP_STAGE}"' EXIT

bundle_model "network_threat_int8.onnx" "${TMP_STAGE}/models"
bundle_model "power_quality_anomaly.onnx" "${TMP_STAGE}/models"
bundle_config "space_telemetry.yaml" "${TMP_STAGE}/configs"
bundle_pcap "cve_2023_44487_rapid_reset.pcap" "${TMP_STAGE}/pcaps"

SRC_YAML="${MATRIX_ROOT}/scenarios/orbital_satellite_ground_station/scenario.yaml"
pack_scenario_bundle "${NAME}" "Orbital Satellite Ground Link & MOC C2" "AEROSPACE_DEFENSE" "ADVANCED" "18-node satellite ground station with sub-120ns CCSDS Space Packet and STANAG defense" "${TMP_STAGE}" "${SRC_YAML}"
