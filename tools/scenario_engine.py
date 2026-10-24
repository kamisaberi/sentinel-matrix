#!/usr/bin/env python3
import argparse
import json
import os
import subprocess
import sys
from pathlib import Path

# Use safe yaml loader or fallback
try:
    import yaml
except ImportError:
    print("[-] PyYAML not found. Installing via pip or running with basic parser...")
    os.system("pip install --quiet pyyaml 2>/dev/null || true")
    import yaml


MATRIX_ROOT = Path(__file__).resolve().parent.parent
CACHE_DIR = MATRIX_ROOT / ".matrix_cache"
OVERLAY_FILE = CACHE_DIR / "scenario_overlay.yml"


def ensure_cache_dir():
    CACHE_DIR.mkdir(parents=True, exist_ok=True)


def generate_compose_overlay(scenario_path: Path, active_mode: str = None) -> Path:
    ensure_cache_dir()

    with open(scenario_path, "r") as f:
        data = yaml.safe_load(f)

    scenario_meta = data.get("scenario", {})
    scenario_name = scenario_meta.get("name", "custom_scenario")
    subnet_prefix = scenario_meta.get("base_subnet", "10.240.0")

    services = {}

    # Handle Mode-specific dynamic nodes (e.g. for fine-tuning simulation)
    modes = data.get("modes", {})
    if active_mode and active_mode in modes:
        mode_data = modes[active_mode]
        dynamic_nodes = mode_data.get("dynamic_nodes", [])
        for node in dynamic_nodes:
            node_name = node["name"]
            service_def = {
                "image": "python:3.11-slim",
                "container_name": node_name,
                "hostname": node.get("hostname", f"{node_name}.matrix.internal"),
                "restart": "unless-stopped",
                "networks": {
                    "sentinel-grid-net": {
                        "ipv4_address": node.get("ip", f"{subnet_prefix}.77")
                    }
                }
            }
            if "ports" in node:
                service_def["ports"] = node["ports"]
            if "environment" in node:
                service_def["environment"] = node["environment"]
            if "command" in node:
                service_def["command"] = node["command"]
            services[node_name] = service_def

    # Handle Top-level general scenario nodes
    general_nodes = data.get("nodes", [])
    for node in general_nodes:
        node_name = node["name"]
        service_def = {
            "image": node.get("image", "python:3.11-slim"),
            "container_name": node_name,
            "hostname": node.get("hostname", f"{node_name}.matrix.internal"),
            "restart": "unless-stopped",
            "networks": {
                "sentinel-grid-net": {
                    "ipv4_address": node.get("ip", f"{subnet_prefix}.199")
                }
            }
        }
        if "ports" in node:
            service_def["ports"] = node["ports"]
        if "command" in node:
            service_def["command"] = node["command"]
        services[node_name] = service_def

    overlay = {
        "services": services
    }

    with open(OVERLAY_FILE, "w") as f:
        yaml.dump(overlay, f, default_flow_style=False)

    print(f"\033[1;32m[+] Compiled dynamic overlay: {OVERLAY_FILE}\033[0m")
    print(f"    └── Generated services count: {len(services)}")
    return OVERLAY_FILE


def load_scenario(scenario_file: str, mode: str = None):
    p = Path(scenario_file)
    if not p.is_absolute():
        p = MATRIX_ROOT / p
    if not p.exists():
        print(f"\033[1;31m[-] Error: Scenario file not found: {p}\033[0m")
        sys.exit(1)

    print(f"\033[1;36m[*] Ingesting Matrix Scenario: {p.name} (Mode: {mode or 'Default'})...\033[0m")
    overlay = generate_compose_overlay(p, mode)

    # Launch base compose + dynamic overlay
    base_compose = MATRIX_ROOT / "docker-compose.yml"
    cmd = [
        "docker", "compose",
        "-f", str(base_compose),
        "-f", str(overlay),
        "up", "-d"
    ]

    print(f"[*] Executing Docker Compose dynamic mesh launch...")
    res = subprocess.run(cmd, cwd=str(MATRIX_ROOT))
    if res.returncode == 0:
        print(f"\033[1;32m[+] Scenario '{p.stem}' successfully loaded and running in mesh!\033[0m")
    else:
        print(f"\033[1;31m[-] Failed to load scenario overlay.\033[0m")
        sys.exit(res.returncode)


def teardown_scenario():
    base_compose = MATRIX_ROOT / "docker-compose.yml"
    if OVERLAY_FILE.exists():
        cmd = [
            "docker", "compose",
            "-f", str(base_compose),
            "-f", str(OVERLAY_FILE),
            "down", "--remove-orphans"
        ]
        subprocess.run(cmd, cwd=str(MATRIX_ROOT))
        OVERLAY_FILE.unlink(missing_ok=True)
        print("\033[1;32m[+] Dynamic scenario overlay dismantled cleanly.\033[0m")
    else:
        cmd = ["docker", "compose", "down", "--remove-orphans"]
        subprocess.run(cmd, cwd=str(MATRIX_ROOT))


def main():
    parser = argparse.ArgumentParser(description="Sentinel-Matrix Dynamic Scenario Engine")
    sub = parser.add_subparsers(dest="action")

    load_p = sub.add_parser("load", help="Load and launch dynamic scenario")
    load_p.add_argument("file", help="Path to scenario YAML file")
    load_p.add_argument("--mode", default=None, help="Execution sub-mode (e.g. local, air-gapped, cloud)")

    sub.add_parser("down", help="Dismantle active scenario and overlays")
    sub.add_parser("status", help="Show active dynamic scenario nodes")

    args = parser.parse_args()

    if args.action == "load":
        load_scenario(args.file, args.mode)
    elif args.action == "down":
        teardown_scenario()
    elif args.action == "status":
        base_compose = MATRIX_ROOT / "docker-compose.yml"
        if OVERLAY_FILE.exists():
            subprocess.run(["docker", "compose", "-f", str(base_compose), "-f", str(OVERLAY_FILE), "ps"], cwd=str(MATRIX_ROOT))
        else:
            subprocess.run(["docker", "compose", "ps"], cwd=str(MATRIX_ROOT))
    else:
        parser.print_help()


if __name__ == "__main__":
    main()