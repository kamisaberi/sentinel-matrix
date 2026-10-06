# Live `nmap -sS` TCP SYN Sweeps (MITRE T1046)

The adversary executes live TCP SYN scans against edge nodes to simulate adversarial reconnaissance mapped to **MITRE ATT&CK T1046 (Network Service Discovery)**.

---

## 1. Scan Execution Command

Execute an interactive scan directly from the adversary container:

```bash
docker exec -it sentinel-adversary nmap -sS -Pn -p 80,102,502,8443,20000 10.240.0.101
```

---

## 2. In-Kernel Defense Reaction

1. During the first two probed ports (e.g., 80 and 102), `sentinel-node-01` observes an anomalous flow rate burst with high `TCP_SYN` flag density.
2. Subsystem `04_ids_ips` and `TabularMAE` flag the reconnaissance signature.
3. Tier 2 `libblackbox` writes `10.240.0.99` into the in-kernel `blocked_ip_map` with a 60-second TTL.
4. Subsequent SYN packets for ports 502, 8443, and 20000 are dropped in driver memory ($< 0.84\,\mu\text{s}$).

---

## 3. Terminal Output Observed by the Attacker

```text
Starting Nmap 7.94 ( https://nmap.org )
Nmap scan report for 10.240.0.101
Host is up (0.00042s latency).

PORT      STATE    SERVICE
80/tcp    open     http
102/tcp   open     iso-tsap
502/tcp   filtered modbus   <-- DROPPED IN-KERNEL!
8443/tcp  filtered https-alt <-- DROPPED IN-KERNEL!
20000/tcp filtered dnp3     <-- DROPPED IN-KERNEL!

Nmap done: 1 IP address (1 host up) scanned in 2.12 seconds
```

The transition to `filtered` provides direct visual confirmation that the kernel XDP drop gate engaged mid-scan.

