#!/usr/bin/env bash
set -euo pipefail
DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "${DIR}/common_env.sh"

NAME="substation_500kv_transmission"
TMP_STAGE="/tmp/gen_${NAME}_$$"
mkdir -p "${TMP_STAGE}/models" "${TMP_STAGE}/configs" "${TMP_STAGE}/pcaps"
trap 'rm -rf "${TMP_STAGE}"' EXIT

cp "${MATRIX_ROOT}/shared/models/network_threat_int8.onnx" "${TMP_STAGE}/models/" 2>/dev/null || true
cp "${MATRIX_ROOT}/shared/models/power_quality_anomaly.onnx"* "${TMP_STAGE}/models/" 2>/dev/null || true
cp "${MATRIX_ROOT}/shared/datasets/industroyer2_substation.pcap" "${TMP_STAGE}/pcaps/" 2>/dev/null || true

SRC_YAML="${MATRIX_ROOT}/scenarios/substation_500kv_transmission/scenario.yaml"
pack_scenario_bundle "${NAME}" "500kV High-Voltage Substation" "POWER_GRID" "ADVANCED" "20-node transmission grid with IEC-104/DNP3 IEDs and PMU telemetry" "${TMP_STAGE}" "${SRC_YAML}"
