# Forge Dataset Watcher Daemon (`src/traffic/forge_watcher.py`)

The `forge_watcher.py` daemon runs inside the `sentinel-forge` container (`10.240.0.20`), monitoring the `/shared/datasets/` volume mount for batches emitted by `sentinel-nexus`.

---

## 1. Watcher Daemon Architecture

```text
 ┌─────────────────────────────────────────────────────────────┐
 │ Host Volume: /opt/sentinel-matrix/shared/datasets/          │
 └──────────────────────────────┬──────────────────────────────┘
                                │ Inotify Linux Kernel Notification
                                ▼
 ┌─────────────────────────────────────────────────────────────┐
 │ forge_watcher.py (sentinel-forge Container - 10.240.0.20)   │
 ├─────────────────────────────────────────────────────────────┤
 │ 1. Traps completed forge_dataset_*.csv files                │
 │ 2. Validates sidecar .manifest.json SHA-256 hash            │
 │ 3. Spawns forge-cli train subprocess                        │
 │ 4. Audits candidate weights via forge-cli validate-safety   │
 │ 5. Exports ONNX Opset 17 to /shared/models/                 │
 │ 6. Dispatches POST /api/v1/ota/stage to Nexus (10.240.0.10) │
 └─────────────────────────────────────────────────────────────┘
```

---

## 2. Watcher Loop Source Code (`forge_watcher.py`)

```python
import time
import subprocess
from pathlib import Path

WATCH_DIR = Path("/shared/datasets")
SAFETY_CORPUS = "/app/configs/safety/golden_attacks.yaml"
NEXUS_URL = "https://10.240.0.10:9443"

def process_batch(csv_path: Path):
    manifest_path = csv_path.with_suffix(".manifest.json")
    if not manifest_path.exists():
        return

    print(f"[*] [Forge] Ingesting new curated dataset: {csv_path.name}")
    candidate_pt = "/tmp/candidate_weights.pt"
    output_onnx = f"/shared/models/network_threat_v2_{csv_path.stem}.onnx"

    # 1. Execute Self-Supervised Training
    subprocess.run([
        "forge-cli", "train",
        "--data", str(csv_path),
        "--epochs", "5",
        "--output-checkpoint", candidate_pt
    ], check=True)

    # 2. Enforce Golden Attacks Safety Gate
    ret = subprocess.run([
        "forge-cli", "validate-safety",
        "--checkpoint", candidate_pt,
        "--safety-corpus", SAFETY_CORPUS
    ])

    if ret.returncode != 0:
        print("[!] [Forge] Safety Gate rejected candidate weights! Model purged.")
        return

    # 3. Compile to ONNX Opset 17
    subprocess.run([
        "forge-cli", "export-onnx",
        "--checkpoint", candidate_pt,
        "--output-onnx", output_onnx
    ], check=True)

    print(f"[+] [Forge] Successfully compiled and verified: {output_onnx}")

def main():
    print("[*] Forge Dataset Watcher armed on /shared/datasets/...")
    while True:
        for csv_file in WATCH_DIR.glob("forge_dataset_*.csv"):
            lock_file = WATCH_DIR / f".{csv_file.name}.lock"
            if not lock_file.exists():
                lock_file.touch()
                try:
                    process_batch(csv_file)
                finally:
                    # Move to processed archive
                    processed_dir = WATCH_DIR / "processed"
                    processed_dir.mkdir(exist_ok=True)
                    csv_file.rename(processed_dir / csv_file.name)
                    lock_file.unlink(missing_ok=True)
        time.sleep(2.0)

if __name__ == "__main__":
    main()
```

