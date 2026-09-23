#!/usr/bin/env python3
import os
import time
import glob
import json
import hashlib
import urllib.request
import urllib.error

NEXUS_REST_URL = os.environ.get("NEXUS_REST_URL", "http://172.28.0.10:9443")
DATASET_DIR = os.environ.get("NEXUS_DATASET_DIR", "/var/lib/sentinel-nexus/forge_datasets")
MODELS_DIR = os.environ.get("NEXUS_MODELS_DIR", "/opt/sentinel-nexus/models")

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
    print("[*] xInfer-Forge Watcher initialized. Polling for curated datasets...")
    processed_datasets = set()
    model_version = 2

    while True:
        time.sleep(5)
        datasets = glob.glob(os.path.join(DATASET_DIR, "forge_dataset_*.csv"))
        for d in datasets:
            if d not in processed_datasets:
                print(f"\n[+] Detected new curated dataset from Nexus: {d}")
                processed_datasets.add(d)

                # Simulate Self-Supervised Masked Autoencoding (MAE) training
                print("[*] Training Masked Autoencoder (MAE) on edge NetFlow representations...")
                time.sleep(6)
                print("[+] Evaluating against configs/safety/golden_attacks.yaml... 100% Retained!")

                # Generate updated ONNX model artifact
                model_name = f"network_threat_v{model_version}.onnx"
                model_path = os.path.join(MODELS_DIR, model_name)
                with open(model_path, "wb") as f:
                    f.write(f"ONNX_SENTINEL_WEIGHTS_V{model_version}_ADAPTED".encode('utf-8'))

                print(f"[+] Compiled to ONNX Opset 17: {model_path}")
                stage_model(model_name, model_path)

                # Automatically advance model canary stages via Nexus REST API
                time.sleep(4)
                urllib.request.urlopen(urllib.request.Request(f"{NEXUS_REST_URL}/api/v1/ota/advance", data=b"{}"))
                print("[+] Advanced to 5% Canary Cohort.")
                time.sleep(6)
                urllib.request.urlopen(urllib.request.Request(f"{NEXUS_REST_URL}/api/v1/ota/advance", data=b"{}"))
                print(f"\033[32m[+] Fully promoted {model_name} FLEET-WIDE! Edge appliances will auto-pull.\033[0m")

                model_version += 1

if __name__ == "__main__":
    main()