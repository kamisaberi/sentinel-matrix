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

