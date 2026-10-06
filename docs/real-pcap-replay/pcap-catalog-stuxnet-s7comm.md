# Attack Catalog: Stuxnet Siemens S7Comm Centrifuge Attack

* **Malware Name:** Stuxnet
* **Target Industry:** Uranium Enrichment & Industrial Centrifuges
* **Target Controller:** Siemens S7-300 / S7-400 PLCs
* **Target Protocol:** Siemens S7Comm over ISO-COTP / TPKT (TCP Port **`102`**)
* **MITRE ATT&CK for ICS:** **T0831 (Manipulation of Control)**

---

## 1. Malicious Memory Mutation Sequence

The capture contains the authentic S7Comm command sequence used to alter frequency drive parameters:
* **ROSCTR `0x01` (Job Request) $\to$ Function `0x05` (Write Variable)**
* Targets Data Block **`DB890`**, modifying frequency registers between $1{,}410\,\text{Hz}$ and $2\,\text{Hz}$ to cause mechanical rotor fatigue.

---

## 2. Replay Execution

```bash
docker exec -it sentinel-traffic python3 /app/src/traffic/pcap_streamer.py \
    --pcap /shared/pcaps/stuxnet_s7comm.pcap \
    --target-ip 10.240.0.101
```

Subsystem `18_cps_sec` intercepts the write attempt against the protected `DB890` memory address, severing the session.

