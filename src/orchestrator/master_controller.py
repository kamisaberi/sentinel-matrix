#!/usr/bin/env python3
import time
import os
import glob
from traffic.ambient_generator import AmbientFlowGenerator
from traffic.attack_generator import AttackGenerator

def main():
    print("==================================================================")
    print("  SENTINEL-MATRIX: AUTONOMOUS FLYWHEEL ORCHESTRATOR")
    print("==================================================================")

    nexus_endpoint = os.environ.get("NEXUS_ENDPOINT", "172.28.0.10:50051")
    ambient = AmbientFlowGenerator(nexus_endpoint)
    attacker = AttackGenerator(nexus_endpoint)

    nodes = ["Edge-Substation-01", "Edge-Hospital-PACS-02", "Edge-Refinery-PLC-03"]
    cycle = 1

    while True:
        print(f"\n--- [CYCLE {cycle}] INITIATING AMBIENT TELEMETRY PHASE (45s) ---")
        end_time = time.time() + 45
        while time.time() < end_time:
            for node in nodes:
                routed = ambient.stream_ambient_batch(node, count=25, inject_uncertainty=True)
                if routed > 0:
                    print(f"    [Ambient] Node {node} -> Routed {routed} active learning vectors to Forge")
            time.sleep(3)

        print(f"\n--- [CYCLE {cycle}] INITIATING ADVERSARIAL ATTACK WAVE ---")
        scenarios = glob.glob("/configs/scenarios/0*.yaml")
        scenarios = [s for s in scenarios if "01_ambient" not in s]
        
        if scenarios:
            target_scenario = scenarios[(cycle - 1) % len(scenarios)]
            attacker.inject_attack_scenario(target_scenario)

        time.sleep(10)
        cycle += 1

if __name__ == "__main__":
    main()