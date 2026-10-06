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

