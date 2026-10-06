# Injecting $> 1{,}000\,\mu\text{s}$ SLA Latency Breaches (`make chaos-latency`)

To verify that `RollbackGuard` on `sentinel-nexus` automatically aborts degraded neural network deployments, `sentinel-matrix` provides a command to inject artificial compute latency into the active Canary edge node.

---

## 1. Latency Injection Command

Execute the chaos injection target from the host repository:

```bash
make chaos-latency
```

---

## 2. What `make chaos-latency` Executes Under the Hood

```bash
# Injects a 1,420 µs compute sleep into sentinel-node-01
docker exec -it sentinel-node-01 sentinel \
    --inject-chaos latency \
    --delay-microseconds 1420 \
    --duration-seconds 30
```

---

## 3. Observation in the Dashboard

```text
 ┌─────────────────────────────────────────────────────────────┐
 │ CANARY NODE SLA MONITOR (sentinel-node-01)                  │
 ├─────────────────────────────────────────────────────────────┤
 │ t = 00s : Latency = 0.82 µs  ──► NOMINAL (< 1.0 ms SLA)     │
 │ t = 05s : Latency = 1420.0 µs──► SLA BREACH DETECTED! (Tick 1)
 │ t = 10s : Latency = 1421.5 µs──► SLA BREACH CONTINUED (Tick 2)
 │ t = 15s : Latency = 1419.8 µs──► 3RD BREACH: ROLLBACK GUARD!│
 └─────────────────────────────────────────────────────────────┘
```

When three consecutive heartbeat reports breach the $1{,}000\,\mu\text{s}$ ceiling, `RollbackGuard` trips the automated abort circuit.

