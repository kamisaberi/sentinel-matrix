// MITRE ATT&CK Matrix Dynamic Visualizer for Sentinel Nexus
const MITRE_DEFINITIONS = {
    "T1110": { name: "Brute Force", tactic: "Credential Access" },
    "T1071": { name: "C2 Application Protocol", tactic: "Command & Control" },
    "T0855": { name: "Unauthorized Command", tactic: "ICS/SCADA Physical" },
    "T1046": { name: "Network Service Discovery", tactic: "Discovery" },
    "T1190": { name: "Exploit Public Application", tactic: "Initial Access" }
};

let isMitreUpdating = false;

async function updateMitreMatrix() {
    if (isMitreUpdating) return;
    isMitreUpdating = true;

    try {
        const res = await fetch('/api/v1/threats/mitre');
        if (!res.ok) return;

        const data = await res.json();
        // Support both ID selectors to eliminate null errors
        const container = document.getElementById('mitre-grid') || document.getElementById('mitre-matrix-container');
        if (!container) return;

        if (!Array.isArray(data) || data.length === 0) {
            container.innerHTML = `<div class="empty-state" style="padding: 12px; font-size: 12px; opacity: 0.7;">No adversary tactics active on wire. Sentinel eBPF listening...</div>`;
            return;
        }

        container.innerHTML = data.map(item => {
            const def = MITRE_DEFINITIONS[item.technique_id] || { name: "Tactical Intrusion", tactic: "ICS Anomaly" };
            return `
                <div class="mitre-tile">
                    <div class="mitre-tech-id">${item.technique_id}</div>
                    <div class="mitre-tech-name">${def.name}</div>
                    <div class="mitre-tactic">${def.tactic}</div>
                    <div class="mitre-count-badge">${item.count} detections</div>
                </div>
            `;
        }).join('');
    } catch (e) {
        console.warn("[MITRE] Telemetry poller paused:", e);
    } finally {
        isMitreUpdating = false;
        // Run cleanly every 5 seconds without stacking
        setTimeout(updateMitreMatrix, 5000);
    }
}

// Initial single launch
updateMitreMatrix();