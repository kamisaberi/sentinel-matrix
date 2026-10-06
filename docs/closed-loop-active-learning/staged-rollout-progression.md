# Validating Staged Model Evolution: Shadow to Fleet-Wide

Inside `sentinel-matrix`, researchers can validate the entire staged rollout progression using live container telemetry.

---

## 1. Rollout Progression Verification

```text
 1. MODEL STAGED: network_threat_v2.onnx uploaded to Nexus (.10)
    Status: STAGE_SHADOW_MODE
    -> All nodes (.101, .102, .103) evaluate v2 in parallel without active drops.
    -> Verify: Zero divergence errors observed in TUI.
                       │
                       ▼ make advance-canary
 2. CANARY DEPLOYMENT: 5% Cohort Enforced
    Status: STAGE_CANARY_5_PCT
    -> Consistent hash assigns sentinel-node-01 (.101) to active Canary cohort.
    -> Node 01 enforces in-kernel drops using v2 weights (< 0.84 µs).
    -> Nodes 02 and 03 remain on verified v1 baseline.
                       │
                       ▼ make promote-fleet
 3. FLEET-WIDE PROMOTION: 100% Rollout
    Status: STAGE_FLEET_WIDE
    -> Nexus broadcasts model promotion across Collective Defense Bus.
    -> Nodes 02 and 03 execute in-memory hot-reload to v2 weights.
```

---

## 2. Shell Command Recipe

Control the rollout using `nexus-ctl` inside the matrix mesh:

```bash
# Check current rollout state
docker exec -it sentinel-nexus nexus-ctl ota status

# Advance to Canary 5% enforcement
docker exec -it sentinel-nexus nexus-ctl ota advance

# Verify Node 01 is enforcing Canary
docker exec -it sentinel-node-01 sentinel --health | grep "Active Model"

# Promote fleet-wide
docker exec -it sentinel-nexus nexus-ctl ota advance --force
```

