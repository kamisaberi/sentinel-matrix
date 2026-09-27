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
        Layout(name="main", ratio=5),
        Layout(name="xai", ratio=4),
        Layout(name="footer", size=3)
    )

    # 1. Header
    layout["header"].update(Panel(
        Text("SENTINEL-MATRIX: XAI EDGE EXPLAINABILITY & CYBER-PHYSICAL RANGE", style="bold cyan", justify="center"),
        border_style="cyan"
    ))

    # Split Main row into Fleet Nodes and MITRE Heatmap
    layout["main"].split_row(
        Layout(name="fleet", ratio=6),
        Layout(name="mitre", ratio=4)
    )

    # Fetch live data from Nexus REST API
    try:
        nodes = requests.get(f"{NEXUS_REST_URL}/api/v1/fleet/nodes", timeout=1).json()
        comp = requests.get(f"{NEXUS_REST_URL}/api/v1/reports/compliance", timeout=1).json()
        ota = requests.get(f"{NEXUS_REST_URL}/api/v1/ota/status", timeout=1).json()
        mitre = requests.get(f"{NEXUS_REST_URL}/api/v1/threats/mitre", timeout=1).json()
        xai_events = requests.get(f"{NEXUS_REST_URL}/api/v1/threats/xai", timeout=1).json()
    except Exception:
        nodes, comp, ota, mitre, xai_events = [], {}, {}, [], []

    # Fleet Table
    node_table = Table(title="CONNECTED CYBER-PHYSICAL APPLIANCES", expand=True)
    node_table.add_column("Node ID", style="cyan")
    node_table.add_column("Site / Infrastructure", style="white")
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

    # MITRE ATT&CK Matrix Table
    mitre_table = Table(title="ACTIVE MITRE DETECTIONS", expand=True)
    mitre_table.add_column("Tactic ID", style="bold red")
    mitre_table.add_column("Technique Name", style="white")
    mitre_table.add_column("Hits", justify="right", style="bold yellow")

    if not mitre:
        mitre_table.add_row("-", "Listening on wire...", "0")
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

    # XAI EXPLAINABILITY JUSTIFICATION PANEL
    xai_table = Table(title="REAL-TIME XAI FEATURE ATTRIBUTION & AUDIT PROOF (IEC 62443 / CMMC 2.0)", expand=True)
    xai_table.add_column("Target IP", style="bold red")
    xai_table.add_column("MITRE Tactic", style="white")
    xai_table.add_column("Top-1 Anomaly Factor", style="bold yellow")
    xai_table.add_column("Observed Value", style="white")
    xai_table.add_column("Baseline (Nominal)", style="dim")
    xai_table.add_column("Auditor Technical Justification", style="cyan")

    if not xai_events:
        xai_table.add_row("-", "-", "Awaiting anomalous execution...", "-", "-", "-")
    else:
        for ev in xai_events[:4]:
            attrs = ev.get("attributions", [])
            top1 = attrs[0] if attrs else {}
            xai_table.add_row(
                ev.get("attacker_ip", "0.0.0.0"),
                f"{ev.get('mitre_id')} ({ev.get('mitre_name')})",
                f"{top1.get('feature', 'N/A')} [{top1.get('contribution_pct', 0)}%]",
                top1.get("observed", "N/A"),
                top1.get("baseline", "N/A"),
                top1.get("audit_note", "Standard baseline anomaly")
            )
    layout["xai"].update(Panel(xai_table, border_style="yellow"))

    # Footer
    stages = ["DISABLED", "SHADOW_MODE", "CANARY_5_PCT", "FLEET_WIDE"]
    stage_name = stages[ota.get('stage', 0)] if ota else "UNKNOWN"
    footer_text = f"Active Model: {comp.get('stable_model', 'N/A')}  |  Rollout Stage: {stage_name}  |  Forge Curated Batches: {comp.get('forge_buffered_samples', 0)}  |  Total Grid Drops: {comp.get('ebpf_drops', 0)}"
    layout["footer"].update(Panel(Text(footer_text, style="bold yellow", justify="center"), border_style="yellow"))

    return layout

def main():
    with Live(generate_dashboard(), refresh_per_second=2, screen=True) as live:
        while True:
            time.sleep(0.5)
            live.update(generate_dashboard())

if __name__ == "__main__":
    main()