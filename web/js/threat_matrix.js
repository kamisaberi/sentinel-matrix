// MITRE ATT&CK Matrix Dynamic Visualizer for Sentinel Nexus
const MITRE_DEFINITIONS = {
    "T1110": { name: "Brute Force", tactic: "Credential Access" },
    "T1071": { name: "C2 Application Protocol", tactic: "Command & Control" },
    "T0855": { name: "Unauthorized Command", tactic: "ICS/SCADA Physical" },
    "T1046": { name: "Network Service Discovery", tactic: "Discovery" },
    "T1190": { name: "Exploit Public Application", tactic: "Initial Access" }
};

async function updateMitreMatrix() {
    try {
        const res = await fetch('/api/v1/threats/mitre');
        const data = await res.json();
        const container = document.getElementById('mitre-matrix-container');
        if (!container) return;

        if (data.length === 0) {
            container.innerHTML = `<div class="empty-state">No adversary tactics detected yet. Listening to appliances...</div>`;
            return;
        }

        container.innerHTML = data.map(item => {
            const def = MITRE_DEFINITIONS[item.technique_id] || { name: "Generic Threat", tactic: "Unknown" };
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
        console.error("Could not render MITRE matrix:", e);
    }
}

// Poll MITRE matrix every 3 seconds
setInterval(updateMitreMatrix, 3000);
updateMitreMatrix();