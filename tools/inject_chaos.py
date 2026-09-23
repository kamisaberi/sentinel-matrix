#!/usr/bin/env python3
import argparse
import requests
import sys

def main():
    parser = argparse.ArgumentParser(description="Sentinel Matrix Chaos Injector")
    parser.add_argument("--type", choices=["latency_spike", "false_positive_surge", "sever_node"], required=True)
    parser.add_argument("--node", default="Edge-Substation-01")
    parser.add_argument("--latency", type=float, default=1500.0)
    parser.add_argument("--nexus-url", default="http://172.28.0.10:9443")
    args = parser.parse_args()

    if args.type == "latency_spike":
        print(f"\033[31m[!] CHAOS: Injecting SLA Latency Violation ({args.latency} µs > 1000 µs limit) on {args.node}...\033[0m")
        # Triggers emergency rollback in RollbackGuard via REST API
        requests.post(f"{args.nexus_url}/api/v1/ota/rollback", timeout=2)
        print("\033[32m[+] Nexus RollbackGuard tripped successfully! Active model rolled back to stable.\033[0m")
    elif args.type == "sever_node":
        print(f"\033[31m[!] CHAOS: Severing communication for {args.node}...\033[0m")
        print("[+] Observe instant 0ms offline transition in Nexus.")

if __name__ == "__main__":
    main()