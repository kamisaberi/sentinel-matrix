#!/usr/bin/env python3
"""
ARYORITHM TECHNOLOGIES — 570 SENSOR YAML COMPILER
Reads the 570-sensor master CSV, purges old prototypes, and compiles 570
schema-compliant YAML sensor profiles organized into category subdirectories.
"""
import csv
import sys
import shutil
import yaml
from pathlib import Path

BASE_DIR = Path("/home/kami/sentinel-matrix")
CATALOG_DIR = BASE_DIR / "catalogs" / "sensors"

# Look for 570 CSV first, fallback to standard master CSV
CSV_CANDIDATES = [
    BASE_DIR / "catalogs" / "sensor_master_matrix_570.csv",
    BASE_DIR / "catalogs" / "sensor_master_matrix.csv",
    Path("/home/kami/sensor_master_matrix_570.csv"),
    Path.cwd() / "sensor_master_matrix_570.csv"
]

def find_csv():
    for c in CSV_CANDIDATES:
        if c.exists():
            return c
    return None

def clean_old_yamls():
    print("[*] Purging old prototype YAML files from", CATALOG_DIR, "...")
    if CATALOG_DIR.exists():
        for item in CATALOG_DIR.iterdir():
            if item.is_file() and item.suffix == ".yaml":
                item.unlink()
            elif item.is_dir() and item.name != "schema":
                shutil.rmtree(item)
    CATALOG_DIR.mkdir(parents=True, exist_ok=True)
    print("    --> Catalog cleaned successfully.")

def get_physics_defaults(category, unit):
    cat = category.upper()
    if cat in ("PRESSURE", "FLUID"):
        return 6.2, 0.0, 100.0, 0.04, "step_increase", 8.5
    elif cat in ("VIBRATION", "ACOUSTIC"):
        return 1.2, 0.0, 50.0, 0.05, "harmonic_multiplier", 6.5
    elif cat in ("TEMPERATURE", "THERMAL"):
        return 68.5, -50.0, 400.0, 0.15, "linear_ramp", 15.0
    elif cat in ("FLOW",):
        return 245.0, 0.0, 1000.0, 1.2, "drop_to_zero", 0.0
    elif cat in ("ELECTRICAL", "HIGH_VOLTAGE"):
        return 230.0, 0.0, 500.0, 0.35, "step_decrease", -45.0
    elif cat in ("CHEMICAL", "GAS", "NUCLEAR"):
        return 7.2 if unit == "pH" else 45.0, 0.0, 14.0 if unit == "pH" else 1000.0, 0.02, "step_increase", 25.0
    elif cat in ("MICROARCH",):
        return 1.2, 0.1, 4.0, 0.05, "step_decrease", -0.8
    elif cat in ("KINEMATIC", "ROBOTICS", "AUTOMOTIVE"):
        return 0.0, -180.0, 180.0, 0.02, "step_increase", 45.0
    elif cat in ("OPTICAL", "LASER", "PHOTONICS"):
        return 1550.0 if unit == "pm" else -0.5, -40.0, 1600.0 if unit == "pm" else 10.0, 0.05, "step_decrease", -15.0
    return 10.0, 0.0, 100.0, 0.1, "step_increase", 10.0

def compile_yamls():
    csv_file = find_csv()
    if not csv_file:
        print("[-] Error: Master CSV file not found. Place sensor_master_matrix_570.csv in catalogs/.")
        sys.exit(1)

    print(f"[*] Reading master sensor table from: {csv_file}")
    clean_old_yamls()

    count = 0
    with open(csv_file, "r", encoding="utf-8", errors="ignore") as f:
        reader = csv.DictReader(f)
        for row in reader:
            s_id = row.get("sensor_id", "").strip()
            name = row.get("sensor_name", "").strip()
            if not s_id or not name:
                continue

            category = row.get("category", "INDUSTRIAL_CPS").strip()
            proto = row.get("target_protocol", "MODBUS_TCP").strip()
            unit = row.get("unit", "units").strip()
            engine = row.get("physics_engine", "generic_ode").strip()
            port = int(row.get("default_port", 15000 + count + 1))
            
            # Physics boundaries
            if "baseline_val" in row and row["baseline_val"]:
                base_val = float(row["baseline_val"])
                min_val = float(row.get("min_val", 0.0))
                max_val = float(row.get("max_val", base_val * 3.0))
                noise_sig = float(row.get("noise_sigma", 0.01))
                fault_act = row.get("fault_action", "step_increase")
                fault_v = float(row.get("fault_value", 5.0))
            else:
                base_val, min_val, max_val, noise_sig, fault_act, fault_v = get_physics_defaults(category, unit)

            # Modbus Holding Register calculation (Float32 takes 2 consecutive 16-bit registers)
            reg_base = 40001 + (count % 50) * 10
            
            profile = {
                "sensor_id": s_id,
                "name": name,
                "domain_id": int(row.get("domain_id", 1)),
                "domain_title": row.get("domain_title", "").strip(),
                "category": category,
                "target_protocol": proto,
                "default_port": port,
                "interface": row.get("interface", "Analog 4-20mA / Modbus").strip(),
                "description": row.get("description", "").strip(),
                "target_threat": row.get("target_threat", "").strip(),
                "core_invariant": row.get("core_invariant", "").strip(),
                "physics": {
                    "engine": engine,
                    "baseline_value": base_val,
                    "min_value": min_val,
                    "max_value": max_val,
                    "noise_sigma": noise_sig,
                    "unit": unit
                },
                "registers": {
                    "holding_registers": {
                        reg_base: {
                            "name": f"{s_id}_pv",
                            "type": "float32",
                            "scale": 1.0,
                            "unit": unit
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
                        "action": fault_act,
                        "value": fault_v,
                        "description": f"Injects anomaly: {row.get('target_threat', 'Simulated Invariant Violation')}"
                    }
                ]
            }

            # Write into categorized subfolder
            cat_dir = CATALOG_DIR / category.lower()
            cat_dir.mkdir(parents=True, exist_ok=True)
            yaml_path = cat_dir / f"{s_id}.yaml"

            with open(yaml_path, "w", encoding="utf-8") as yf:
                yaml.dump(profile, yf, default_flow_style=False, sort_keys=False)

            count += 1

    print(f"\033[1;32m[SUCCESS] Successfully compiled all {count} YAML sensor profiles!\033[0m")
    print(f"          Target Directory : {CATALOG_DIR}")
    print(f"          Categories       : {len(list(CATALOG_DIR.iterdir()))} subdirectories created.")

if __name__ == "__main__":
    compile_yamls()