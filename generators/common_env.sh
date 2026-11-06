#!/usr/bin/env bash
# ==============================================================================
# ARYORITHM SENTINEL-MATRIX: SCENARIO GENERATOR COMMON ENVIRONMENT
# ==============================================================================
set -euo pipefail

# 1. Determine caller privileges
if [ "${EUID}" -eq 0 ]; then
    export CACHE_DIR="/var/cache/sentinel"
else
    export CACHE_DIR="${HOME}/.cache/sentinel"
fi

export SCENARIO_CACHE_DIR="${CACHE_DIR}/scenarios"
mkdir -p "${SCENARIO_CACHE_DIR}"

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
export MATRIX_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"

# 2. Discover developer public key
export AUTHOR_PUBKEY=""
KEY_CANDIDATES=(
    "${HOME}/.sentinel/keys/developer_public.pem"
    "${HOME}/.sentinel/keys/ed25519_public.pem"
    "/etc/sentinel/keys/developer_public.pem"
    "${MATRIX_ROOT}/../blackbox-sentinel/keys/developer_public.pem"
)
for k in "${KEY_CANDIDATES[@]}"; do
    if [ -f "$k" ]; then
        AUTHOR_PUBKEY=$(openssl pkey -pubin -in "$k" -raw -out - 2>/dev/null | xxd -p -c 64 || true)
        if [ -n "$AUTHOR_PUBKEY" ]; then break; fi
    fi
done

# 3. Helper: Copies an ONNX model and any accompanying .data file
bundle_model() {
    local MODEL_NAME="$1"
    local DEST_DIR="$2"
    local SRC="${MATRIX_ROOT}/shared/models/${MODEL_NAME}"
    if [ -f "${SRC}" ]; then
        cp "${SRC}" "${DEST_DIR}/"
        if [ -f "${SRC}.data" ]; then
            cp "${SRC}.data" "${DEST_DIR}/"
        fi
        return 0
    fi
    # Fallback search
    local FOUND=$(find "${MATRIX_ROOT}" -name "${MODEL_NAME}" 2>/dev/null | head -n 1 || true)
    if [ -n "${FOUND}" ] && [ -f "${FOUND}" ]; then
        cp "${FOUND}" "${DEST_DIR}/"
        if [ -f "${FOUND}.data" ]; then
            cp "${FOUND}.data" "${DEST_DIR}/"
        fi
        return 0
    fi
    return 1
}

# 4. Helper: Copies config files from all standard locations
bundle_config() {
    local CFG_NAME="$1"
    local DEST_DIR="$2"
    local CANDIDATES=(
        "${MATRIX_ROOT}/configs/${CFG_NAME}"
        "${MATRIX_ROOT}/configs/nodes/${CFG_NAME}"
        "/etc/sentinel/configs/${CFG_NAME}"
        "/etc/sentinel/${CFG_NAME}"
        "${MATRIX_ROOT}/../blackbox-sentinel/configs/${CFG_NAME}"
    )
    for c in "${CANDIDATES[@]}"; do
        if [ -f "$c" ]; then
            cp "$c" "${DEST_DIR}/"
            return 0
        fi
    done
    return 1
}

# 5. Helper: Copies PCAP datasets
bundle_pcap() {
    local PCAP_NAME="$1"
    local DEST_DIR="$2"
    local CANDIDATES=(
        "${MATRIX_ROOT}/shared/datasets/${PCAP_NAME}"
        "${MATRIX_ROOT}/configs/pcaps/${PCAP_NAME}"
    )
    for p in "${CANDIDATES[@]}"; do
        if [ -f "$p" ]; then
            cp "$p" "${DEST_DIR}/"
            return 0
        fi
    done
    return 1
}

# 6. Shared packaging function
pack_scenario_bundle() {
    local SCEN_NAME="$1"
    local TITLE="$2"
    local SECTOR="$3"
    local COMPLEXITY="$4"
    local DESC="$5"
    local STAGE_DIR="$6"
    local YAML_PATH="$7"

    echo -e "\033[1;36m[*] Packaging scenario bundle: ${SCEN_NAME} -> ${SCENARIO_CACHE_DIR}...\033[0m"

    # Generate Manifest
    cat << EOF > "${STAGE_DIR}/manifest.json"
{
  "name": "${SCEN_NAME}",
  "slug": "${SCEN_NAME}",
  "title": "${TITLE}",
  "version": "1.0.0",
  "asset_type": "scenario",
  "target_sector": "${SECTOR}",
  "sector": "${SECTOR}",
  "complexity": "${COMPLEXITY}",
  "category": "SCADA_ICS",
  "author": "Aryorithm Certified Engineer",
  "author_public_key": "${AUTHOR_PUBKEY}",
  "description": "${DESC}",
  "compliance": ["IEC-62443-4-2", "NIS2"]
}
EOF

    # Copy scenario.yaml
    cp "${YAML_PATH}" "${STAGE_DIR}/scenario.yaml"

    # Create run_demo.sh
    cat << 'EOF' > "${STAGE_DIR}/run_demo.sh"
#!/usr/bin/env bash
set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
echo -e "\033[1;36m[*] Launching Dynamic Scenario...\033[0m"
python3 /home/kami/sentinel-matrix/tools/scenario_engine.py load "${SCRIPT_DIR}/scenario.yaml"
EOF
    chmod +x "${STAGE_DIR}/run_demo.sh"

    # Pack into Cache
    local OUT_TAR="${SCENARIO_CACHE_DIR}/scenario_${SCEN_NAME}.tar.gz"
    tar -czf "${OUT_TAR}" -C "${STAGE_DIR}" .

    # Emit Companion Manifest
    cp "${STAGE_DIR}/manifest.json" "${OUT_TAR}.manifest.json"

    local SZ=$(du -h "${OUT_TAR}" | cut -f1)
    echo -e "\033[1;32m[+] Successfully generated:\033[0m ${OUT_TAR} (${SZ})"
}