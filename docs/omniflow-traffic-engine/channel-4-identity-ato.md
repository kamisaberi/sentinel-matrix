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

