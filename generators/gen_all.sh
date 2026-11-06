cat << 'EOF' > /home/kami/sentinel-matrix/generators/gen_all.sh
#!/usr/bin/env bash
# ==============================================================================
# ARYORITHM SENTINEL-MATRIX: MASTER 10-SCENARIO GENERATOR
# ==============================================================================
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "${SCRIPT_DIR}"

echo -e "\033[1;36m========================================================================\033[0m"
echo -e "\033[1;37m   GENERATING 10 REAL-WORLD PRODUCTION SCENARIO BUNDLES (.tar.gz)       \033[0m"
echo -e "\033[1;36m========================================================================\033[0m"

SCRIPTS=(
    "gen_01_water_utility.sh"
    "gen_02_substation.sh"
    "gen_03_smart_factory_5g.sh"
    "gen_04_refinery_cracking.sh"
    "gen_05_container_terminal.sh"
    "gen_06_nuclear_turbine.sh"
    "gen_07_hospital_pacs.sh"
    "gen_08_gas_pipeline.sh"
    "gen_09_satellite_ground.sh"
    "gen_10_chemical_copilot.sh"
)

for gen in "${SCRIPTS[@]}"; do
    if [ -f "$gen" ]; then
        bash "$gen"
    fi
done

source "${SCRIPT_DIR}/common_env.sh"
echo -e "\n\033[1;32m[SUCCESS] All 10 scenario bundles generated in: ${SCENARIO_CACHE_DIR}\033[0m"
ls -lh "${SCENARIO_CACHE_DIR}"/scenario_*.tar.gz
echo -e "\033[1;36m========================================================================\033[0m\n"
EOF
chmod +x /home/kami/sentinel-matrix/generators/gen_all.sh