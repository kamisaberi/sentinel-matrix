// File: /home/kami/sentinel-nexus/web/js/threat_matrix.js
// ============================================================================
// ARYORITHM SENTINEL NEXUS: SCENARIO-DRIVEN MITRE ATT&CK & XAI MATRIX
// Zero Hardcoding: Driven by /api/v1/threats/mitre & /api/v1/threats/xai
// ============================================================================

(function () {
    'use strict';

    let activeTacticFilter = 'ALL';
    let lastTechniques = [];
    let lastXaiEvents = [];
    let pollTimer = null;

    document.addEventListener('DOMContentLoaded', () => {
        // Immediate refresh when MITRE ATT&CK tab is clicked
        document.querySelectorAll('.admin-nav-item, .nav-tab').forEach(btn => {
            btn.addEventListener('click', () => {
                if (btn.getAttribute('data-tab') === 'tab-threats') {
                    refreshMitreAndXai();
                }
            });
        });

        refreshMitreAndXai();
        pollTimer = setInterval(() => {
            const pane = document.getElementById('tab-threats');
            if (pane && pane.classList.contains('active')) {
                refreshMitreAndXai();
            }
        }, 4000);
    });

    async function refreshMitreAndXai() {
        const container = document.getElementById('mitre-grid') || document.getElementById('mitre-matrix-container');
        if (!container) return;

        try {
            const [mitreRes, xaiRes, nodesRes] = await Promise.all([
                fetch('/api/v1/threats/mitre').catch(() => null),
                fetch('/api/v1/threats/xai').catch(() => null),
                fetch('/api/v1/fleet/nodes').catch(() => null)
            ]);

            if (mitreRes && mitreRes.ok) {
                const mData = await mitreRes.json();
                lastTechniques = Array.isArray(mData) ? mData : [];
            } else {
                lastTechniques = [];
            }

            if (xaiRes && xaiRes.ok) {
                const xData = await xaiRes.json();
                lastXaiEvents = Array.isArray(xData) ? xData : [];
            } else {
                lastXaiEvents = [];
            }

            let fleetSites = [];
            if (nodesRes && nodesRes.ok) {
                const nData = await nodesRes.json();
                const nodes = Array.isArray(nData) ? nData : (nData.nodes || []);
                fleetSites = [...new Set(nodes.map(n => n.site).filter(Boolean))];
            }

            updatePanelHeader(fleetSites);
            renderMitreView(container);
        } catch (e) {
            console.warn('[MITRE] Telemetry refresh paused:', e);
        }
    }

    function updatePanelHeader(fleetSites) {
        const pane = document.getElementById('tab-threats');
        if (!pane) return;
        const h3 = pane.querySelector('.panel-header h3');
        if (h3) {
            const scope = fleetSites.length > 0 ? ` — ${fleetSites.join(' / ')}` : '';
            h3.textContent = `DYNAMIC MITRE ATT&CK TACTICAL HEATMAP${scope}`;
        }
    }

    function renderMitreView(container) {
        const tactics = ['ALL', ...new Set(lastTechniques.map(t => t.tactic).filter(Boolean))];
        if (!tactics.includes(activeTacticFilter)) activeTacticFilter = 'ALL';

        const filtered = activeTacticFilter === 'ALL'
            ? lastTechniques
            : lastTechniques.filter(t => t.tactic === activeTacticFilter);

        const totalLive = lastTechniques.reduce((acc, t) => acc + Number(t.live_detections || 0), 0);
        const totalDrops = lastTechniques.reduce((acc, t) => Math.max(acc, Number(t.node_drops || 0)), 0);

        const filterPillsHtml = tactics.map(tac => {
            const isSel = tac === activeTacticFilter;
            return `
                <button class="mitre-tactic-pill" data-tactic="${escapeHtml(tac)}"
                    style="font-size:10px; font-weight:700; padding:4px 10px; border-radius:4px; cursor:pointer; font-family:monospace;
                    background:${isSel ? '#00E5FF' : '#111827'}; color:${isSel ? '#07090E' : '#94A3B8'};
                    border:1px solid ${isSel ? '#00E5FF' : '#243144'};">
                    ${escapeHtml(tac.toUpperCase())}
                </button>
            `;
        }).join('');

        const tilesHtml = filtered.length === 0
            ? `<div style="padding:18px; background:rgba(14,19,27,0.8); border:1px solid #243144; border-radius:6px; font-family:monospace; font-size:11px; color:#94A3B8;">
                    No MITRE techniques derived yet. Waiting for registered edge nodes or threat telemetry...
               </div>`
            : `<div style="display:grid; grid-template-columns:repeat(auto-fill, minmax(275px, 1fr)); gap:12px;">
                ${filtered.map(item => renderTile(item)).join('')}
               </div>`;

        const xaiHtml = renderXaiSection();

        container.innerHTML = `
            <div style="display:flex; flex-direction:column; gap:14px;">
                <!-- Summary KPI Strip -->
                <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:10px; background:rgba(7,10,15,0.8); border:1px solid #1E293B; border-radius:6px; padding:10px 14px;">
                    <div style="display:flex; gap:10px; flex-wrap:wrap; font-family:monospace; font-size:11px;">
                        <span class="badge badge-cyan">${lastTechniques.length} SCENARIO TECHNIQUES</span>
                        <span class="badge badge-green">KERNEL DROPS GUARDED: ${totalDrops}</span>
                        <span class="badge badge-purple">LIVE gRPC XAI EVENTS: ${totalLive}</span>
                    </div>
                    <div style="display:flex; gap:6px; flex-wrap:wrap;">
                        ${filterPillsHtml}
                    </div>
                </div>

                <!-- Dynamic Technique Heatmap Grid -->
                ${tilesHtml}

                <!-- Live MRD-XAI Attribution Stream -->
                ${xaiHtml}
            </div>
        `;

        container.querySelectorAll('.mitre-tactic-pill').forEach(btn => {
            btn.addEventListener('click', () => {
                activeTacticFilter = btn.getAttribute('data-tactic') || 'ALL';
                renderMitreView(container);
            });
        });
    }

    function renderTile(item) {
        const status = item.status || 'ARMED';
        const isLive = status === 'MITIGATED_LIVE';
        const isGuarded = status === 'KERNEL_GUARDED';

        const accentColor = isLive ? '#FF3366' : (isGuarded ? '#00FFA3' : '#00E5FF');
        const bg = isLive ? 'rgba(255, 51, 102, 0.10)' : (isGuarded ? 'rgba(0, 255, 163, 0.06)' : 'rgba(14, 19, 27, 0.90)');

        const targets = Array.isArray(item.targets) ? item.targets : [];
        const attacks = Array.isArray(item.attacks) ? item.attacks : [];

        return `
            <div class="mitre-tile" style="background:${bg}; border:1px solid ${accentColor}; border-radius:6px; padding:14px; display:flex; flex-direction:column; justify-content:space-between; gap:8px;">
                <div>
                    <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:6px;">
                        <span style="font-family:monospace; font-size:12px; font-weight:800; color:${accentColor};">${escapeHtml(item.technique_id)}</span>
                        <span class="badge" style="font-size:8.5px; color:${accentColor}; border:1px solid ${accentColor}; background:rgba(0,0,0,0.3);">${escapeHtml(status)}</span>
                    </div>
                    <div style="font-size:12px; font-weight:700; color:#F8FAFC; line-height:1.35;">${escapeHtml(item.name || item.technique_id)}</div>
                    <div style="font-size:10px; color:#94A3B8; margin-top:3px; font-family:monospace;">Tactic: ${escapeHtml(item.tactic || 'Defense')}</div>
                </div>

                <div style="border-top:1px solid rgba(255,255,255,0.06); padding-top:8px; font-size:10px;">
                    ${attacks.length > 0 ? `
                        <div style="color:#CBD5E1; margin-bottom:4px;">
                            <span style="color:#64748B; font-family:monospace;">Vectors:</span> ${escapeHtml(attacks.join(' | '))}
                        </div>` : ''}
                    ${targets.length > 0 ? `
                        <div style="color:#94A3B8; font-family:monospace; font-size:9.5px; margin-bottom:6px;">
                            Sentries: ${escapeHtml(targets.join(', '))}
                        </div>` : ''}
                    <div style="display:flex; justify-content:space-between; font-family:monospace; font-size:10px; color:${accentColor}; font-weight:700;">
                        <span>Live Detections: ${Number(item.live_detections || 0)}</span>
                        <span>Kernel Drops: ${Number(item.node_drops || 0)}</span>
                    </div>
                </div>
            </div>
        `;
    }

    function renderXaiSection() {
        const header = `
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:8px;">
                <span style="font-size:11px; font-weight:800; color:#A855F7; letter-spacing:0.06em;">LIVE MRD-XAI FEATURE ATTRIBUTIONS (/api/v1/threats/xai)</span>
                <span class="badge badge-purple">${lastXaiEvents.length} RECORDED</span>
            </div>
        `;

        if (lastXaiEvents.length === 0) {
            return `
                <div style="background:rgba(14,19,27,0.85); border:1px solid #243144; border-radius:6px; padding:14px;">
                    ${header}
                    <div style="font-family:monospace; font-size:10.5px; color:#8A99AD;">
                        [*] Waiting for gRPC ThreatIndicator broadcasts from edge sentries. Technique heatmap above reflects active scenario policies and eBPF drop telemetry.
                    </div>
                </div>
            `;
        }

        const rows = lastXaiEvents.slice(0, 8).map(ev => {
            const attrs = (ev.attributions || []).map(a =>
                `${escapeHtml(a.feature)} (${a.contribution_pct}%: ${escapeHtml(a.observed)} vs ${escapeHtml(a.baseline)})`
            ).join(' | ');
            return `
                <tr>
                    <td style="color:#FF3366; font-weight:700;">${escapeHtml(ev.mitre_id)}</td>
                    <td style="color:#F8FAFC;">${escapeHtml(ev.origin_node)}</td>
                    <td style="color:#00E5FF;">${escapeHtml(ev.attacker_ip)}</td>
                    <td style="color:#00FFA3;">${(Number(ev.confidence || 0) * 100).toFixed(1)}%</td>
                    <td style="color:#94A3B8;">${attrs || escapeHtml(ev.mitre_name)}</td>
                </tr>
            `;
        }).join('');

        return `
            <div style="background:rgba(14,19,27,0.85); border:1px solid #243144; border-radius:6px; padding:14px;">
                ${header}
                <table class="data-table">
                    <thead>
                        <tr>
                            <th>MITRE</th>
                            <th>ORIGIN NODE</th>
                            <th>SOURCE IP</th>
                            <th>CONFIDENCE</th>
                            <th>TOP-K XAI FEATURE ATTRIBUTION</th>
                        </tr>
                    </thead>
                    <tbody>${rows}</tbody>
                </table>
            </div>
        `;
    }

    function escapeHtml(str) {
        if (typeof str !== 'string') return String(str || '');
        return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    }

    window.updateMitreMatrix = refreshMitreAndXai;
})();