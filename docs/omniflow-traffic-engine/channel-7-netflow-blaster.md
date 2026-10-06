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

