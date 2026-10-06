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

