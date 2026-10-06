# Customizing the Grid Topology (`configs/matrix.yaml`)

The primary simulation grid topology, container network parameters, and scenario timings are declared in `configs/matrix.yaml`.

---

## 1. Master Configuration Schema (`configs/matrix.yaml`)

```yaml
version: "2.4.0"

mesh_network:
  bridge_name: "matrix_net"
  subnet: "10.240.0.0/24"
  gateway: "10.240.0.1"
  dns_server: "10.240.0.10"

nodes:
  nexus_hub:
    name: "sentinel-nexus"
    ip_address: "10.240.0.10"
    grpc_port: 50051
    web_port: 9443
    sse_port: 9444

  forge_trainer:
    name: "sentinel-forge"
    ip_address: "10.240.0.20"
    auto_cycle: true
    poll_interval_sec: 5

  traffic_streamer:
    name: "sentinel-traffic"
    ip_address: "10.240.0.50"
    omniflow_active: true
    pcap_replay_speed: 1.0

  adversary:
    name: "sentinel-adversary"
    ip_address: "10.240.0.99"
    attack_interval_sec: 15
    auto_attack_cycle: true

  edge_appliances:
    - name: "sentinel-node-01"
      ip_address: "10.240.0.101"
      profile: "substation_alpha"
      target_protocol: "IEC_60870_5_104"
    - name: "sentinel-node-02"
      ip_address: "10.240.0.102"
      profile: "hospital_enclave"
      target_protocol: "DICOM_PACS"
    - name: "sentinel-node-03"
      ip_address: "10.240.0.103"
      profile: "chemical_refinery"
      target_protocol: "MODBUS_TCP"

simulation_parameters:
  tick_interval_ms: 100
  log_level: "INFO"
  evidence_retention_days: 7
```

