# Chaos Engineering & Resilience Testing in the Cyber-Range

In critical infrastructure and defense deployments, automated safety mechanisms must be verified under adversarial stress conditions before being trusted on physical power grids or industrial pipelines. 

`sentinel-matrix` incorporates a dedicated **Chaos Engineering Sub-Framework** to validate automated fail-safes, rollback circuits, and fault isolation mechanisms.

---

## 1. Chaos Engineering Pillars

```text
 ┌─────────────────────────────────────────────────────────────┐
 │ SENTINEL-MATRIX CHAOS ENGINE                                │
 ├─────────────────────────────────────────────────────────────┤
 │ 1. Latency Spike Injection    : make chaos-latency          │
 │    Forces artificial >1000µs delays on Canary nodes         │
 │ 2. Abrupt Link Severing       : make chaos-sever            │
 │    Kills edge containers to test 15-second liveness timeout │
 │ 3. Graceful Signal Termination: make chaos-disconnect       │
 │    Sends SIGINT to test 0ms DeregistrationRequest           │
 │ 4. Corrupted Model Delivery   : make chaos-corrupt-weights  │
 │    Tests SHA-256 rejection and automated fallback           │
 └─────────────────────────────────────────────────────────────┘
```

---

## 2. Invariants Under Chaos

1. **Deterministic Safety Tripping:** An operational latency breach ($> 1{,}000\,\mu\text{s}$) or drop surge must trigger an automated rollback without operator intervention.
2. **Zero In-Kernel Leaks:** Terminating a user-space container must unhook eBPF filters from the host kernel (`xdp off`), preventing orphaned packet drops.
3. **Cascading State Accuracy:** Killing a parent node must immediately transition all connected subordinate sensors to `INHERITED_OFFLINE` without phantom polling storms.

