# Verifying Automated RollbackGuard Aborts

This test validates that when a candidate model breaches line-rate SLAs during the Canary phase, `sentinel-nexus` reverts the Canary cohort back to the verified baseline model in **under $50\,\text{milliseconds}$**.

---

## 1. Rollback Execution Sequence

```text
 [ Latency Injection Active on sentinel-node-01 (> 1000 µs) ]
                            │
                            ▼ Heartbeat Telemetry (current_drop_latency_us: 1420)
 ┌─────────────────────────────────────────────────────────────┐
 │ sentinel-nexus: RollbackGuard.cpp                           │
 │  - Traps 3rd consecutive SLA violation                      │
 │  - Transitions state: CANARY_5_PCT -> ROLLED_BACK           │
 └──────────────────────────┬──────────────────────────────────┘
                            │
                            ▼ Broadcasts Rollback Command (< 50ms Bus)
 ┌─────────────────────────────────────────────────────────────┐
 │ sentinel-node-01 In-Memory Hot Reload                       │
 │  - Discards candidate v2 model                              │
 │  - Executes atomic pointer swap to network_threat_v1.onnx   │
 └──────────────────────────┬──────────────────────────────────┘
                            │
                            ▼ Latency Restored
 [ Normal In-Kernel Mitigation Resumed: 0.81 µs ]
```

---

## 2. Automated Test Assertion (`tests/test_rollback_guard.py`)

Run the automated validation script:

```bash
python3 tests/test_rollback_guard.py
```

### Expected Output
```text
[*] Starting Canary OTA Rollout to STAGE_CANARY_5_PCT...
[*] Staging candidate model (network_threat_v2_canary.onnx) to node-01...
[*] Injecting 1420µs latency spike into node-01...
[!] [t=15.2s] RollbackGuard triggered: Reason = LATENCY_SLA_BREACH!
[+] [t=15.3s] Verified node-01 active model reverted to network_threat_v1.onnx
[+] [t=15.4s] Observed node-01 latency restored to 0.81 µs (< 0.84 µs SLA).
[PASS] Automated RollbackGuard Circuit Fully Validated!
```

