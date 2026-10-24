#!/usr/bin/env python3
import argparse
import json
import os
import socket
import struct
import sys
import threading
import time


class UniversalDeviceEmulator:
    def __init__(self, archetype, protocol, port, device_name, config_file=None):
        self.archetype = archetype
        self.protocol = protocol.lower()
        self.port = int(port)
        self.device_name = device_name
        self.running = True
        self.config = {}

        if config_file and os.path.exists(config_file):
            try:
                with open(config_file, "r") as f:
                    self.config = json.load(f)
            except Exception as e:
                print(f"[-] Warning: Failed to load config {config_file}: {e}")

        # In-memory virtual registers & physical state
        self.registers = [0] * 100
        self.coils = [False] * 32
        self.seq_counter = 0

    def start(self):
        print(f"\033[1;36m================================================================================\033[0m")
        print(f"\033[1;37m        STARTING UNIVERSAL DEVICE EMULATOR: {self.device_name}                  \033[0m")
        print(f"\033[1;36m================================================================================\033[0m")
        print(f"[*] Archetype  : {self.archetype.upper()}")
        print(f"[*] Protocol   : {self.protocol.upper()}")
        print(f"[*] Port       : {self.port}")
        print(f"[*] Container  : {socket.gethostname()}")

        if self.protocol == "modbus":
            self.run_modbus_server()
        elif self.protocol == "s7comm":
            self.run_s7comm_server()
        elif self.protocol == "iec104":
            self.run_iec104_server()
        elif self.protocol == "gtpu":
            self.run_gtpu_server()
        elif self.protocol == "ccsds":
            self.run_ccsds_server()
        elif self.protocol == "stream_telemetry":
            self.run_telemetry_streamer()
        else:
            print(f"[-] Protocol {self.protocol} not recognized, falling back to TCP echo.")
            self.run_generic_tcp_server()

    # --------------------------------------------------------------------------
    # ARCHETYPE 1 & 2: MODBUS TCP LISTENER (Ports: 502 / Any)
    # --------------------------------------------------------------------------
    def run_modbus_server(self):
        s = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
        s.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
        s.bind(("0.0.0.0", self.port))
        s.listen(10)
        print(f"\033[1;32m[+] Modbus TCP Server active on port {self.port}\033[0m")

        while self.running:
            try:
                conn, addr = s.accept()
                threading.Thread(target=self._handle_modbus_conn, args=(conn, addr), daemon=True).start()
            except Exception:
                break

    def _handle_modbus_conn(self, conn, addr):
        while self.running:
            data = conn.recv(512)
            if not data or len(data) < 8:
                break

            func_code = data[7]
            # FC 0x03: Read Holding Registers
            if func_code == 0x03:
                resp = bytearray(data[0:6])
                resp[4] = 0x00
                resp[5] = 0x07  # Length
                resp.extend([data[6], 0x03, 0x04, 0x00, 0x64, 0x00, 0xC8]) # Return 2 registers (100, 200)
                conn.sendall(resp)
            # FC 0x05 / 0x06: Write Single Coil / Register
            elif func_code in (0x05, 0x06, 0x0F, 0x10):
                conn.sendall(data) # Echo write ack
        conn.close()

    # --------------------------------------------------------------------------
    # ARCHETYPE 2: SIEMENS S7COMM LISTENER (Port: 102 / Any)
    # --------------------------------------------------------------------------
    def run_s7comm_server(self):
        s = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
        s.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
        s.bind(("0.0.0.0", self.port))
        s.listen(10)
        print(f"\033[1;32m[+] Siemens S7Comm Server active on port {self.port}\033[0m")

        while self.running:
            try:
                conn, addr = s.accept()
                threading.Thread(target=self._handle_s7_conn, args=(conn, addr), daemon=True).start()
            except Exception:
                break

    def _handle_s7_conn(self, conn, addr):
        while self.running:
            data = conn.recv(512)
            if not data:
                break
            # COTP Connection Request (CR: 0xE0 -> Send CC)
            if len(data) >= 7 and data[0] == 0x03 and data[5] == 0xE0:
                cotp_cc = bytes.fromhex("0300000b06d0000100020000")
                conn.sendall(cotp_cc)
            # S7 Header Setup Communication
            elif len(data) >= 10 and data[7] == 0x32:
                # S7 ACK PDU
                ack = bytearray(data)
                ack[8] = 0x03 # ROSCTR: Ack_Data
                conn.sendall(ack)
        conn.close()

    # --------------------------------------------------------------------------
    # ARCHETYPE 3: IEC 60870-5-104 SMART GRID IED (Port: 2404 / Any)
    # --------------------------------------------------------------------------
    def run_iec104_server(self):
        s = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
        s.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
        s.bind(("0.0.0.0", self.port))
        s.listen(10)
        print(f"\033[1;32m[+] IEC 60870-5-104 Grid IED active on port {self.port}\033[0m")

        while self.running:
            try:
                conn, addr = s.accept()
                threading.Thread(target=self._handle_iec104_conn, args=(conn, addr), daemon=True).start()
            except Exception:
                break

    def _handle_iec104_conn(self, conn, addr):
        while self.running:
            data = conn.recv(512)
            if not data or len(data) < 6:
                break
            if data[0] == 0x68:
                # Respond to STARTDT (0x07) or TESTFR (0x43) with ACK (0x0B or 0x83)
                ack = bytes.fromhex("68040b000000")
                conn.sendall(ack)
        conn.close()

    # --------------------------------------------------------------------------
    # ARCHETYPE 7: 3GPP 5G GTP-U TUNNEL GATEWAY (Port: 2152 UDP)
    # --------------------------------------------------------------------------
    def run_gtpu_server(self):
        s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
        s.bind(("0.0.0.0", self.port))
        print(f"\033[1;32m[+] 3GPP 5G N3 GTP-U UPF Gateway active on UDP {self.port}\033[0m")

        while self.running:
            data, addr = s.recvfrom(2048)
            if len(data) >= 8 and data[1] == 0xFF:
                # Echo back verified GTP-U frame
                s.sendto(data, addr)

    # --------------------------------------------------------------------------
    # ARCHETYPE 8: CCSDS 133.0-B-2 SPACE TELEMETRY TRANSCEIVER (Port: 50100 UDP)
    # --------------------------------------------------------------------------
    def run_ccsds_server(self):
        s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
        s.bind(("0.0.0.0", self.port))
        print(f"\033[1;32m[+] CCSDS Space Packet Ground Transceiver active on UDP {self.port}\033[0m")

        while self.running:
            data, addr = s.recvfrom(2048)
            if len(data) >= 6:
                s.sendto(b"CCSDS_ACK_OK", addr)

    # --------------------------------------------------------------------------
    # ARCHETYPE 6: SPATIAL / STREAMING SENSOR (Vibration/Thermal UDP Blaster)
    # --------------------------------------------------------------------------
    def run_telemetry_streamer(self):
        dest_ip = self.config.get("dest_ip", "127.0.0.1")
        dest_port = int(self.config.get("dest_port", 9999))
        interval = float(self.config.get("interval", 0.5))

        s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
        print(f"\033[1;32m[+] Streaming live sensor telemetry to {dest_ip}:{dest_port} (Interval: {interval}s)\033[0m")

        while self.running:
            self.seq_counter += 1
            payload = {
                "device": self.device_name,
                "archetype": self.archetype,
                "seq": self.seq_counter,
                "temperature_c": 65.4 + (self.seq_counter % 5),
                "vibration_mm_s": 1.24 + (self.seq_counter % 2),
                "timestamp": time.time()
            }
            s.sendto(json.dumps(payload).encode(), (dest_ip, dest_port))
            time.sleep(interval)

    def run_generic_tcp_server(self):
        s = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
        s.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
        s.bind(("0.0.0.0", self.port))
        s.listen(5)
        while self.running:
            conn, _ = s.accept()
            conn.sendall(f"UNIVERSAL_DEVICE_ECHO_{self.device_name}\n".encode())
            conn.close()


def main():
    parser = argparse.ArgumentParser(description="Universal Industrial Device & Sensor Emulator")
    parser.add_argument("--archetype", default="plc", choices=[
        "sensor", "plc", "ied", "sis", "ipc", "vision", "5g_gateway", "space_telemetry"
    ], help="Target device archetype")
    parser.add_argument("--protocol", default="modbus", choices=[
        "modbus", "s7comm", "iec104", "gtpu", "ccsds", "stream_telemetry", "tcp"
    ], help="Operational wire protocol")
    parser.add_argument("--port", type=int, default=502, help="Listening port")
    parser.add_argument("--name", default="Universal-Device", help="Emulated device name")
    parser.add_argument("--config", default="/app/device_archetypes.json", help="Path to JSON configuration profile")

    args = parser.parse_args()

    emulator = UniversalDeviceEmulator(
        archetype=args.archetype,
        protocol=args.protocol,
        port=args.port,
        device_name=args.name,
        config_file=args.config
    )
    emulator.start()


if __name__ == "__main__":
    main()