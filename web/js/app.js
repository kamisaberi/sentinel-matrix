async function fetchFleetData() {
    try {
        // 1. Fetch Fleet Nodes
        const nodesRes = await fetch('/api/v1/fleet/nodes');
        const nodes = await nodesRes.json();
        renderNodes(nodes);

        // 2. Fetch Compliance & Drop Totals
        const compRes = await fetch('/api/v1/reports/compliance');
        const comp = await compRes.json();
        
        document.getElementById('val-nodes').innerText = comp.online_count + " / " + comp.fleet_size;
        document.getElementById('val-drops').innerText = comp.ebpf_drops.toLocaleString();
        document.getElementById('val-samples').innerText = comp.forge_buffered_samples.toLocaleString();
        document.getElementById('val-model').innerText = comp.stable_model || "None";
        document.getElementById('fleet-summary-text').innerText = `Fleet: ${comp.online_count} Nodes Online`;

        // 3. Fetch OTA Status
        const otaRes = await fetch('/api/v1/ota/status');
        const ota = await otaRes.json();
        const stages = ["DISABLED", "SHADOW_MODE", "CANARY_5_PCT", "FLEET_WIDE"];
        document.getElementById('val-model-stage').innerText = `Stage: ${stages[ota.stage] || "UNKNOWN"}`;

    } catch (err) {
        console.error("Failed to query Nexus API:", err);
    }
}

function renderNodes(nodes) {
    const tbody = document.getElementById('node-table-body');
    if (!nodes || nodes.length === 0) {
        tbody.innerHTML = `<tr><td colspan="7" class="empty-state">No appliances connected. Launch simulated nodes to populate.</td></tr>`;
        return;
    }

    tbody.innerHTML = nodes.map(n => `
        <tr>
            <td><code>${n.node_id}</code></td>
            <td>${n.site}</td>
            <td>${n.hostname}</td>
            <td><span class="status-badge ${n.status === 'ONLINE' ? 'status-online' : 'status-offline'}">${n.status}</span></td>
            <td>${n.cpu_pct.toFixed(1)}% / ${n.npu_temp_c.toFixed(1)}°C</td>
            <td><strong>${n.ebpf_drops}</strong></td>
            <td>${n.mitigation_latency_us.toFixed(2)} µs</td>
        </tr>
    `).join('');
}

async function broadcastThreat() {
    const ip = document.getElementById('broadcast-ip').value.trim();
    if (!ip) return;

    const res = await fetch('/api/v1/threats/broadcast', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ip: ip })
    });
    const data = await res.json();
    document.getElementById('broadcast-result').innerText = `Broadcast sent: Blocked ${data.target_ip} across all appliances!`;
}

async function stageModel() {
    const res = await fetch('/api/v1/ota/stage', { method: 'POST' });
    const data = await res.json();
    document.getElementById('ota-status-log').innerText = `Stage Update: Candidate in ${data.stage}`;
    fetchFleetData();
}

async function advanceModel() {
    const res = await fetch('/api/v1/ota/advance', { method: 'POST' });
    const data = await res.json();
    document.getElementById('ota-status-log').innerText = `Stage Update: Advanced to ${data.stage}`;
    fetchFleetData();
}

async function rollbackModel() {
    const res = await fetch('/api/v1/ota/rollback', { method: 'POST' });
    const data = await res.json();
    document.getElementById('ota-status-log').innerText = `Status: Emergency Rollback completed.`;
    fetchFleetData();
}

// Polling interval (every 2 seconds)
setInterval(fetchFleetData, 2000);
fetchFleetData();