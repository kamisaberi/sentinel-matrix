# High-Velocity cURL API Abuse & SQL Injection Bursts

The adversary targets the Web Command Center and REST endpoints on edge nodes using high-velocity HTTP request bursts and SQL injection strings to evaluate Subsystems `05_waf` and `10_bad`.

---

## 1. Attack Execution

Execute an API fuzzing burst:

```bash
docker exec -it sentinel-adversary python3 -c "
import urllib.request, time
url = 'http://10.240.0.101:8080/api/v1/sensor?id=1%20OR%201=1'
for i in range(50):
    try:
        urllib.request.urlopen(url, timeout=0.5)
    except Exception as e:
        print(f'Request {i}: Blocked by in-kernel WAF gate ({e})')
        break
"
```

---

## 2. Observation

* Requests 1 through 3 pass through to the WAF inspection engine.
* At Request 4, `05_waf` flags the repeated SQL syntax violation (`1 OR 1=1`).
* The source IP `10.240.0.99` is added to `blocked_ip_map`.
* Requests 5 through 50 time out immediately at the socket layer.

