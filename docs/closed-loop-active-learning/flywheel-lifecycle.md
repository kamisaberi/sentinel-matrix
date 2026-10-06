# Closed-Loop Active Learning Flywheel Lifecycle

In `sentinel-matrix`, the entire continual learning lifecycle—from edge packet evaluation to active learning dataset curation, self-supervised retraining, safety validation, and canary hot-reloads—executes as an automated loop across the `10.240.0.0/24` mesh.

---

## 1. Flywheel Phase Interaction

```text
 ┌─────────────────────────────────────────────────────────────┐
 │ PHASE 1: UNCERTAINTY INGESTION (Edge Nodes .101 - .103)     │
 │  - Real traffic evaluated by network_threat_v1.onnx         │
 │  - Boundary vectors (Score ∈ [0.40, 0.60]) streamed to Nexus │
 └──────────────────────────────┬──────────────────────────────┘
                                │ gRPC Port 50051 Stream
                                ▼
 ┌─────────────────────────────────────────────────────────────┐
 │ PHASE 2: BATCH CURATION (sentinel-nexus .10)                │
 │  - DatasetCurator.cpp packages 5,000 ambiguous flows        │
 │  - Writes forge_dataset_<uuid>.csv to /shared/datasets/     │
 └──────────────────────────────┬──────────────────────────────┘
                                │ Inotify Event (IN_CLOSE_WRITE)
                                ▼
 ┌─────────────────────────────────────────────────────────────┐
 │ PHASE 3: SELF-SUPERVISED ADAPTATION (sentinel-forge .20)    │
 │  - Trains TabularMAE across 5 epochs (30% Masking + InfoNCE)│
 │  - Evaluates Golden Attacks Safety Gate (Requires 100% Pass)│
 └──────────────────────────────┬──────────────────────────────┘
                                │ Compiles to network_threat_v2.onnx
                                ▼
 ┌─────────────────────────────────────────────────────────────┐
 │ PHASE 4: CANARY STAGING & HOT-RELOAD (sentinel-nexus .10)   │
 │  - Stages model via POST /api/v1/ota/stage                  │
 │  - Promotes: SHADOW_MODE -> CANARY_5_PCT -> FLEET_WIDE      │
 │  - Edge nodes hot-reload weights via atomic pointer swap    │
 └──────────────────────────────┬──────────────────────────────┘
                                │
                                └──► Newly adapted model resolves edge cases!
```

---

## 2. Invariant Proofs

* **Autonomous Evolution:** Operates without data scientists manually labeling flows or engineering features.
* **Non-Blocking Operation:** Edge packet mitigation ($< 0.84\,\mu\text{s}$) continues uninterrupted throughout training and deployment phases.

