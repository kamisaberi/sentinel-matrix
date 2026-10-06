# Dual-Console Observability: Terminal TUI vs. Web Command Center

`sentinel-matrix` provides two complementary observability consoles designed for different operational environments: the **Terminal Dashboard TUI (`make tui`)** for headless SSH sessions and bastion hosts, and the **Web Command Center (`https://localhost:9443`)** for graphical SOC displays.

---

## 1. Observability Architecture Comparison

```text
 ┌─────────────────────────────────────────────────────────────┐
 │ sentinel-nexus Event Core (Ports 9443 & 9444)               │
 └──────────────────────────────┬──────────────────────────────┘
                                │
        ┌───────────────────────┴───────────────────────┐
        ▼ HTTP EventStream (Port 9444)                  ▼ HTTPS REST / Static (Port 9443)
 ┌─────────────────────────────┐         ┌─────────────────────────────┐
 │ Terminal TUI (make tui)     │         │ Web Command Center (Browser)│
 │ • curses / rich Python TUI  │         │ • Embedded HTML5 Canvas SPA │
 │ • 100% Terminal-Native      │         │ • Radial Topology Visualizer│
 │ • Zero Graphic Dependencies │         │ • Interactive Canary Staging│
 │ • Ultra-Low Latency (<10ms) │         │ • Zero External CDNs        │
 └─────────────────────────────┘         └─────────────────────────────┘
```

---

## 2. Feature Availability Matrix

| Capability | Terminal TUI (`make tui`) | Web Command Center (Port 9443) |
| :--- | :--- | :--- |
| **Execution Environment** | Headless CLI / SSH Console | Desktop Web Browser (Chrome, Firefox) |
| **Asset Visualization** | High-Density Text Table | HTML5 Canvas Radial Node Topology |
| **Real-Time Threat Feed** | Streamed Event Log | Animated Vector Arcs & Threat Drawers |
| **Top-3 XAI Residuals** | Rendered via ASCII Bars | Rendered via Styled SVG Heatmaps |
| **MITRE ATT&CK Matrix** | Condensed 4-Column View | Full Multi-Tactic Grid with Drilldown |
| **Canary OTA Controls** | Display Status Only | Interactive 1-Click Promote / Rollback |
| **Network Requirements** | Localhost or Internal SSH | HTTPS Port Forwarding (`-L 9443:localhost:9443`) |

