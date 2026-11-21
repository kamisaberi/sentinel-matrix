#!/usr/bin/env python3
# File: /home/kami/sentinel-matrix/src/apparatus_runtime/apparatus_driver.py
# ==============================================================================
# ARYORITHM TECHNOLOGIES B.V. — GENERIC APPARATUS & DUAL-PCAP PLUGIN HOST
# 100% Domain-Agnostic: Loads vertical physics/protocol handlers from --plugin-dir
# ==============================================================================

import argparse
import importlib.util
import json
import os
import socket
import struct
import threading
import time
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path


# ==============================================================================
# 1. PURE-PYTHON PCAP READER (MICROSECOND / NANOSECOND, ZERO EXTERNAL DEPS)
# ==============================================================================
class PcapReader:
    MAGIC_MAP = {
        b"\xd4\xc3\xb2\xa1": ("<", 1e-6),
        b"\xa1\xb2\xc3\xd4": (">", 1e-6),
        b"\x4d\x3c\xb2\xa1": ("<", 1e-9),
        b"\xa1\xb2\x3c\x4d": (">", 1e-9),
    }

    @classmethod
    def load_udp_payloads(cls, pcap_path: str):
        records = []
        p = Path(pcap_path)
        if not p.is_file():
            return records

        raw = p.read_bytes()
        if len(raw) < 24:
            return records

        magic = raw[:4]
        if magic not in cls.MAGIC_MAP:
            return records

        endian, frac_scale = cls.MAGIC_MAP[magic]
        _, _, _, _, _, linktype = struct.unpack(endian + "HHiiii", raw[4:24])

        offset = 24
        t0 = None
        while offset + 16 <= len(raw):
            ts_sec, ts_sub, incl_len, _ = struct.unpack(endian + "IIII", raw[offset:offset + 16])
            offset += 16
            pkt = raw[offset:offset + incl_len]
            offset += incl_len
            if len(pkt) < incl_len:
                break

            ts = ts_sec + ts_sub * frac_scale
            if t0 is None:
                t0 = ts

            payload, src_ip, dst_port = cls._extract_payload(pkt, linktype)
            if payload:
                records.append((ts - t0, payload, src_ip, dst_port))
        return records

    @staticmethod
    def _extract_payload(pkt: bytes, linktype: int):
        ip_offset = 0
        if linktype == 1:
            if len(pkt) < 14:
                return b"", "0.0.0.0", 0
            eth_type = struct.unpack(">H", pkt[12:14])[0]
            if eth_type == 0x8100 and len(pkt) >= 18:
                ip_offset = 18
            elif eth_type == 0x0800:
                ip_offset = 14
            else:
                return pkt, "0.0.0.0", 0
        elif linktype == 113:
            ip_offset = 16
        elif linktype == 101:
            ip_offset = 0
        else:
            return pkt, "0.0.0.0", 0

        if len(pkt) < ip_offset + 20:
            return b"", "0.0.0.0", 0

        ver_ihl = pkt[ip_offset]
        if (ver_ihl >> 4) != 4:
            return b"", "0.0.0.0", 0

        ihl = (ver_ihl & 0x0F) * 4
        proto = pkt[ip_offset + 9]
        src_ip = socket.inet_ntoa(pkt[ip_offset + 12:ip_offset + 16])
        l4_offset = ip_offset + ihl

        if proto == 17 and len(pkt) >= l4_offset + 8:
            _, dst_port, _, _ = struct.unpack(">HHHH", pkt[l4_offset:l4_offset + 8])
            return pkt[l4_offset + 8:], src_ip, dst_port
        if proto == 6 and len(pkt) >= l4_offset + 20:
            _, dst_port = struct.unpack(">HH", pkt[l4_offset:l4_offset + 4])
            data_off = ((pkt[l4_offset + 12] >> 4) & 0x0F) * 4
            return pkt[l4_offset + data_off:], src_ip, dst_port

        return pkt[l4_offset:], src_ip, 0


# ==============================================================================
# 2. DYNAMIC PLUGIN LOADER
# ==============================================================================
class GenericFallbackPlugin:
    def init_state(self, engine):
        engine.domain_state["telemetry"] = {"value": 0.0, "status": "NOMINAL"}

    def decode_packet(self, engine, payload: bytes, is_attack: bool, src_ip: str = ""):
        engine.domain_state["telemetry"]["last_len"] = len(payload)
        engine.domain_state["telemetry"]["status"] = "ALERT" if is_attack else "NOMINAL"

    def emit_nominal_step(self, engine, elapsed: float):
        engine.send_and_decode(b"NOMINAL_HEARTBEAT", is_attack=False)

    def emit_attack_step(self, engine, attack_type: str):
        engine.send_and_decode(f"ATTACK:{attack_type}".encode("utf-8"), is_attack=True)

    def on_attack_triggered(self, engine, attack_type: str):
        engine.domain_state["telemetry"]["status"] = "ALERT"

    def on_attack_stopped(self, engine):
        engine.domain_state["telemetry"]["status"] = "NOMINAL"

    def handle_post(self, engine, path: str, req: dict):
        return None

    def get_snapshot(self, engine) -> dict:
        return dict(engine.domain_state)


def load_apparatus_plugins(plugin_dir: Path) -> dict:
    registry = {}
    if not plugin_dir.is_dir():
        return registry

    for py_file in sorted(plugin_dir.glob("*.py")):
        if py_file.name.startswith("_"):
            continue
        try:
            spec = importlib.util.spec_from_file_location(f"apparatus_plugin_{py_file.stem}", str(py_file))
            if spec and spec.loader:
                mod = importlib.util.module_from_spec(spec)
                spec.loader.exec_module(mod)
                if hasattr(mod, "register_plugins"):
                    mod.register_plugins(registry)
                elif hasattr(mod, "APPARATUS_TYPES") and isinstance(mod.APPARATUS_TYPES, dict):
                    registry.update(mod.APPARATUS_TYPES)
                print(f"[+] Loaded apparatus plugin module: {py_file.name}", flush=True)
        except Exception as exc:
            print(f"[-] Failed loading apparatus plugin {py_file}: {exc}", flush=True)
    return registry


# ==============================================================================
# 3. GENERIC DUAL-PCAP STREAMING ENGINE
# ==============================================================================
class ApparatusEngine:
    def __init__(self, args, plugin):
        self.apparatus_type = args.type
        self.name = args.name
        self.target_ip = args.target_ip
        self.target_port = args.target_port
        self.pcap_dir = Path(args.pcap_dir)
        self.nominal_pcap = args.nominal_pcap or ""
        self.default_attack_pcap = args.attack_pcap or ""
        self.rate_mult = max(0.05, float(args.rate_multiplier))
        self.plugin = plugin

        self.sock = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
        self.lock = threading.Lock()
        self.running = True
        self.t_start = time.time()
        self.seq = 100

        self.active_attack = {
            "active": False,
            "mode": "overlay",
            "attack_type": "none",
            "pcap": "",
            "expires_at": 0.0,
            "packets_injected": 0,
        }

        self.stats = {
            "nominal_packets_tx": 0,
            "attack_packets_tx": 0,
            "replays_observed": 0,
            "kinematic_breaches_observed": 0,
            "nominal_source": "pcap" if (self.nominal_pcap and Path(self.nominal_pcap).is_file()) else "plugin_synth",
        }

        self.domain_state = {}
        self.plugin.init_state(self)

    def send_and_decode(self, payload: bytes, is_attack: bool, src_ip: str = ""):
        try:
            self.sock.sendto(payload, (self.target_ip, self.target_port))
        except Exception:
            pass
        with self.lock:
            if is_attack:
                self.stats["attack_packets_tx"] += 1
                self.active_attack["packets_injected"] += 1
            else:
                self.stats["nominal_packets_tx"] += 1
            self.plugin.decode_packet(self, payload, is_attack=is_attack, src_ip=src_ip)

    def _nominal_loop(self):
        nominal_records = PcapReader.load_udp_payloads(self.nominal_pcap) if self.nominal_pcap else []
        if nominal_records:
            print(f"[ApparatusEngine] Nominal PCAP loaded: {self.nominal_pcap} ({len(nominal_records)} packets)", flush=True)
        else:
            print(f"[ApparatusEngine] Nominal mode: plugin synthesis ({self.apparatus_type}) -> {self.target_ip}:{self.target_port}", flush=True)

        while self.running:
            with self.lock:
                replace_mode = self.active_attack["active"] and self.active_attack["mode"] == "replace"

            if replace_mode:
                time.sleep(0.05)
                continue

            if nominal_records:
                prev_t = 0.0
                for rel_t, payload, src_ip, _ in nominal_records:
                    if not self.running:
                        break
                    with self.lock:
                        if self.active_attack["active"] and self.active_attack["mode"] == "replace":
                            break
                    dt = max(0.005, min(0.5, (rel_t - prev_t) / self.rate_mult))
                    prev_t = rel_t
                    time.sleep(dt)
                    self.send_and_decode(payload, is_attack=False, src_ip=src_ip)
            else:
                self.plugin.emit_nominal_step(self, time.time() - self.t_start)
                time.sleep(0.08 / self.rate_mult)

    def _attack_loop(self):
        while self.running:
            with self.lock:
                act = dict(self.active_attack)

            if not act["active"]:
                time.sleep(0.05)
                continue

            if act["expires_at"] > 0 and time.time() >= act["expires_at"]:
                self.stop_attack()
                continue

            pcap_file = act.get("pcap", "")
            records = PcapReader.load_udp_payloads(pcap_file) if pcap_file else []

            if records:
                prev_t = 0.0
                for rel_t, payload, src_ip, _ in records:
                    with self.lock:
                        if not self.active_attack["active"] or time.time() >= self.active_attack["expires_at"]:
                            break
                    dt = max(0.005, min(0.25, (rel_t - prev_t) / self.rate_mult))
                    prev_t = rel_t
                    time.sleep(dt)
                    self.send_and_decode(payload, is_attack=True, src_ip=src_ip)
            else:
                self.plugin.emit_attack_step(self, act["attack_type"])
                time.sleep(0.15)

    def list_pcaps(self):
        if not self.pcap_dir.is_dir():
            return []
        return sorted([f.name for f in self.pcap_dir.iterdir() if f.is_file() and f.suffix in (".pcap", ".pcapng")])

    def trigger_attack(self, attack_type: str = "anomaly", pcap_name: str = "", mode: str = "overlay", duration_sec: float = 12.0):
        resolved_pcap = ""
        if pcap_name:
            cand = self.pcap_dir / Path(pcap_name).name
            if cand.is_file():
                resolved_pcap = str(cand)
        elif self.default_attack_pcap and Path(self.default_attack_pcap).is_file():
            resolved_pcap = self.default_attack_pcap

        with self.lock:
            self.active_attack = {
                "active": True,
                "mode": "replace" if mode == "replace" else "overlay",
                "attack_type": attack_type or "anomaly",
                "pcap": resolved_pcap,
                "expires_at": time.time() + max(1.0, min(300.0, float(duration_sec))),
                "packets_injected": 0,
            }
            self.plugin.on_attack_triggered(self, attack_type or "anomaly")

        print(f"[ApparatusEngine] Attack triggered: type={attack_type} mode={mode} pcap={resolved_pcap or 'synthetic'} ({duration_sec}s)", flush=True)
        return dict(self.active_attack)

    def stop_attack(self):
        with self.lock:
            self.active_attack["active"] = False
            self.active_attack["attack_type"] = "none"
            self.active_attack["pcap"] = ""
            self.plugin.on_attack_stopped(self)
        print("[ApparatusEngine] Attack stopped -> nominal baseline restored.", flush=True)

    def get_snapshot(self):
        with self.lock:
            snap = {
                "name": self.name,
                "apparatus_type": self.apparatus_type,
                "target": f"{self.target_ip}:{self.target_port}",
                "seq": self.seq,
                "timestamp_us": int(time.time() * 1e6),
                "stats": dict(self.stats),
                "active_attack": dict(self.active_attack),
                "available_pcaps": self.list_pcaps(),
            }
            snap.update(self.plugin.get_snapshot(self))
            return snap

    def start(self):
        threading.Thread(target=self._nominal_loop, daemon=True).start()
        threading.Thread(target=self._attack_loop, daemon=True).start()


# ==============================================================================
# 4. HTTP REST TELEMETRY & ATTACK CONTROL SERVER (:8090)
# ==============================================================================
def make_handler(engine: ApparatusEngine):
    class Handler(BaseHTTPRequestHandler):
        def _send_json(self, code: int, obj):
            body = json.dumps(obj).encode("utf-8")
            self.send_response(code)
            self.send_header("Content-Type", "application/json")
            self.send_header("Access-Control-Allow-Origin", "*")
            self.send_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
            self.send_header("Access-Control-Allow-Headers", "Content-Type")
            self.send_header("Content-Length", str(len(body)))
            self.end_headers()
            self.wfile.write(body)

        def do_OPTIONS(self):
            self._send_json(200, {"status": "ok"})

        def do_GET(self):
            if self.path.startswith("/health"):
                self._send_json(200, {"status": "healthy", "name": engine.name, "type": engine.apparatus_type})
            elif self.path.startswith("/pcaps"):
                self._send_json(200, {"pcaps": engine.list_pcaps()})
            else:
                self._send_json(200, engine.get_snapshot())

        def do_POST(self):
            length = int(self.headers.get("Content-Length", 0))
            raw = self.rfile.read(length).decode("utf-8") if length > 0 else "{}"
            try:
                req = json.loads(raw) if raw.strip() else {}
            except Exception:
                req = {}

            if self.path.startswith("/attack/inject"):
                res = engine.trigger_attack(
                    attack_type=req.get("attack_type", "anomaly"),
                    pcap_name=req.get("pcap", ""),
                    mode=req.get("mode", "overlay"),
                    duration_sec=req.get("duration_sec", 12.0),
                )
                self._send_json(200, {"status": "injected", "attack": res})
            elif self.path.startswith("/attack/stop") or self.path.startswith("/reset"):
                engine.stop_attack()
                self._send_json(200, {"status": "stopped"})
            else:
                with engine.lock:
                    custom = engine.plugin.handle_post(engine, self.path, req)
                if custom is not None:
                    self._send_json(200, custom)
                else:
                    self._send_json(404, {"error": "unknown endpoint"})

        def log_message(self, format, *args):
            pass

    return Handler


def main():
    parser = argparse.ArgumentParser(description="Sentinel-Matrix Generic Apparatus & Dual-PCAP Host")
    parser.add_argument("--type", default=os.getenv("APPARATUS_TYPE", "generic"))
    parser.add_argument("--name", default=os.getenv("APPARATUS_NAME", "Apparatus-Stream-01"))
    parser.add_argument("--plugin-dir", default=os.getenv("APPARATUS_PLUGIN_DIR", "/app/apparatus_plugins"))
    parser.add_argument("--nominal-pcap", default=os.getenv("NOMINAL_PCAP", ""))
    parser.add_argument("--attack-pcap", default=os.getenv("ATTACK_PCAP", ""))
    parser.add_argument("--pcap-dir", default=os.getenv("PCAP_DIR", "/app/pcaps"))
    parser.add_argument("--target-ip", default=os.getenv("TARGET_IP", "127.0.0.1"))
    parser.add_argument("--target-port", type=int, default=int(os.getenv("TARGET_PORT", "50050")))
    parser.add_argument("--api-port", type=int, default=int(os.getenv("API_PORT", "8090")))
    parser.add_argument("--rate-multiplier", type=float, default=float(os.getenv("RATE_MULTIPLIER", "1.0")))
    args = parser.parse_args()

    plugins = load_apparatus_plugins(Path(args.plugin_dir))
    plugin_cls = plugins.get(args.type, GenericFallbackPlugin)
    plugin = plugin_cls()

    engine = ApparatusEngine(args, plugin)
    engine.start()

    server = ThreadingHTTPServer(("0.0.0.0", args.api_port), make_handler(engine))
    print(f"[+] Apparatus Host '{args.name}' ({args.type}, plugin={plugin_cls.__name__}) listening on :{args.api_port} -> UDP {args.target_ip}:{args.target_port}", flush=True)
    server.serve_forever()


if __name__ == "__main__":
    main()
