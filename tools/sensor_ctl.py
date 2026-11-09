#!/usr/bin/env python3
"""
ARYORITHM MASTER SENSOR CONTROLLER (aryo sensor)
Catalogs, inspects, and injects physical chaos across 550+ industrial sensors.
"""
import sys
import yaml
import json
import urllib.request
from pathlib import Path

CATALOG_DIR = Path("/home/kami/sentinel-matrix/catalogs/sensors")
REST_FAULT_URL = "http://localhost:8088/fault"

GREEN = "\033[1;32m"
CYAN = "\033[1;36m"
YELLOW = "\033[1;33m"
RED = "\033[1;31m"
RESET = "\033[0m"

def cmd_list():
    profiles = sorted(list(CATALOG_DIR.glob("*.yaml")))
    print(f"{CYAN}========================================================================================================{RESET}")
    print(f"\033[1;37m        ARYORITHM SENSOR CATALOG: 550+ INDUSTRIAL ASSET ARCHETYPES                      {RESET}")
    print(f"{CYAN}========================================================================================================{RESET}")
    print(f"{'SENSOR ID':<24} {'CATEGORY':<12} {'VENDOR':<16} {'PORT':<8} {'PROTOCOL':<12} {'PHYSICS ENGINE'}")
    print("-" * 104)

    for p in profiles:
        try:
            with open(p) as f:
                prof = yaml.safe_load(f)
            s_id = prof.get("sensor_id", p.stem)
            cat = prof.get("category", "UNKNOWN")
            vendor = prof.get("vendor", "Generic")
            port = prof.get("default_port", 15501)
            proto = prof.get("target_protocol", "MODBUS_TCP")
            engine = prof.get("physics", {}).get("engine", "generic_ode")
            print(f"{s_id:<24} {cat:<12} {vendor:<16} {port:<8} {proto:<12} {GREEN}{engine}{RESET}")
        except Exception:
            pass

    print("-" * 104)
    print(f"[+] Total Cataloged Sensor Profiles: {len(profiles)} | Add to scenario: {YELLOW}aryo scenario add <scen> <sensor_id>{RESET}")
    print(f"{CYAN}========================================================================================================{RESET}")

def cmd_inspect(sensor_id):
    target_yaml = CATALOG_DIR / f"{sensor_id}.yaml"
    if not target_yaml.exists():
        matches = list(CATALOG_DIR.glob(f"*{sensor_id}*.yaml"))
        if matches:
            target_yaml = matches[0]
        else:
            print(f"{RED}[-] Error: Sensor profile '{sensor_id}' not found in {CATALOG_DIR}{RESET}")
            sys.exit(1)

    with open(target_yaml) as f:
        prof = yaml.safe_load(f)

    print(f"{CYAN}================================================================================{RESET}")
    print(f"\033[1;37m        SENSOR INSPECTION: {prof.get('sensor_id')} ({prof.get('model', 'Profile')})        {RESET}")
    print(f"{CYAN}================================================================================{RESET}")
    print(f"Vendor          : {prof.get('vendor')} (Category: {prof.get('category')})")
    print(f"Wire Protocol   : {prof.get('target_protocol')} (Default Port: :{prof.get('default_port')})")
    print(f"Physics Engine  : {GREEN}{prof.get('physics', {}).get('engine')}{RESET}")
    print(f"Baseline Value  : {prof.get('physics', {}).get('baseline_value')} (Noise Sigma: {prof.get('physics', {}).get('noise_sigma', 0.01)})")

    regs = prof.get("registers", {}).get("holding_registers", {})
    if regs:
        print("\n\033[1m[Modbus Holding Registers]:\033[0m")
        for addr, meta in regs.items():
            print(f"  • Register {addr:<6} -> {meta.get('name'):<18} ({meta.get('type')}, Unit: {meta.get('unit')})")

    hooks = prof.get("fault_hooks", [])
    if hooks:
        print("\n\033[1m[Available Chaos/Fault Injection Hooks]:\033[0m")
        for h in hooks:
            print(f"  • Trigger: {YELLOW}{h.get('id'):<24}{RESET} Action: {h.get('action')}")

    print(f"{CYAN}================================================================================{RESET}")

def cmd_fault(sensor_id, action, value=0.0):
    payload = json.dumps({"sensor_id": sensor_id, "action": action, "value": float(value)}).encode("utf-8")
    req = urllib.request.Request(REST_FAULT_URL, data=payload, headers={"Content-Type": "application/json"})
    try:
        with urllib.request.urlopen(req, timeout=3) as resp:
            data = resp.read().decode("utf-8")
            print(f"{GREEN}[+] Chaos Injected Successfully into Live Sensor Multiplexer!{RESET}")
            print(f"    Target: {sensor_id} | Action: {action} | Value Modifier: {value}")
            print(f"    REST Response: {data}")
    except Exception as exc:
        print(f"{RED}[-] Error connecting to Multiplexer Fault Hook ({REST_FAULT_URL}): {exc}{RESET}")
        print("    Ensure the multiplexer is running: python3 /home/kami/sentinel-matrix/tools/sensor_multiplexer.py")
        sys.exit(1)

def main():
    if len(sys.argv) < 2 or sys.argv[1] in ("-h", "--help"):
        print("Usage: aryo sensor <list|inspect|fault> [arguments]")
        sys.exit(0)

    cmd = sys.argv[1]
    if cmd == "list":
        cmd_list()
    elif cmd == "inspect" and len(sys.argv) >= 3:
        cmd_inspect(sys.argv[2])
    elif cmd == "fault" and len(sys.argv) >= 4:
        val = sys.argv[4] if len(sys.argv) >= 5 else 0.0
        cmd_fault(sys.argv[2], sys.argv[3], val)
    else:
        print(f"[-] Invalid sensor command. Run 'aryo sensor --help'.")
        sys.exit(1)

if __name__ == "__main__":
    main()