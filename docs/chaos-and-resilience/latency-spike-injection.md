---

### File: `sentinel-matrix/docs/chaos-and-resilience/latency-spike-injection.md`

```markdown
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
```

---

### File: `sentinel-matrix/docs/chaos-and-resilience/automated-rollback-verification.md`

```markdown
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
```

---

### File: `sentinel-matrix/docs/chaos-and-resilience/node-sever-testing.md`

```markdown
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
```

---

### File: `sentinel-matrix/docs/chaos-and-resilience/instant-0ms-disconnect-validation.md`

```markdown
# Validating 0ms Instant Graceful Disconnection

Contrasting with abrupt failure (`SIGKILL`), this test proves that during routine administrative shutdowns (`SIGINT` / `systemctl stop sentinel`), the edge appliance executes an instant **0ms graceful disconnect**, eliminating the 15-second timeout delay on the central dashboard.

---

## 1. Disconnect Validation Command

Execute a graceful termination:

```bash
make chaos-disconnect
```

### What `make chaos-disconnect` Executes:
```bash
# Sends SIGTERM/SIGINT, triggering the daemon's internal signal trap
docker stop -t 5 sentinel-node-01
```

---

## 2. Timing Analysis & Confirmation

```text
 [ Host sends SIGINT to sentinel-node-01 ]
                   │
                   ▼ Linux Signal Trap Handler (0.1 ms)
 ┌─────────────────────────────────────────────────────────────┐
 │ NexusUplink::execute_instant_disconnect()                   │
 │  - Synchronous gRPC Call: DeregisterAppliance()             │
 └─────────────────┬───────────────────────────────────────────┘
                   │ Network Transit over 10.240.0.0/24 (0.8 ms)
                   ▼
 ┌─────────────────────────────────────────────────────────────┐
 │ sentinel-nexus marks node-01 as OFFLINE                     │
 │ in < 5 milliseconds (Zero Timeout Waiting)                  │
 └─────────────────────────────────────────────────────────────┘
```

Verify in the Nexus log that the status changed immediately:

```bash
docker logs --tail 20 sentinel-nexus | grep -i "disconnected"
# Output: [INFO] FleetService: Appliance sentinel-node-01 disconnected gracefully (0ms delay).
```
```

---

### File: `sentinel-matrix/docs/chaos-and-resilience/automated-recovery-testing.md`

```markdown
# Automated Recovery & Re-Enrollment Testing (`make recover`)

This test verifies that severed or rebooted edge appliances automatically re-establish communication, re-authenticate their TPM 2.0 hardware identity, and resume line-rate threat mitigation without human intervention.

---

## 1. Recovery Execution Command

Restart the severed container:

```bash
make recover
```

### What `make recover` Executes:
```bash
docker start sentinel-node-02
```

---

## 2. Re-Registration Sequence

```text
 [ Container sentinel-node-02 Boots ]
                   │
                   ▼
 ┌─────────────────────────────────────────────────────────────┐
 │ 1. Reads local configuration (/etc/sentinel/sentinel.yaml)   │
 │ 2. Validates eBPF bytecode and re-attaches xdp_filter.o     │
 │ 3. Connects to Nexus Hub (10.240.0.10:50051) via mTLS      │
 │ 4. Transmits TPM 2.0 PCR Quote challenge verification       │
 └─────────────────┬───────────────────────────────────────────┘
                   │ Re-Enrollment Accepted (< 500 ms)
                   ▼
 ┌─────────────────────────────────────────────────────────────┐
 │ sentinel-nexus transitions node-02 from UNREACHABLE to ONLINE│
 │ Subordinate sensors resume normal operational badges        │
 └─────────────────────────────────────────────────────────────┘
```

Verify that the node has returned to healthy operation:

```bash
docker exec -it sentinel-nexus nexus-ctl fleet list --status ONLINE
```

`sentinel-node-02` appears as `ONLINE` with all historical drop counters preserved.
```
