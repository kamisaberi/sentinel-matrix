#!/usr/bin/env python3
import sys
import time
import yaml
import argparse
import grpc

sys.path.append("/app/generated")
sys.path.append("/home/kami/sentinel-nexus/tools/mock_appliance/generated")

import intelligence_pb2
import intelligence_pb2_grpc

class AttackGenerator:
    def __init__(self, nexus_endpoint="172.28.0.10:50051"):
        self.channel = grpc.insecure_channel(nexus_endpoint)
        self.intel_stub = intelligence_pb2_grpc.IntelligenceServiceStub(self.channel)

    def inject_attack_scenario(self, scenario_path):
        with open(scenario_path, 'r') as f:
            data = yaml.safe_load(f)

        sc = data['scenario']
        name = sc['name']
        attacker_ip = sc.get('attacker_ip', '198.51.100.44')
        target_port = sc.get('target_port', 502)
        tactic = sc.get('mitre_tactic', 'T0855')

        print(f"\n\033[31m[!] EXECUTING ATTACK SCENARIO: {name}\033[0m")
        print(f"    Attacker IP : {attacker_ip}")
        print(f"    Target Port : {target_port}")
        print(f"    MITRE Tactic: {tactic}")

        t_type = intelligence_pb2.THREAT_SCADA_ANOMALY
        if "C2" in name:
            t_type = intelligence_pb2.THREAT_C2_BEACON
        elif "Exploit" in name:
            t_type = intelligence_pb2.THREAT_EXPLOIT_PAYLOAD

        def stream_threat():
            yield intelligence_pb2.ThreatIndicator(
                origin_node_id="SIMULATED-EDGE-PROBE",
                attacker_ip=attacker_ip,
                port=target_port,
                type=t_type,
                confidence=0.99,
                timestamp_ns=time.time_ns()
            )
            time.sleep(1)

        rule_stream = self.intel_stub.SyncCollectiveImmunity(stream_threat())
        for rule in rule_stream:
            print(f"\033[32m[+] Nexus Collective Fanout Confirmed: Rule {rule.rule_id} -> Blocked {rule.target_ip}\033[0m")
            break

if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--scenario", required=True, help="Path to scenario YAML")
    parser.add_argument("--endpoint", default="172.28.0.10:50051")
    args = parser.parse_args()

    gen = AttackGenerator(args.endpoint)
    gen.inject_attack_scenario(args.scenario)