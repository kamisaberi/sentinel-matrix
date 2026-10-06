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

