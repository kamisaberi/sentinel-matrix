---

### File: `sentinel-matrix/docs/observability-and-tui/terminal-dashboard-tui.md`

```markdown
# High-Density Terminal Dashboard Architecture (`live_dashboard.py`)

The terminal monitoring interface (`src/monitor/live_dashboard.py`) runs inside the `sentinel-monitor` container (`10.240.0.60`) or directly on the host via `make tui`. It consumes the real-time SSE stream from `sentinel-nexus` and updates an interactive, multi-panel terminal display using the Python `rich` library.

---

## 1. Engine Threading & Event Loop

```text
 ┌─────────────────────────────────────────────────────────────┐
 │ Background Ingestion Thread (SSE Consumer)                  │
 │  - Subscribes to http://10.240.0.10:9444/stream             │
 │  - Decodes JSON events: fleet_tick, threat_drop, xai_proof  │
 │  - Updates shared thread-safe state queue                   │
 └──────────────────────────────┬──────────────────────────────┘
                                │ State Snapshot
                                ▼
 ┌─────────────────────────────────────────────────────────────┐
 │ Foreground Render Loop (rich.live.Live Display)             │
 │  - Refreshes at 10 Hz (100ms tick interval)                 │
 │  - Re-computes rolling microsecond percentiles              │
 │  - Formats panels without screen flickering                 │
 └─────────────────────────────────────────────────────────────┘
```

---

## 2. Launching the Dashboard

Execute from the project root:

```bash
make tui
```

To run against a remote Nexus hub instance:

```bash
python3 src/monitor/live_dashboard.py --nexus-url http://10.240.0.10:9444
```
```

---

### File: `sentinel-matrix/docs/observability-and-tui/split-panel-layout.md`

```markdown
# TUI Split-Panel Screen Layout & Navigation

The terminal dashboard uses a three-panel split design optimized for standard $80 \times 24$ terminal windows while expanding dynamically on high-resolution widescreen consoles.

---

## 1. Screen Real Estate Partitioning

```text
 ┌─ Sentinel-Matrix Cyber-Range Grid ─────────────┬─ Real-Time XAI Feature Deviations ──┐
 │ NODE UUID         IP         STATUS   DROPS    │ Rank 1: MODBUS_REG_40001 (64.2%)    │
 │ sentinel-node-01  .101       ONLINE   14,209   │  Observed: 9850 PSI | Base: 2100    │
 │ sentinel-node-02  .102       ONLINE    8,412   │  Delta: +7750 PSI [██████████████]  │
 │ sentinel-node-03  .103       ONLINE    1,094   │ Rank 2: FLOW_PACKETS_PER_SEC (23.8%)│
 │                                                │  Observed: 82000 | Base: 150        │
 │                                                │  Delta: +81850 pps [██████]         │
 ├─ MITRE ATT&CK Threat Activity ─────────────────┤ Rank 3: IAT_MEAN (12.0%)            │
 │ [02:14:00] T0855 Unauthorized Cmd (Node 01)    │  Delta: -0.012488 s [██]            │
 │ [02:14:02] T0843 Program Download (Node 03)    ├─ Global Mesh Performance ───────────┤
 │ [02:14:05] T1046 Network Discovery (Adversary) │ Active Nodes: 3/3 | Total Drops: 23k│
 └────────────────────────────────────────────────┴─ Fleet SLA Median: 0.82µs (p99: 0.84)─┘
```

---

## 2. Panel Functions

* **Left Upper (Appliance Registry):** Displays connected edge containers, IP mappings, real-time health badges, and total in-kernel drops.
* **Left Lower (MITRE Threat Feed):** Scrolling log of live attacks, detailing attack timestamp, technique ID, target node, and mitigation action (`XDP_DROP`).
* **Right Upper (XAI Explanations):** Renders the top-3 physical feature deviations for the most recent threat mitigation.
* **Right Lower (Fleet KPIs):** Real-time summary displaying active nodes, cumulative fleet drops, and microsecond SLA compliance.
```

---

### File: `sentinel-matrix/docs/observability-and-tui/real-time-xai-panel.md`

```markdown
# Live XAI Residual Attribution Panel

The upper-right panel of the TUI renders **Microsecond Residual Decomposition (MRD)** feature attributions in real time, explaining why an edge appliance's autoencoder flagged an anomaly and initiated a kernel drop.

---

## 1. Rendering Logic (`src/monitor/xai_panel.py`)

```python
from rich.panel import Panel
from rich.table import Table
from rich.progress import BarColumn, Progress

def render_xai_panel(incident_data: dict) -> Panel:
    table = Table.grid(padding=(0, 1))
    table.add_column(style="bold cyan", width=22)
    table.add_column(style="white", width=28)
    table.add_column(style="bold red", width=12)

    attributions = incident_data.get("top_attributions", [])
    
    for attr in attributions:
        rank = attr.get("rank", 1)
        name = attr.get("feature_name", "UNKNOWN")
        pct = attr.get("contribution_percentage", 0.0)
        delta = attr.get("residual_delta", "")

        # Generate ASCII Bar representation
        bar_len = int((pct / 100.0) * 15)
        bar = "█" * bar_len + "░" * (15 - bar_len)

        table.add_row(f"Rank {rank}: {name[:18]}", f"{delta} [{bar}]", f"{pct:.1f}%")

    title = f"Top-3 XAI Residuals: {incident_data.get('incident_id', 'Waiting...')}"
    return Panel(table, title=title, border_style="cyan")
```

---

## 2. Operator Benefits

* **Root Cause Identification:** Operators instantly see which parameter (e.g., valve setpoint vs. packet rate) triggered the automated mitigation.
* **Verification:** Proves that in-kernel drops are driven by physical process violations rather than arbitrary heuristic errors.
```

---

### File: `sentinel-matrix/docs/observability-and-tui/web-command-center-integration.md`

```markdown
# Accessing the Web Command Center from Host Browsers

While `sentinel-matrix` executes inside a virtual machine or container mesh, its Web Command Center is exposed to host desktop browsers over port **9443**.

---

## 1. Port Forwarding & Routing

In `docker-compose.yml`, `sentinel-nexus` maps port 9443 to the host interface:

```yaml
    ports:
      - "9443:9443" # HTTPS REST & Web Console
      - "9444:9444" # Real-Time SSE Stream
```

If running inside a VMware virtual machine, access the web console from your host machine browser by navigating to the VM's assigned IP address:

👉 **`https://<VM_IP_ADDRESS>:9443`**

Or forward ports via SSH:

```bash
ssh -L 9443:localhost:9443 -L 9444:localhost:9444 user@vm-host
```

Then open `https://localhost:9443` in Chrome or Firefox.

---

## 2. Browser Security Exceptions

Because `sentinel-matrix` generates self-signed internal testing certificates during `make init`, modern browsers will present a certificate warning (`NET::ERR_CERT_AUTHORITY_INVALID`).

Click **Advanced $\to$ Proceed to localhost (unsafe)** to open the console.
```

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

