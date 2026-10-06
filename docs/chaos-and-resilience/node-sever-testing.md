# Node Sever Testing & Liveness Grace Expiration (`make chaos-sever`)

This tutorial evaluates how the central fleet command plane handles abrupt network or hardware failure (e.g., power loss, cut fiber line, or host hypervisor crash).

---

## 1. Severing an Edge Node

Execute the sever command:

```bash
make chaos-sever
```

### What `make chaos-sever` Executes:
```bash
# Forcefully kills container without allowing signal traps to fire
docker kill -s SIGKILL sentinel-node-02
```

---

## 2. Observation of Cascading State Transitions

Because `sentinel-node-02` was terminated via `SIGKILL`, it cannot send a graceful disconnect notice. `sentinel-nexus` tracks the liveness grace window:

```text
 t = 00s: Last valid heartbeat received.
 t = 05s: Missed Heartbeat 1 (Grace Counter = 1)
 t = 10s: Missed Heartbeat 2 (Grace Counter = 2)
 t = 15s: Missed Heartbeat 3 (Grace Counter = 3) ──► TIMEOUT REACHED!
          Nexus marks sentinel-node-02 as UNREACHABLE.
          All attached sensors transition to INHERITED_OFFLINE.
```

Inspect the node status via `nexus-ctl`:

```bash
docker exec -it sentinel-nexus nexus-ctl fleet list
```

### Output:
```text
NODE UUID          STATUS        DROPS   SLA
sentinel-node-01   ONLINE        14,209  0.82 µs
sentinel-node-02   UNREACHABLE    8,412  ---       <-- Marked UNREACHABLE!
sentinel-node-03   ONLINE         1,094  0.84 µs
```

