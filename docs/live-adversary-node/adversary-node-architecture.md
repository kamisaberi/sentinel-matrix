# Live Red-Team Adversary Node Architecture (`10.240.0.99`)

In addition to playing back passive PCAP files, `sentinel-matrix` deploys an active, containerized Red-Team attacker node: **`sentinel-adversary`**, statically bound to **`10.240.0.99`** on the `10.240.0.0/24` network. 

This node acts as a hostile machine directly on the wire, generating live interactive TCP handshakes, Modbus coil overrides, port sweeps, and web application fuzzing bursts.

---

## 1. Network Routing & Attacker Topology

```text
 ┌─────────────────────────────────────────────────────────────┐
 │ RED-TEAM ATTACK WORKSTATION: sentinel-adversary             │
 │ Static IP: 10.240.0.99 | MAC: 02:42:0a:f0:00:63            │
 ├─────────────────────────────────────────────────────────────┤
 │ • Tooling: nmap, mbpoll, curl, hping3, scapy, hydra         │
 │ • Autonomous Daemon: live_adversary_daemon.py               │
 └──────────────────────────────┬──────────────────────────────┘
                                │ Physical Ingress on matrix_net (10.240.0.0/24)
        ┌───────────────────────┼───────────────────────┐
        ▼                       ▼                       ▼
 ┌──────────────┐        ┌──────────────┐        ┌──────────────┐
 │ Target 1:    │        │ Target 2:    │        │ Target 3:    │
 │ Substation   │        │ Hospital     │        │ Refinery     │
 │ 10.240.0.101 │        │ 10.240.0.102 │        │ 10.240.0.103 │
 └──────────────┘        └──────────────┘        └──────────────┘
```

---

## 2. Realistic Adversarial Feedback Loop

Because the adversary executes against real network sockets:
1. **Interactive State:** It initiates real three-way handshakes (`SYN` $\to$ `SYN-ACK` $\to$ `ACK`).
2. **Immediate Feedback:** When `sentinel-node-01` detects an attack and adds `10.240.0.99` to `blocked_ip_map`, subsequent packets from the adversary receive zero response on the wire.
3. **Observability:** Attack tools report connection timeouts or socket resets (`ECONNREFUSED` / `filtered`) in real time.

