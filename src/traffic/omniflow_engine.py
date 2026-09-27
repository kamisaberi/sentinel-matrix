#!/usr/bin/env python3
"""
Sentinel Matrix: OmniFlow Multi-Modal Traffic Engine (XAI-Enriched)
Generates high-rate traffic across 7 channels with domain-specific XAI attributions:
1. SCADA/OT (Modbus/DNP3) -> Function Code & Coil Register Attributions
2. Edge Vision (YOLO/Thermal) -> Bounding Box & Hotspot Attributions
3. L7 Web/API & Bot -> Kinematic Jitter & Header Attributions
4. Identity / ATO -> Impossible Geo-Velocity Attributions
5. Host Process / CWPP -> Shannon Entropy & Syscall Attributions
6. Medical & IoT (DICOM/MAVLink) -> Protocol Buffer & MTU Attributions
7. NetFlow Blaster -> Active Learning Uncertainty Feeder
"""

import os
import sys
import time
import random
import threading
import requests
import yaml

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

        self.cfg = self._load_config()
        self.nexus_rest = self.cfg.get("nexus_rest_url", "http://10.240.0.10:9443")
        self.nexus_grpc = self.cfg.get("nexus_endpoint", "10.240.0.10:50051")

        self.grpc_channel = grpc.insecure_channel(self.nexus_grpc)
        self.telemetry_stub = telemetry_pb2_grpc.TelemetryServiceStub(self.grpc_channel)
        self.intel_stub = intelligence_pb2_grpc.IntelligenceServiceStub(self.grpc_channel)

    def _load_config(self):
        if os.path.exists(self.config_path):
            with open(self.config_path, "r") as f:
                return yaml.safe_load(f).get("omniflow", {})
        return {}

    def _broadcast_threat_with_xai(self, attacker_ip, attributions):
        """Dispatches an attacker IP along with its top-3 XAI feature attributions."""
        try:
            url = f"{self.nexus_rest}/api/v1/threats/broadcast"
            payload = {
                "ip": attacker_ip,
                "attributions": attributions
            }
            requests.post(url, json=payload, timeout=2)
            with self.stats_lock:
                self.stats["total_adversarial_injections"] += 1
        except Exception:
            pass

    # --------------------------------------------------------------------------
    # CHANNEL 1: Industrial SCADA & Critical Infrastructure (Modbus/DNP3)
    # --------------------------------------------------------------------------
    def _worker_scada_ot(self):
        c_cfg = self.cfg.get("channels", {}).get("channel_1_scada_ot", {})
        rate = c_cfg.get("rate_eps", 40)
        delay = 1.0 / max(1, rate)

        while self.running.is_set():
            time.sleep(delay)
            with self.stats_lock:
                self.stats["c1_scada_events"] += 1

            if random.random() < c_cfg.get("anomalous_override_probability", 0.15):
                attacker_ip = f"198.51.100.{random.randint(40, 50)}"
                coil = random.randint(101, 120)
                
                # Domain-Specific XAI Attributions for SCADA
                attributions = [
                    {
                        "feature": "SCADA_Function_Code",
                        "contribution_pct": 54.2,
                        "observed": "0x05 (Force Single Coil)",
                        "baseline": "0x03 (Read Holding Registers)",
                        "audit_note": "Unauthorized coil override attempting physical valve manipulation"
                    },
                    {
                        "feature": "Forward_Packet_Rate",
                        "contribution_pct": 28.1,
                        "observed": f"{random.uniform(140.0, 220.0):.1f} Hz",
                        "baseline": "18.4 ± 4.2 Hz",
                        "audit_note": "Command injection velocity exceeded safety threshold by >10x"
                    },
                    {
                        "feature": "SCADA_Register_Address",
                        "contribution_pct": 14.8,
                        "observed": f"{coil} (Turbine Relief Coil)",
                        "baseline": "0-100 (Sensor Zone)",
                        "audit_note": "Target register belongs to restricted physical actuation zone"
                    }
                ]
                self._broadcast_threat_with_xai(attacker_ip, attributions)

    # --------------------------------------------------------------------------
    # CHANNEL 2: Edge Vision & Thermal Optical Sensors (YOLO / Thermal Tensors)
    # --------------------------------------------------------------------------
    def _worker_vision(self):
        c_cfg = self.cfg.get("channels", {}).get("channel_2_vision_camera", {})
        target_fps = c_cfg.get("target_fps", 15)
        delay = 1.0 / max(1, target_fps)

        while self.running.is_set():
            time.sleep(delay)
            with self.stats_lock:
                self.stats["c2_vision_frames"] += 1

            if random.random() < c_cfg.get("intrusion_event_probability", 0.10):
                attacker_ip = f"10.240.0.{random.randint(180, 195)}"
                attributions = [
                    {
                        "feature": "Protocol_Anomaly_Index",
                        "contribution_pct": 48.0,
                        "observed": "0.95 (Restricted Person)",
                        "baseline": "0.05 (Nominal / Clear)",
                        "audit_note": "Physical perimeter intrusion confirmed by edge YOLOv8 model in exclusion zone"
                    },
                    {
                        "feature": "Payload_Byte_Variance",
                        "contribution_pct": 32.0,
                        "observed": "88.4 variance",
                        "baseline": "12.0 ± 2.1 variance",
                        "audit_note": "Thermal matrix tensor indicates runaway heating anomaly on transformer core"
                    },
                    {
                        "feature": "Inter_Arrival_Jitter",
                        "contribution_pct": 16.0,
                        "observed": "0.01 ms",
                        "baseline": "33.3 ms (30 FPS)",
                        "audit_note": "Video frame timing anomaly indicates potential RTSP loop replay tampering"
                    }
                ]
                self._broadcast_threat_with_xai(attacker_ip, attributions)

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

            if random.random() < c_cfg.get("bot_linear_kinematics_ratio", 0.20):
                attacker_ip = f"203.0.113.{random.randint(10, 30)}"
                attributions = [
                    {
                        "feature": "Inter_Arrival_Jitter",
                        "contribution_pct": 51.0,
                        "observed": "0.02 ms",
                        "baseline": "45.2 ± 12.1 ms",
                        "audit_note": "Extremely low jitter (<0.1ms) proving automated non-human bot kinematics"
                    },
                    {
                        "feature": "TCP_PSH_Flag_Ratio",
                        "contribution_pct": 29.0,
                        "observed": "88.0%",
                        "baseline": "12.0 ± 3.0%",
                        "audit_note": "High-urgency data push requests targeting administrative API endpoints"
                    },
                    {
                        "feature": "Total_Fwd_Bytes",
                        "contribution_pct": 15.0,
                        "observed": "45,200 bytes",
                        "baseline": "1,024 ± 256 bytes",
                        "audit_note": "Excessive payload transfer attempting parameter fuzzing / SQL injection"
                    }
                ]
                self._broadcast_threat_with_xai(attacker_ip, attributions)

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

            if random.random() < c_cfg.get("impossible_velocity_ratio", 0.10):
                attacker_ip = f"192.0.2.{random.randint(100, 200)}"
                attributions = [
                    {
                        "feature": "Protocol_Anomaly_Index",
                        "contribution_pct": 58.0,
                        "observed": "0.92 (Impossible Travel)",
                        "baseline": "0.02 (Nominal)",
                        "audit_note": "Geographic login velocity between Amsterdam and Singapore exceeds physical travel speed"
                    },
                    {
                        "feature": "TCP_SYN_Flag_Ratio",
                        "contribution_pct": 24.0,
                        "observed": "45.0%",
                        "baseline": "1.2 ± 0.4%",
                        "audit_note": "Rapid authentication connection sweeps across multiple identity providers"
                    },
                    {
                        "feature": "Active_Mean_Duration",
                        "contribution_pct": 14.0,
                        "observed": "2.1 ms",
                        "baseline": "120.0 ± 25.0 ms",
                        "audit_note": "Automated credential stuffing tool cadence breaching human threshold"
                    }
                ]
                self._broadcast_threat_with_xai(attacker_ip, attributions)

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

            if random.random() < c_cfg.get("anomalous_syscall_ratio", 0.10):
                attacker_ip = f"10.240.0.{random.randint(210, 230)}"
                attributions = [
                    {
                        "feature": "Payload_Shannon_Entropy",
                        "contribution_pct": 62.0,
                        "observed": "7.95 bits",
                        "baseline": "3.84 ± 0.42 bits",
                        "audit_note": "High Shannon entropy indicating file encryption in progress / ransomware execution"
                    },
                    {
                        "feature": "Total_Fwd_Packets",
                        "contribution_pct": 22.0,
                        "observed": "1,420 pkts",
                        "baseline": "8.4 ± 2.1 pkts",
                        "audit_note": "Mass file IOPS read/write burst attempting unauthorized disk manipulation"
                    },
                    {
                        "feature": "Flow_Bytes_Per_Sec",
                        "contribution_pct": 12.0,
                        "observed": "88,400 B/s",
                        "baseline": "4,200 ± 850 B/s",
                        "audit_note": "Exfiltration velocity anomaly detected at container syscall boundary"
                    }
                ]
                self._broadcast_threat_with_xai(attacker_ip, attributions)

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

            if random.random() < c_cfg.get("anomalous_telemetry_ratio", 0.10):
                attacker_ip = f"203.0.113.{random.randint(80, 95)}"
                attributions = [
                    {
                        "feature": "Payload_Shannon_Entropy",
                        "contribution_pct": 52.0,
                        "observed": "7.88 bits",
                        "baseline": "3.84 ± 0.42 bits",
                        "audit_note": "Encrypted C2 beacon exfiltration tunnel disguised as DICOM PACS stream"
                    },
                    {
                        "feature": "Avg_Packet_Size",
                        "contribution_pct": 31.0,
                        "observed": "1,480 bytes",
                        "baseline": "240.0 ± 45.0 bytes",
                        "audit_note": "Abnormal PACS payload length exceeding protocol MTU expectation"
                    },
                    {
                        "feature": "Forward_Packet_Rate",
                        "contribution_pct": 13.0,
                        "observed": "120.0 Hz",
                        "baseline": "18.4 ± 4.2 Hz",
                        "audit_note": "Telemetry frequency spike attempting buffer overflow on hospital diagnostic server"
                    }
                ]
                self._broadcast_threat_with_xai(attacker_ip, attributions)

    # --------------------------------------------------------------------------
    # CHANNEL 7: High-Throughput Wire Flow Blaster (Active Learning Feeder)
    # --------------------------------------------------------------------------
    def _worker_netflow_blaster(self):
        c_cfg = self.cfg.get("channels", {}).get("channel_7_netflow_blaster", {})
        nodes = c_cfg.get("target_nodes", ["Edge-Substation-01", "Edge-Hospital-PACS-02", "Edge-Refinery-PLC-03"])
        batch_size = 50

        while self.running.is_set():
            time.sleep(0.08)
            target = random.choice(nodes)
            
            vectors = []
            for _ in range(batch_size):
                features = [random.gauss(0.0, 0.5) for _ in range(32)]
                
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

    def start_all(self):
        print("==================================================================")
        print("  OMNIFLOW: CONCURRENT 7-CHANNEL MULTI-MODAL ENGINE (XAI-ACTIVE)")
        print("==================================================================")

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

        while self.running.is_set():
            time.sleep(5)
            with self.stats_lock:
                print(f"[OmniFlow XAI] NetFlow: {self.stats['c7_netflow_vectors']:,} | "
                      f"SCADA: {self.stats['c1_scada_events']:,} | "
                      f"Vision: {self.stats['c2_vision_frames']:,} | "
                      f"XAI Alerts Injected: {self.stats['total_adversarial_injections']:,} | "
                      f"Forge Batches: {self.stats['total_forge_samples_streamed']:,}")

    def stop(self):
        self.running.clear()

if __name__ == "__main__":
    cfg_file = sys.argv[1] if len(sys.argv) > 1 else "/configs/traffic/omniflow.yaml"
    engine = OmniFlowEngine(cfg_file)
    try:
        engine.start_all()
    except KeyboardInterrupt:
        engine.stop()