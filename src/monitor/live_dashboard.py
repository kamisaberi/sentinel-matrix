#!/usr/bin/env python3
import time
import os
import requests
from rich.live import Live
from rich.table import Table
from rich.panel import Panel
from rich.layout import Layout
from rich.text import Text

NEXUS_REST_URL = os.environ.get("NEXUS_REST_URL", "http://10.240.0.10:9443")

def generate_dashboard():
    layout = Layout()
    layout.split_column(
        Layout(name="header", size=3),
        Layout(name="main", ratio=1),
        Layout(name="footer", size=3)
    )

    layout["header"].update(Panel(
        Text("SENTINEL-MATRIX: AUTONOMOUS CYBER-PHYSICAL RANGE (VMWARE MESH)", style="bold cyan", justify="center"),
        border_style="cyan"
    ))

    layout["main"].split_row(
        Layout(name="fleet", ratio=6),
        Layout(name="mitre", ratio=4)
    )

    try:
        nodes = requests.get(f"{NEXUS_REST_URL}/api/v1/fleet/nodes", timeout=1).json()
        comp = requests.get(f"{NEXUS_REST_URL}/api/v1/reports/compliance", timeout=1).json()
        ota = requests.get(f"{NEXUS_REST_URL}/api/v1/ota/status", timeout=1).json()
        mitre = requests.get(f"{NEXUS_REST_URL}/api/v1/threats/mitre", timeout=1).json()
    except Exception:
        nodes, comp, ota, mitre = [], {}, {}, []

    # Fleet Table
    node_table = Table(title="CONNECTED EDGE APPLIANCES", expand=True)
    node_table.add_column("Node ID", style="cyan")
    node_table.add_column("Site Identifier", style="white")
    node_table.add_column("Status", justify="center")
    node_table.add_column("CPU %", justify="right")
    node_table.add_column("eBPF Drops", justify="right", style="red")
    node_table.add_column("Mitigation SLA", justify="right", style="green")

    for n in nodes:
        status_style = "bold green" if n['status'] == "ONLINE" else "bold red"
        node_table.add_row(
            n['node_id'],
            n['site'],
            Text(n['status'], style=status_style),
            f"{n['cpu_pct']:.1f}%",
            str(n['ebpf_drops']),
            f"{n['mitigation_latency_us']:.2f} µs"
        )
    layout["fleet"].update(Panel(node_table, border_style="blue"))

    # MITRE Matrix Table
    mitre_table = Table(title="MITRE ATT&CK DETECTIONS", expand=True)
    mitre_table.add_column("Tactic ID", style="bold red")
    mitre_table.add_column("Technique Name", style="white")
    mitre_table.add_column("Hits", justify="right", style="bold yellow")

    if not mitre:
        mitre_table.add_row("-", "Listening for adversarial waves...", "0")
    else:
        for m in mitre:
            count = m.get('count', 0)
            count_style = "bold red" if count > 0 else "dim"
            mitre_table.add_row(
                m.get('technique_id', 'T1000'),
                m.get('name', 'Generic Threat'),
                Text(str(count), style=count_style)
            )
    layout["mitre"].update(Panel(mitre_table, border_style="red"))

    stages = ["DISABLED", "SHADOW_MODE", "CANARY_5_PCT", "FLEET_WIDE"]
    stage_name = stages[ota.get('stage', 0)] if ota else "UNKNOWN"
    footer_text = f"Active Model: {comp.get('stable_model', 'N/A')}  |  Rollout Stage: {stage_name}  |  Forge Buffered Samples: {comp.get('forge_buffered_samples', 0)}  |  Total Grid Drops: {comp.get('ebpf_drops', 0)}"
    layout["footer"].update(Panel(Text(footer_text, style="bold yellow", justify="center"), border_style="yellow"))

    return layout

def main():
    with Live(generate_dashboard(), refresh_per_second=2, screen=True) as live:
        while True:
            time.sleep(0.5)
            live.update(generate_dashboard())

if __name__ == "__main__":
    main()