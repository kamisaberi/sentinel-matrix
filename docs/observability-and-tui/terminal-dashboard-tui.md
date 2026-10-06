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

