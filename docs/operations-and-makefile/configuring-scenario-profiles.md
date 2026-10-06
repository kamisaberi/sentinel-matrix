# Authoring Attack Scenarios (`configs/scenarios/`)

`sentinel-matrix` executes reproducible cyber-physical simulation scenarios defined as YAML profiles in `configs/scenarios/`.

---

## 1. Blackout Scenario Profile (`scenario_blackout.yaml`)

```yaml
scenario:
  name: "Regional Grid Blackout Simulation"
  id: "SCEN-BLACKOUT-01"
  duration_minutes: 10
  description: "Replays Industroyer2 switchgear trips followed by high-volume C2 exfiltration."

timeline:
  - time_offset_sec: 10
    action: "TRAFFIC_BURST"
    source: "sentinel-traffic"
    channel: "scada_ot"
    rate_multiplier: 2.0

  - time_offset_sec: 45
    action: "MALWARE_REPLAY"
    source: "sentinel-traffic"
    pcap: "/shared/pcaps/industroyer_iec104.pcap"
    target: "10.240.0.101"

  - time_offset_sec: 90
    action: "ADVERSARY_ATTACK"
    source: "sentinel-adversary"
    attack_type: "NMAP_SWEEP"
    target_subnet: "10.240.0.0/24"

  - time_offset_sec: 180
    action: "CHAOS_INJECTION"
    target: "sentinel-node-01"
    chaos_type: "LATENCY_SPIKE"
    delay_us: 1420

  - time_offset_sec: 300
    action: "VERIFY_METRICS"
    assert_min_drops: 1000
    assert_rollback_triggered: true
```

---

## 2. Launching a Scenario

Run a scenario using the testbed runner:

```bash
python3 src/traffic/scenario_runner.py --scenario configs/scenarios/scenario_blackout.yaml
```

