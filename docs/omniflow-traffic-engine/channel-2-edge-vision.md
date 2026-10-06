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

