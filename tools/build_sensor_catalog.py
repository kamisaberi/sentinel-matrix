#!/usr/bin/env python3
"""
ARYORITHM PROCEDURAL CATALOG COMPILER
Reads sensor_master_matrix.csv and generates 570 validated YAML sensor profiles.
"""
import csv
import yaml
from pathlib import Path

CATALOG_DIR = Path("/home/kami/sentinel-matrix/catalogs/sensors")
INPUT_CSV = Path("/home/kami/sentinel-matrix/catalogs/sensor_master_matrix.csv")

def build_catalog():
    if not INPUT_CSV.exists():
        print(f"[-] Error: {INPUT_CSV} not found. Run generate_sensor_master_matrix.py first.")
        return

    with open(INPUT_CSV, "r", encoding="utf-8") as f:
        reader = csv.DictReader(f)
        count = 0
        for r in reader:
            cat_dir = CATALOG_DIR / r["category"].lower()
            cat_dir.mkdir(parents=True, exist_ok=True)
            
            s_id = r["sensor_id"]
            yaml_path = cat_dir / f"{s_id}.yaml"
            
            reg_base = 40001 + (int(r["default_port"]) % 100) * 10
            
            profile = {
                "sensor_id": s_id,
                "domain_id": int(r["domain_id"]),
                "domain_name": r["domain_name"],
                "model": r["sensor_name"],
                "category": r["category"],
                "target_protocol": r["target_protocol"],
                "default_port": int(r["default_port"]),
                "interface": r["interface"],
                "physics": {
                    "engine": r["physics_engine"],
                    "baseline_value": float(r["baseline_val"]),
                    "min_value": float(r["min_val"]),
                    "max_value": float(r["max_val"]),
                    "noise_sigma": float(r["noise_sigma"])
                },
                "registers": {
                    "holding_registers": {
                        reg_base: {
                            "name": f"{s_id}_pv",
                            "type": "float32",
                            "scale": 1.0,
                            "unit": r["unit"]
                        },
                        reg_base + 2: {
                            "name": f"{s_id}_status",
                            "type": "uint16",
                            "scale": 1.0,
                            "unit": "bitmask"
                        }
                    }
                },
                "fault_hooks": [
                    {
                        "id": f"{s_id}_fault",
                        "action": r["fault_action"],
                        "value": float(r["fault_value"])
                    }
                ]
            }
            
            with open(yaml_path, "w", encoding="utf-8") as yf:
                yaml.dump(profile, yf, default_flow_style=False, sort_keys=False)
            count += 1

    print(f"\033[1;32m[SUCCESS] Successfully compiled {count} sensor YAML profiles into {CATALOG_DIR}!\033[0m")

if __name__ == "__main__":
    build_catalog()