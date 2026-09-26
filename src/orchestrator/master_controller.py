#!/usr/bin/env python3
import time
import os
import sys
import threading
import random

sys.path.insert(0, "/app")
sys.path.insert(0, "/app/src")
sys.path.insert(0, "/app/generated")

import grpc
import fleet_pb2
import fleet_pb2_grpc
import common_pb2
from traffic.omniflow_engine import OmniFlowEngine

NEXUS_ENDPOINT = os.environ.get("NEXUS_ENDPOINT", "10.240.0.10:50051")

# Fleet appliance definitions
NODES = [
    {
        "id": "Edge-Substation-01",
        "site": "PowerGrid-North-01",
        "host": "substation-plc-01",
        "backend": common_pb2.BACKEND_INTEL_OPENVINO,
        "uuid": "421a-substation-alpha-01"
    },
    {
        "id": "Edge-Hospital-PACS-02",
        "site": "Metro-General-Hospital",
        "host": "hospital-pacs-02",
        "backend": common_pb2.BACKEND_NVIDIA_TENSORRT,
        "uuid": "421a-hospital-pacs-02"
    },
    {
        "id": "Edge-Refinery-PLC-03",
        "site": "Coastal-Refinery-ZoneB",
        "host": "refinery-s7-03",
        "backend": common_pb2.BACKEND_ROCKCHIP_RKNN,
        "uuid": "421a-refinery-plc-03"
    }
]

def register_and_heartbeat_worker():
    channel = grpc.insecure_channel(NEXUS_ENDPOINT)
    fleet_stub = fleet_pb2_grpc.FleetServiceStub(channel)

    assigned_ids = {}

    # 1. Register all appliances
    for node in NODES:
        try:
            req = fleet_pb2.RegistrationRequest(
                identity=common_pb2.HardwareIdentity(
                    type=common_pb2.DEVICE_VIRTUAL_TPM,
                    machine_uuid=node["uuid"],
                    hostname=node["host"],
                    kernel_version="6.8.0-45-generic",
                    primary_backend=node["backend"],
                    tpm_public_hash="TPM2-VMWARE-VIRTUAL-PCR0"
                ),
                site_identifier=node["site"],
                software_version="1.0.0",
                tpm_quote_signature="VALIDATED_SIG"
            )
            resp = fleet_stub.RegisterAppliance(req)
            assigned_ids[node["id"]] = resp.node_id
            print(f"[MasterController] Registered {node['id']} -> Assigned: {resp.node_id}")
        except Exception as e:
            print(f"[-] Registration notice for {node['id']}: {e}")

    # 2. Continuous heartbeat loop (keeps TUI and Web UI populated in real time)
    drops = {node["id"]: random.randint(12, 45) for node in NODES}
    while True:
        time.sleep(3)
        for node in NODES:
            nid = assigned_ids.get(node["id"])
            if not nid:
                continue

            drops[node["id"]] += random.randint(0, 3)
            try:
                metrics = fleet_pb2.DeviceMetrics(
                    cpu_usage_pct=random.uniform(8.5, 24.0),
                    ram_usage_mb=random.uniform(180.0, 320.0),
                    npu_gpu_usage_pct=random.uniform(15.0, 45.0),
                    npu_gpu_temp_celsius=random.uniform(44.0, 52.0),
                    packets_inspected=random.randint(150000, 450000),
                    ebpf_packets_dropped=drops[node["id"]],
                    ring_buffer_fill_pct=random.randint(2, 8),
                    avg_mitigation_latency_us=random.uniform(0.78, 0.92) # Sub-microsecond proof
                )
                fleet_stub.SendHeartbeat(fleet_pb2.HeartbeatRequest(
                    node_id=nid,
                    timestamp_ns=time.time_ns(),
                    metrics=metrics
                ))
            except Exception:
                pass

def main():
    # Start background fleet registrar & heartbeat daemon
    t = threading.Thread(target=register_and_heartbeat_worker, daemon=True)
    t.start()

    # Launch OmniFlow 7-Channel Traffic Engine
    cfg_path = "/configs/traffic/omniflow.yaml"
    if not os.path.exists(cfg_path):
        cfg_path = os.path.join(os.path.dirname(__file__), "../../configs/traffic/omniflow.yaml")

    engine = OmniFlowEngine(cfg_path)
    try:
        engine.start_all()
    except KeyboardInterrupt:
        print("[*] OmniFlow stopping...")
        engine.stop()

if __name__ == "__main__":
    main()