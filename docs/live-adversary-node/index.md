# Live Red-Team Adversary Node (`10.240.0.99`)

The `sentinel-adversary` container acts as an active Red-Team workstation on the wire, generating live interactive attack traffic.

## Section Navigation

- [Adversary Node Architecture](./adversary-node-architecture.md): Network routing, toolsets (`nmap`, `mbpoll`, `curl`), and target nodes.
- [Live Adversary Daemon](./live-adversary-daemon.md): `live_adversary_daemon.py` automated execution loop cycling through attack phases.
- [Nmap TCP SYN Sweeps](./nmap-tcp-syn-sweeps.md): Executing live TCP SYN scans (MITRE ATT&CK T1046) against edge nodes.
- [Mbpoll SCADA Overrides](./mbpoll-scada-overrides.md): Live Modbus Function Code 05 coil overrides targeting `10.240.0.101:502`.
- [cURL API Abuse Bursts](./curl-api-abuse-bursts.md): High-velocity cURL API requests and SQL injection bursts targeting Web UIs.
- [Observing Wire eBPF Drops](./observing-wire-ebpf-drops.md): Real-time verification observing port states transition from `open` to `filtered`.
- [Custom Adversary Tooling](./custom-adversary-tooling.md): Customizing `Dockerfile.adversary` with Scapy, hping3, and Hydra.
