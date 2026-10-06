# The Infinite Closed-Loop Adaptation Flywheel

`sentinel-matrix` acts as an automated sandbox to validate the closed-loop continual learning flywheel of the Aryorithm ecosystem. The entire lifecycle—from zero-day attack injection to in-kernel drop, uncertainty curation, self-supervised retraining, safety validation, and hot-reload—runs continuously without human intervention.

---

## 1. The 6-Step Flywheel Sequence

```text
 [ STEP 1: TRAFFIC & EXPLOIT INJECTION ]
  sentinel-traffic (.50) & sentinel-adversary (.99) blast ambient flows
  interspersed with genuine Triton, Stuxnet, and Industroyer2 attacks.
                   │
                   ▼ Wire Arrival on eth0 (10.240.0.101)
 [ STEP 2: IN-KERNEL ACTIVE MITIGATION ]
  sentinel-node-01 evaluates frames. Known threats dropped in < 0.84 µs.
  Ambiguous/unseen flow patterns produce scores in uncertainty window [0.40 - 0.60].
                   │
                   ▼ Telemetry Streamed via gRPC Port 50051
 [ STEP 3: NEXUS DATASET CURATION ]
  sentinel-nexus (.10) DatasetCurator.cpp gathers 5,000 ambiguous flows.
  Flushes forge_dataset_<uuid>.csv to /shared/datasets/.
                   │
                   ▼ Inotify Trigger (IN_CLOSE_WRITE)
 [ STEP 4: FORGE CONTINUAL RETRAINING ]
  sentinel-forge (.20) trains TabularMAE across 5 epochs (30% masking + InfoNCE).
  Audits candidate weights against configs/safety/golden_attacks.yaml.
                   │
                   ▼ Safety Verified (100% Pass) -> Compiles ONNX Opset 17
 [ STEP 5: NEXUS REST STAGING & CANARY ENFORCEMENT ]
  Forge stages network_threat_v2.onnx to Nexus REST API (POST /api/v1/ota/stage).
  Nexus initiates staged rollout: SHADOW_MODE -> CANARY_5_PCT.
                   │
                   ▼ Broadcast via Collective Defense Bus (< 50ms)
 [ STEP 6: ZERO-DOWNTIME EDGE HOT-RELOAD ]
  sentinel-node-01 through node-03 hot-reload weights via atomic pointer swap.
  The newly adapted model now flags previously ambiguous flows as clear threats!
 -------------------------------------------------------------------------------
 TOTAL FLYWHEEL CYCLE DURATION: ~35 to 55 Seconds (Fully Autonomous)
```

---

## 2. Invariant Validation

* **No Regression:** During Step 4, if candidate weights miss even a single historical attack, Forge's automated purge circuit deletes the weights, preserving edge fleet stability.
* **Zero Downtime:** Edge nodes never stop inspecting packets; the in-kernel eBPF filter continues evaluating traffic while user-space models hot-reload.

