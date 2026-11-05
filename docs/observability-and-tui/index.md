# Observability & TUI Dashboard

`sentinel-matrix` provides dual-console observability via a terminal Curses/Rich TUI (`make tui`) and the browser Web Command Center.

## Section Navigation

- [Observability Overview](./observability-overview.md): Dual-console architecture and feature comparison matrix.
- [Terminal Dashboard TUI](./terminal-dashboard-tui.md): High-density Curses/Rich dashboard architecture (`live_dashboard.py`).
- [Split-Panel Layout](./split-panel-layout.md): Screen partitioning into registry, threat feed, XAI residuals, and fleet KPIs.
- [Real-Time XAI Panel](./real-time-xai-panel.md): Rendering Microsecond Residual Decomposition (MRD) top-3 feature attributions.
- [Web Command Center Integration](./web-command-center-integration.md): Accessing port 9443 HTTPS console from host desktop browsers.
- [Streaming SSE Events](./streaming-sse-events.md): Server-Sent Events multiplexing over port 9444 (`fleet_tick`, `threat_drop`).
- [Metrics Aggregation](./metrics-aggregation.md): Live microsecond latency aggregation and rolling percentile calculations.
