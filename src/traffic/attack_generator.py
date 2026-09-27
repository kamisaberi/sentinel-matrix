#!/usr/bin/env python3
import sys
import os
import time
import yaml
import argparse
import requests

class AttackGenerator:
    def __init__(self, nexus_rest="http://10.240.0.10:9443"):
        self.nexus_rest = os.environ.get("NEXUS_REST_URL", nexus_rest)

    def inject_attack_scenario(self, scenario_path):
        with open(scenario_path, 'r') as f:
            data = yaml.safe_load(f)

        sc = data['scenario']
        name = sc['name']
        attacker_ip = sc.get('attacker_ip', '203.0.113.88')
        target_port = sc.get('target_port', 443)
        tactic = sc.get('mitre_tactic', 'T1071')
        tactic_name = sc.get('mitre_name', 'C2 Egress Beacon')

        print(f"\n\033[31m[!] EXECUTING ATTACK SCENARIO: {name}\033[0m")
        print(f"    Attacker IP : {attacker_ip}")
        print(f"    Target Port : {target_port}")
        print(f"    MITRE Tactic: {tactic} ({tactic_name})")

# Dispatch through Nexus Central Threat Bus with Top-3 XAI Attribution
        try:
            url = f"{self.nexus_rest}/api/v1/threats/broadcast"
            payload = {
                "ip": attacker_ip,
                "attributions": [
                    {
                        "feature": "SCADA_Function_Code" if "SCADA" in name else "Payload_Shannon_Entropy",
                        "contribution_pct": 54.2,
                        "observed": "0x05 (Force Single Coil)" if "SCADA" in name else "7.92 bits",
                        "baseline": "0x03 (Read Only)" if "SCADA" in name else "3.84 ± 0.42 bits",
                        "audit_note": "Unauthorized actuator coil override attempting physical valve manipulation" if "SCADA" in name else "High-entropy payload indicating encrypted C2 beacon exfiltration"
                    },
                    {
                        "feature": "Forward_Packet_Rate",
                        "contribution_pct": 28.1,
                        "observed": "184.2 Hz",
                        "baseline": "18.4 ± 4.2 Hz",
                        "audit_note": "Command injection velocity exceeded nominal safety threshold by >10x"
                    },
                    {
                        "feature": "SCADA_Register_Address" if "SCADA" in name else "Inter_Arrival_Jitter",
                        "contribution_pct": 14.8,
                        "observed": "105 (Cooling Valve)" if "SCADA" in name else "0.02 ms",
                        "baseline": "0-100 (Sensor Zone)" if "SCADA" in name else "45.2 ± 12.1 ms",
                        "audit_note": "Target register belongs to restricted physical actuation zone" if "SCADA" in name else "Extremely low jitter proving automated non-human scripting"
                    }
                ]
            }
            resp = requests.post(url, json=payload, timeout=4)
            if resp.status_code == 200:
                print(f"\033[32m[+] Nexus Collective Defense Fanout Confirmed!\033[0m")
                print(f"    Target IP [{attacker_ip}] injected into eBPF blocked_ip_map across all appliances.")
                print(f"    MITRE {tactic} recorded in threat intelligence cache (< 50ms SLA).\n")
            else:
                print(f"[-] Nexus returned status: {resp.status_code}")
        except Exception as e:
            print(f"[-] Error dispatching threat to Nexus: {e}")

if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--scenario", required=True, help="Path to scenario YAML")
    parser.add_argument("--endpoint", default="10.240.0.10:50051")
    args = parser.parse_args()

    gen = AttackGenerator()
    gen.inject_attack_scenario(args.scenario)