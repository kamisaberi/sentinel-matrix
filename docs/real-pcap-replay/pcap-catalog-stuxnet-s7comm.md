---

### File: `sentinel-matrix/docs/real-pcap-replay/pcap-catalog-stuxnet-s7comm.md`

```markdown
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
```

---

### File: `sentinel-matrix/docs/real-pcap-replay/pcap-catalog-modbus-scada.md`

```markdown
# Attack Catalog: Genuine Modbus SCADA Overrides (Univ. of Illinois)

* **Dataset Origin:** University of Illinois Urbana-Champaign SCADA Lab
* **Target Protocol:** Modbus TCP (Port **`502`**)
* **Attack Class:** Multi-stage reconnaissance followed by Function Code `05` coil overrides and Function Code `16` register setpoint tampering.
* **MITRE ATT&CK for ICS:** **T0855 (Unauthorized Command Message)**

---

## 1. Replay Behavior

The capture contains over $45{,}000$ packets of mixed normal polling interspersed with stealthy coil write bursts attempting to disable cooling water pumps. 

Replaying this dataset verifies that the neural autoencoder (`libxinfer.so`) accurately differentiates between normal cyclic polls and malicious coil override instructions.
```

---

### File: `sentinel-matrix/docs/real-pcap-replay/rate-pacing-and-wire-injection.md`

```markdown
# Microsecond Rate-Pacing & Packet Scheduling

When replaying historical network captures, streaming packets too rapidly can overwhelm virtual queues, while streaming too slowly fails to simulate real-world line-rate pressure.

`pcap_streamer.py` incorporates **High-Resolution Microsecond Rate-Pacing**.

---

## 1. Rate-Pacing Algorithm

```text
 For each packet in PCAP:
   1. Read delta timestamp: Δt = ts_packet[i] - ts_packet[i-1]
   2. Apply speed multiplier: Δt_adjusted = Δt / speed_factor
   3. Busy-spin wait until target epoch reached (bypassing OS sleep jitter)
   4. Transmit frame over raw socket
```

---

## 2. CLI Rate-Pacing Options

Control transmission rates using the streamer CLI:

```bash
# Replay at real-time wire pace (1.0x speed multiplier)
python3 pcap_streamer.py --pcap attack.pcap --speed 1.0

# Replay at maximum wire saturation (10,000 packets/second burst)
python3 pcap_streamer.py --pcap attack.pcap --pps-limit 10000
```
```

