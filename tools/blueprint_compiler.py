#!/usr/bin/env python3
"""
Sentinel-Matrix: Visual Threat Blueprint Compiler
Compiles visual node-and-edge JSON graphs from app.aryorithm.com into canonical model_routes.yaml.
Supports offline files or live fetch from backend.aryorithm.com using ~/.sentinel/credentials.json.
"""

import os
import sys
import json
import argparse
import requests


def load_credentials() -> dict:
    home = os.path.expanduser("~")
    cred_paths = [
        os.path.join(home, ".sentinel", "credentials.json"),
        "/etc/sentinel/credentials.json"
    ]
    for p in cred_paths:
        if os.path.exists(p):
            try:
                with open(p, "r") as f:
                    return json.load(f)
            except Exception:
                pass
    return {}


def fetch_remote_blueprint(blueprint_id: str, hub_url: str = None) -> dict:
    creds = load_credentials()
    api_key = creds.get("api_key", "")
    base_url = hub_url or creds.get("hub_url", "https://backend.aryorithm.com/api/v1")
    
    endpoint = f"{base_url.rstrip('/')}/blueprints/{blueprint_id}"
    print(f"[*] Fetching remote visual blueprint from: {endpoint}")
    
    headers = {"Authorization": f"Bearer {api_key}"} if api_key else {}
    r = requests.get(endpoint, headers=headers, timeout=5)
    if r.status_code == 200:
        return r.json()
    else:
        raise RuntimeError(f"HTTP {r.status_code} fetching remote blueprint: {r.text}")


def compile_blueprint_to_yaml(blueprint_json: dict) -> str:
    nodes = {n["id"]: n for n in blueprint_json.get("nodes", [])}
    edges = blueprint_json.get("edges", [])

    # Find Ingress Sensors
    ingress_nodes = [n for n in nodes.values() if n.get("type") == "SENSOR_INGRESS"]
    reflex_nodes  = [n for n in nodes.values() if n.get("type") == "SPKG_REFLEX_GATE"]
    model_nodes   = [n for n in nodes.values() if n.get("type") == "SILICON_MODEL"]
    fusion_nodes  = [n for n in nodes.values() if n.get("type") == "CROSS_MODAL_FUSION"]

    yaml_lines = [
        "# ============================================================================",
        f"# ARYORITHM MODEL ROUTING DAG - COMPILED FROM VISUAL BLUEPRINT",
        f"# Blueprint Name : {blueprint_json.get('name', 'Visual Blueprint')}",
        f"# Blueprint ID   : {blueprint_json.get('blueprint_id', 'unknown')}",
        "# ============================================================================",
        ""
    ]

    for ingress in ingress_nodes:
        cfg = ingress.get("config", {})
        sensor_id = cfg.get("sensor_id", "Default-Sensor")
        sensor_type = cfg.get("sensor_type", "SCADA_MODBUS_TCP")
        driver_mode = cfg.get("driver_mode", "AF_XDP_UMEM")
        port = cfg.get("port", 502)
        transport = cfg.get("transport", "tcp")

        yaml_lines.append(f"- sensor_id: {sensor_id}")
        yaml_lines.append(f"  sensor_type: {sensor_type}")
        yaml_lines.append(f"  driver_mode: {driver_mode}")
        yaml_lines.append(f"  match:")
        yaml_lines.append(f"    port: {port}")
        yaml_lines.append(f"    transport: {transport}")

        # Connect Reflex Package (Stage 1)
        if reflex_nodes:
            r_cfg = reflex_nodes[0].get("config", {})
            pkg_id = r_cfg.get("package_id", "org.aryorithm.package.modbus_actuator_guard")
            plugin_id = r_cfg.get("plugin_id", "modbus_actuator_guard.so")
            owner_sub = r_cfg.get("owner_subsystem", "18_cps_sec")
            exec_mode = r_cfg.get("execution_mode", "CASCADE_SHORT_CIRCUIT")

            yaml_lines.append(f"    package_id: {pkg_id}")
            yaml_lines.append(f"    plugin_id: {plugin_id}")
            yaml_lines.append(f"    owner_subsystem: {owner_sub}")
            yaml_lines.append(f"    execution_mode: {exec_mode}")

        # Connect Silicon AI Model (Stage 3)
        if model_nodes:
            m_cfg = model_nodes[0].get("config", {})
            model_id = m_cfg.get("model_id", "network_threat_int8.onnx")
            silicon = m_cfg.get("silicon_target", "INTEL_OPENVINO")
            fmt = m_cfg.get("format", "ONNX")
            prec = m_cfg.get("precision", "INT8")
            budget = m_cfg.get("latency_budget_ns", 20000)
            threshold = m_cfg.get("threshold_drop", 0.85)
            xai = m_cfg.get("xai_explainer", "MRD_XAI")

            yaml_lines.append(f"    model_id: {model_id}")
            yaml_lines.append(f"    silicon_target: {silicon}")
            yaml_lines.append(f"    format: {fmt}")
            yaml_lines.append(f"    precision: {prec}")
            yaml_lines.append(f"    latency_budget_ns: {budget}")
            yaml_lines.append(f"    threshold_drop: {threshold}")
            yaml_lines.append(f"    xai_explainer: {xai}")

        yaml_lines.append("")

    # Append Cross-Modal Fusion Rules (Stage 4)
    if fusion_nodes:
        yaml_lines.append("# --- CROSS-MODAL PHYSICAL CONSTRAINT FUSION (Stage 4) ---")
        for fusion in fusion_nodes:
            f_cfg = fusion.get("config", {})
            corr_id = f_cfg.get("correlation_id", "STUXNET_THERMAL_BLINDING")
            cyber_id = f_cfg.get("cyber_sensor_id", "Substation-Modbus-01")
            cyber_max = f_cfg.get("cyber_max_score", 0.20)
            phys_id = f_cfg.get("physical_sensor_id", "101")
            phys_min_temp = f_cfg.get("physical_min_temp", 120.0)
            action = f_cfg.get("action", "KERNEL_DROP_AND_ISOLATE")

            yaml_lines.append(f"- correlation_id: {corr_id}")
            yaml_lines.append(f"  cyber_sensor_id: {cyber_id}")
            yaml_lines.append(f"  cyber_max_score: {cyber_max}")
            yaml_lines.append(f"  physical_sensor_id: {phys_id}")
            yaml_lines.append(f"  physical_min_temp: {phys_min_temp}")
            yaml_lines.append(f"  action: {action}")
            yaml_lines.append("")

    return "\n".join(yaml_lines)


def main():
    parser = argparse.ArgumentParser(description="Sentinel Visual Threat Blueprint Compiler")
    parser.add_argument("-i", "--input", type=str, default=None, help="Path to input visual blueprint JSON")
    parser.add_argument("--remote-id", type=str, default=None, help="Fetch visual blueprint by ID from backend.aryorithm.com")
    parser.add_argument("-o", "--output", type=str, default="model_routes.yaml", help="Path to output model_routes.yaml")
    args = parser.parse_args()

    if args.remote_id:
        blueprint_data = fetch_remote_blueprint(args.remote_id)
    elif args.input:
        with open(args.input, "r") as f:
            blueprint_data = json.load(f)
    else:
        # Default fallback to sample substation blueprint
        default_sample = "configs/sample_substation_blueprint.json"
        if not os.path.exists(default_sample):
            default_sample = "../configs/sample_substation_blueprint.json"
        with open(default_sample, "r") as f:
            blueprint_data = json.load(f)

    yaml_content = compile_blueprint_to_yaml(blueprint_data)

    os.makedirs(os.path.dirname(os.path.abspath(args.output)), exist_ok=True)
    with open(args.output, "w") as f:
        f.write(yaml_content)

    print("\033[1;32m[+] Successfully compiled visual blueprint to:\033[0m " + args.output)
    print(f"    ├── Nodes Processed : {len(blueprint_data.get('nodes', []))}")
    print(f"    └── Edges Processed : {len(blueprint_data.get('edges', []))}")


if __name__ == "__main__":
    main()