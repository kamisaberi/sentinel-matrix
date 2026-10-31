#!/usr/bin/env python3
import os
import time
import glob
import json
import hashlib
import urllib.request
import urllib.error

NEXUS_REST_URL = os.environ.get("NEXUS_REST_URL", "http://10.240.0.10:9443")
DATASET_DIR = os.environ.get("NEXUS_DATASET_DIR", "/var/lib/sentinel-nexus/forge_datasets")
MODELS_DIR = os.environ.get("NEXUS_MODELS_DIR", "/opt/sentinel-nexus/models")
FORGE_AUTO_RETRAIN = os.environ.get("FORGE_AUTO_RETRAIN", "false").lower() in ("true", "1", "yes")

def calculate_sha256(filepath):
    h = hashlib.sha256()
    with open(filepath, "rb") as f:
        while chunk := f.read(65536):
            h.update(chunk)
    return h.hexdigest()

def stage_model(model_name, model_path):
    sha = calculate_sha256(model_path)
    url = f"{NEXUS_REST_URL}/api/v1/ota/stage"
    payload = json.dumps({
        "version": model_name,
        "sha256": sha,
        "url": f"/models/{model_name}"
    }).encode('utf-8')

    try:
        req = urllib.request.Request(url, data=payload, headers={"Content-Type": "application/json"})
        with urllib.request.urlopen(req, timeout=5) as resp:
            data = json.loads(resp.read().decode('utf-8'))
            print(f"\033[32m[+] Model {model_name} staged successfully into Nexus! Stage: {data.get('stage')}\033[0m")
    except Exception as e:
        print(f"[-] Error staging model to Nexus: {e}")

def main():
    print("==========================================================================")
    print("        XINFER-FORGE WATCHER: CONTINUAL LEARNING CONTROLLER               ")
    print("==========================================================================")

    # HARD INVARIANT: Standby mode when auto-retrain is disabled
    if not FORGE_AUTO_RETRAIN:
        print("[*] FORGE_AUTO_RETRAIN is DISABLED (manual mode active).")
        print("[+] Automatic ONNX generation is paused. Standing by for manual 'aryo forge run' commands...")
        while True:
            time.sleep(60)

    print("[*] xInfer-Forge Watcher initialized with AUTO-RETRAIN enabled.")
    processed_datasets = set()
    model_version = 2

    while True:
        time.sleep(10)
        datasets = glob.glob(os.path.join(DATASET_DIR, "forge_dataset_*.csv"))
        for d in datasets:
            if d not in processed_datasets:
                print(f"\n[+] Processing curated dataset from Nexus: {d}")
                processed_datasets.add(d)

                model_name = "network_threat_v2_adapted.onnx"
                model_path = os.path.join(MODELS_DIR, model_name)
                with open(model_path, "wb") as f:
                    f.write(f"ONNX_SENTINEL_WEIGHTS_V{model_version}_ADAPTED".encode('utf-8'))

                print(f"[+] Output static candidate model: {model_path}")
                stage_model(model_name, model_path)
                model_version += 1

if __name__ == "__main__":
    main()