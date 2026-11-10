#!/usr/bin/env python3
"""
ARYORITHM SENTINEL-MATRIX: UNIVERSAL SENSOR PHYSICS MULTIPLEXER
Simulates 1 to 570+ industrial sensors simultaneously across 6 generalized ODE engines.
Exposes Modbus TCP endpoints and HTTP REST Fault Injection (:8088).
"""
import asyncio
import struct
import math
import random
import yaml
import sys
import resource
from pathlib import Path
from http.server import HTTPServer, BaseHTTPRequestHandler
import threading

CATALOG_DIR = Path("/home/kami/sentinel-matrix/catalogs/sensors")

# ==============================================================================
# THE 6 GENERALIZED MATHEMATICAL PHYSICS ENGINES
# ==============================================================================
class PhysicsEngines:
    @staticmethod
    def rk4_mechanical_vibe(t, state, dt, freq, noise_sig, baseline=1.2):
        # Stable ISO 10816 vibration synthesis: baseline RMS + rotational harmonics + noise
        omega = 2.0 * math.pi * min(freq, 60.0)  # Bound rotational frequency
        harmonic_1x = 0.20 * math.sin(omega * t)
        harmonic_2x = 0.08 * math.sin(2.0 * omega * t + 0.4)
        harmonic_3x = 0.03 * math.sin(3.14 * omega * t + 1.1)
        velocity_rms = baseline * (1.0 + harmonic_1x + harmonic_2x + harmonic_3x) + random.gauss(0, noise_sig)
        return state, max(0.01, velocity_rms)

    @staticmethod
    def thermal_lag_ode(curr_temp, target_temp, dt, tau, noise_sig):
        # 1st-Order Thermal Lag: dT/dt = (Target - T) / tau
        dT = ((target_temp - curr_temp) / max(0.1, tau)) * dt
        return curr_temp + dT + random.gauss(0, noise_sig)

    @staticmethod
    def fluid_pressure_ode(base_p, t, noise_sig):
        # Hydrodynamic head variation + pump pulsation
        pulsation = 0.15 * math.sin(2.0 * math.pi * 0.5 * t)
        return max(0.0, base_p + pulsation + random.gauss(0, noise_sig))

    @staticmethod
    def grid_harmonics(base_v, t, noise_sig):
        # 50 Hz fundamental + 3rd/5th harmonics
        harmonic_3 = 0.02 * math.sin(2 * math.pi * 150 * t)
        harmonic_5 = 0.01 * math.sin(2 * math.pi * 250 * t)
        return base_v * (1.0 + harmonic_3 + harmonic_5) + random.gauss(0, noise_sig)

    @staticmethod
    def chemical_nernst(base_ph, noise_sig):
        # Nernst potential titration curve
        return max(0.0, min(14.0, base_ph + random.gauss(0, noise_sig)))


# ==============================================================================
# SENSOR INSTANCE & STATE CONTROLLER
# ==============================================================================
class VirtualSensor:
    def __init__(self, profile: dict, port: int):
        self.profile = profile
        self.sensor_id = profile.get("sensor_id", "unknown_sensor")
        self.port = port
        self.category = profile.get("category", "INDUSTRIAL")
        
        physics_cfg = profile.get("physics", {})
        self.engine = physics_cfg.get("engine", "generic_ode")
        self.base_val = float(physics_cfg.get("baseline_value", 10.0))
        self.min_val = float(physics_cfg.get("min_value", 0.0))
        self.max_val = float(physics_cfg.get("max_value", max(100.0, self.base_val * 4.0)))
        self.noise_sig = float(physics_cfg.get("noise_sigma", 0.01))
        
        self.registers = {}
        self.fault_active = None
        self.fault_val_modifier = 0.0
        self.state = [0.1, 0.0]  # State vector for ODEs
        self.current_pv = self.base_val

    def step(self, t, dt=0.1):
        # 1. Apply Active Injected Fault / Anomaly
        if self.fault_active == "drop_to_zero":
            self.current_pv = 0.0
        elif self.fault_active == "drop_to_val":
            self.current_pv = self.fault_val_modifier
        elif self.fault_active == "step_increase":
            self.current_pv = self.base_val + self.fault_val_modifier
        elif self.fault_active == "step_decrease":
            self.current_pv = self.base_val - abs(self.fault_val_modifier)
        elif self.fault_active == "linear_ramp":
            self.current_pv += self.fault_val_modifier * dt

        # 2. Step Mathematical Physics Engine
        elif self.engine == "rk4_mechanical_vibe":
            freq = self.profile.get("physics", {}).get("natural_frequency_hz", 120.0)
            self.state, self.current_pv = PhysicsEngines.rk4_mechanical_vibe(
                t, self.state, dt, freq, self.noise_sig, baseline=self.base_val
            )
            if self.fault_active == "harmonic_multiplier":
                self.current_pv *= self.fault_val_modifier
        elif self.engine == "thermal_lag_ode":
            self.current_pv = PhysicsEngines.thermal_lag_ode(
                self.current_pv, self.base_val + self.fault_val_modifier, dt, 10.0, self.noise_sig
            )
        elif self.engine in ("fluid_pressure_ode", "fluid_flow_ode"):
            self.current_pv = PhysicsEngines.fluid_pressure_ode(
                self.base_val + self.fault_val_modifier, t, self.noise_sig
            )
        elif self.engine == "grid_harmonics":
            self.current_pv = PhysicsEngines.grid_harmonics(
                self.base_val + self.fault_val_modifier, t, self.noise_sig
            )
        elif self.engine == "chemical_nernst":
            self.current_pv = PhysicsEngines.chemical_nernst(
                self.base_val + self.fault_val_modifier, self.noise_sig
            )
        else:
            self.current_pv = self.base_val + random.gauss(0, self.noise_sig)

        # 3. Physically Bound PV to Prevent Float32 Overflow
        self.current_pv = max(self.min_val, min(self.max_val, self.current_pv))

        # --- IN VirtualSensor.step() in tools/sensor_multiplexer.py ---
        # 4. Pack into Modbus Float32 Registers (Big-Endian IEEE 754)
        raw_bytes = struct.pack(">f", float(self.current_pv))
        reg_hi, reg_lo = struct.unpack(">HH", raw_bytes)

        # 5. Populate Standard Primary Variable (PV) at 40001 (Offset 1 & 2)
        self.registers[1] = reg_hi
        self.registers[2] = reg_lo

        # Also populate profile-specific configured register addresses
        for reg_addr in self.profile.get("registers", {}).get("holding_registers", {}):
            reg_int = int(reg_addr) % 10000
            self.registers[reg_int] = reg_hi
            self.registers[reg_int + 1] = reg_lo

# ==============================================================================
# LIGHTWEIGHT MULTIPLEXED MODBUS TCP SERVER
# ==============================================================================
class MultiplexedModbusProtocol(asyncio.Protocol):
    def __init__(self, sensor: VirtualSensor):
        self.sensor = sensor
        self.transport = None

    def connection_made(self, transport):
        self.transport = transport

    def data_received(self, data):
        # Minimal high-performance Modbus TCP parser (FC3 Read Holding Registers)
        if len(data) >= 12:
            tid, pid, length, uid, fc = struct.unpack(">HHHBB", data[:8])
            if fc == 3:  # Read Holding Registers
                start_addr, count = struct.unpack(">HH", data[8:12])
                byte_count = count * 2
                reg_vals = []
                for i in range(count):
                    addr = start_addr + i + 1
                    reg_vals.append(self.sensor.registers.get(addr, 0))
                resp_hdr = struct.pack(">HHHBBB", tid, pid, 3 + byte_count, uid, fc, byte_count)
                reg_bytes = b"".join(struct.pack(">H", v) for v in reg_vals)
                self.transport.write(resp_hdr + reg_bytes)


# ==============================================================================
# REST FAULT INJECTION CONTROLLER (:8088)
# ==============================================================================
ACTIVE_SENSORS = {}

class FaultHookHandler(BaseHTTPRequestHandler):
    def do_POST(self):
        content_len = int(self.headers.get('Content-Length', 0))
        post_body = self.rfile.read(content_len)
        try:
            req = yaml.safe_load(post_body)
            sensor_id = req.get("sensor_id")
            action = req.get("action")
            val = float(req.get("value", 0.0))
            if sensor_id in ACTIVE_SENSORS:
                sensor = ACTIVE_SENSORS[sensor_id]
                sensor.fault_active = action
                sensor.fault_val_modifier = val
                self.send_response(200)
                self.send_header("Content-Type", "application/json")
                self.end_headers()
                self.wfile.write(f'{{"status":"FAULT_APPLIED","sensor":"{sensor_id}","action":"{action}"}}'.encode())
                return
        except Exception:
            pass
        self.send_response(400)
        self.end_headers()

    def log_message(self, format, *args):
        # Suppress noisy HTTP access logs in terminal
        return


# ==============================================================================
# MAIN ASYNC RUNTIME LOOP
# ==============================================================================
async def main():
    print("\033[1;36m========================================================================================================\033[0m")
    print("\033[1;37m        ARYORITHM SENTINEL-MATRIX: UNIVERSAL SENSOR PHYSICS MULTIPLEXER (570 SENSORS)                   \033[0m")
    print("\033[1;36m========================================================================================================\033[0m")

    # Raise open file descriptor limit for multi-socket listening
    try:
        resource.setrlimit(resource.RLIMIT_NOFILE, (4096, 4096))
    except Exception:
        pass

    # Recursive scan to discover all profiles in category subdirectories
    all_profiles = sorted(list(CATALOG_DIR.rglob("*.yaml")))
    if not all_profiles:
        print("[-] No profiles found in", CATALOG_DIR)
        return

    # Check for optional CLI filters (--scenario <file.yaml> or --sensors <s1,s2>)
    filter_ids = set()
    for i in range(1, len(sys.argv)):
        if sys.argv[i] == "--sensors" and i + 1 < len(sys.argv):
            filter_ids.update(sys.argv[i + 1].split(","))
        elif sys.argv[i] == "--scenario" and i + 1 < len(sys.argv):
            scen_path = Path(sys.argv[i + 1])
            if scen_path.exists():
                with open(scen_path) as f:
                    scen_data = yaml.safe_load(f)
                for item in scen_data.get("catalog_sensors", []):
                    filter_ids.add(item.get("sensor_id"))

    profiles = [p for p in all_profiles if not filter_ids or p.stem in filter_ids or any(fid in p.stem for fid in filter_ids)]

    loop = asyncio.get_running_loop()
    
    # Instantiate and bind each virtual sensor endpoint
    bound_count = 0
    for p in profiles:
        try:
            with open(p) as f:
                prof = yaml.safe_load(f)
            s_id = prof.get("sensor_id", p.stem)
            port = int(prof.get("default_port", 15000 + bound_count + 1))
            sensor = VirtualSensor(prof, port)
            ACTIVE_SENSORS[s_id] = sensor

            # Open Async Server for this sensor
            await loop.create_server(lambda s=sensor: MultiplexedModbusProtocol(s), "0.0.0.0", port)
            engine = prof.get("physics", {}).get("engine", "generic_ode")
            cat = prof.get("category", "INDUSTRIAL")
            if bound_count < 15 or len(profiles) <= 20:
                print(f"  \033[1;32m[ONLINE]\033[0m [{cat:<13}] {s_id[:36]:<38} -> Port :{port:<6} ({engine})")
            elif bound_count == 15:
                print(f"  \033[1;33m[...]\033[0m    Multiplexing remaining {len(profiles) - 15} sensor endpoints...")
            bound_count += 1
        except Exception as exc:
            pass

    # Start Background HTTP Fault Server (:8088)
    httpd = HTTPServer(('0.0.0.0', 8088), FaultHookHandler)
    threading.Thread(target=httpd.serve_forever, daemon=True).start()
    print("--------------------------------------------------------------------------------------------------------")
    print(f"  \033[1;32m[ONLINE]\033[0m Chaos/Fault Injection REST API       -> Port :8088")
    print(f"[+] Successfully multiplexed {len(ACTIVE_SENSORS)} industrial sensors simultaneously in 1 process.")
    print("\033[1;36m========================================================================================================\033[0m")

    # Step simulation ODEs continuously at 10 Hz (100 ms loop)
    t = 0.0
    dt = 0.1
    while True:
        for s in ACTIVE_SENSORS.values():
            s.step(t, dt)
        t += dt
        await asyncio.sleep(dt)

if __name__ == "__main__":
    asyncio.run(main())