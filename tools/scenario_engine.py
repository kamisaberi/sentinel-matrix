#!/usr/bin/env python3
import argparse
import os
import shutil
import subprocess
import sys
import tarfile
from pathlib import Path

try:
    import yaml
except ImportError:
    os.system("pip install --quiet pyyaml 2>/dev/null || true")
    import yaml

MATRIX_ROOT = Path(__file__).resolve().parent.parent
CACHE_DIR = MATRIX_ROOT / ".matrix_cache"
STAGED_DIR = CACHE_DIR / "staged"


def ensure_cache_dir():
    CACHE_DIR.mkdir(parents=True, exist_ok=True)
    STAGED_DIR.mkdir(parents=True, exist_ok=True)


def resolve_scenario_yaml(target_input: str) -> tuple[str, Path, Path]:
    """
    Resolves input (tar.gz, directory, yaml file, or slug name) into a valid scenario.yaml.
    Returns: (scenario_name, path_to_yaml, working_directory)
    """
    ensure_cache_dir()
    p = Path(target_input)

    # 1. Check if input is a slug name matching cached archives or local directories
    if not p.exists():
        search_candidates = [
            MATRIX_ROOT / "scenarios" / target_input / "scenario.yaml",
            MATRIX_ROOT / "scenarios" / f"{target_input}.yaml",
            Path.home() / ".cache" / "sentinel" / "scenarios" / f"scenario_{target_input}.tar.gz",
            Path.home() / ".cache" / "sentinel" / "scenarios" / f"{target_input}.tar.gz",
            Path("/var/cache/sentinel/scenarios") / f"scenario_{target_input}.tar.gz",
            Path("/var/cache/sentinel/scenarios") / f"{target_input}.tar.gz"
        ]
        for candidate in search_candidates:
            if candidate.exists():
                p = candidate
                break

    if not p.is_absolute():
        p = (MATRIX_ROOT / p).resolve()

    if not p.exists():
        print(f"\033[1;31m[-] Error: Scenario target not found: {target_input}\033[0m")
        sys.exit(1)

    # CASE A: Input is a Compressed Archive (.tar.gz, .tgz, .tar)
    if p.is_file() and any(p.name.endswith(ext) for ext in [".tar.gz", ".tgz", ".tar"]):
        slug = p.name
        for ext in [".tar.gz", ".tgz", ".tar"]:
            if slug.endswith(ext):
                slug = slug[:-len(ext)]
        if slug.startswith("scenario_"):
            slug = slug[9:]

        extract_target = STAGED_DIR / slug
        if extract_target.exists():
            shutil.rmtree(extract_target)
        extract_target.mkdir(parents=True, exist_ok=True)

        print(f"[*] Extracting scenario archive: {p.name} -> {extract_target}...")
        with tarfile.open(p, "r:*") as tar:
            tar.extractall(path=extract_target)

        # Locate scenario.yaml inside extracted directory
        yaml_candidates = list(extract_target.rglob("scenario.yaml"))
        if not yaml_candidates:
            yaml_candidates = list(extract_target.rglob("*.yaml"))
        if not yaml_candidates:
            print(f"\033[1;31m[-] Error: No scenario.yaml found inside archive {p.name}\033[0m")
            sys.exit(1)

        yaml_file = yaml_candidates[0]
        working_dir = yaml_file.parent
        print(f"[+] Located extracted topology: {yaml_file.relative_to(extract_target)}")
        return slug, yaml_file, working_dir

    # CASE B: Input is a Directory
    if p.is_dir():
        slug = p.name
        yaml_file = p / "scenario.yaml"
        if not yaml_file.exists():
            yaml_candidates = list(p.glob("*.yaml"))
            if yaml_candidates:
                yaml_file = yaml_candidates[0]
            else:
                print(f"\033[1;31m[-] Error: No scenario.yaml found in directory {p}\033[0m")
                sys.exit(1)
        return slug, yaml_file, p

    # CASE C: Input is a direct .yaml file
    if p.is_file():
        slug = p.stem
        if slug.endswith(".scenario"):
            slug = slug[:-9]
        return slug, p, p.parent

    print(f"\033[1;31m[-] Error: Unsupported scenario format: {p}\033[0m")
    sys.exit(1)


def compile_scenario_to_compose(scenario_path: Path, working_dir: Path, scenario_name: str) -> Path:
    ensure_cache_dir()

    with open(scenario_path, "r") as f:
        data = yaml.safe_load(f)

    scenario_meta = data.get("scenario", {})
    actual_name = scenario_meta.get("name", scenario_name)
    out_compose_file = CACHE_DIR / f"docker-compose.{actual_name}.yml"

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

        # Preserve & Anchor Build Context
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

        if svc_conf.get("privileged", False):
            service["privileged"] = True
        if "cap_add" in svc_conf:
            service["cap_add"] = svc_conf["cap_add"]
        if "depends_on" in svc_conf:
            service["depends_on"] = svc_conf["depends_on"]
        if "healthcheck" in svc_conf:
            service["healthcheck"] = svc_conf["healthcheck"]
        if "environment" in svc_conf:
            service["environment"] = svc_conf["environment"]

        # Preserve & Anchor Volume Mounts
        if "volumes" in svc_conf:
            anchored_volumes = []
            for v in svc_conf["volumes"]:
                if isinstance(v, str) and (v.startswith("./") or v.startswith("../")):
                    parts = v.split(":")
                    # First check relative to working_dir (for unpacked scenarios), else MATRIX_ROOT
                    rel_candidate = (working_dir / parts[0]).resolve()
                    if rel_candidate.exists():
                        parts[0] = str(rel_candidate)
                    else:
                        parts[0] = str((MATRIX_ROOT / parts[0]).resolve())
                    anchored_volumes.append(":".join(parts))
                else:
                    anchored_volumes.append(v)
            service["volumes"] = anchored_volumes

        if "ports" in svc_conf:
            service["ports"] = svc_conf["ports"]
        if "command" in svc_conf:
            service["command"] = svc_conf["command"]
        if svc_conf.get("stdin_open", False):
            service["stdin_open"] = True
        if svc_conf.get("tty", False):
            service["tty"] = True
        if "networks" in svc_conf:
            service["networks"] = svc_conf["networks"]

        services_def[svc_key] = service

    standalone_compose = {
        "name": f"matrix-{actual_name}",
        "networks": networks_def,
        "services": services_def
    }
    if volumes_def:
        standalone_compose["volumes"] = volumes_def

    with open(out_compose_file, "w") as f:
        yaml.dump(standalone_compose, f, default_flow_style=False, sort_keys=False)

    return out_compose_file


def load_scenario(target_input: str):
    scenario_name, yaml_path, working_dir = resolve_scenario_yaml(target_input)
    compose_file = compile_scenario_to_compose(yaml_path, working_dir, scenario_name)

    print("\033[1;36m================================================================================\033[0m")
    print(f"\033[1;37m        LAUNCHING SOVEREIGN SCENARIO: {scenario_name}                           \033[0m")
    print("\033[1;36m================================================================================\033[0m")
    print(f"[*] Resolved Topology : {yaml_path}")
    print(f"[*] Compiled Manifest : {compose_file}")

    cmd = [
        "docker", "compose",
        "--project-directory", str(MATRIX_ROOT),
        "-p", f"matrix_{scenario_name}",
        "-f", str(compose_file),
        "up", "-d"
    ]

    res = subprocess.run(cmd, cwd=str(MATRIX_ROOT))
    if res.returncode == 0:
        print(f"\n\033[1;32m[+] Scenario '{scenario_name}' is LIVE across custom networks & volumes!\033[0m")
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
        # Clean staged extractions
        if STAGED_DIR.exists():
            shutil.rmtree(STAGED_DIR, ignore_errors=True)
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

    # Clean individual staged folder if present
    staged_folder = STAGED_DIR / scenario_name
    if staged_folder.exists():
        shutil.rmtree(staged_folder, ignore_errors=True)


def main():
    parser = argparse.ArgumentParser(description="Sentinel-Matrix Universal Scenario Orchestrator")
    sub = parser.add_subparsers(dest="action")

    load_p = sub.add_parser("load", help="Load scenario (supports .tar.gz, directory, or .yaml)")
    load_p.add_argument("target", help="Scenario .tar.gz, folder path, yaml file, or slug name")

    down_p = sub.add_parser("down", help="Tear down scenario")
    down_p.add_argument("--name", default=None, help="Scenario name to tear down")

    args = parser.parse_args()

    if args.action == "load":
        load_scenario(args.target)
    elif args.action == "down":
        teardown_scenario(args.name)
    else:
        parser.print_help()


if __name__ == "__main__":
    main()