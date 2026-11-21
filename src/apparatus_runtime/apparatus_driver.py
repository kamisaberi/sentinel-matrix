#!/usr/bin/env python3
# File: /home/kami/sentinel-matrix/src/apparatus_runtime/apparatus_driver.py
# ==============================================================================
# ARYORITHM TECHNOLOGIES B.V. — UNIVERSAL APPARATUS & DUAL-PCAP RUNTIME ENGINE
# Zero Heavy Video Codecs: Real-World Physical/Protocol Data + Dual PCAP Replay
# Supports: radar_360, formation_hud, flir_thermal, synchrophasor, reactor_core, lidar_spatial
# ==============================================================================

import argparse
import json
import math
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
        b"\xd4\xc3\xb2\xa1": ("<", 1e-6),  # Little-endian microsecond
        b"\xa1\xb2\xc3\xd4": (">", 1e-6),  # Big-endian microsecond
        b"\x4d\x3c\xb2\xa1": ("<", 1e-9),  # Little-endian nanosecond
        b"\xa1\xb2\x3c\x4d": (">", 1e-9),  # Big-endian nanosecond
    }

    @classmethod
    def load_udp_payloads(cls, pcap_path: str):
        """Returns list of (rel_time_sec, payload_bytes, src_ip_str, dst_port)."""
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
        # Linktype 1 = Ethernet, 101 = Raw IP, 113 = Linux SLL
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

        if proto == 17 and len(pkt) >= l4_offset + 8:  # UDP
            _, dst_port, _, _ = struct.unpack(">HHHH", pkt[l4_offset:l4_offset + 8])
            return pkt[l4_offset + 8:], src_ip, dst_port
        if proto == 6 and len(pkt) >= l4_offset + 20:  # TCP
            _, dst_port = struct.unpack(">HH", pkt[l4_offset:l4_offset + 4])
            data_off = ((pkt[l4_offset + 12] >> 4) & 0x0F) * 4
            return pkt[l4_offset + data_off:], src_ip, dst_port

        return pkt[l4_offset:], src_ip, 0


# ==============================================================================
# 2. REAL-WORLD APPARATUS STATE & DUAL-PCAP STREAMING ENGINE
# ==============================================================================
class ApparatusEngine:
    def __init__(self, args):
        self.apparatus_type = args.type
        self.name = args.name
        self.target_ip = args.target_ip
        self.target_port = args.target_port
        self.pcap_dir = Path(args.pcap_dir)
        self.nominal_pcap = args.nominal_pcap or ""
        self.default_attack_pcap = args.attack_pcap or ""
        self.rate_mult = max(0.05, float(args.rate_multiplier))

        self.sock = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
        self.lock = threading.Lock()
        self.running = True
        self.t_start = time.time()

        # Live Dual-PCAP Attack Control State
        self.active_attack = {
            "active": False,
            "mode": "overlay",       # "overlay" | "replace"
            "attack_type": "none",
            "pcap": "",
            "expires_at": 0.0,
            "packets_injected": 0,
        }

        self.formation = "v_formation"
        self.seq = 100
        self.last_valid_seq = 0
        self.stats = {
            "nominal_packets_tx": 0,
            "attack_packets_tx": 0,
            "replays_observed": 0,
            "kinematic_breaches_observed": 0,
            "nominal_source": "pcap" if (self.nominal_pcap and Path(self.nominal_pcap).is_file()) else "physics_synth",
        }

        # ----------------------------------------------------------------------
        # Domain 1 & 2: Aerospace 3D Airspace Tracks & Radar Strobe
        # ----------------------------------------------------------------------
        self.tracks = {
            "alpha":   {"id": 1, "callsign": "UAV-ALPHA",   "squawk": "4201", "x": 0.0,    "y": 80.0,  "z": 120.0, "v_mps": 24.2, "doppler_mps": 12.1, "heading": 0.0, "roll_deg": 0.0, "rcs_dbsm": -12.4, "cbf_h": 55.8, "status": "NOMINAL"},
            "bravo":   {"id": 2, "callsign": "UAV-BRAVO",   "squawk": "4202", "x": -135.0, "y": -25.0, "z": 118.0, "v_mps": 24.0, "doppler_mps": 11.8, "heading": 0.0, "roll_deg": 0.0, "rcs_dbsm": -12.1, "cbf_h": 56.0, "status": "NOMINAL"},
            "charlie": {"id": 3, "callsign": "UAV-CHARLIE", "squawk": "4203", "x": 135.0,  "y": -25.0, "z": 145.0, "v_mps": 24.4, "doppler_mps": 12.4, "heading": 0.0, "roll_deg": 0.0, "rcs_dbsm": -11.8, "cbf_h": 55.6, "status": "NOMINAL"},
        }
        self.ghost_tracks = []
        self.ew_strobe = {"active": False, "bearing_deg": 58.0, "power_dbm": -92.0, "source_ip": "10.240.52.122", "reason": "NONE"}

        # ----------------------------------------------------------------------
        # Domain 3: FLIR Radiometric Thermal Camera
        # ----------------------------------------------------------------------
        self.flir = {
            "palette": "IRONBOW",
            "gimbal_az_deg": 14.2,
            "gimbal_el_deg": -28.5,
            "gimbal_roll_deg": 0.4,
            "lrf_slant_range_m": 412.6,
            "ambient_temp_c": 21.4,
            "peak_temp_c": 38.6,
            "saturation_pct": 4.2,
            "roi_target": "GROUND_CONVOY_01",
            "laser_dazzle": False,
            "grid_cols": 16,
            "grid_rows": 12,
            "thermal_grid_c": [],
        }
        self._refresh_flir_grid(0.0, False)

        # ----------------------------------------------------------------------
        # Domain 4: Substation Synchrophasor Power Grid (IEEE C37.118)
        # ----------------------------------------------------------------------
        self.synchrophasor = {
            "freq_hz": 50.00,
            "busbar_kv": 220.4,
            "phase_deg": 0.0,
            "thd_pct": 1.4,
            "harmonics": {"1x": 1.0, "2x": 0.12, "3x": 0.08, "5x": 0.04},
        }

        # ----------------------------------------------------------------------
        # Domain 5: Chemical Refinery Exothermic Reaction Vessel
        # ----------------------------------------------------------------------
        self.reactor = {
            "pressure_psi": 100.2,
            "temp_c": 85.4,
            "flow_lpm": 42.0,
            "agitator_rpm": 1200,
            "quench_active": False,
            "status": "NOMINAL_CIRCULATION"
        }

        # ----------------------------------------------------------------------
        # Domain 6: LiDAR Spatial Altimeter / Point-Cloud
        # ----------------------------------------------------------------------
        self.lidar = {
            "ground_clearance_m": 120.4,
            "scan_rate_hz": 20,
            "blind_vector": False,
            "ranges_64d": [120.4] * 64
        }

    # ------------------------------------------------------------------
    # PACKET DECODING INTO REAL-WORLD APPARATUS STATE
    # ------------------------------------------------------------------
    def _decode_wire_packet(self, payload: bytes, is_attack: bool, src_ip: str = ""):
        """Decodes STANAG 4586, FLIR, PMU, or S7Comm into real-world state."""
        now = time.time()

        # 1. STANAG 4586 32-Byte Telecommand / Track Frame (>HIIQHfff)
        if len(payload) >= 32:
            msg_type, vid, seq, ts_us, plen, wx, wy, wz = struct.unpack(">HIIQHfff", payload[:32])
            if msg_type == 0x1001 and math.isfinite(wx) and math.isfinite(wy) and math.isfinite(wz):
                id_map = {1: "alpha", 2: "bravo", 3: "charlie"}
                key = id_map.get(vid, "alpha")
                t = self.tracks[key]

                dist = math.hypot(wx - t["x"], wy - t["y"])
                is_replay = (seq <= self.last_valid_seq and seq > 0 and is_attack)
                is_teleport = (dist > 400.0)

                if is_replay:
                    self.stats["replays_observed"] += 1
                    self.ew_strobe = {
                        "active": True,
                        "bearing_deg": 62.0,
                        "power_dbm": -42.5,
                        "source_ip": src_ip or "10.240.52.122",
                        "reason": f"STANAG_REPLAY (seq={seq})",
                    }
                    return

                if is_teleport:
                    self.stats["kinematic_breaches_observed"] += 1
                    self.ghost_tracks = [{
                        "target": key,
                        "x": round(wx, 1),
                        "y": round(wy, 1),
                        "z": round(wz, 1),
                        "delta_v_mps": round(dist / 0.1, 1),
                        "verdict": "REJECTED_GPS_TELEPORT",
                        "ts": now,
                    }]
                    self.ew_strobe = {
                        "active": True,
                        "bearing_deg": round((math.degrees(math.atan2(wx, wy)) + 360.0) % 360.0, 1),
                        "power_dbm": -34.0,
                        "source_ip": src_ip or "10.240.52.122",
                        "reason": f"GPS_TELEPORT (d={dist:.0f}m)",
                    }
                    return

                dt = 0.08
                speed = max(18.0, min(79.0, dist / dt if dist > 0.1 else t["v_mps"]))
                heading = math.atan2(wx - t["x"], wy - t["y"]) if dist > 0.1 else t["heading"]
                roll_deg = round(math.degrees(math.atan2(speed * speed, 9.81 * 420.0)) * math.sin(now), 2)
                doppler = round(speed * math.cos(heading), 2)
                t.update({
                    "x": round(wx, 2),
                    "y": round(wy, 2),
                    "z": round(wz, 2),
                    "v_mps": round(speed, 2),
                    "doppler_mps": doppler,
                    "heading": round(heading, 4),
                    "roll_deg": roll_deg,
                    "rcs_dbsm": round(-12.2 + math.sin(now * 2.3 + vid) * 0.9, 2),
                    "cbf_h": round(80.0 - speed, 2),
                    "status": "NOMINAL",
                })
                if seq > self.last_valid_seq:
                    self.last_valid_seq = seq
                return

        # 2. Radiometric FLIR Packet ("FLIR" magic + 5 floats)
        if len(payload) >= 24 and payload[:4] == b"FLIR":
            az, el, lrf, peak_c, sat_pct = struct.unpack(">fffff", payload[4:24])
            self.flir["gimbal_az_deg"] = round(az, 2)
            self.flir["gimbal_el_deg"] = round(el, 2)
            self.flir["lrf_slant_range_m"] = round(lrf, 1)
            self.flir["peak_temp_c"] = round(peak_c, 1)
            self.flir["saturation_pct"] = round(sat_pct, 1)
            self.flir["laser_dazzle"] = sat_pct > 55.0 or peak_c > 110.0
            self._refresh_flir_grid(now, self.flir["laser_dazzle"], peak_c)

    def _refresh_flir_grid(self, t_sec: float, is_dazzle: bool, peak_override: float = None):
        cols, rows = 16, 12
        cx = 8.0 + math.sin(t_sec * 0.8) * 3.0
        cy = 6.0 + math.cos(t_sec * 0.6) * 2.0
        peak = peak_override if peak_override is not None else (142.0 if is_dazzle else 38.6)
        grid = []
        for r in range(rows):
            row_vals = []
            for c in range(cols):
                d = math.hypot(c - cx, r - cy)
                if is_dazzle:
                    val = 22.0 + (peak - 22.0) * math.exp(-(d * d) / 22.0)
                else:
                    val = 21.0 + (peak - 21.0) * math.exp(-(d * d) / 4.2) + math.sin((c + r) * 0.7 + t_sec) * 0.6
                row_vals.append(round(val, 1))
            grid.append(row_vals)
        self.flir["thermal_grid_c"] = grid

    # ------------------------------------------------------------------
    # BACKGROUND THREAD 1: NOMINAL LOOP (PCAP OR REAL-WORLD SYNTHESIS)
    # ------------------------------------------------------------------
    def _nominal_loop(self):
        nominal_records = PcapReader.load_udp_payloads(self.nominal_pcap) if self.nominal_pcap else []
        if nominal_records:
            print(f"[ApparatusEngine] Nominal PCAP loaded: {self.nominal_pcap} ({len(nominal_records)} packets)", flush=True)
        else:
            print(f"[ApparatusEngine] Nominal mode: real-world {self.apparatus_type} protocol synthesis -> {self.target_ip}:{self.target_port}", flush=True)

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
                    self._send_and_decode(payload, is_attack=False, src_ip=src_ip)
            else:
                self._emit_synthetic_nominal_step()
                time.sleep(0.08 / self.rate_mult)

    def _emit_synthetic_nominal_step(self):
        elapsed = time.time() - self.t_start
        tick = elapsed * 0.55
        now_us = int(time.time() * 1e6)

        # 1. 3D Swarm Flight Kinematics
        ax = math.sin(tick * 0.65) * 160.0
        ay = math.cos(tick * 0.35) * 110.0 + 40.0
        az = 120.0 + math.sin(tick * 2.0) * 4.5

        with self.lock:
            form = self.formation

        if form == "echelon":
            bx, by, bz = ax + 105.0, ay - 75.0, 118.0
            cx, cy, cz = ax + 210.0, ay - 150.0, 145.0
        elif form == "diamond":
            bx, by, bz = ax - 125.0, ay - 20.0, 118.0
            cx, cy, cz = ax, ay - 165.0, 145.0
        elif form == "orbit":
            bx, by, bz = ax + math.cos(tick * 1.8) * 155.0, ay + math.sin(tick * 1.8) * 155.0, 118.0
            cx, cy, cz = ax + math.cos(tick * 1.8 + math.pi) * 155.0, ay + math.sin(tick * 1.8 + math.pi) * 155.0, 145.0
        else:
            bx, by, bz = ax - 135.0, ay - 105.0, 118.0
            cx, cy, cz = ax + 135.0, ay - 105.0, 145.0

        for vid, (px, py, pz) in ((1, (ax, ay, az)), (2, (bx, by, bz)), (3, (cx, cy, cz))):
            self.seq += 1
            pkt = struct.pack(">HIIQHfff", 0x1001, vid, self.seq, now_us, 12, float(px), float(py), float(pz))
            self._send_and_decode(pkt, is_attack=False)

        # 2. FLIR, Synchrophasor, Reactor & LiDAR Nominal Updates
        with self.lock:
            if not self.active_attack["active"]:
                # FLIR
                self.flir["gimbal_az_deg"] = round(14.0 + math.sin(tick) * 18.0, 2)
                self.flir["gimbal_el_deg"] = round(-28.0 + math.cos(tick * 0.7) * 5.0, 2)
                self.flir["lrf_slant_range_m"] = round(412.0 + math.sin(tick * 0.9) * 14.0, 1)
                self.flir["peak_temp_c"] = round(38.5 + math.sin(tick * 1.3) * 1.2, 1)
                self.flir["saturation_pct"] = 4.2
                self.flir["laser_dazzle"] = False
                self._refresh_flir_grid(elapsed, False)

                # Synchrophasor
                self.synchrophasor["freq_hz"] = round(50.00 + math.sin(tick * 1.5) * 0.025, 3)
                self.synchrophasor["phase_deg"] = round((elapsed * 45.0) % 360.0, 1)
                self.synchrophasor["thd_pct"] = 1.4
                self.synchrophasor["harmonics"] = {"1x": 1.0, "2x": 0.12, "3x": 0.08, "5x": 0.04}

                # Reactor Core
                self.reactor["pressure_psi"] = round(100.2 + math.sin(tick * 1.4) * 1.5, 1)
                self.reactor["temp_c"] = round(85.4 + math.sin(tick * 0.9) * 0.8, 1)
                self.reactor["flow_lpm"] = round(42.0 + math.cos(tick * 1.1) * 0.5, 1)
                self.reactor["agitator_rpm"] = int(1200 + math.sin(tick * 2.0) * 15)
                self.reactor["quench_active"] = False
                self.reactor["status"] = "NOMINAL_CIRCULATION"

                # LiDAR
                self.lidar["ground_clearance_m"] = round(120.4 + math.sin(tick * 2.0) * 4.5, 2)
                self.lidar["blind_vector"] = False
                self.lidar["ranges_64d"] = [round(self.lidar["ground_clearance_m"] + math.sin(i * 0.2 + tick) * 1.2, 2) for i in range(64)]

                # Clear old ghosts/strobes
                self.ghost_tracks = [g for g in self.ghost_tracks if (time.time() - g["ts"]) < 3.0]
                if not self.ghost_tracks:
                    self.ew_strobe["active"] = False
                    self.ew_strobe["reason"] = "NONE"

    # ------------------------------------------------------------------
    # BACKGROUND THREAD 2: ON-DEMAND ATTACK BURST LOOP (PCAP OR SYNTH)
    # ------------------------------------------------------------------
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
                    self._send_and_decode(payload, is_attack=True, src_ip=src_ip)
            else:
                self._emit_synthetic_attack_step(act["attack_type"])
                time.sleep(0.15)

    def _emit_synthetic_attack_step(self, attack_type: str):
        now_us = int(time.time() * 1e6)
        atk = (attack_type or "").lower()

        if "replay" in atk:
            pkt = struct.pack(">HIIQHfff", 0x1001, 1, 100, now_us, 12, 0.0, 80.0, 120.0)
            self._send_and_decode(pkt, is_attack=True, src_ip="10.240.52.122")
        elif "dazzle" in atk or "optical" in atk or "thermal" in atk or "triton" in atk:
            pkt = struct.pack(">4sfffff", b"FLIR", 18.5, -24.0, 412.0, 146.5, 94.8)
            self._send_and_decode(pkt, is_attack=True, src_ip="10.240.52.122")
        elif "stuxnet" in atk or "reactor" in atk or "s7" in atk or "chemical" in atk:
            with self.lock:
                self.reactor["pressure_psi"] = round(168.5 + math.sin(time.time() * 6.0) * 4.2, 1)
                self.reactor["temp_c"] = round(134.2 + math.sin(time.time() * 4.0) * 2.5, 1)
                self.reactor["agitator_rpm"] = 3600
                self.reactor["quench_active"] = False
                self.reactor["status"] = "EXOTHERMIC_RUNAWAY_DANGER"
                self.stats["attack_packets_tx"] += 1
        elif "harmonic" in atk or "grid" in atk or "industroyer" in atk:
            with self.lock:
                self.synchrophasor["freq_hz"] = round(49.42 + math.sin(time.time() * 8.0) * 0.18, 3)
                self.synchrophasor["thd_pct"] = 21.8
                self.synchrophasor["harmonics"] = {"1x": 1.0, "2x": 0.64, "3x": 0.52, "5x": 0.31}
                self.stats["attack_packets_tx"] += 1
        elif "lidar" in atk:
            with self.lock:
                self.lidar["blind_vector"] = True
                self.lidar["ranges_64d"] = [0.0] * 64
                self.stats["attack_packets_tx"] += 1
        else:
            # Default: 5 km GPS Teleportation Jump
            pkt = struct.pack(">HIIQHfff", 0x1001, 2, 99999, now_us, 12, 5000.0, 5000.0, 800.0)
            self._send_and_decode(pkt, is_attack=True, src_ip="10.240.52.122")

    def _send_and_decode(self, payload: bytes, is_attack: bool, src_ip: str = ""):
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
            self._decode_wire_packet(payload, is_attack=is_attack, src_ip=src_ip)

    # ------------------------------------------------------------------
    # PUBLIC CONTROL METHODS (REST API)
    # ------------------------------------------------------------------
    def list_pcaps(self):
        if not self.pcap_dir.is_dir():
            return []
        return sorted([f.name for f in self.pcap_dir.iterdir() if f.is_file() and f.suffix in (".pcap", ".pcapng")])

    def trigger_attack(self, attack_type: str = "gps_teleport", pcap_name: str = "", mode: str = "overlay", duration_sec: float = 12.0):
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
                "attack_type": attack_type or "gps_teleport",
                "pcap": resolved_pcap,
                "expires_at": time.time() + max(1.0, min(300.0, float(duration_sec))),
                "packets_injected": 0,
            }
        print(f"[ApparatusEngine] Attack triggered: type={attack_type} mode={mode} pcap={resolved_pcap or 'synthetic'} ({duration_sec}s)", flush=True)
        return dict(self.active_attack)

    def stop_attack(self):
        with self.lock:
            self.active_attack["active"] = False
            self.active_attack["attack_type"] = "none"
            self.active_attack["pcap"] = ""
            self.ghost_tracks = []
            self.ew_strobe["active"] = False
            self.ew_strobe["reason"] = "NONE"
            self.flir["laser_dazzle"] = False
            self.flir["saturation_pct"] = 4.2
            self.reactor["pressure_psi"] = 100.2
            self.reactor["temp_c"] = 85.4
            self.reactor["agitator_rpm"] = 1200
            self.reactor["quench_active"] = False
            self.reactor["status"] = "NOMINAL_CIRCULATION"
            self.lidar["blind_vector"] = False
        print("[ApparatusEngine] Attack stopped -> nominal baseline restored.", flush=True)

    def get_snapshot(self):
        with self.lock:
            return {
                "name": self.name,
                "apparatus_type": self.apparatus_type,
                "target": f"{self.target_ip}:{self.target_port}",
                "formation": self.formation,
                "seq": self.seq,
                "timestamp_us": int(time.time() * 1e6),
                "stats": dict(self.stats),
                "active_attack": dict(self.active_attack),
                "drones": {k: dict(v) for k, v in self.tracks.items()},
                "tracks": list(self.tracks.values()),
                "ghost_tracks": list(self.ghost_tracks),
                "ew_strobe": dict(self.ew_strobe),
                "flir": dict(self.flir),
                "synchrophasor": dict(self.synchrophasor),
                "reactor": dict(self.reactor),
                "lidar": dict(self.lidar),
                "available_pcaps": self.list_pcaps(),
            }

    def start(self):
        threading.Thread(target=self._nominal_loop, daemon=True).start()
        threading.Thread(target=self._attack_loop, daemon=True).start()


# ==============================================================================
# 3. HTTP REST TELEMETRY & ATTACK CONTROL SERVER (:8090)
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
                    attack_type=req.get("attack_type", "gps_teleport"),
                    pcap_name=req.get("pcap", ""),
                    mode=req.get("mode", "overlay"),
                    duration_sec=req.get("duration_sec", 12.0),
                )
                self._send_json(200, {"status": "injected", "attack": res})
            elif self.path.startswith("/attack/stop") or self.path.startswith("/reset"):
                engine.stop_attack()
                self._send_json(200, {"status": "stopped"})
            elif self.path.startswith("/formation"):
                new_f = req.get("formation", "")
                if new_f in ("v_formation", "echelon", "diamond", "orbit"):
                    with engine.lock:
                        engine.formation = new_f
                self._send_json(200, {"status": "ok", "formation": engine.formation})
            else:
                self._send_json(404, {"error": "unknown endpoint"})

        def log_message(self, format, *args):
            pass

    return Handler


def main():
    parser = argparse.ArgumentParser(description="Sentinel-Matrix Apparatus & Dual-PCAP Runtime")
    parser.add_argument("--type", default=os.getenv("APPARATUS_TYPE", "radar_360"),
                        choices=["radar_360", "formation_hud", "flir_thermal", "synchrophasor", "lidar_spatial", "reactor_core"])
    parser.add_argument("--name", default=os.getenv("APPARATUS_NAME", "Apparatus-Stream-01"))
    parser.add_argument("--nominal-pcap", default=os.getenv("NOMINAL_PCAP", ""))
    parser.add_argument("--attack-pcap", default=os.getenv("ATTACK_PCAP", ""))
    parser.add_argument("--pcap-dir", default=os.getenv("PCAP_DIR", "/app/pcaps"))
    parser.add_argument("--target-ip", default=os.getenv("TARGET_IP", "127.0.0.1"))
    parser.add_argument("--target-port", type=int, default=int(os.getenv("TARGET_PORT", "50050")))
    parser.add_argument("--api-port", type=int, default=int(os.getenv("API_PORT", "8090")))
    parser.add_argument("--rate-multiplier", type=float, default=float(os.getenv("RATE_MULTIPLIER", "1.0")))
    args = parser.parse_args()

    engine = ApparatusEngine(args)
    engine.start()

    server = ThreadingHTTPServer(("0.0.0.0", args.api_port), make_handler(engine))
    print(f"[+] Apparatus Runtime '{args.name}' ({args.type}) listening on :{args.api_port} -> UDP {args.target_ip}:{args.target_port}", flush=True)
    server.serve_forever()


if __name__ == "__main__":
    main()