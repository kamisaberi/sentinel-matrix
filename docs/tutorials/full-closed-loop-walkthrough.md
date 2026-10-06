# End-to-End Walkthrough: Attack $\to$ Mitigation $\to$ Retrain $\to$ Hot-Reload

This tutorial demonstrates the complete closed-loop lifecycle of the Aryorithm ecosystem inside `sentinel-matrix`. Within **60 seconds**, an adversary launches a novel exploit, an edge appliance mitigates the attack in kernel space, Nexus curates training data, Forge retrains weights, and the edge fleet hot-reloads the updated model without packet loss.

---

## 1. Test Execution Sequence

```text
 [ Step 1: Launch Grid & Open Terminal TUI ]
    $ make up && make tui
                       │
                       ▼
 [ Step 2: Trigger Zero-Day Attack from Adversary (.99) ]
    $ make attack-modbus
    -> In-Kernel XDP Filter drops attack on Node 01 in 0.81 µs.
    -> Threat score lies in uncertainty boundary (0.52).
                       │
                       ▼
 [ Step 3: Nexus Dataset Curator Packages Batch ]
    -> Ingests boundary flow into forge_dataset_*.csv.
    -> Writes to /shared/datasets/.
                       │
                       ▼
 [ Step 4: Forge Executes Continual Adaptation Loop ]
    -> forge_watcher.py detects batch via inotify.
    -> Trains TabularMAE across 5 epochs (MAE + InfoNCE).
    -> Passes Golden Attacks Safety Gate (100% Score: 52/52).
    -> Compiles PyTorch -> network_threat_v2.onnx.
                       │
                       ▼
 [ Step 5: Nexus Promotes Model to Canary ]
    -> Stages model via POST /api/v1/ota/stage.
    -> Node 01 executes in-memory atomic pointer swap (< 50ms).
                       │
                       ▼
 [ Step 6: Parity Confirmation ]
    -> Re-launching the attack yields confidence score > 0.95!
```

---

## 2. Step-by-Step Command Walkthrough

### Terminal 1: Launch Matrix & Open Dashboard
```bash
cd /opt/sentinel-matrix
make up
make tui
```

### Terminal 2: Trigger the Live Adversary Attack
```bash
make attack-modbus
```

### Observation in Terminal 1 (TUI Dashboard):
1. **Under 1 Millisecond:** `sentinel-node-01` increments its drop counter. The XAI panel renders the root-cause deviation (`MODBUS_REGISTER_SETPOINT_40001` delta: $+7{,}750\,\text{PSI}$).
2. **At 15 Seconds:** The bottom status bar indicates: `DatasetCurator: Packaged 5,000 samples to /shared/datasets/`.
3. **At 35 Seconds:** The TUI logs: `Forge: Candidate weights verified by Safety Gate (52/52). Compiled to ONNX Opset 17.`
4. **At 45 Seconds:** Nexus promotes the model: `OTA Canary: Node 01 hot-reloaded to network_threat_v2.onnx (0.00ms downtime).`

