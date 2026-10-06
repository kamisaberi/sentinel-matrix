# Simulating an Electrical Substation Blackout Attack (Industroyer2)

This tutorial demonstrates how `sentinel-matrix` simulates and neutralizes a high-voltage electrical grid sabotage attempt by replaying authentic **Industroyer2 (CrashOverride)** IEC 60870-5-104 packets targeting Substation Alpha (`sentinel-node-01`).

---

## 1. Attack Mechanics in the Testbed

```text
 [ sentinel-traffic (10.240.0.50) ]
                 │
                 ▼ Replays authentic industroyer_iec104.pcap
 ┌─────────────────────────────────────────────────────────────┐
 │ 1. TCP Port 2404 Handshake (STARTDT Act / Con)              │
 │ 2. General Interrogation: Maps Information Object Addresses │
 │ 3. ASDU Type 46 (Double Command):                           │
 │    IOA 1124 (Feeder Breaker) -> Command: DCS=1 (OPEN)       │
 └──────────────────────────────┬──────────────────────────────┘
                                │ Live Wire Transmission
                                ▼
 ┌─────────────────────────────────────────────────────────────┐
 │ sentinel-node-01 (10.240.0.101: In-Kernel eBPF Filter)      │
 │  - Subsystem 18 (18_cps_sec) & libiec104_dissector.so       │
 │  - Dissects ASDU header in 0.38 µs                          │
 │  - Identifies unauthorized breaker trip command             │
 │  - Executes XDP_DROP in 0.81 µs                             │
 └─────────────────────────────────────────────────────────────┘
```

---

## 2. Executing the Replay

Run the attack replay command from the host:

```bash
make replay-industroyer
```

---

## 3. Verifying Grid Containment

Check the telemetry output on Node 01:

```bash
docker exec -it sentinel-node-01 sentinel --dump-drops
```

### Output:
```text
Target IP       Rule ID   Triggering Subsystem   Drop Count   Status
10.240.0.50     2401      18_cps_sec (IEC 104)   12 pkts      ACTIVE_DROP (0.81 µs)
```

The double-command trip frame was dropped in kernel driver memory; the virtual breaker never transitioned to open, preventing the simulated power outage.

