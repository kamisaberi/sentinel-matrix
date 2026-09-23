#!/usr/bin/env python3
import time
import os
import requests
from rich.live import Live
from rich.table import Table
from rich.panel import Panel
from rich.layout import Layout
from rich.text import Text

NEXUS_REST_URL = os.environ.get("NEXUS_REST_URL", "http://172.28.0.10:9443")

def generate_dashboard():
    layout = Layout()
    layout.split_column(
        Layout(name="header", size=3),
        Layout(name="main", ratio=1),
        Layout(name="footer", size=3)
    )

    # Header
    layout["header"].update(Panel(
        Text("SENTINEL-MATRIX: AUTONOMOUS CYBER-PHYSICAL RANGE (VMWARE MESH)", style="bold cyan", justify="center"),
        border_style="cyan"
    ))

    # Fetch API status
    try:
        nodes = requests.get(f"{NEXUS_REST_URL}/api/v1/fleet/nodes", timeout=1).json()
        comp = requests.get(f"{NEXUS_REST_URL}/api/v1/reports/compliance", timeout=1).json()
        ota = requests.get(f"{NEXUS_REST_URL}/api/v1/ota/status", timeout=1).json()
    except Exception:
        nodes, comp, ota = [], {}, {}

    table = Table(title="CONNECTED EDGE APPLIANCES", expand=True)
    table.add_column("Node ID", style="cyan")
    table.add_column("Site Identifier", style="white")
    table.add_column("Status", justify="center")
    table.add_column("CPU %", justify="right")
    table.add_column("Kernel Drops", justify="right", style="red")
    table.add_column("Latency (SLA)", justify="right", style="green")

    for n in nodes:
        status_style = "bold green" if n['status'] == "ONLINE" else "bold red"
        table.add_row(
            n['node_id'],
            n['site'],
            Text(n['status'], style=status_style),
            f"{n['cpu_pct']:.1f}%",
            str(n['ebpf_drops']),
            f"{n['mitigation_latency_us']:.2f} µs"
        )

    layout["main"].update(Panel(table, border_style="blue"))

    stages = ["DISABLED", "SHADOW_MODE", "CANARY_5_PCT", "FLEET_WIDE"]
    stage_name = stages[ota.get('stage', 0)] if ota else "UNKNOWN"
    footer_text = f"Active Model: {comp.get('stable_model', 'N/A')}  |  Rollout Stage: {stage_name}  |  Forge Buffered Samples: {comp.get('forge_buffered_samples', 0)}  |  Total Drops: {comp.get('ebpf_drops', 0)}"
    layout["footer"].update(Panel(Text(footer_text, style="bold yellow", justify="center"), border_style="yellow"))

    return layout

def main():
    with Live(generate_dashboard(), refresh_per_second=2, screen=True) as live:
        while True:
            time.sleep(0.5)
            live.update(generate_dashboard())

if __name__ == "__main__":
    main()