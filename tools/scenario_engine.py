#!/usr/bin/env python3
import argparse
import os
import subprocess
import sys
from pathlib import Path

try:
    import yaml
except ImportError:
    os.system("pip install --quiet pyyaml 2>/dev/null || true")
    import yaml

MATRIX_ROOT = Path(__file__).resolve().parent.parent
CACHE_DIR = MATRIX_ROOT / ".matrix_cache"


def ensure_cache_dir():
    CACHE_DIR.mkdir(parents=True, exist_ok=True)


def compile_scenario_to_compose(scenario_path: Path) -> tuple[str, Path]:
    ensure_cache_dir()

    with open(scenario_path, "r") as f:
        data = yaml.safe_load(f)

    scenario_meta = data.get("scenario", {})
    scenario_name = scenario_meta.get("name", scenario_path.stem)
    out_compose_file = CACHE_DIR / f"docker-compose.{scenario_name}.yml"

    # 1. Compile Networks
    networks_def = {}
    raw_networks = data.get("networks", {})
    for net_name, net_conf in raw_networks.items():
        net_entry = {
            "driver": net_conf.get("driver", "bridge")
        }
        if net_conf.get("internal", False):
            net_entry["internal"] = True

        if "subnet" in net_conf:
            net_entry["ipam"] = {
                "driver": "default",
                "config": [{
                    "subnet": net_conf["subnet"],
                    "gateway": net_conf.get("gateway", net_conf["subnet"].rsplit(".", 1)[0] + ".1")
                }]
            }
        networks_def[net_name] = net_entry

    # 2. Compile Named Volumes
    volumes_def = {}
    raw_volumes = data.get("volumes", {})
    for vol_name, vol_conf in raw_volumes.items():
        if isinstance(vol_conf, dict):
            # Evaluate ${PWD} if present in volume bind opts
            if "driver_opts" in vol_conf and "device" in vol_conf["driver_opts"]:
                dev_path = vol_conf["driver_opts"]["device"]
                dev_path = dev_path.replace("${PWD}", str(MATRIX_ROOT))
                vol_conf["driver_opts"]["device"] = dev_path
            volumes_def[vol_name] = vol_conf
        else:
            volumes_def[vol_name] = {"driver": "local"}

    # 3. Compile Production Services with Full Passthrough & Path Anchoring
    services_def = {}
    nodes = data.get("nodes", data.get("services", []))

    if isinstance(nodes, list):
        node_iterator = [(n["name"], n) for n in nodes]
    elif isinstance(nodes, dict):
        node_iterator = nodes.items()
    else:
        node_iterator = []

    for svc_key, svc_conf in node_iterator:
        service = {}

        # Preserve & Anchor Build Context & Dockerfile
        if "build" in svc_conf:
            build_spec = svc_conf["build"].copy() if isinstance(svc_conf["build"], dict) else {"context": svc_conf["build"]}
            ctx = build_spec.get("context", ".")
            if not os.path.isabs(ctx):
                build_spec["context"] = str((MATRIX_ROOT / ctx).resolve())
            service["build"] = build_spec
        elif "image" in svc_conf:
            service["image"] = svc_conf["image"]

        if "container_name" in svc_conf:
            service["container_name"] = svc_conf["container_name"]
        else:
            service["container_name"] = f"matrix-{svc_key}"

        if "hostname" in svc_conf:
            service["hostname"] = svc_conf["hostname"]

        service["restart"] = svc_conf.get("restart", "unless-stopped")

        # Preserve Security & eBPF Capabilities
        if svc_conf.get("privileged", False):
            service["privileged"] = True
        if "cap_add" in svc_conf:
            service["cap_add"] = svc_conf["cap_add"]

        # Preserve Dependencies & Healthchecks
        if "depends_on" in svc_conf:
            service["depends_on"] = svc_conf["depends_on"]
        if "healthcheck" in svc_conf:
            service["healthcheck"] = svc_conf["healthcheck"]

        # Preserve Environment
        if "environment" in svc_conf:
            service["environment"] = svc_conf["environment"]

        # Preserve & Anchor Volume Mounts
        if "volumes" in svc_conf:
            anchored_volumes = []
            for v in svc_conf["volumes"]:
                if isinstance(v, str) and (v.startswith("./") or v.startswith("../")):
                    # Anchor host bind mounts to MATRIX_ROOT
                    parts = v.split(":")
                    host_part = str((MATRIX_ROOT / parts[0]).resolve())
                    parts[0] = host_part
                    anchored_volumes.append(":".join(parts))
                else:
                    anchored_volumes.append(v)
            service["volumes"] = anchored_volumes

        # Preserve Ports, Commands, TTY
        if "ports" in svc_conf:
            service["ports"] = svc_conf["ports"]
        if "command" in svc_conf:
            service["command"] = svc_conf["command"]
        if svc_conf.get("stdin_open", False):
            service["stdin_open"] = True
        if svc_conf.get("tty", False):
            service["tty"] = True

        # Network Bindings
        if "networks" in svc_conf:
            service["networks"] = svc_conf["networks"]

        services_def[svc_key] = service

    standalone_compose = {
        "name": f"matrix-{scenario_name}",
        "networks": networks_def,
        "services": services_def
    }
    if volumes_def:
        standalone_compose["volumes"] = volumes_def

    with open(out_compose_file, "w") as f:
        yaml.dump(standalone_compose, f, default_flow_style=False, sort_keys=False)

    return scenario_name, out_compose_file


def load_scenario(scenario_file: str):
    p = Path(scenario_file)
    if not p.is_absolute():
        p = MATRIX_ROOT / p
    if not p.exists():
        print(f"\033[1;31m[-] Error: Scenario file not found: {p}\033[0m")
        sys.exit(1)

    scenario_name, compose_file = compile_scenario_to_compose(p)

    print("\033[1;36m================================================================================\033[0m")
    print(f"\033[1;37m        LAUNCHING SOVEREIGN SCENARIO: {scenario_name}                           \033[0m")
    print("\033[1;36m================================================================================\033[0m")
    print(f"[*] Compiled standalone manifest: {compose_file}")

    # Explicitly anchor the project directory to MATRIX_ROOT
    cmd = [
        "docker", "compose",
        "--project-directory", str(MATRIX_ROOT),
        "-p", f"matrix_{scenario_name}",
        "-f", str(compose_file),
        "up", "-d"
    ]

    res = subprocess.run(cmd, cwd=str(MATRIX_ROOT))
    if res.returncode == 0:
        print(f"\n\033[1;32m[+] Scenario '{scenario_name}' is LIVE with all production volumes & networks!\033[0m")
        print("\033[1;36m================================================================================\033[0m")
    else:
        print(f"\033[1;31m[-] Launch failed with code {res.returncode}\033[0m")
        sys.exit(res.returncode)


def teardown_scenario(scenario_name: str = None):
    ensure_cache_dir()
    if not scenario_name:
        for f in CACHE_DIR.glob("docker-compose.*.yml"):
            s_name = f.stem.replace("docker-compose.", "")
            print(f"[*] Dismantling scenario project: matrix_{s_name}...")
            subprocess.run([
                "docker", "compose",
                "--project-directory", str(MATRIX_ROOT),
                "-p", f"matrix_{s_name}",
                "-f", str(f),
                "down", "--remove-orphans"
            ], cwd=str(MATRIX_ROOT))
            f.unlink(missing_ok=True)
        return

    compose_file = CACHE_DIR / f"docker-compose.{scenario_name}.yml"
    if compose_file.exists():
        subprocess.run([
            "docker", "compose",
            "--project-directory", str(MATRIX_ROOT),
            "-p", f"matrix_{scenario_name}",
            "-f", str(compose_file),
            "down", "--remove-orphans"
        ], cwd=str(MATRIX_ROOT))
        compose_file.unlink(missing_ok=True)


def main():
    parser = argparse.ArgumentParser(description="Sentinel-Matrix Scenario Orchestrator")
    sub = parser.add_subparsers(dest="action")

    load_p = sub.add_parser("load", help="Load scenario YAML")
    load_p.add_argument("file", help="Scenario file path")

    down_p = sub.add_parser("down", help="Tear down scenario")
    down_p.add_argument("--name", default=None, help="Scenario name")

    args = parser.parse_args()

    if args.action == "load":
        load_scenario(args.file)
    elif args.action == "down":
        teardown_scenario(args.name)
    else:
        parser.print_help()


if __name__ == "__main__":
    main()