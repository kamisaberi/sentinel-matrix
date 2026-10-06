# TUI Split-Panel Screen Layout & Navigation

The terminal dashboard uses a three-panel split design optimized for standard $80 \times 24$ terminal windows while expanding dynamically on high-resolution widescreen consoles.

---

## 1. Screen Real Estate Partitioning

```text
 ┌─ Sentinel-Matrix Cyber-Range Grid ─────────────┬─ Real-Time XAI Feature Deviations ──┐
 │ NODE UUID         IP         STATUS   DROPS    │ Rank 1: MODBUS_REG_40001 (64.2%)    │
 │ sentinel-node-01  .101       ONLINE   14,209   │  Observed: 9850 PSI | Base: 2100    │
 │ sentinel-node-02  .102       ONLINE    8,412   │  Delta: +7750 PSI [██████████████]  │
 │ sentinel-node-03  .103       ONLINE    1,094   │ Rank 2: FLOW_PACKETS_PER_SEC (23.8%)│
 │                                                │  Observed: 82000 | Base: 150        │
 │                                                │  Delta: +81850 pps [██████]         │
 ├─ MITRE ATT&CK Threat Activity ─────────────────┤ Rank 3: IAT_MEAN (12.0%)            │
 │ [02:14:00] T0855 Unauthorized Cmd (Node 01)    │  Delta: -0.012488 s [██]            │
 │ [02:14:02] T0843 Program Download (Node 03)    ├─ Global Mesh Performance ───────────┤
 │ [02:14:05] T1046 Network Discovery (Adversary) │ Active Nodes: 3/3 | Total Drops: 23k│
 └────────────────────────────────────────────────┴─ Fleet SLA Median: 0.82µs (p99: 0.84)─┘
```

---

## 2. Panel Functions

* **Left Upper (Appliance Registry):** Displays connected edge containers, IP mappings, real-time health badges, and total in-kernel drops.
* **Left Lower (MITRE Threat Feed):** Scrolling log of live attacks, detailing attack timestamp, technique ID, target node, and mitigation action (`XDP_DROP`).
* **Right Upper (XAI Explanations):** Renders the top-3 physical feature deviations for the most recent threat mitigation.
* **Right Lower (Fleet KPIs):** Real-time summary displaying active nodes, cumulative fleet drops, and microsecond SLA compliance.

