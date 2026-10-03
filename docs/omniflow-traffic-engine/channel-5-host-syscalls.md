---

### File: `sentinel-matrix/docs/omniflow-traffic-engine/channel-5-host-syscalls.md`

```markdown
# Channel 5: Container Breakouts & Ransomware Shannon Entropy

Channel 5 exercises host-level security engines—specifically Subsystem `07_epp_ngav` (Entropy Wiper Blocker) and Subsystem `09_cwpp` (Container eBPF Syscall Guard).

---

## 1. Traffic Profile

* **Container Escape Simulation:** Intercepting unshare and mount syscalls attempting to mount the host root partition from within container boundaries.
* **Ransomware Ciphertext Injection:** Blasting continuous byte streams with **Shannon Entropy $\ge 7.95\text{ bits/byte}$** to evaluate real-time file entropy tripwires.

---

## 2. Ingestion Implementation (`syscall_channel.py`)

```python
import socket
import time
import os

def run_syscall_channel(config: dict, stop_event):
    target_ip = config.get("target_node_01", "10.240.0.101")
    sock = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
    
    while not stop_event.is_set():
        # Generate 4 KB block of cryptographically random bytes (Shannon Entropy ~ 7.99 bits)
        high_entropy_payload = os.urandom(4096)
        sock.sendto(high_entropy_payload, (target_ip, 9995))
        time.sleep(0.1)
```
```

---

### File: `sentinel-matrix/docs/omniflow-traffic-engine/channel-6-medical-iot.md`

```markdown
# Channel 6: Medical IoT DICOM PACS & MAVLink Drone Telemetry

Channel 6 simulates specialized cyber-physical telemetry directed at **`sentinel-node-02` (`10.240.0.102`)**, testing hospital PACS defense (Subsystem `17_iot_sec`) and autonomous drone telemetry parsing (Dissector `mavlink-uav`).

---

## 1. Traffic Profile

* **DICOM Upper Layer (Port 104):** Streams authentic 16-bit CT/MRI slice metadata, interspersing unauthorized Calling AE Title `C-MOVE` patient siphoning requests.
* **MAVLink v2 Drone Streams (Port 14550):** Transmits autonomous navigation telemetry with injected GPS altitude spoofing.

---

## 2. Ingestion Implementation (`medical_channel.py`)

```python
import socket
import time
import struct

def run_medical_channel(config: dict, stop_event):
    target_ip = config.get("target_node_02", "10.240.0.102")
    sock_dicom = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
    
    while not stop_event.is_set():
        try:
            sock_dicom.connect((target_ip, 104))
            while not stop_event.is_set():
                # Emit DICOM A-ASSOCIATE-RQ packet with unauthorized Calling AET
                dulp_associate = b"\x01\x00\x00\x00\x00\x44\x00\x01\x00\x00ROGUE_CLIENT    PACS_CENTRAL    "
                sock_dicom.send(dulp_associate)
                time.sleep(1.0)
        except Exception:
            time.sleep(2.0)
            sock_dicom = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
```
```

---

### File: `sentinel-matrix/docs/omniflow-traffic-engine/channel-7-netflow-blaster.md`

```markdown
# Channel 7: High-Rate NetFlow Blaster ($[0.40 - 0.60]$ Uncertainty)

Channel 7 is the primary data feeder for the active learning closed-loop flywheel. It blasts continuous 32-dimensional NetFlow vectors, purposefully introducing boundary flows in the **$[0.40 - 0.60]$ prediction uncertainty window** to trigger `DatasetCurator.cpp` on `sentinel-nexus`.

---

## 1. Uncertainty Feed Mechanics

```text
 Ingress Flow Generation (Channel 7)
              │
              ▼ Generates 32-dim Flow Vectors
 ┌─────────────────────────────────────────────────────────────┐
 │ Probability Distribution:                                   │
 │  • 80% Unambiguous Benign (f(x) < 0.15)                     │
 │  • 15% High-Uncertainty Boundary Flows (0.40 <= f(x) <= 0.60│ ──► CURATOR QUEUE
 │  •  5% Unambiguous Exploits (f(x) > 0.85)                   │ ──► IN-KERNEL DROP
 └─────────────────────────────────────────────────────────────┘
```

---

## 2. Ingestion Implementation (`netflow_channel.py`)

```python
import socket
import time
import numpy as np

def run_netflow_channel(config: dict, stop_event):
    target_ip = config.get("target_node_01", "10.240.0.101")
    sock = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
    
    while not stop_event.is_set():
        # 15% probability of generating boundary flow vector [0.40 - 0.60]
        if np.random.random() < 0.15:
            vector = np.random.uniform(0.42, 0.58, size=(32,)).astype(np.float32)
        else:
            vector = np.random.uniform(0.05, 0.20, size=(32,)).astype(np.float32)

        sock.sendto(vector.tobytes(), (target_ip, 9999))
        time.sleep(0.001) # ~1,000 flows/sec
```
```

---

### File: `sentinel-matrix/docs/omniflow-traffic-engine/declarative-traffic-tuning.md`

```markdown
# Declarative Traffic Tuning via `omniflow.yaml`

All OmniFlow channels are configured declaratively in `/etc/sentinel/omniflow.yaml`. Rates, targets, and anomaly ratios can be tuned without modifying Python source code.

---

## 1. Master Configuration Schema (`omniflow.yaml`)

```yaml
version: "2.4.0"

general:
  target_subnet: "10.240.0.0/24"
  target_node_01: "10.240.0.101" # Substation Alpha
  target_node_02: "10.240.0.102" # Hospital Enclave
  target_node_03: "10.240.0.103" # Chemical Refinery

channels:
  scada_ot:
    enabled: true
    polling_rate_hz: 10
    anomaly_probability: 0.10
    ports: [502, 20000]

  edge_vision:
    enabled: true
    fps: 30
    injection_port: 5540

  web_api_bot:
    enabled: true
    requests_per_second: 20
    sqli_probability: 0.15

  identity_ato:
    enabled: true
    geo_velocity_trigger_interval_sec: 15

  host_syscalls:
    enabled: true
    entropy_burst_mb_per_sec: 2.0

  medical_iot:
    enabled: true
    dicom_transfers_per_minute: 12
    mavlink_spoof_interval_sec: 30

  netflow_blaster:
    enabled: true
    rate_eps: 1500
    uncertainty_fraction: 0.15 # 15% within [0.40 - 0.60] window
```
```
