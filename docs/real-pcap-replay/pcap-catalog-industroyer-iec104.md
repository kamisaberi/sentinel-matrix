# Attack Catalog: Industroyer (CrashOverride) IEC 60870-5-104

* **Malware Name:** Industroyer / CrashOverride (CRASHOVERRIDE.v1 / v2)
* **Associated Threat Actor:** Sandworm Team (APT44)
* **Target Industry:** Electrical Transmission Substations (Power Grids)
* **Target Protocol:** IEC 60870-5-104 (TCP Port **`2404`**)
* **MITRE ATT&CK for ICS:** **T0855 (Unauthorized Command Message)**

---

## 1. Authentic Attack Sequence in PCAP

```text
 1. STARTDT Act (APCI U-Format): Activates the data transmission channel.
 2. Interrogation Command (ASDU Type 100): Maps active substation IOA switch positions.
 3. Double Command (ASDU Type 46): Transmits automated Breaker Open pulses:
    • Information Object Address (IOA): 1124 (High-Voltage Feeder 14)
    • Command State: DCS = 1 (Open Circuit Breaker)
```

---

## 2. Replay Execution & In-Kernel Detection

Execute the replay targeting Substation Alpha (`sentinel-node-01`):

```bash
docker exec -it sentinel-traffic python3 /app/src/traffic/pcap_streamer.py \
    --pcap /shared/pcaps/industroyer_iec104.pcap \
    --target-ip 10.240.0.101
```

### Detection Trace on Node 01:
```text
[!] IN-KERNEL eBPF MITIGATION EXECUTED:
    Subsystem   : 18_cps_sec / libsentinel_plugin_iec104.so
    Threat Class: T0855 (Industroyer2 Switchgear Open Command)
    Target IOA  : 1124 (Feeder Breaker)
    Reaction    : Frame dropped in driver ring in 0.81 µs.
```

