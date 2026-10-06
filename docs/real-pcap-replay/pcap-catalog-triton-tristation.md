# Attack Catalog: Triton (HatMan) Triconex TriStation

* **Malware Name:** Triton / TRISIS / HatMan
* **Associated Threat Actor:** Xenotime (TEMP.Veles)
* **Target Industry:** Petrochemical Plants & Refineries
* **Target System:** Schneider Electric Triconex Safety Instrumented Systems (SIS)
* **Target Protocol:** TriStation TSAP (UDP Port **`19999`**)
* **MITRE ATT&CK for ICS:** **T0843 (Program Download)**

---

## 1. Exploitation Sequence

```text
 1. Handshake Initiation: TriStation Hello sequence to Triconex MP 3008.
 2. Privilege Escalation: Exploits zero-day memory boundary in firmware to achieve RCE.
 3. Malicious Logic Injection: Overwrites Safety Function Block to disable plant emergency shutdown.
```

---

## 2. Replay & Mitigation Verification

Stream the capture against `sentinel-node-03` (Chemical Refinery):

```bash
docker exec -it sentinel-traffic python3 /app/src/traffic/pcap_streamer.py \
    --pcap /shared/pcaps/triton_tristation.pcap \
    --target-ip 10.240.0.103
```

Subsystem `18_cps_sec` traps the unexpected TSAP program upload sequence, enforcing an immediate kernel drop and preserving the Safety Instrumented System.

