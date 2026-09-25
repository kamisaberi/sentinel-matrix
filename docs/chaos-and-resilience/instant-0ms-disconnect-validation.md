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
