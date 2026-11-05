# OmniFlow Multi-Modal Traffic Engine

The OmniFlow traffic engine (`src/traffic/omniflow_engine.py`) generates multi-modal workloads across 7 concurrent worker channels.

## Section Navigation

- [OmniFlow Architecture](./omniflow-architecture.md): Multi-threaded engine architecture running inside `sentinel-traffic` (`.50`).
- [Channel 1: SCADA OT](./channel-1-scada-ot.md): Cyclic Modbus TCP and DNP3 polling with injected coil write anomalies.
- [Channel 2: Edge Vision](./channel-2-edge-vision.md): 30 FPS video tensor streaming and YOLO object detection breach triggers.
- [Channel 3: Web API & Bots](./channel-3-web-api-bot.md): L7 REST API queries, SQL injection bursts, and non-human bot kinematics.
- [Channel 4: Identity & ATO](./channel-4-identity-ato.md): Kerberos ticket requests and impossible travel geo-velocity injections.
- [Channel 5: Host Syscalls](./channel-5-host-syscalls.md): Container breakout attempts and high Shannon entropy ransomware wipers.
- [Channel 6: Medical IoT](./channel-6-medical-iot.md): DICOM PACS DULP C-STORE transfers and MAVLink UAV drone telemetry.
- [Channel 7: NetFlow Blaster](./channel-7-netflow-blaster.md): Continuous 32-dim flow vector blaster feeding the $[0.40 - 0.60]$ uncertainty window.
- [Declarative Tuning](./declarative-traffic-tuning.md): Tuning rates, targets, and anomaly ratios via `/etc/sentinel/omniflow.yaml`.
