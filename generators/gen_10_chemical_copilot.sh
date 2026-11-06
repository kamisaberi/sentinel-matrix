#!/usr/bin/env bash
set -euo pipefail
DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "${DIR}/common_env.sh"

NAME="chemical_reactor_copilot_trism"
TMP_STAGE="/tmp/gen_${NAME}_$$"
mkdir -p "${TMP_STAGE}/models" "${TMP_STAGE}/configs" "${TMP_STAGE}/pcaps"
trap 'rm -rf "${TMP_STAGE}"' EXIT

cp "${MATRIX_ROOT}/shared/models/network_threat_int8.onnx" "${TMP_STAGE}/models/" 2>/dev/null || true
cp "${MATRIX_ROOT}/shared/models/vibration_spectral_ae.onnx"* "${TMP_STAGE}/models/" 2>/dev/null || true
cp "${MATRIX_ROOT}/configs/plc_register_map.json" "${TMP_STAGE}/configs/" 2>/dev/null || true

SRC_YAML="${MATRIX_ROOT}/scenarios/chemical_reactor_copilot_trism/scenario.yaml"
pack_scenario_bundle "${NAME}" "Chemical Reactor with AI Copilot & Live-SBOM" "CHEMICAL_AI_AUTOMATION" "ADVANCED" "20-node exothermic chemical reactor with GenAI Copilot, AI TRiSM firewall, and Live-SBOM" "${TMP_STAGE}" "${SRC_YAML}"
