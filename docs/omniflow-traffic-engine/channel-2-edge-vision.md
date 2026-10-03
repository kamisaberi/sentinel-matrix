---

### File: `sentinel-matrix/docs/omniflow-traffic-engine/channel-2-edge-vision.md`

```markdown
# Channel 2: Edge Vision 30 FPS Video & YOLO Intrusions

Channel 2 simulates physical security cameras streaming 30 FPS video tensor metadata to **`sentinel-node-02` (`10.240.0.102`)** to evaluate edge vision acceleration in `libxinfer.so` and Subsystem `05_waf` / `10_bad`.

---

## 1. Traffic Profile

* **Transmission Mode:** Raw UDP video tensor streaming on port **`5540`**.
* **Frame Rate:** $30.0\text{ FPS}$ ($33.3\,\text{ms}$ inter-frame interval).
* **Tensor Format:** Pre-processed $640 \times 640 \times 3$ normalized bounding box vectors.
* **Injected Anomalies:** Simulated physical perimeter breach events (unauthorized personnel entering a fenced substation transformer yard).

---

## 2. Ingestion Implementation (`vision_channel.py`)

```python
import socket
import time
import numpy as np

def run_vision_channel(config: dict, stop_event):
    target_ip = config.get("target_node_02", "10.240.0.102")
    sock = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
    
    frame_interval = 1.0 / 30.0 # 33.3ms
    
    while not stop_event.is_set():
        start = time.perf_counter()
        
        # Synthesize normalized bounding box metadata vector
        tensor_data = np.random.uniform(0.0, 1.0, size=(16,)).astype(np.float32)
        sock.sendto(tensor_data.tobytes(), (target_ip, 5540))
        
        elapsed = time.perf_counter() - start
        if elapsed < frame_interval:
            time.sleep(frame_interval - elapsed)
```
```

---

### File: `sentinel-matrix/docs/omniflow-traffic-engine/channel-3-web-api-bot.md`

```markdown
# Channel 3: L7 REST API Abuse & Non-Human Bot Kinematics

Channel 3 targets Subsystems `05_waf` and `10_bad` running on **`sentinel-node-01` (`10.240.0.101:8443`)**, generating high-velocity HTTP API queries, SQL injections, and automated bot kinematics.

---

## 1. Traffic Profile

* **Protocol:** HTTP/1.1 and HTTP/2 over TCP ports **`80` and `8443`**.
* **Baseline Normal:** Standard REST queries (`GET /api/v1/status`, `POST /api/v1/auth`).
* **Injected Anomalies:**
  * **SQL Injection (SQLi):** `SELECT * FROM users WHERE '1'='1' UNION SELECT credit_card`.
  * **Non-Human Kinematic Bursts:** Mouse and touch velocity profiles with zero deceleration curves, mimicking headless Selenium/Playwright scrapers.

---

## 2. Ingestion Implementation (`web_channel.py`)

```python
import requests
import time
import random

def run_web_channel(config: dict, stop_event):
    target_url = f"http://{config.get('target_node_01', '10.240.0.101')}:8080"
    
    sqli_payloads = [
        "/api/v1/users?id=1%20OR%201=1",
        "/api/v1/sensor?name=val';%20DROP%20TABLE%20telemetry;--",
        "/api/v1/login?user=admin%27%20--"
    ]

    while not stop_event.is_set():
        try:
            if random.random() < 0.85:
                # Legitimate API telemetry request
                requests.get(f"{target_url}/api/v1/telemetry", timeout=1.0)
            else:
                # Malicious SQLi / API abuse attempt (Trapped by 05_waf)
                payload = random.choice(sqli_payloads)
                requests.get(f"{target_url}{payload}", timeout=1.0)
            time.sleep(0.05)
        except Exception:
            time.sleep(0.5)
```
```

---

### File: `sentinel-matrix/docs/omniflow-traffic-engine/channel-4-identity-ato.md`

```markdown
# Channel 4: Identity Abuse & Impossible Travel Geo-Velocity

Channel 4 evaluates Subsystems `12_itdr` (Identity Threat Detection) and `14_ato` (Account Takeover) by streaming Kerberos authentication requests and impossible travel logins to **`sentinel-node-03` (`10.240.0.103`)**.

---

## 1. Traffic Profile

* **Target Ports:** TCP/UDP port **`88`** (Kerberos) and TCP port **`389`** (LDAP).
* **Kerberoasting Bursts:** Generating high-frequency `TGS-REQ` tickets requesting weak RC4-HMAC ciphers across multiple Service Principal Names (SPNs).
* **Impossible Travel Telemetry:** Transmitting authentication tokens for user `operator.admin`:
  * Login 1: Munich, Germany at $t = 0$.
  * Login 2: Singapore at $t = 300\,\text{seconds}$ (Calculated geo-velocity: $> 1{,}800\,\text{km/h}$).

---

## 2. Ingestion Implementation (`identity_channel.py`)

```python
import socket
import time
import json

def run_identity_channel(config: dict, stop_event):
    target_ip = config.get("target_node_03", "10.240.0.103")
    sock = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
    
    # Simulates Kerberos & Identity telemetry frames
    while not stop_event.is_set():
        # Transmit Kerberos AS-REQ simulation packet
        mock_kerberos_tgs = b"\x6a\x82\x01\x14\x30\x82\x01\x10\xa0\x03\x02\x01\x05..."
        sock.sendto(mock_kerberos_tgs, (target_ip, 88))
        time.sleep(0.2)
```
```

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

