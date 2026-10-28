#!/usr/bin/env python3
import argparse
import http.server
import json
import math
import os
import random
import socket
import struct
import sys
import threading
import time

class AnomalyControlServer(http.server.BaseHTTPRequestHandler):
    emulator = None

    def do_POST(self):
        if "/anomaly" in self.path:
            if "action=trigger" in self.path:
                self.emulator.anomaly_active = True
                print(f"[!] [{self.emulator.device_name}] ANOMALY TRIGGERED!")
            elif "action=reset" in self.path:
                self.emulator.anomaly_active = False
                print(f"[+] [{self.emulator.device_name}] Restored normal baseline.")
            self.send_response(200)
            self.send_header("Content-Type", "application/json")
            self.end_headers()
            self.wfile.write(b'{"status":"ok"}')
        else:
            self.send_response(404)
            self.end_headers()

    def do_GET(self):
        self.send_response(200)
        self.send_header("Content-Type", "application/json")
        self.end_headers()
        res = {
            "device": self.emulator.device_name,
            "anomaly_active": self.emulator.anomaly_active,
            "readings": self.emulator.current_readings
        }
        self.wfile.write(json.dumps(res).encode())

    def log_message(self, format, *args):
        pass  # Suppress HTTP log spam

class UniversalDeviceEmulator:
    def __init__(self, archetype, protocol, port, device_name, config_file=None):
        self.archetype = archetype
        self.protocol = protocol.lower()
        self.port = int(port)
        self.device_name = device_name
        self.running = True
        self.anomaly_active = False
        self.current_readings = {}
        self.seq_counter = 0

    def start(self):
        print(f"\033[1;36m================================================================================\033[0m")
        print(f"\033[1;37m   STARTING SENSOR ENGINE: {self.device_name} (Infinite Dynamic Physics)        \033[0m")
        print(f"\033[1;36m================================================================================\033[0m")
        print(f"[*] Archetype  : {self.archetype.upper()}")
        print(f"[*] Protocol   : {self.protocol.upper()} on port {self.port}")

        # Start HTTP Anomaly Control API on port 8088
        AnomalyControlServer.emulator = self
        threading.Thread(target=self._run_control_server, daemon=True).start()

        # Start Infinite Dynamic Physics Computation Thread
        threading.Thread(target=self._physics_loop, daemon=True).start()

        if self.protocol == "modbus":
            self.run_modbus_server()
        elif self.protocol == "stream_telemetry":
            self.run_telemetry_streamer()
        else:
            self.run_generic_server()

    def _run_control_server(self):
        try:
            server = http.server.HTTPServer(("0.0.0.0", 8088), AnomalyControlServer)
            server.serve_forever()
        except Exception:
            pass

    def _physics_loop(self):
        t = 0.0
        while self.running:
            t += 0.1
            noise = (random.random() - 0.5) * 0.1

            if "Vibration" in self.device_name:
                if self.anomaly_active:
                    # Bearing Failure Anomaly
                    temp = 128.4 + 2.0 * math.sin(t)
                    vibe = 8.95 + 0.5 * random.random()
                else:
                    # Clean Baseline
                    temp = 74.5 + 0.4 * math.sin(t * 0.1) + noise
                    vibe = 1.24 + 0.05 * math.sin(t * 0.5) + (noise * 0.1)

                self.current_readings = {"temperature_c": round(temp, 2), "vibration_mm_s": round(vibe, 2)}

            elif "Power" in self.device_name:
                if self.anomaly_active:
                    # Frequency Sag & Voltage Drop Anomaly
                    freq = 47.12 + 0.05 * random.random()
                    volt = 194.8 + 1.0 * math.sin(t)
                else:
                    # Stable 50 Hz Grid
                    freq = 50.00 + 0.01 * math.sin(t * 0.2) + (noise * 0.02)
                    volt = 230.1 + 0.4 * math.sin(t * 0.05) + noise

                self.current_readings = {"frequency_hz": round(freq, 2), "voltage_v": round(volt, 1)}

            elif "LiDAR" in self.device_name:
                dist = 0.42 if self.anomaly_active else 5.00 + (noise * 0.05)
                self.current_readings = {"perimeter_clearance_m": round(dist, 2)}

            time.sleep(0.1)

    def run_modbus_server(self):
        s = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
        s.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
        s.bind(("0.0.0.0", self.port))
        s.listen(10)

        while self.running:
            try:
                conn, _ = s.accept()
                threading.Thread(target=self._handle_modbus, args=(conn,), daemon=True).start()
            except Exception:
                break

    def _handle_modbus(self, conn):
        while self.running:
            data = conn.recv(512)
            if not data or len(data) < 8:
                break
            func_code = data[7]
            if func_code == 0x03:
                # Return live physical readings encoded in holding registers
                r1 = int(self.current_readings.get("temperature_c", self.current_readings.get("frequency_hz", 50.0)) * 10)
                r2 = int(self.current_readings.get("vibration_mm_s", self.current_readings.get("voltage_v", 230.0)) * 10)

                resp = bytearray(data[0:6])
                resp[4] = 0x00
                resp[5] = 0x07
                resp.extend([data[6], 0x03, 0x04, (r1 >> 8) & 0xFF, r1 & 0xFF, (r2 >> 8) & 0xFF, r2 & 0xFF])
                conn.sendall(resp)
            elif func_code in (0x05, 0x06):
                conn.sendall(data)
        conn.close()

    def run_telemetry_streamer(self):
        s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
        while self.running:
            self.seq_counter += 1
            payload = {
                "device": self.device_name,
                "seq": self.seq_counter,
                "readings": self.current_readings,
                "timestamp": time.time()
            }
            # Stream UDP packets on port
            s.sendto(json.dumps(payload).encode(), ("127.0.0.1", self.port))
            time.sleep(0.1)

    def run_generic_server(self):
        s = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
        s.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
        s.bind(("0.0.0.0", self.port))
        s.listen(5)
        while self.running:
            conn, _ = s.accept()
            conn.close()

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--archetype", default="sensor")
    parser.add_argument("--protocol", default="modbus")
    parser.add_argument("--port", type=int, default=502)
    parser.add_argument("--name", default="Universal-Device")
    args = parser.parse_args()

    emulator = UniversalDeviceEmulator(args.archetype, args.protocol, args.port, args.name)
    emulator.start()

if __name__ == "__main__":
    main()