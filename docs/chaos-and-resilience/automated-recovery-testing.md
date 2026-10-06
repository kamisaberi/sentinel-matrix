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
