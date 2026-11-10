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

# --- REPLACE cmd_list() IN tools/sensor_ctl.py ---
def cmd_list(category_filter=None, search_query=None, domain_filter=None, limit=None):
    profiles = list(CATALOG_DIR.rglob("*.yaml"))
    if not profiles:
        print(f"[-] No sensor profiles found in {CATALOG_DIR}")
        return

    # 1. Parse and extract all sensors
    sensors = []
    for p in profiles:
        try:
            with open(p, "r", encoding="utf-8") as f:
                prof = yaml.safe_load(f)
            s_id = prof.get("sensor_id", p.stem)
            
            # Extract numerical ID for sorting (s001 -> 1)
            num_match = re.search(r"s(\d+)", s_id)
            num = int(num_match.group(1)) if num_match else 9999
            
            sensors.append({
                "num": num,
                "slug": s_id,
                "name": prof.get("name", prof.get("model", s_id)),
                "category": prof.get("category", "INDUSTRIAL"),
                "domain_id": prof.get("domain_id", 0),
                "port": prof.get("default_port", 15501),
                "interface": prof.get("interface", "Modbus / Analog"),
                "engine": prof.get("physics", {}).get("engine", "generic_ode")
            })
        except Exception:
            pass

    # 2. Sort numerically (#001 -> #570)
    sensors.sort(key=lambda x: x["num"])

    # 3. Apply optional filters
    filtered = []
    for s in sensors:
        if category_filter and category_filter.upper() != s["category"].upper():
            continue
        if domain_filter and int(domain_filter) != s["domain_id"]:
            continue
        if search_query:
            q = search_query.lower()
            if q not in s["name"].lower() and q not in s["slug"].lower() and q not in s["interface"].lower():
                continue
        filtered.append(s)

    if limit:
        filtered = filtered[:int(limit)]

    # 4. Render 120-Column Aligned Table
    print(f"{CYAN}========================================================================================================================{RESET}")
    print(f"\033[1;37m                       ARYORITHM MASTER SENSOR CATALOG (570 INDUSTRIAL TELEMETRY ARCHETYPES)                            {RESET}")
    print(f"{CYAN}========================================================================================================================{RESET}")
    print(f"{'ID':<6} {'SENSOR NAME':<44} {'CATEGORY':<14} {'PORT':<8} {'INTERFACE':<26} {'PHYSICS ENGINE'}")
    print("-" * 120)

    for s in filtered:
        s_num = f"#{s['num']:03d}"
        s_name = s['name'][:42]
        s_cat = s['category'][:13]
        s_port = f":{s['port']}"
        s_iface = s['interface'][:24]
        s_engine = s['engine']
        print(f"{YELLOW}{s_num:<6}{RESET} {s_name:<44} {s_cat:<14} {s_port:<8} {s_iface:<26} {GREEN}{s_engine}{RESET}")

    print("-" * 120)
    print(f"[+] Displaying {len(filtered)} of {len(sensors)} cataloged sensors | Filters: {YELLOW}aryo sensor list [--category <c>] [--search <q>]{RESET}")
    print(f"{CYAN}========================================================================================================================{RESET}")


    
def cmd_inspect(sensor_id):
    target_yaml = CATALOG_DIR / f"{sensor_id}.yaml"
    if not target_yaml.exists():
        matches = list(CATALOG_DIR.rglob(f"*{sensor_id}*.yaml"))
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


# --- IN main() of tools/sensor_ctl.py ---
    if cmd == "list":
        cat_f, q_f, dom_f, lim_f = None, None, None, None
        for i in range(2, len(sys.argv)):
            if sys.argv[i] == "--category" and i + 1 < len(sys.argv): cat_f = sys.argv[i+1]
            elif sys.argv[i] == "--search" and i + 1 < len(sys.argv): q_f = sys.argv[i+1]
            elif sys.argv[i] == "--domain" and i + 1 < len(sys.argv): dom_f = sys.argv[i+1]
            elif sys.argv[i] == "--limit" and i + 1 < len(sys.argv): lim_f = sys.argv[i+1]
        cmd_list(cat_f, q_f, dom_f, lim_f)
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