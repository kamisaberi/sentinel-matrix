# Declarative Traffic Tuning via `omniflow.yaml`

All OmniFlow channels are configured declaratively in `/etc/sentinel/omniflow.yaml`. Rates, targets, and anomaly ratios can be tuned without modifying Python source code.

---

## 1. Master Configuration Schema (`omniflow.yaml`)

```yaml
version: "2.4.0"

general:
  target_subnet: "10.240.0.0/24"
  target_node_01: "10.240.0.101" # Substation Alpha
  target_node_02: "10.240.0.102" # Hospital Enclave
  target_node_03: "10.240.0.103" # Chemical Refinery

channels:
  scada_ot:
    enabled: true
    polling_rate_hz: 10
    anomaly_probability: 0.10
    ports: [502, 20000]

  edge_vision:
    enabled: true
    fps: 30
    injection_port: 5540

  web_api_bot:
    enabled: true
    requests_per_second: 20
    sqli_probability: 0.15

  identity_ato:
    enabled: true
    geo_velocity_trigger_interval_sec: 15

  host_syscalls:
    enabled: true
    entropy_burst_mb_per_sec: 2.0

  medical_iot:
    enabled: true
    dicom_transfers_per_minute: 12
    mavlink_spoof_interval_sec: 30

  netflow_blaster:
    enabled: true
    rate_eps: 1500
    uncertainty_fraction: 0.15 # 15% within [0.40 - 0.60] window
```
