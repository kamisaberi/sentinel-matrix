---

### File: `sentinel-matrix/docs/observability-and-tui/streaming-sse-events.md`

```markdown
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
```

---

### File: `sentinel-matrix/docs/observability-and-tui/metrics-aggregation.md`

```markdown
# Live Microsecond Latency Aggregation & Percentiles

`sentinel-monitor` aggregates latency reports from all edge nodes into rolling 60-second sliding windows, calculating live microsecond latency percentiles ($p50$, $p90$, $p95$, $p99$).

---

## 1. Sliding Window Percentile Calculation

```python
import numpy as np
from collections import deque
import time

class LatencyAggregator:
    def __init__(self, window_seconds: int = 60):
        self.window = deque()
        self.window_sec = window_seconds

    def record_sample(self, latency_us: float):
        now = time.time()
        self.window.append((now, latency_us))
        self._prune(now)

    def _prune(self, now: float):
        while self.window and (now - self.window[0][0] > self.window_sec):
            self.window.popleft()

    def get_percentiles(self) -> dict:
        if not self.window:
            return {"p50": 0.0, "p90": 0.0, "p99": 0.0}

        latencies = [item[1] for item in self.window]
        return {
            "p50": float(np.percentile(latencies, 50)),
            "p90": float(np.percentile(latencies, 90)),
            "p95": float(np.percentile(latencies, 95)),
            "p99": float(np.percentile(latencies, 99)),
        }
```

---

## 2. SLA Breach Detection

If the calculated 99th percentile ($p99$) exceeds **$1.0\,\mu\text{s}$**, the TUI changes the SLA metric label from cyan to bold red (`SLA BREACH: 1.42 µs`), indicating that edge nodes are experiencing CPU starvation or scheduling delays.
```

