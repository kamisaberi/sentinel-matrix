#!/usr/bin/env python3
"""
ARYORITHM TECHNOLOGIES — 570-SENSOR MASTER MATRIX GENERATOR
Generates the complete 570-sensor CSV dataset spanning all 80 domains
based on the Master Cyber-Physical Sensor Encyclopedia (01.md to 11.md).
"""
import csv
import re
from pathlib import Path

BASE_DIR = Path("/home/kami/sentinel-matrix")
CATALOG_DIR = BASE_DIR / "catalogs"
OUTPUT_CSV = CATALOG_DIR / "sensor_master_matrix.csv"

# Comprehensive domain taxonomy mapping
DOMAINS = [
    (1, "Microarchitectural & CPU", "MICROARCH", "PMU_PERF", "pmu_microarch", "IPC", 1.2, 0.1, 4.0, 0.05, "step_decrease", -0.8),
    (2, "PCB & Power-Rail", "PCB_POWER", "MODBUS_TCP", "pcb_power_glitch", "mV", 1200.0, 900.0, 1400.0, 5.0, "step_decrease", -250.0),
    (3, "Wire-Speed Network", "NETWORK", "UDP_STREAM", "network_ebpf", "drops", 0.0, 0.0, 1000000.0, 0.0, "step_increase", 50000.0),
    (4, "RF & Electromagnetic", "RF_EM", "MODBUS_TCP", "rf_signal_sdr", "dBm", -45.0, -110.0, 10.0, 1.2, "step_increase", 30.0),
    (5, "Acoustic & Vibration", "VIBRATION", "MODBUS_TCP", "rk4_mechanical_vibe", "mm/s", 1.2, 0.0, 50.0, 0.05, "harmonic_multiplier", 6.5),
    (6, "Thermal & Cryogenic", "TEMPERATURE", "MODBUS_TCP", "thermal_lag_ode", "degC", 68.5, -200.0, 1200.0, 0.2, "linear_ramp", 15.0),
    (7, "Photonic & Optical", "OPTICAL", "MODBUS_TCP", "optical_laser", "dB", -0.5, -40.0, 10.0, 0.02, "step_decrease", -15.0),
    (8, "Kinematic & Mechanical", "KINEMATIC", "MODBUS_TCP", "kinematic_encoder", "deg", 0.0, -360.0, 360.0, 0.01, "step_increase", 45.0),
    (9, "Fluid & Hydrodynamic", "PRESSURE", "MODBUS_TCP", "fluid_pressure_ode", "bar", 6.2, 0.0, 100.0, 0.04, "step_increase", 8.5),
    (10, "Chemical & Gas", "CHEMICAL", "MODBUS_TCP", "chemical_nernst", "pH", 7.2, 0.0, 14.0, 0.02, "drop_to_val", 2.1),
    (11, "Magnetic & MHD", "MAGNETIC", "MODBUS_TCP", "magnetic_flux", "uT", 45.0, -500.0, 500.0, 0.5, "step_increase", 120.0),
    (12, "High-Voltage Electrical", "ELECTRICAL", "MODBUS_TCP", "grid_harmonics", "kV", 110.0, 0.0, 500.0, 0.8, "step_increase", 45.0),
    (13, "Nuclear & Particle", "NUCLEAR", "MODBUS_TCP", "nuclear_decay", "uSv/h", 0.15, 0.0, 1000.0, 0.01, "step_increase", 150.0),
    (14, "Aerospace & Avionics", "AVIONICS", "MODBUS_TCP", "avionics_pitot", "knots", 280.0, 0.0, 600.0, 1.5, "step_decrease", -90.0),
    (15, "Deep Marine & Subsea", "SUBSEA", "MODBUS_TCP", "subsea_acoustic", "m/s", 1500.0, 1400.0, 1600.0, 0.5, "step_decrease", -35.0),
    (16, "Semiconductor Fab", "SEMICONDUCTOR", "MODBUS_TCP", "vacuum_plasma", "mbar", 1e-6, 1e-11, 1.0, 1e-8, "step_increase", 1e-3),
    (17, "Bioprocess & Pharma", "BIOPROCESS", "MODBUS_TCP", "bioprocess_cell", "g/L", 5.5, 0.0, 50.0, 0.05, "step_decrease", -3.2),
    (18, "Quantum Metrology", "QUANTUM", "MODBUS_TCP", "quantum_squid", "mK", 15.0, 0.01, 1000.0, 0.1, "step_increase", 50.0),
    (19, "High-Energy Laser", "LASER", "MODBUS_TCP", "optical_laser", "kW", 10.0, 0.0, 100.0, 0.1, "step_increase", 25.0),
    (20, "Combustion & Rockets", "PROPULSION", "MODBUS_TCP", "combustion_ode", "bar", 45.0, 0.0, 250.0, 0.5, "step_increase", 30.0),
    (21, "Extreme Geological", "GEOLOGICAL", "MODBUS_TCP", "seismic_geophone", "mm/s", 0.02, 0.0, 100.0, 0.005, "step_increase", 12.0),
    (22, "Autonomous Drive-by-Wire", "AUTOMOTIVE", "MODBUS_TCP", "kinematic_encoder", "Nm", 3.5, -50.0, 50.0, 0.05, "step_increase", 15.0),
    (23, "CBRN & Biosecurity", "CBRN", "MODBUS_TCP", "cbrn_spectral", "ppb", 0.0, 0.0, 1000.0, 0.01, "step_increase", 25.0),
    (24, "Molten Metallurgy", "METALLURGY", "MODBUS_TCP", "thermal_lag_ode", "degC", 1650.0, 1000.0, 2200.0, 2.5, "step_increase", 150.0),
    (25, "Silicon Photonics", "PHOTONICS", "MODBUS_TCP", "optical_laser", "pm", 1550.0, 1500.0, 1600.0, 0.05, "step_increase", 2.5),
    (26, "Microfluidic DNA", "MICROFLUIDIC", "MODBUS_TCP", "bioprocess_cell", "pL", 50.0, 0.0, 500.0, 0.2, "step_decrease", -20.0),
    (27, "Nuclear Core Voiding", "NUCLEAR", "MODBUS_TCP", "fluid_flow_ode", "void_pct", 0.05, 0.0, 1.0, 0.005, "step_increase", 0.35),
    (28, "Terahertz Security", "TERAHERTZ", "MODBUS_TCP", "rf_signal_sdr", "GHz", 300.0, 100.0, 1000.0, 0.5, "step_increase", 15.0),
    (29, "Space Weather", "SPACE_WEATHER", "MODBUS_TCP", "nuclear_decay", "pfu", 1.2, 0.0, 10000.0, 0.1, "step_increase", 500.0),
    (30, "Power Quality Harmonics", "ELECTRICAL", "MODBUS_TCP", "grid_harmonics", "pct", 1.5, 0.0, 30.0, 0.05, "step_increase", 8.5),
    (31, "Metal 3D Printing", "ADDITIVE_MFG", "MODBUS_TCP", "thermal_lag_ode", "degC", 1850.0, 1200.0, 2500.0, 5.0, "step_decrease", -350.0),
    (32, "Hypersonic Re-entry", "HYPERSONIC", "MODBUS_TCP", "thermal_lag_ode", "MW/m2", 5.2, 0.0, 50.0, 0.1, "step_increase", 12.0),
    (33, "Petrochemical FCC", "PETROCHEM", "MODBUS_TCP", "fluid_pressure_ode", "bar", 2.8, 0.0, 40.0, 0.05, "step_decrease", -1.5),
    (34, "Railway PTC Balise", "RAILWAY", "MODBUS_TCP", "kinematic_encoder", "km/h", 160.0, 0.0, 350.0, 0.5, "step_increase", 60.0),
    (35, "Liquid Hydrogen Cryo", "CRYOGENIC", "MODBUS_TCP", "thermal_lag_ode", "K", 20.3, 14.0, 300.0, 0.05, "step_increase", 15.0),
    (36, "Battery Gigafactory", "BATTERY_MFG", "MODBUS_TCP", "kinematic_encoder", "g/m2", 180.0, 100.0, 300.0, 0.8, "step_increase", 25.0),
    (37, "Subsea Well Chokes", "SUBSEA", "MODBUS_TCP", "fluid_pressure_ode", "psi", 8500.0, 0.0, 15000.0, 15.0, "step_decrease", -2500.0),
    (38, "Autonomous Marine", "MARINE", "MODBUS_TCP", "subsea_acoustic", "rpm", 110.0, 0.0, 250.0, 0.5, "harmonic_multiplier", 3.5),
    (39, "Particle Accelerator", "SYNCHROTRON", "MODBUS_TCP", "rf_signal_sdr", "um", 0.0, -500.0, 500.0, 0.1, "step_increase", 120.0),
    (40, "Space Life Support", "ECLSS", "MODBUS_TCP", "chemical_nernst", "kPa", 21.0, 15.0, 30.0, 0.1, "step_decrease", -5.5),
    (41, "AMR & AGV Safety", "ROBOTICS", "MODBUS_TCP", "kinematic_encoder", "m/s", 1.5, 0.0, 4.0, 0.02, "step_increase", 1.8),
    (42, "Transmission Line DLR", "ELECTRICAL", "MODBUS_TCP", "grid_harmonics", "kN", 25.0, 5.0, 80.0, 0.2, "step_decrease", -10.0),
    (43, "Mining Beneficiation", "MINING", "MODBUS_TCP", "fluid_flow_ode", "g/cm3", 1.45, 1.0, 2.5, 0.01, "step_decrease", -0.35),
    (44, "BSL-4 Biosecurity", "BIOSECURITY", "MODBUS_TCP", "fluid_pressure_ode", "Pa", -45.0, -150.0, 0.0, 0.5, "step_increase", 40.0),
    (45, "Rocket TVC Propulsion", "PROPULSION", "MODBUS_TCP", "kinematic_encoder", "deg", 0.0, -10.0, 10.0, 0.02, "step_increase", 4.5),
    (46, "Quantum Gravimetry", "QUANTUM", "MODBUS_TCP", "quantum_squid", "uGal", 980665.0, 970000.0, 990000.0, 0.5, "step_increase", 50.0),
    (47, "HPC Liquid Cooling", "DATACENTER", "MODBUS_TCP", "fluid_pressure_ode", "bar", 1.8, 0.0, 10.0, 0.02, "step_increase", 3.5),
    (48, "HAPS Airships", "AEROSPACE", "MODBUS_TCP", "thermal_lag_ode", "Pa", 350.0, 50.0, 1000.0, 1.0, "step_increase", 400.0),
    (49, "Enhanced Geothermal", "GEOTHERMAL", "MODBUS_TCP", "thermal_lag_ode", "degC", 280.0, 50.0, 400.0, 0.5, "step_decrease", -65.0),
    (50, "Autonomous Heavy Excavator", "ROBOTICS", "MODBUS_TCP", "kinematic_encoder", "bar", 180.0, 0.0, 350.0, 1.5, "step_increase", 95.0),
    (51, "Industrial Microwave", "MICROWAVE", "MODBUS_TCP", "rf_signal_sdr", "VSWR", 1.15, 1.0, 5.0, 0.02, "step_increase", 2.5),
    (52, "Submarine Stealth", "SUBSEA", "MODBUS_TCP", "subsea_acoustic", "dB", 42.0, 20.0, 120.0, 0.5, "step_increase", 35.0),
    (53, "EUV Litho Optics", "SEMICONDUCTOR", "MODBUS_TCP", "vacuum_plasma", "pct", 68.5, 40.0, 75.0, 0.1, "step_decrease", -15.0),
    (54, "Aviation Fly-by-Wire", "AVIONICS", "MODBUS_TCP", "kinematic_encoder", "deg", 0.0, -30.0, 30.0, 0.05, "step_increase", 12.0),
    (55, "Molten Salt Reactor", "NUCLEAR", "MODBUS_TCP", "chemical_nernst", "mV", -350.0, -600.0, 0.0, 1.0, "step_increase", 180.0),
    (56, "Combine Harvester", "AGRICULTURE", "MODBUS_TCP", "rk4_mechanical_vibe", "impacts/s", 45.0, 0.0, 500.0, 1.0, "step_increase", 120.0),
    (57, "7T MRI Safety", "MEDICAL", "MODBUS_TCP", "magnetic_flux", "W/kg", 1.8, 0.0, 8.0, 0.05, "step_increase", 3.2),
    (58, "LNG Carrier Sloshing", "CRYOGENIC", "MODBUS_TCP", "fluid_pressure_ode", "kPa", 45.0, 0.0, 500.0, 1.2, "step_increase", 180.0),
    (59, "Hypersonic Scramjet", "PROPULSION", "MODBUS_TCP", "fluid_pressure_ode", "bar", 12.5, 0.0, 80.0, 0.2, "step_decrease", -6.5),
    (60, "Tokamak Fusion", "FUSION", "MODBUS_TCP", "magnetic_flux", "MA", 15.0, 0.0, 25.0, 0.05, "step_decrease", -10.0),
    (61, "SiC EV Powertrain", "AUTOMOTIVE", "MODBUS_TCP", "grid_harmonics", "A", 250.0, 0.0, 800.0, 1.0, "step_increase", 450.0),
    (62, "DGR Nuclear Repository", "NUCLEAR", "MODBUS_TCP", "fluid_pressure_ode", "MPa", 7.5, 0.0, 20.0, 0.05, "step_decrease", -3.5),
    (63, "Tandem Perovskite Fab", "SOLAR_FAB", "MODBUS_TCP", "optical_laser", "nm", 750.0, 700.0, 850.0, 0.1, "step_increase", 25.0),
    (64, "Arctic Icebreaker Hull", "MARINE", "MODBUS_TCP", "rk4_mechanical_vibe", "MPa", 18.0, 0.0, 80.0, 0.2, "step_increase", 45.0),
    (65, "HPEM Directed Energy", "DIRECTED_ENERGY", "MODBUS_TCP", "rf_signal_sdr", "kV/m", 0.0, 0.0, 100.0, 0.05, "step_increase", 65.0),
    (66, "Pharma Aseptic Isolator", "PHARMA", "MODBUS_TCP", "chemical_nernst", "ppm", 420.0, 0.0, 1000.0, 1.5, "step_decrease", -250.0),
    (67, "SMES Pulsed Power", "PULSED_POWER", "MODBUS_TCP", "grid_harmonics", "kA", 45.0, 0.0, 150.0, 0.2, "step_increase", 60.0),
    (68, "Direct Air Capture CO2", "DAC_CARBON", "MODBUS_TCP", "chemical_nernst", "pct", 99.6, 90.0, 100.0, 0.05, "step_decrease", -8.5),
    (69, "Deep Sea Mining Riser", "MINING", "MODBUS_TCP", "fluid_pressure_ode", "bar", 380.0, 0.0, 600.0, 1.5, "step_increase", 85.0),
    (70, "XFEL Beamline Optics", "SYNCHROTRON", "MODBUS_TCP", "optical_laser", "mJ", 2.4, 0.0, 10.0, 0.02, "step_increase", 4.5),
    (71, "Port Container Straddle", "LOGISTICS", "MODBUS_TCP", "kinematic_encoder", "bar", 220.0, 0.0, 420.0, 1.0, "step_decrease", -150.0),
    (72, "SOEC High-Temp H2", "HYDROGEN", "MODBUS_TCP", "chemical_nernst", "V", 1.28, 0.8, 1.8, 0.005, "step_decrease", -0.45),
    (73, "Rocket Booster Grid Fins", "AEROSPACE", "MODBUS_TCP", "kinematic_encoder", "deg", 0.0, -25.0, 25.0, 0.05, "step_increase", 8.5),
    (74, "Submarine ASW Sonar", "SUBSEA", "MODBUS_TCP", "subsea_acoustic", "kN", 18.0, 0.0, 60.0, 0.2, "step_increase", 25.0),
    (75, "SMR Passive Safety", "NUCLEAR", "MODBUS_TCP", "thermal_lag_ode", "degC", 285.0, 20.0, 350.0, 0.5, "step_increase", 45.0),
    (76, "Swarm Drone UWB", "DRONE_SWARM", "UDP_STREAM", "rf_signal_sdr", "meters", 8.5, 0.5, 100.0, 0.02, "step_decrease", -6.5),
    (77, "HVDC Cable Dielectrics", "ELECTRICAL", "MODBUS_TCP", "grid_harmonics", "kV/mm", 18.5, 0.0, 50.0, 0.1, "step_increase", 12.0),
    (78, "Continuous Granulation", "PHARMA", "MODBUS_TCP", "bioprocess_cell", "LOD_pct", 2.0, 0.5, 10.0, 0.05, "step_increase", 3.5),
    (79, "Renewable Electrolyzer H2", "HYDROGEN", "MODBUS_TCP", "chemical_nernst", "pct_H2", 0.25, 0.0, 4.0, 0.01, "step_increase", 1.8),
    (80, "Maglev Levitation Gap", "MAGLEV", "MODBUS_TCP", "kinematic_encoder", "mm", 10.0, 2.0, 25.0, 0.05, "step_decrease", -6.2),
]

def generate():
    CATALOG_DIR.mkdir(parents=True, exist_ok=True)
    rows = []
    
    # 570 sensors generated deterministically across all 80 domains
    sensor_idx = 1
    port_start = 15001

    for domain_id, d_name, cat, proto, engine, unit, base, min_v, max_v, noise, f_act, f_val in DOMAINS:
        # Determine number of sensors in this domain (between 6 and 8 per domain to total exactly 570)
        num_sensors = 8 if domain_id <= 10 else (7 if domain_id <= 40 else (7 if domain_id <= 70 else 7))
        if sensor_idx + num_sensors > 571:
            num_sensors = 571 - sensor_idx

        for s_sub in range(1, num_sensors + 1):
            if sensor_idx > 570:
                break
            
            s_slug = f"s{sensor_idx:03d}_{re.sub(r'[^a-zA-Z0-9]+', '_', d_name.lower())}_{s_sub:02d}"
            s_name = f"{d_name} Telemetry Node #{s_sub:02d}"
            
            # Generate realistic variation per sensor
            s_port = port_start + sensor_idx - 1
            s_base = round(base * (1.0 + (s_sub - 1) * 0.08), 3)
            s_min = min_v
            s_max = round(max_v * (1.0 + (s_sub - 1) * 0.05), 3)
            
            row = {
                "sensor_id": s_slug,
                "domain_id": domain_id,
                "domain_name": d_name,
                "sensor_name": s_name,
                "category": cat,
                "target_protocol": proto,
                "default_port": s_port,
                "interface": "Modbus/RS-485 / Analog ADC" if proto == "MODBUS_TCP" else ("Linux PMU" if proto == "PMU_PERF" else "GigE Vision / UDP"),
                "physics_engine": engine,
                "baseline_val": s_base,
                "min_val": s_min,
                "max_val": s_max,
                "noise_sigma": noise,
                "unit": unit,
                "target_threat": f"Physical Invariant Breach & False Data Injection in {d_name}",
                "core_invariant": f"Physical Value |y(t) - y_nominal| <= Threshold; Violation triggers in-kernel drop",
                "fault_action": f_act,
                "fault_value": f_val
            }
            rows.append(row)
            sensor_idx += 1

    # Write Master CSV
    with open(OUTPUT_CSV, "w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=list(rows[0].keys()))
        writer.writeheader()
        writer.writerows(rows)

    print(f"\033[1;32m[SUCCESS] Generated Master Sensor Matrix: {OUTPUT_CSV}\033[0m")
    print(f"          Total Sensors Cataloged: {len(rows)} rows across {len(DOMAINS)} domains.")

if __name__ == "__main__":
    generate()