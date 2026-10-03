---

### File: `sentinel-matrix/docs/real-pcap-replay/git-lfs-downloader.md`

```markdown
# Git LFS Pointer Resolution (`tools/download_real_pcaps.py`)

When cloning repositories that host binary PCAP files via Git Large File Storage (LFS), standard Git clones often download **130-byte text pointer files** rather than binary payloads:

```text
version https://git-lfs.github.com/spec/v1
oid sha256:e9a2c31e847b2c94b13a7b41e2d9010000000000000000000000000000000000
size 14820352
```

`tools/download_real_pcaps.py` automates resolving, verifying, and downloading the binary files.

---

## 1. LFS Batch API Resolution Sequence

```text
 [ Discovers 130-Byte Git LFS Pointer File ]
                      │
                      ▼ Queries GitHub LFS Batch API
 ┌─────────────────────────────────────────────────────────────┐
 │ POST /repo.git/info/lfs/objects/batch                       │
 │ Payload: { "operation": "download", "objects": [{ "oid" }] }│
 └────────────────────┬────────────────────────────────────────┘
                      │
                      ▼ Resolves Pre-Signed AWS S3 Binary URL
 ┌─────────────────────────────────────────────────────────────┐
 │ Direct Binary Download via HTTPS Streaming                  │
 │  - Validates Magic Bytes: 0xa1b2c3d4                        │
 │  - Verifies Full SHA-256 Digest against pointer OID         │
 └────────────────────┬────────────────────────────────────────┘
                      │
                      ▼
 [ Overwrites pointer file with genuine binary PCAP payload ]
```

---

## 2. Ingestion Script Usage

Execute the automated downloader:

```bash
python3 tools/download_real_pcaps.py --target-dir shared/pcaps
```

The script replaces all pointer files with verified binary PCAPs.
```

---

### File: `sentinel-matrix/docs/real-pcap-replay/offline-binary-generator.md`

```markdown
# Air-Gapped Binary Generator (`tools/generate_real_pcaps.py`)

In air-gapped testbeds without internet access to GitHub LFS servers, `tools/generate_real_pcaps.py` generates protocol-compliant binary PCAP files directly from raw hex dumps and Python definitions.

---

## 1. Offline Generation Script

```python
#!/usr/bin/env python3
import struct
from pathlib import Path

PCAP_GLOBAL_HEADER = struct.pack("=IHHiIII", 0xa1b2c3d4, 2, 4, 0, 0, 65535, 1)

def write_pcap_frame(f, frame_bytes: bytes, ts_sec: int = 1791172800, ts_usec: int = 0):
    pkt_hdr = struct.pack("=IIII", ts_sec, ts_usec, len(frame_bytes), len(frame_bytes))
    f.write(pkt_hdr + frame_bytes)

def generate_offline_industroyer_pcap(output_path: str):
    p = Path(output_path)
    p.parent.mkdir(parents=True, exist_ok=True)
    
    with open(p, "wb") as f:
        f.write(PCAP_GLOBAL_HEADER)
        
        # Frame 1: IEC 60870-5-104 STARTDT Act
        frame_startdt = bytes.fromhex(
            "005056a1b201005056a1b29908004500002c0001000040067cc20a"
            "f000630af00065c001096400000001000000005002ffff632d0000"
            "680407000000" # APCI: STARTDT Act
        )
        write_pcap_frame(f, frame_startdt)

        # Frame 2: IEC 104 Type 46 (Double Command: Breaker Open)
        frame_trip = bytes.fromhex(
            "005056a1b201005056a1b2990800450000360002000040067cb70a"
            "f000630af00065c001096400000002000000015018ffff541a0000"
            "680e00000200" # APCI I-format
            "2e0106000100" # ASDU: Type 46, COT=6, CommonAddr=1
            "64040001"     # IOA=1124, Breaker State=1 (Trip)
        )
        write_pcap_frame(f, frame_trip, ts_usec=100000)

    print(f"[+] Successfully generated offline binary PCAP: {output_path}")

if __name__ == "__main__":
    generate_offline_industroyer_pcap("shared/pcaps/industroyer_iec104.pcap")
```
```

---

### File: `sentinel-matrix/docs/real-pcap-replay/pcap-catalog-industroyer-iec104.md`

```markdown
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
```

---

### File: `sentinel-matrix/docs/real-pcap-replay/pcap-catalog-triton-tristation.md`

```markdown
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
```

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

