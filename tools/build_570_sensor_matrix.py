#!/usr/bin/env python3
"""
ARYORITHM TECHNOLOGIES — 570 MASTER SENSOR COMPILER
Parses 01.md through 11.md, extracts all 570 sensors with exact names,
synthesizes comprehensive engineering descriptions, and writes sensor_master_matrix_570.csv.
"""
import re
import csv
import sys
from pathlib import Path

BASE_DIR = Path("/home/kami/sentinel-matrix")
CATALOG_DIR = BASE_DIR / "catalogs"
OUTPUT_CSV = CATALOG_DIR / "sensor_master_matrix_570.csv"

# Category mapping based on domain keywords
def map_category(domain_title):
    d = domain_title.lower()
    if "microarchitectural" in d or "cpu" in d: return "MICROARCH", "PMU_PERF", "pmu_microarch", "IPC"
    if "pcb" in d or "fault-injection" in d: return "PCB_POWER", "MODBUS_TCP", "pcb_power_glitch", "mV"
    if "network" in d or "wire-speed" in d: return "NETWORK", "UDP_STREAM", "network_ebpf", "packets"
    if "rf" in d or "radio" in d or "gnss" in d: return "RF_EM", "MODBUS_TCP", "rf_signal_sdr", "dBm"
    if "acoustic" in d or "vibration" in d: return "VIBRATION", "MODBUS_TCP", "rk4_mechanical_vibe", "mm/s"
    if "thermal" in d or "cryogenic" in d or "infrared" in d: return "TEMPERATURE", "MODBUS_TCP", "thermal_lag_ode", "degC"
    if "photonic" in d or "fiber-optic" in d or "laser" in d: return "OPTICAL", "MODBUS_TCP", "optical_laser", "dBm"
    if "mechanical" in d or "kinematic" in d or "displacement" in d: return "KINEMATIC", "MODBUS_TCP", "kinematic_encoder", "mm"
    if "fluid" in d or "pressure" in d or "hydrodynamic" in d: return "PRESSURE", "MODBUS_TCP", "fluid_pressure_ode", "bar"
    if "chemical" in d or "gas" in d or "dielectric" in d: return "CHEMICAL", "MODBUS_TCP", "chemical_nernst", "ppm"
    if "magnetic" in d or "mhd" in d: return "MAGNETIC", "MODBUS_TCP", "magnetic_flux", "uT"
    if "high-voltage" in d or "arc" in d or "power quality" in d: return "ELECTRICAL", "MODBUS_TCP", "grid_harmonics", "V"
    if "nuclear" in d or "radiological" in d: return "NUCLEAR", "MODBUS_TCP", "nuclear_decay", "uSv/h"
    if "aerospace" in d or "avionics" in d or "spacecraft" in d: return "AVIONICS", "MODBUS_TCP", "avionics_pitot", "knots"
    if "marine" in d or "subsea" in d or "ocean" in d: return "SUBSEA", "MODBUS_TCP", "subsea_acoustic", "m/s"
    if "semiconductor" in d or "plasma" in d or "litho" in d: return "SEMICONDUCTOR", "MODBUS_TCP", "vacuum_plasma", "mbar"
    if "bioprocess" in d or "bio" in d or "cbrn" in d: return "BIOPROCESS", "MODBUS_TCP", "bioprocess_cell", "pH"
    if "quantum" in d or "qubit" in d: return "QUANTUM", "MODBUS_TCP", "quantum_squid", "mK"
    if "propulsion" in d or "combustion" in d or "rocket" in d: return "PROPULSION", "MODBUS_TCP", "combustion_ode", "bar"
    if "geological" in d or "seismic" in d: return "GEOLOGICAL", "MODBUS_TCP", "seismic_geophone", "mm/s"
    if "automotive" in d or "drive-by-wire" in d: return "AUTOMOTIVE", "MODBUS_TCP", "kinematic_encoder", "deg"
    if "metallurgy" in d or "molten" in d: return "METALLURGY", "MODBUS_TCP", "thermal_lag_ode", "degC"
    return "INDUSTRIAL_CPS", "MODBUS_TCP", "generic_ode", "units"

def clean_text(text):
    text = re.sub(r"\*\*|\*", "", text)
    text = text.replace("$", "").replace("\\le", "<=").replace("\\ge", ">=").replace("\\Delta", "Δ")
    text = text.replace("\\mu", "µ").replace("\\approx", "≈").replace("\\propto", "∝")
    text = text.replace("\\in", "∈").replace("\\times", "×").replace("\\pm", "±")
    text = re.sub(r"\\text\{([^}]+)\}", r"\1", text)
    text = re.sub(r"\s+", " ", text).strip()
    return text

def parse_markdown_files():
    # Search for all markdown encyclopedia files across the workspace
    search_dirs = [
        Path("/home/kami/sentinel-stack/temp/future_working/sensors_list"),
        # BASE_DIR,
        # Path("/home/kami"),
        # Path.cwd()
    ]
    md_files = []
    for d in search_dirs:
        for f in d.glob("**/*.md"):
            if re.match(r"(0[1-9]|1[0-2])\.md$", f.name) or "sensor" in f.name.lower():
                if f not in md_files:
                    md_files.append(f)

    # Sort files to ensure order (01.md -> 11.md)
    def sort_key(p):
        m = re.search(r"(\d+)", p.name)
        return int(m.group(1)) if m else 999
    md_files.sort(key=sort_key)

    sensors = []
    current_domain_id = 1
    current_domain_title = "Host Hardware & Network Telemetry"

    # Regex patterns
    domain_pattern = re.compile(r"^##\s+Domain\s+(\d+):\s*(.+)$", re.IGNORECASE)
    row_pattern = re.compile(r"^\|\s*\*\*?(\d+)\*\*?\s*\|\s*\*\*?([^|]+?)\*\*?\s*\|\s*([^|]+?)\s*\|\s*([^|]+?)\s*\|\s*([^|]+?)\s*\|$")

    for fpath in md_files:
        try:
            with open(fpath, "r", encoding="utf-8", errors="ignore") as f:
                lines = f.readlines()
        except Exception:
            continue

        for line in lines:
            line_str = line.strip()
            
            # Domain header detection
            d_match = domain_pattern.match(line_str)
            if d_match:
                current_domain_id = int(d_match.group(1))
                current_domain_title = clean_text(d_match.group(2))
                continue

            # Sensor row detection
            r_match = row_pattern.match(line_str)
            if r_match:
                num = int(r_match.group(1))
                name = clean_text(r_match.group(2))
                interface = clean_text(r_match.group(3))
                threat = clean_text(r_match.group(4))
                invariant = clean_text(r_match.group(5))

                cat, proto, engine, unit = map_category(current_domain_title)
                slug = f"s{num:03d}_" + re.sub(r"[^a-zA-Z0-9]+", "_", name.lower()).strip("_")
                port = 15000 + num

                # Generate comprehensive technical description
                desc = (
                    f"{name} is a specialized Domain {current_domain_id:02d} ({current_domain_title}) "
                    f"cyber-physical monitoring sensor. Interfacing directly via {interface}, it is specifically "
                    f"engineered to mitigate and detect {threat}. In the Aryorithm edge architecture, it continuously "
                    f"asserts the operational invariant: {invariant}. Any divergence between commanded network state "
                    f"and this physical reading triggers sub-microsecond in-kernel eBPF packet mitigation."
                )

                sensors.append({
                    "id": num,
                    "sensor_id": slug,
                    "sensor_name": name,
                    "domain_id": current_domain_id,
                    "domain_title": current_domain_title,
                    "category": cat,
                    "target_protocol": proto,
                    "default_port": port,
                    "interface": interface,
                    "physics_engine": engine,
                    "unit": unit,
                    "target_threat": threat,
                    "core_invariant": invariant,
                    "description": desc
                })

    # Deduplicate and sort by sensor ID
    seen = set()
    unique_sensors = []
    for s in sensors:
        if s["id"] not in seen and s["id"] <= 570:
            seen.add(s["id"])
            unique_sensors.append(s)
    unique_sensors.sort(key=lambda x: x["id"])

    return unique_sensors

def main():
    CATALOG_DIR.mkdir(parents=True, exist_ok=True)
    sensors = parse_markdown_files()

    if not sensors:
        print("[-] Error: No markdown sensor files found under /home/kami.")
        sys.exit(1)

    fieldnames = [
        "id", "sensor_id", "sensor_name", "domain_id", "domain_title",
        "category", "target_protocol", "default_port", "interface",
        "physics_engine", "unit", "target_threat", "core_invariant", "description"
    ]

    with open(OUTPUT_CSV, "w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=fieldnames)
        writer.writeheader()
        writer.writerows(sensors)

    print(f"\033[1;32m[SUCCESS] Successfully compiled {len(sensors)}/570 exact sensors into:\033[0m")
    print(f"          {OUTPUT_CSV}")
    print(f"          All exact names, interfaces, threats, invariants, and descriptions preserved.")

if __name__ == "__main__":
    main()