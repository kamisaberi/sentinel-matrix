#!/usr/bin/env python3
import time
import os
import sys
import glob

# Ensure Python locates all simulation modules and compiled protobuf stubs
sys.path.insert(0, "/app")
sys.path.insert(0, "/app/src")
sys.path.insert(0, "/app/generated")

from traffic.ambient_generator import AmbientFlowGenerator
from traffic.attack_generator import AttackGenerator

def main():
    print("==================================================================")
    print("  SENTINEL-MATRIX: AUTONOMOUS FLYWHEEL ORCHESTRATOR")
    print("==================================================================")

    nexus_endpoint = os.environ.get("NEXUS_ENDPOINT", "10.240.0.10:50051")
    ambient = AmbientFlowGenerator(nexus_endpoint)
    attacker = AttackGenerator(nexus_endpoint)

    nodes = ["Edge-Substation-01", "Edge-Hospital-PACS-02", "Edge-Refinery-PLC-03"]
    cycle = 1

    while True:
        print(f"\n--- [CYCLE {cycle}] INITIATING AMBIENT TELEMETRY PHASE (45s) ---")
        end_time = time.time() + 45
        while time.time() < end_time:
            for node in nodes:
                try:
                    routed = ambient.stream_ambient_batch(node, count=25, inject_uncertainty=True)
                    if routed > 0:
                        print(f"    [Ambient] Node {node} -> Routed {routed} active learning vectors to Forge")
                except Exception as e:
                    pass
            time.sleep(3)

        print(f"\n--- [CYCLE {cycle}] INITIATING ADVERSARIAL ATTACK WAVE ---")
        scenarios = glob.glob("/configs/scenarios/0*.yaml")
        scenarios = [s for s in scenarios if "01_ambient" not in s]
        
        if scenarios:
            target_scenario = scenarios[(cycle - 1) % len(scenarios)]
            try:
                attacker.inject_attack_scenario(target_scenario)
            except Exception as e:
                print(f"[-] Attack injection notice: {e}")

        time.sleep(10)
        cycle += 1

if __name__ == "__main__":
    main()