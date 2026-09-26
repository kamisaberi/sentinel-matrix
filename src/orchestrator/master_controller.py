#!/usr/bin/env python3
import time
import os
import sys

sys.path.insert(0, "/app")
sys.path.insert(0, "/app/src")
sys.path.insert(0, "/app/generated")

from traffic.omniflow_engine import OmniFlowEngine

def main():
    cfg_path = "/configs/traffic/omniflow.yaml"
    if not os.path.exists(cfg_path):
        cfg_path = os.path.join(os.path.dirname(__file__), "../../configs/traffic/omniflow.yaml")

    engine = OmniFlowEngine(cfg_path)
    try:
        engine.start_all()
    except KeyboardInterrupt:
        print("[*] OmniFlow stopping...")
        engine.stop()

if __name__ == "__main__":
    main()