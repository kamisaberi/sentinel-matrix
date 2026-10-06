# Server-Sent Events (SSE) Multiplexing on Port 9444

Both the terminal TUI (`live_dashboard.py`) and the Web Command Center consume real-time telemetry from a unified **Server-Sent Events (SSE)** endpoint exposed on port **9444**.

---

## 1. Multiplexed Event Types

```text
 ┌─────────────────────────────────────────────────────────────┐
 │ SSE STREAM: http://10.240.0.10:9444/stream                  │
 ├─────────────────────────────────────────────────────────────┤
 │ • fleet_tick     : Pushed every 1000ms (Global health, pps) │
 │ • threat_drop    : Pushed immediately on in-kernel drop     │
 │ • xai_attribution: Pushed with top-3 feature deltas         │
 │ • canary_update  : Pushed when OTA rollout stage advances   │
 └─────────────────────────────────────────────────────────────┘
```

---

## 2. Python Stream Consumer (`src/monitor/sse_client.py`)

```python
import json
import urllib.request

def consume_matrix_sse_stream(stream_url: str, event_callback):
    req = urllib.request.Request(stream_url, headers={"Accept": "text/event-stream"})
    
    with urllib.request.urlopen(req, timeout=30) as response:
        event_type = "message"
        
        for line in response:
            line_str = line.decode('utf-8').strip()
            
            if line_str.startswith("event:"):
                event_type = line_str[6:].strip()
            elif line_str.startswith("data:"):
                data_json = json.loads(line_str[5:].strip())
                event_callback(event_type, data_json)
```

