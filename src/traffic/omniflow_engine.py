#!/usr/bin/env python3
"""
Sentinel Matrix: OmniFlow Multi-Modal Traffic Engine
Runs 7 concurrent daemon threads simulating:
1. SCADA/OT (Modbus/DNP3)
2. Edge Vision (YOLO/Thermal Tensors)
3. L7 Web/API & Bot Kinematics
4. Identity / Impossible Velocity ATO
5. Host Process / Entropy Burst
6. Medical & Specialized IoT (DICOM/MAVLink)
7. Line-Rate NetFlow Blaster (Active Learning feeder)
"""

import os
import sys
import time
import math
import random
import threading
import requests
import yaml

# Add compiled gRPC stubs path
sys.path.insert(0, "/app")
sys.path.insert(0, "/app/generated")
sys.path.insert(0, "/app/src")

import grpc
import telemetry_pb2
import telemetry_pb2_grpc
import intelligence_pb2
import intelligence_pb2_grpc

class OmniFlowEngine:
    def __init__(self, config_path="/configs/traffic/omniflow.yaml"):
        self.config_path = config_path
        self.running = threading.Event()
        self.running.set()

        # Metrics accumulator across all 7 channels
        self.stats = {
            "c1_scada_events": 0,
            "c2_vision_frames": 0,
            "c3_web_requests": 0,
            "c4_identity_logins": 0,
            "c5_host_syscalls": 0,
            "c6_iot_packets": 0,
            "c7_netflow_vectors": 0,
            "total_adversarial_injections": 0,
            "total_forge_samples_streamed": 0,
        }
        self.stats_lock = threading.Lock()

        # Load config
        self.cfg = self._load_config()
        self.nexus_rest = self.cfg.get("nexus_rest_url", "http://10.240.0.10:9443")
        self.nexus_grpc = self.cfg.get("nexus_endpoint", "10.240.0.10:50051")

        # gRPC Channel initialization
        self.grpc_channel = grpc.insecure_channel(self.nexus_grpc)
        self.telemetry_stub = telemetry_pb2_grpc.TelemetryServiceStub(self.grpc_channel)
        self.intel_stub = intelligence_pb2_grpc.IntelligenceServiceStub(self.grpc_channel)

    def _load_config(self):
        if os.path.exists(self.config_path):
            with open(self.config_path, "r") as f:
                return yaml.safe_load(f).get("omniflow", {})
        return {}

    def _broadcast_threat_indicator(self, origin_node, attacker_ip, port, threat_type, tactic_id):
        """Notifies Nexus central threat bus for sub-50ms collective defense fanout."""
        try:
            url = f"{self.nexus_rest}/api/v1/threats/broadcast"
            requests.post(url, json={"ip": attacker_ip}, timeout=2)
            with self.stats_lock:
                self.stats["total_adversarial_injections"] += 1
        except Exception:
            pass

    # --------------------------------------------------------------------------
    # CHANNEL 1: Industrial SCADA & OT Subsystems (Module 18, Plugins 01-06)
    # --------------------------------------------------------------------------
    def _worker_scada_ot(self):
        c_cfg = self.cfg.get("channels", {}).get("channel_1_scada_ot", {})
        rate = c_cfg.get("rate_eps", 40)
        delay = 1.0 / max(1, rate)
        target_node = c_cfg.get("target_node", "Edge-Substation-01")

        while self.running.is_set():
            time.sleep(delay)
            is_anomaly = random.random() < c_cfg.get("anomalous_override_probability", 0.15)
            
            with self.stats_lock:
                self.stats["c1_scada_events"] += 1

            if is_anomaly:
                # Unauthorized coil override: triggers Module 18 (SCADA Physical Constraint Validator)
                attacker_ip = f"198.51.100.{random.randint(40, 50)}"
                self._broadcast_threat_indicator(
                    origin_node=target_node,
                    attacker_ip=attacker_ip,
                    port=502,
                    threat_type=intelligence_pb2.THREAT_SCADA_ANOMALY,
                    tactic_id="T0855"
                )

    # --------------------------------------------------------------------------
    # CHANNEL 2: Edge Vision & Optical Sensor Stream (YOLOv8 / Thermal)
    # --------------------------------------------------------------------------
    def _worker_vision(self):
        c_cfg = self.cfg.get("channels", {}).get("channel_2_vision_camera", {})
        target_fps = c_cfg.get("target_fps", 15)
        delay = 1.0 / max(1, target_fps)

        while self.running.is_set():
            time.sleep(delay)
            with self.stats_lock:
                self.stats["c2_vision_frames"] += 1

            # Periodically simulate a perimeter intrusion or thermal flare
            if random.random() < c_cfg.get("intrusion_event_probability", 0.10):
                # Generates a synthetic candidate vector with high uncertainty
                features = [random.uniform(-0.5, 0.5) for _ in range(32)]
                features[0] = 0.95 # Synthetic visual bounding box confidence
                features[1] = 0.88 # Thermal anomaly indicator
                self._stream_vector_to_nexus("Edge-Hospital-PACS-02", features, uncertainty=0.48, drop=False)

    # --------------------------------------------------------------------------
    # CHANNEL 3: Web App, API Abuse & Bot Kinematics (Module 05, Module 10)
    # --------------------------------------------------------------------------
    def _worker_web_bot(self):
        c_cfg = self.cfg.get("channels", {}).get("channel_3_web_api_bot", {})
        rate = c_cfg.get("rate_eps", 60)
        delay = 1.0 / max(1, rate)

        while self.running.is_set():
            time.sleep(delay)
            with self.stats_lock:
                self.stats["c3_web_requests"] += 1

            # Simulate automated bot kinematics (linear acceleration vs human curve)
            if random.random() < c_cfg.get("bot_linear_kinematics_ratio", 0.20):
                attacker_ip = f"203.0.113.{random.randint(10, 30)}"
                self._broadcast_threat_indicator(
                    origin_node="Edge-Hospital-PACS-02",
                    attacker_ip=attacker_ip,
                    port=443,
                    threat_type=intelligence_pb2.THREAT_EXPLOIT_PAYLOAD,
                    tactic_id="T1190"
                )

    # --------------------------------------------------------------------------
    # CHANNEL 4: Identity, Impossible Velocity & ATO (Module 12, Module 14)
    # --------------------------------------------------------------------------
    def _worker_identity_ato(self):
        c_cfg = self.cfg.get("channels", {}).get("channel_4_identity_ato", {})
        rate = c_cfg.get("rate_eps", 20)
        delay = 1.0 / max(1, rate)

        while self.running.is_set():
            time.sleep(delay)
            with self.stats_lock:
                self.stats["c4_identity_logins"] += 1

            # Impossible travel velocity breach
            if random.random() < c_cfg.get("impossible_velocity_ratio", 0.10):
                attacker_ip = f"192.0.2.{random.randint(100, 200)}"
                self._broadcast_threat_indicator(
                    origin_node="Edge-Substation-01",
                    attacker_ip=attacker_ip,
                    port=88,
                    threat_type=intelligence_pb2.THREAT_BRUTE_FORCE,
                    tactic_id="T1110"
                )

    # --------------------------------------------------------------------------
    # CHANNEL 5: Host Breakout, Syscalls & High Entropy (Module 07, Module 09)
    # --------------------------------------------------------------------------
    def _worker_host_syscalls(self):
        c_cfg = self.cfg.get("channels", {}).get("channel_5_host_process", {})
        rate = c_cfg.get("rate_eps", 30)
        delay = 1.0 / max(1, rate)

        while self.running.is_set():
            time.sleep(delay)
            with self.stats_lock:
                self.stats["c5_host_syscalls"] += 1

            # High-entropy file IOPS burst (simulating ransomware encryption)
            if random.random() < c_cfg.get("anomalous_syscall_ratio", 0.10):
                features = [random.uniform(0.1, 0.4) for _ in range(32)]
                features[5] = c_cfg.get("ransomware_burst_entropy", 7.95)
                self._stream_vector_to_nexus("Edge-Refinery-PLC-03", features, uncertainty=0.52, drop=True)

    # --------------------------------------------------------------------------
    # CHANNEL 6: Healthcare DICOM, UAV MAVLink & Maritime (Plugins 07-12)
    # --------------------------------------------------------------------------
    def _worker_specialized_iot(self):
        c_cfg = self.cfg.get("channels", {}).get("channel_6_specialized_iot", {})
        rate = c_cfg.get("rate_eps", 25)
        delay = 1.0 / max(1, rate)

        while self.running.is_set():
            time.sleep(delay)
            with self.stats_lock:
                self.stats["c6_iot_packets"] += 1

            # Stealthy C2 beacon exfiltration over DICOM PACS stream
            if random.random() < c_cfg.get("anomalous_telemetry_ratio", 0.10):
                attacker_ip = f"203.0.113.{random.randint(80, 95)}"
                self._broadcast_threat_indicator(
                    origin_node="Edge-Hospital-PACS-02",
                    attacker_ip=attacker_ip,
                    port=104, # Standard DICOM port
                    threat_type=intelligence_pb2.THREAT_C2_BEACON,
                    tactic_id="T1071"
                )

    # --------------------------------------------------------------------------
    # CHANNEL 7: High-Throughput Wire Flow Blaster (Active Learning Feeder)
    # --------------------------------------------------------------------------
    def _worker_netflow_blaster(self):
        c_cfg = self.cfg.get("channels", {}).get("channel_7_netflow_blaster", {})
        nodes = c_cfg.get("target_nodes", ["Edge-Substation-01", "Edge-Hospital-PACS-02", "Edge-Refinery-PLC-03"])
        batch_size = 50

        while self.running.is_set():
            time.sleep(0.08) # Sated continuous burst
            target = random.choice(nodes)
            
            vectors = []
            for _ in range(batch_size):
                features = [random.gauss(0.0, 0.5) for _ in range(32)]
                
                # Active learning uncertainty window [0.40 - 0.60] to feed Forge
                if random.random() < c_cfg.get("active_learning_uncertainty_ratio", 0.20):
                    uncertainty = random.uniform(0.42, 0.58)
                    recon_loss = random.uniform(0.76, 0.95)
                    drop = True
                else:
                    uncertainty = random.uniform(0.02, 0.25)
                    recon_loss = random.uniform(0.05, 0.28)
                    drop = False

                vectors.append(telemetry_pb2.CandidateVector(
                    event_id=random.randint(100000, 999999),
                    timestamp_ns=time.time_ns(),
                    features=features,
                    inference_uncertainty=uncertainty,
                    autoencoder_recon_loss=recon_loss,
                    triggered_kernel_drop=drop
                ))

            try:
                def gen():
                    yield telemetry_pb2.FeatureVectorStream(node_id=target, vectors=vectors)
                
                summary = self.telemetry_stub.StreamCandidateVectors(gen())
                with self.stats_lock:
                    self.stats["c7_netflow_vectors"] += batch_size
                    self.stats["total_forge_samples_streamed"] += summary.routed_to_forge
            except Exception:
                pass

    def _stream_vector_to_nexus(self, node_id, features, uncertainty=0.45, drop=False):
        try:
            vec = telemetry_pb2.CandidateVector(
                event_id=random.randint(100000, 999999),
                timestamp_ns=time.time_ns(),
                features=features,
                inference_uncertainty=uncertainty,
                autoencoder_recon_loss=0.82 if drop else 0.20,
                triggered_kernel_drop=drop
            )
            def gen():
                yield telemetry_pb2.FeatureVectorStream(node_id=node_id, vectors=[vec])
            summary = self.telemetry_stub.StreamCandidateVectors(gen())
            with self.stats_lock:
                self.stats["total_forge_samples_streamed"] += summary.routed_to_forge
        except Exception:
            pass

    def start_all(self):
        print("==================================================================")
        print("  OMNIFLOW: CONCURRENT 7-CHANNEL MULTI-MODAL TRAFFIC ENGINE")
        print("==================================================================")
        print("[*] Channel 1: Industrial SCADA/OT (Modbus/DNP3/S7)     -> Running")
        print("[*] Channel 2: Edge Vision (YOLO/Thermal Sensor Tensors)-> Running")
        print("[*] Channel 3: L7 Web API & Bot Kinematics (WAF/IDOR)   -> Running")
        print("[*] Channel 4: Identity & Impossible Velocity (ATO)     -> Running")
        print("[*] Channel 5: Host Syscalls & Ransomware Entropy       -> Running")
        print("[*] Channel 6: Medical DICOM & Drone MAVLink IoT        -> Running")
        print("[*] Channel 7: High-Rate NetFlow Stream (Active Learning)-> Running")
        print("------------------------------------------------------------------")

        workers = [
            threading.Thread(target=self._worker_scada_ot, daemon=True, name="Worker-SCADA"),
            threading.Thread(target=self._worker_vision, daemon=True, name="Worker-Vision"),
            threading.Thread(target=self._worker_web_bot, daemon=True, name="Worker-WebBot"),
            threading.Thread(target=self._worker_identity_ato, daemon=True, name="Worker-Identity"),
            threading.Thread(target=self._worker_host_syscalls, daemon=True, name="Worker-HostSyscalls"),
            threading.Thread(target=self._worker_specialized_iot, daemon=True, name="Worker-SpecializedIoT"),
            threading.Thread(target=self._worker_netflow_blaster, daemon=True, name="Worker-NetFlowBlaster"),
        ]

        for w in workers:
            w.start()

        # Telemetry reporter loop
        while self.running.is_set():
            time.sleep(5)
            with self.stats_lock:
                print(f"[OmniFlow Status] NetFlow: {self.stats['c7_netflow_vectors']:,} | "
                      f"SCADA: {self.stats['c1_scada_events']:,} | "
                      f"Vision: {self.stats['c2_vision_frames']:,} | "
                      f"Web: {self.stats['c3_web_requests']:,} | "
                      f"Injections: {self.stats['total_adversarial_injections']:,} | "
                      f"Forge Curated: {self.stats['total_forge_samples_streamed']:,}")

    def stop(self):
        self.running.clear()

if __name__ == "__main__":
    cfg_file = sys.argv[1] if len(sys.argv) > 1 else "/configs/traffic/omniflow.yaml"
    engine = OmniFlowEngine(cfg_file)
    try:
        engine.start_all()
    except KeyboardInterrupt:
        engine.stop()