# OmniFlow Multi-Modal Traffic Engine Architecture (`omniflow_engine.py`)

The OmniFlow traffic engine (`src/traffic/omniflow_engine.py`), hosted in the `sentinel-traffic` container (`10.240.0.50`), simulates realistic multi-modal network workloads across the `10.240.0.0/24` mesh. 

Instead of generating basic synthetic ping floods, OmniFlow runs **seven concurrent worker threads**, each generating protocol-conforming frames targeted at specific edge nodes (`.101`, `.102`, `.103`).

---

## 1. Multi-Threaded Engine Architecture

```text
 ┌─────────────────────────────────────────────────────────────┐
 │ sentinel-traffic Container (IP: 10.240.0.50)                │
 │ Master Controller: omniflow_engine.py                       │
 └──────────────────────────────┬──────────────────────────────┘
                                │ Spawns 7 Independent Worker Threads
        ┌───────────────────────┼───────────────────────┐
        ▼                       ▼                       ▼
 ┌──────────────┐        ┌──────────────┐        ┌──────────────┐
 │ Channel 1:   │        │ Channel 2:   │        │ Channel 3:   │
 │ SCADA OT     │        │ Edge Vision  │        │ L7 Web & Bot │
 │ Modbus/DNP3  │        │ YOLO Tensors │        │ SQLi/API     │
 └──────┬───────┘        └──────┬───────┘        └──────┬───────┘
        │                       │                       │
        ▼                       ▼                       ▼
 ┌──────────────┐        ┌──────────────┐        ┌──────────────┐
 │ Channel 4:   │        │ Channel 5:   │        │ Channel 6:   │
 │ Identity/ATO │        │ Host Syscalls│        │ Medical IoT  │
 │ Kerberos/Geo │        │ CWPP / Wipers│        │ DICOM/MAVLink│
 └──────┬───────┘        └──────┬───────┘        └──────┬───────┘
        │                       │                       │
        └───────────────────────┼───────────────────────┘
                                ▼
                         ┌──────────────┐
                         │ Channel 7:   │
                         │ NetFlow Blast│
                         │ Active Learn │
                         └──────┬───────┘
                                │ Real Wire Ingress over matrix_net (10.240.0.0/24)
                                ▼
 [ TARGET APPLIANCES: sentinel-node-01 (.101), node-02 (.102), node-03 (.103) ]
```

---

## 2. Master Engine Implementation (`omniflow_engine.py`)

```python
import threading
import time
import yaml
from pathlib import Path
from typing import Dict, Any

from channels.scada_channel import run_scada_channel
from channels.vision_channel import run_vision_channel
from channels.web_channel import run_web_channel
from channels.identity_channel import run_identity_channel
from channels.syscall_channel import run_syscall_channel
from channels.medical_channel import run_medical_channel
from channels.netflow_channel import run_netflow_channel

class OmniFlowEngine:
    def __init__(self, config_path: str = "/etc/sentinel/omniflow.yaml"):
        with open(config_path, "r") as f:
            self.config: Dict[str, Any] = yaml.safe_load(f)
        self.stop_event = threading.Event()
        self.threads = []

    def start(self):
        print("[*] Launching OmniFlow 7-Channel Multi-Modal Traffic Engine...")
        channel_dispatch = [
            (run_scada_channel, "Ch1-SCADA-OT"),
            (run_vision_channel, "Ch2-Edge-Vision"),
            (run_web_channel, "Ch3-Web-API-Bot"),
            (run_identity_channel, "Ch4-Identity-ATO"),
            (run_syscall_channel, "Ch5-Host-Syscalls"),
            (run_medical_channel, "Ch6-Medical-IoT"),
            (run_netflow_channel, "Ch7-NetFlow-Blaster"),
        ]

        for target_func, name in channel_dispatch:
            t = threading.Thread(
                target=target_func, 
                args=(self.config, self.stop_event), 
                name=name, 
                daemon=True
            )
            t.start()
            self.threads.append(t)
            print(f"  -> Worker Thread [{name}] Active.")

    def join(self):
        try:
            while not self.stop_event.is_set():
                time.sleep(1.0)
        except KeyboardInterrupt:
            print("\n[*] Stopping OmniFlow engine...")
            self.stop_event.set()
            for t in self.threads:
                t.join(timeout=2.0)
```

