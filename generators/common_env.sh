#!/usr/bin/env bash
# ==============================================================================
# ARYORITHM SENTINEL-MATRIX: SCENARIO GENERATOR COMMON ENVIRONMENT
# ==============================================================================
set -euo pipefail

# Determine caller privileges
if [ "${EUID}" -eq 0 ]; then
    export CACHE_DIR="/var/cache/sentinel"
else
    export CACHE_DIR="${HOME}/.cache/sentinel"
fi

export SCENARIO_CACHE_DIR="${CACHE_DIR}/scenarios"
mkdir -p "${SCENARIO_CACHE_DIR}"

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
export MATRIX_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"

# Discover developer public key
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

# Shared packaging function
pack_scenario_bundle() {
    local SCEN_NAME="$1"
    local TITLE="$2"
    local SECTOR="$3"
    local COMPLEXITY="$4"
    local DESC="$5"
    local STAGE_DIR="$6"
    local YAML_PATH="$7"

    echo -e "\033[1;36m[*] Packaging scenario bundle: ${SCEN_NAME} -> ${SCENARIO_CACHE_DIR}...\033[0m"

    # 1. Generate Manifest
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

    # 2. Copy scenario.yaml
    cp "${YAML_PATH}" "${STAGE_DIR}/scenario.yaml"

    # 3. Create run_demo.sh
    cat << 'EOF' > "${STAGE_DIR}/run_demo.sh"
#!/usr/bin/env bash
set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
echo -e "\033[1;36m[*] Launching Dynamic Scenario...\033[0m"
python3 /home/kami/sentinel-matrix/tools/scenario_engine.py load "${SCRIPT_DIR}/scenario.yaml"
EOF
    chmod +x "${STAGE_DIR}/run_demo.sh"

    # 4. Pack into Cache
    local OUT_TAR="${SCENARIO_CACHE_DIR}/scenario_${SCEN_NAME}.tar.gz"
    tar -czf "${OUT_TAR}" -C "${STAGE_DIR}" .

    # 5. Emit Companion Manifest
    cp "${STAGE_DIR}/manifest.json" "${OUT_TAR}.manifest.json"

    local SZ=$(du -h "${OUT_TAR}" | cut -f1)
    echo -e "\033[1;32m[+] Successfully generated:\033[0m ${OUT_TAR} (${SZ})"
}