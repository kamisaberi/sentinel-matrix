# Channel 1: SCADA OT Modbus & DNP3 Telemetry Stream

Channel 1 simulates industrial operations technology (OT) network communication, targeting **`sentinel-node-01` (`10.240.0.101`)** and **`sentinel-node-03` (`10.240.0.103`)**.

---

## 1. Traffic Profile & Protocol Mechanics

* **Target Ports:** TCP 502 (Modbus TCP) and TCP/UDP 20000 (DNP3).
* **Baseline Normal:** Continuous cyclic polling:
  * Modbus Function Code `03` (Read Holding Registers) every $100\,\text{ms}$.
  * DNP3 Class 0/1/2/3 data polls every $1{,}000\,\text{ms}$.
* **Injected Anomalies:**
  * **Coil Overrides:** Function Code `05` write commands attempting to trip physical safety interlocks.
  * **Thermodynamic Invariant Violations:** Writing values exceeding physical safety limits (e.g., setpoints $> 4{,}500\,\text{PSI}$ on register `40001`).

---

## 2. Ingestion Implementation (`scada_channel.py`)

```python
import socket
import time
import struct
import random

def run_scada_channel(config: dict, stop_event):
    target_ip = config.get("target_node_01", "10.240.0.101")
    sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
    
    while not stop_event.is_set():
        try:
            sock.connect((target_ip, 502))
            while not stop_event.is_set():
                # 90% Benign Read Holding Registers
                if random.random() < 0.90:
                    # MBAP: TransID(2B), ProtoID=0(2B), Len=6(2B), UnitID=1(1B), FC=03(1B), Start=0(2B), Qty=10(2B)
                    payload = struct.pack(">HHHBBHH", random.randint(1, 65535), 0, 6, 1, 3, 0, 10)
                else:
                    # 10% Malicious Register Override (Triggers 18_cps_sec in-kernel drop)
                    # FC 16: Write Register 40001 with 9850 PSI
                    payload = struct.pack(">HHHBBHHB H", random.randint(1, 65535), 0, 9, 1, 16, 40001, 1, 2, 9850)

                sock.send(payload)
                time.sleep(0.1)
        except Exception:
            time.sleep(1.0)
            sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
```

