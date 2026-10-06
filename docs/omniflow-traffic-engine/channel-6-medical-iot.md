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

