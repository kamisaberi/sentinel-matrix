#!/usr/bin/env python3
# File: /home/kami/sentinel-matrix/tools/scenario_engine.py
# ==============================================================================
# ARYORITHM SENTINEL-MATRIX: UNIVERSAL SCENARIO COMPILER & ORCHESTRATOR
# Tier 3 Matrix Apparatus Engine linked against Tier 0 sentinel_fs
# ==============================================================================

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

# Authoritative Sovereign Sentinel Filesystem (SSFS) Substrate
from sentinel_fs import SentinelPathResolver, ObjectClass

MATRIX_ROOT = Path(__file__).resolve().parent.parent

# Decoupled Workspaces & Staging (Zero git repository pollution)
WORKSPACE_BASE = SentinelPathResolver.resolve_dir(ObjectClass.SCENARIO_WORKSPACE)
CATALOG_BASE = SentinelPathResolver.resolve_dir(ObjectClass.SCENARIO_CATALOG)


def ensure_workspace_dir(scenario_name: str) -> tuple[Path, Path]:
    """Ensures dedicated runtime and staging directories inside SSFS."""
    scenario_workspace = SentinelPathResolver.resolve_scenario_workspace(scenario_name)
    staged_dir = scenario_workspace / "staged"
    scenario_workspace.mkdir(parents=True, exist_ok=True)
    staged_dir.mkdir(parents=True, exist_ok=True)
    return scenario_workspace, staged_dir


def safe_clean_dir(target_path: Path):
    """Safely removes a directory even if prior runs left root-owned files."""
    if not target_path.exists():
        return
    try:
        shutil.rmtree(target_path)
    except PermissionError:
        subprocess.run(["sudo", "rm", "-rf", str(target_path)], check=False)


def resolve_pack_path(src_part: str) -> str:
    """Delegates symbolic pack:// resolution to the canonical SSFS resolver."""
    return str(SentinelPathResolver.resolve_pack_uri(src_part))


def resolve_scenario_yaml(target_input: str) -> tuple[str, Path, Path]:
    """
    Resolves input (tar.gz, directory, yaml file, or catalog slug) into a valid scenario.yaml.
    Returns: (scenario_name, path_to_yaml, working_directory)
    """
    p = Path(target_input)

    # 1. Check if input is a catalog slug matching the sovereign SSFS catalog
    if not p.exists():
        search_candidates = [
            CATALOG_BASE / target_input / "scenario.yaml",
            CATALOG_BASE / f"{target_input}.yaml",
            CATALOG_BASE / target_input,
            MATRIX_ROOT / "scenarios" / target_input / "scenario.yaml",
            MATRIX_ROOT / "scenarios" / f"{target_input}.yaml"
        ]
        for candidate in search_candidates:
            if candidate.exists():
                p = candidate
                break

    if not p.is_absolute():
        p = p.resolve()

    if not p.exists():
        print(f"\033[1;31m[-] Error: Scenario target not found: {target_input}\033[0m")
        print(f"[*] Searched authoritative SSFS catalog: {CATALOG_BASE}")
        sys.exit(1)

    # CASE A: Input is a Compressed Archive (.tar.gz, .tgz, .tar)
    if p.is_file() and any(p.name.endswith(ext) for ext in [".tar.gz", ".tgz", ".tar"]):
        slug = p.name
        for ext in [".tar.gz", ".tgz", ".tar"]:
            if slug.endswith(ext):
                slug = slug[:-len(ext)]
        if slug.startswith("scenario_"):
            slug = slug[9:]

        workspace_dir, extract_target = ensure_workspace_dir(slug)
        if extract_target.exists():
            safe_clean_dir(extract_target)
        extract_target.mkdir(parents=True, exist_ok=True)

        print(f"[*] Extracting scenario archive: {p.name} -> {extract_target}...")
        with tarfile.open(p, "r:*") as tar:
            tar.extractall(path=extract_target)

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
        if p.name in ("scenario.yaml", "scenario.yml"):
            slug = p.parent.name
        else:
            slug = p.stem
            if slug.endswith(".scenario"):
                slug = slug[:-9]
        return slug, p, p.parent

    print(f"\033[1;31m[-] Error: Unsupported scenario format: {p}\033[0m")
    sys.exit(1)


def compile_scenario_to_compose(scenario_path: Path, working_dir: Path, scenario_name: str) -> tuple[Path, str]:
    workspace_dir, _ = ensure_workspace_dir(scenario_name)

    with open(scenario_path, "r") as f:
        data = yaml.safe_load(f)

    scenario_meta = data.get("scenario", {})
    actual_name = scenario_meta.get("name", scenario_name)
    out_compose_file = workspace_dir / f"docker-compose.{actual_name}.yml"

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

        if "build" in svc_conf:
            build_spec = svc_conf["build"].copy() if isinstance(svc_conf["build"], dict) else {"context": svc_conf["build"]}
            ctx = build_spec.get("context", ".")
            if not os.path.isabs(ctx):
                build_spec["context"] = str((MATRIX_ROOT / ctx).resolve())
            service["build"] = build_spec
        elif "image" in svc_conf:
            service["image"] = svc_conf["image"]

        service["container_name"] = svc_conf.get("container_name", f"matrix-{svc_key}")
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

        # Preserve & Anchor Volume Mounts (SSFS pack:// resolution)
        if "volumes" in svc_conf:
            anchored_volumes = []
            for v in svc_conf["volumes"]:
                if isinstance(v, str) and v.startswith("pack://"):
                    # Strip 'pack://' prefix first to avoid splitting on the scheme colon
                    sub_str = v[len("pack://"):]
                    pack_path, *mount_opts = sub_str.split(":")
                    resolved_host_path = resolve_pack_path(f"pack://{pack_path}")
                    anchored_volumes.append(":".join([resolved_host_path] + mount_opts))
                elif isinstance(v, str) and (v.startswith("./") or v.startswith("../")):
                    parts = v.split(":")
                    rel_candidate = (working_dir / parts[0]).resolve()
                    parts[0] = str(rel_candidate if rel_candidate.exists() else (MATRIX_ROOT / parts[0]).resolve())
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

        for extra_key in ("ipc", "shm_size", "devices", "network_mode", "pid"):
            if extra_key in svc_conf:
                service[extra_key] = svc_conf[extra_key]

        if "networks" in svc_conf:
            raw_node_nets = svc_conf["networks"]
            if isinstance(raw_node_nets, list):
                service["networks"] = raw_node_nets
            elif isinstance(raw_node_nets, dict):
                normalized_nets = {}
                for net_k, net_v in raw_node_nets.items():
                    if isinstance(net_v, dict):
                        net_entry = {}
                        if "ip" in net_v:
                            net_entry["ipv4_address"] = net_v["ip"]
                        elif "ipv4_address" in net_v:
                            net_entry["ipv4_address"] = net_v["ipv4_address"]
                        normalized_nets[net_k] = net_entry
                    else:
                        normalized_nets[net_k] = net_v
                service["networks"] = normalized_nets

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

    return out_compose_file, actual_name


def load_scenario(target_input: str):
    scenario_name, yaml_path, working_dir = resolve_scenario_yaml(target_input)
    compose_file, actual_name = compile_scenario_to_compose(yaml_path, working_dir, scenario_name)

    print("\033[1;36m================================================================================\033[0m")
    print(f"\033[1;37m        LAUNCHING SOVEREIGN SCENARIO: {actual_name}                           \033[0m")
    print("\033[1;36m================================================================================\033[0m")
    print(f"[*] Resolved Topology : {yaml_path}")
    print(f"[*] SSFS Manifest     : {compose_file}")

    cmd = [
        "docker", "compose",
        "--project-directory", str(MATRIX_ROOT),
        "-p", f"matrix_{actual_name}",
        "-f", str(compose_file),
        "up", "-d"
    ]

    res = subprocess.run(cmd, cwd=str(MATRIX_ROOT))
    if res.returncode == 0:
        print(f"\n\033[1;32m[+] Scenario '{actual_name}' is LIVE across custom networks & volumes!\033[0m")
        print("\033[1;36m================================================================================\033[0m")
    else:
        print(f"\033[1;31m[-] Launch failed with code {res.returncode}\033[0m")
        sys.exit(res.returncode)


def teardown_scenario(scenario_name: str = None):
    if not scenario_name:
        for ws in WORKSPACE_BASE.glob("*"):
            if ws.is_dir():
                for f in ws.glob("docker-compose.*.yml"):
                    s_name = f.stem.replace("docker-compose.", "")
                    print(f"[*] Dismantling scenario project: matrix_{s_name}...")
                    subprocess.run([
                        "docker", "compose",
                        "--project-directory", str(MATRIX_ROOT),
                        "-p", f"matrix_{s_name}",
                        "-f", str(f),
                        "down", "--remove-orphans"
                    ], cwd=str(MATRIX_ROOT))
                safe_clean_dir(ws)
        return

    print(f"[*] Dismantling scenario project: matrix_{scenario_name}...")
    workspace_dir = SentinelPathResolver.resolve_scenario_workspace(scenario_name)
    compose_file = workspace_dir / f"docker-compose.{scenario_name}.yml"

    if compose_file.exists():
        subprocess.run([
            "docker", "compose",
            "--project-directory", str(MATRIX_ROOT),
            "-p", f"matrix_{scenario_name}",
            "-f", str(compose_file),
            "down", "--remove-orphans"
        ], cwd=str(MATRIX_ROOT))
    else:
        try:
            resolved_slug, yaml_path, working_dir = resolve_scenario_yaml(scenario_name)
            temp_compose, actual_name = compile_scenario_to_compose(yaml_path, working_dir, resolved_slug)
            subprocess.run([
                "docker", "compose",
                "--project-directory", str(MATRIX_ROOT),
                "-p", f"matrix_{actual_name}",
                "-f", str(temp_compose),
                "down", "--remove-orphans"
            ], cwd=str(MATRIX_ROOT))
        except Exception:
            subprocess.run([
                "docker", "compose",
                "--project-directory", str(MATRIX_ROOT),
                "-p", f"matrix_{scenario_name}",
                "down", "--remove-orphans"
            ], cwd=str(MATRIX_ROOT))

    if workspace_dir.exists():
        safe_clean_dir(workspace_dir)
    print(f"\033[1;32m[+] Scenario '{scenario_name}' dismantled successfully.\033[0m")


def status_scenario(scenario_name: str = None):
    if scenario_name:
        workspace_dir = SentinelPathResolver.resolve_scenario_workspace(scenario_name)
        compose_file = workspace_dir / f"docker-compose.{scenario_name}.yml"
        if compose_file.exists():
            subprocess.run([
                "docker", "compose",
                "--project-directory", str(MATRIX_ROOT),
                "-p", f"matrix_{scenario_name}",
                "-f", str(compose_file),
                "ps"
            ], cwd=str(MATRIX_ROOT))
            return

    subprocess.run(["docker", "ps", "--filter", "name=matrix-", "--format", "table {{.Names}}\t{{.Status}}\t{{.Ports}}\t{{.Networks}}"])


def main():
    parser = argparse.ArgumentParser(description="Sentinel-Matrix Universal Scenario Orchestrator (SSFS Connected)")
    sub = parser.add_subparsers(dest="action")

    load_p = sub.add_parser("load", help="Load scenario (supports slug, directory, or .yaml)")
    load_p.add_argument("target", help="Scenario slug name, folder path, or yaml file")

    down_p = sub.add_parser("down", help="Tear down scenario")
    down_p.add_argument("--name", default=None, help="Scenario name to tear down")

    stat_p = sub.add_parser("status", help="Display running scenario containers")
    stat_p.add_argument("--name", default=None, help="Scenario name to filter")

    args = parser.parse_args()

    if args.action == "load":
        load_scenario(args.target)
    elif args.action == "down":
        teardown_scenario(args.name)
    elif args.action == "status":
        status_scenario(args.name)
    else:
        parser.print_help()


if __name__ == "__main__":
    main()