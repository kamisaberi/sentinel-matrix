// File: /home/kami/sentinel-nexus/web/js/ota_manager.js
// ============================================================================
// ARYORITHM SENTINEL NEXUS: SCENARIO-DRIVEN CANARY OTA & ROLLBACKGUARD
// Zero Hardcoding: Uses /api/v1/ota/*, /api/v1/models & /api/v1/fleet/nodes
// ============================================================================

class OtaManager {
    constructor() {
        this.stages = ['DISABLED', 'SHADOW_MODE', 'CANARY_5_PCT', 'FLEET_WIDE'];
        this.stageLabels = [
            { idx: 0, key: 'DISABLED', desc: 'No Rollout Active' },
            { idx: 1, key: 'SHADOW_MODE', desc: 'Passive Inference (0 Drops)' },
            { idx: 2, key: 'CANARY_5_PCT', desc: 'Canary Cohort Guarded' },
            { idx: 3, key: 'FLEET_WIDE', desc: 'Promoted Stable Fleet-Wide' }
        ];
        this.container = document.getElementById('ota-controls');
        this.models = [];
        this.nodes = [];
        this.otaStatus = null;
        this.rendered = false;

        this.initUI();
        this.refreshAll();
        setInterval(() => {
            const pane = document.getElementById('tab-ota');
            if (pane && pane.classList.contains('active')) {
                this.refreshAll();
            }
        }, 3000);
    }

    initUI() {
        if (!this.container) return;

        this.container.innerHTML = `
            <div style="display:flex; flex-direction:column; gap:16px;">
                <!-- 4-Stage Rollout Pipeline Stepper -->
                <div id="ota-stepper" style="display:grid; grid-template-columns:repeat(4, 1fr); gap:10px;"></div>

                <!-- Two-Column Control & RollbackGuard Grid -->
                <div style="display:grid; grid-template-columns:1.1fr 1fr; gap:16px;">
                    <!-- Left: Model Staging & Rollout Controls -->
                    <div style="background:rgba(14,19,27,0.85); border:1px solid #243144; border-radius:6px; padding:16px; display:flex; flex-direction:column; gap:12px;">
                        <div style="display:flex; justify-content:space-between; align-items:center;">
                            <span style="font-size:12px; font-weight:800; color:#00E5FF; letter-spacing:0.06em;">ROLLOUT STATE &amp; CANDIDATE STAGING</span>
                            <span class="badge badge-cyan" id="val-model-stage">STAGE: LOADING...</span>
                        </div>

                        <div style="display:grid; grid-template-columns:1fr 1fr; gap:10px; font-family:monospace; font-size:11px;">
                            <div style="background:#070A0F; border:1px solid #1E293B; border-radius:4px; padding:10px;">
                                <div style="font-size:9px; color:#8A99AD; text-transform:uppercase;">Stable Deployed Model(s)</div>
                                <div id="ota-stable-version" style="color:#00FFA3; font-weight:700; margin-top:4px; word-break:break-word;">-</div>
                            </div>
                            <div style="background:#070A0F; border:1px solid #1E293B; border-radius:4px; padding:10px;">
                                <div style="font-size:9px; color:#8A99AD; text-transform:uppercase;">Active Candidate</div>
                                <div id="ota-candidate-version" style="color:#FFB800; font-weight:700; margin-top:4px; word-break:break-word;">None</div>
                            </div>
                        </div>

                        <div style="background:#070A0F; border:1px solid #1E293B; border-radius:4px; padding:8px 10px; font-family:monospace; font-size:10px; color:#94A3B8;">
                            SHA-256 Digest: <span id="ota-candidate-sha" style="color:#00F0FF; word-break:break-all;">-</span>
                        </div>

                        <div style="display:flex; flex-direction:column; gap:6px;">
                            <label for="ota-model-select" style="font-size:10px; font-weight:700; color:#94A3B8; text-transform:uppercase; font-family:monospace;">
                                Select Candidate Model from Active Scenario Vault (/api/v1/models):
                            </label>
                            <select id="ota-model-select" class="form-select-sm" style="width:100%; padding:8px 10px; font-size:11px;"></select>
                        </div>

                        <div style="display:grid; grid-template-columns:1fr 1fr 1fr; gap:8px; margin-top:4px;">
                            <button id="btn-ota-stage" class="btn-primary" style="padding:9px 8px; font-size:10px;">1. STAGE CANDIDATE</button>
                            <button id="btn-ota-advance" class="btn-secondary" style="margin:0; padding:9px 8px; font-size:10px; border-color:#00E5FF; color:#00E5FF;">2. ADVANCE STAGE</button>
                            <button id="btn-ota-rollback" class="btn-attack btn-attack-danger" style="padding:9px 8px; font-size:10px;">[!] ROLLBACK</button>
                        </div>

                        <div id="ota-status-log" style="background:#04060A; border:1px solid #1E293B; border-radius:4px; padding:8px 10px; font-family:monospace; font-size:10px; color:#00F0FF; min-height:34px;">
                            [*] Canary OTA console synchronized.
                        </div>
                    </div>

                    <!-- Right: RollbackGuard Fleet SLA Monitor -->
                    <div style="background:rgba(14,19,27,0.85); border:1px solid #243144; border-radius:6px; padding:16px; display:flex; flex-direction:column; gap:10px;">
                        <div style="display:flex; justify-content:space-between; align-items:center;">
                            <span style="font-size:12px; font-weight:800; color:#00FFA3; letter-spacing:0.06em;">ROLLBACKGUARD SLA TELEMETRY</span>
                            <span class="badge badge-green" id="ota-guard-badge">SLA GUARD ARMED</span>
                        </div>
                        <div id="ota-guard-summary" style="font-family:monospace; font-size:10px; color:#94A3B8; background:#070A0F; border:1px solid #1E293B; border-radius:4px; padding:8px 10px;">
                            Threshold: Max Latency &le; 1000.0 µs | Auto-Rollback on Breach
                        </div>
                        <div style="overflow-y:auto; max-height:240px;">
                            <table class="data-table">
                                <thead>
                                    <tr>
                                        <th>SENTRY NODE</th>
                                        <th>STATUS</th>
                                        <th>LATENCY SLA</th>
                                        <th>DROPS</th>
                                    </tr>
                                </thead>
                                <tbody id="ota-fleet-tbody"></tbody>
                            </table>
                        </div>
                    </div>
                </div>
            </div>
        `;

        document.getElementById('btn-ota-stage')?.addEventListener('click', () => this.stageCandidate());
        document.getElementById('btn-ota-advance')?.addEventListener('click', () => this.advanceStage());
        document.getElementById('btn-ota-rollback')?.addEventListener('click', () => this.rollback());

        document.querySelectorAll('.admin-nav-item, .nav-tab').forEach(btn => {
            btn.addEventListener('click', () => {
                if (btn.getAttribute('data-tab') === 'tab-ota') {
                    this.refreshAll();
                }
            });
        });

        this.rendered = true;
    }

    async refreshAll() {
        await Promise.all([
            this.refreshStatus(),
            this.refreshModels(),
            this.refreshFleetNodes()
        ]);
    }

    async refreshStatus() {
        try {
            const res = await fetch('/api/v1/ota/status');
            if (!res.ok) return;
            const data = await res.json();
            this.otaStatus = data;

            const stageIdx = Number(data.stage ?? 0);
            const stageName = this.stages[stageIdx] || 'UNKNOWN';

            const stageBadge = document.getElementById('val-model-stage');
            if (stageBadge) stageBadge.textContent = `STAGE: ${stageName}`;

            const stableEl = document.getElementById('ota-stable-version');
            if (stableEl) stableEl.textContent = data.stable_version || 'None';

            const candEl = document.getElementById('ota-candidate-version');
            if (candEl) {
                const hasCand = data.candidate_version && data.candidate_version !== 'None';
                candEl.textContent = data.candidate_version || 'None';
                candEl.style.color = hasCand ? '#FFB800' : '#64748B';
            }

            const shaEl = document.getElementById('ota-candidate-sha');
            if (shaEl) shaEl.textContent = data.candidate_sha256 || 'No candidate staged';

            if (data.rollback_guard) {
                const g = data.rollback_guard;
                const sumEl = document.getElementById('ota-guard-summary');
                if (sumEl) {
                    sumEl.textContent = `Guard Limit: <= ${g.max_sla_latency_us} µs | Fleet Avg: ${Number(g.avg_fleet_latency_us || 0).toFixed(2)} µs | Online: ${g.online_nodes}/${g.total_nodes} | Drops: ${g.total_drops}`;
                }
            }

            this.renderStepper(stageIdx, data.candidate_version && data.candidate_version !== 'None');
        } catch (e) {
            this.logFeedback(`[-] Unable to query /api/v1/ota/status: ${e.message}`);
        }
    }

    renderStepper(activeStageIdx, candidateActive) {
        const stepper = document.getElementById('ota-stepper');
        if (!stepper) return;

        stepper.innerHTML = this.stageLabels.map(s => {
            const isCurrent = s.idx === activeStageIdx;
            const color = isCurrent ? (candidateActive && s.idx < 3 ? '#FFB800' : '#00FFA3') : '#243144';
            const bg = isCurrent ? 'rgba(0, 229, 255, 0.09)' : 'rgba(14, 19, 27, 0.65)';

            return `
                <div style="background:${bg}; border:1px solid ${color}; border-radius:4px; padding:10px 12px;">
                    <div style="display:flex; justify-content:space-between; align-items:center;">
                        <span style="font-family:monospace; font-size:10px; font-weight:800; color:${isCurrent ? color : '#94A3B8'};">STAGE ${s.idx}</span>
                        ${isCurrent ? `<span class="badge badge-cyan" style="font-size:8px;">ACTIVE</span>` : ''}
                    </div>
                    <div style="font-size:11px; font-weight:800; color:#F8FAFC; margin-top:4px; font-family:monospace;">${s.key}</div>
                    <div style="font-size:9px; color:#8A99AD; margin-top:2px;">${s.desc}</div>
                </div>
            `;
        }).join('');
    }

    async refreshModels() {
        const sel = document.getElementById('ota-model-select');
        if (!sel) return;
        const prev = sel.value;

        try {
            const res = await fetch('/api/v1/models');
            if (!res.ok) return;
            const models = await res.json();
            this.models = Array.isArray(models) ? models : [];

            if (this.models.length === 0) {
                sel.innerHTML = '<option value="">No ONNX models found in active scenario</option>';
                return;
            }

            sel.innerHTML = this.models.map(m => {
                const id = m.model_id || m.filename || m.id;
                const info = `${id} (${m.format || 'ONNX'} | ${m.size || 'N/A'} | ${m.status || 'STAGED'})`;
                return `<option value="${this.escapeHtml(id)}" ${id === prev ? 'selected' : ''}>${this.escapeHtml(info)}</option>`;
            }).join('');
        } catch (_) {}
    }

    async refreshFleetNodes() {
        const tbody = document.getElementById('ota-fleet-tbody');
        if (!tbody) return;

        try {
            const res = await fetch('/api/v1/fleet/nodes');
            if (!res.ok) return;
            const nodes = await res.json();
            this.nodes = Array.isArray(nodes) ? nodes : [];

            if (this.nodes.length === 0) {
                tbody.innerHTML = '<tr><td colspan="4" style="color:#64748B; text-align:center;">No sentries registered.</td></tr>';
                return;
            }

            let breach = false;
            tbody.innerHTML = this.nodes.map(n => {
                const lat = Number(n.mitigation_latency_us || 0);
                const over = lat > 1000.0;
                if (over) breach = true;
                const isOnline = (n.status || '').toUpperCase() === 'ONLINE';
                return `
                    <tr>
                        <td style="color:#F8FAFC; font-weight:700;">${this.escapeHtml(n.hostname || n.node_id)}</td>
                        <td><span class="badge ${isOnline ? 'badge-green' : 'badge-purple'}" style="font-size:8px;">${this.escapeHtml(n.status || 'UNKNOWN')}</span></td>
                        <td style="color:${over ? '#EF4444' : '#00FFA3'};">${lat.toFixed(2)} µs</td>
                        <td style="color:#00E5FF;">${n.ebpf_drops || 0}</td>
                    </tr>
                `;
            }).join('');

            const guardBadge = document.getElementById('ota-guard-badge');
            if (guardBadge) {
                guardBadge.textContent = breach ? 'SLA BREACH DETECTED' : 'SLA GUARD ARMED';
                guardBadge.style.color = breach ? '#EF4444' : '';
                guardBadge.style.borderColor = breach ? '#EF4444' : '';
            }
        } catch (_) {}
    }

    async stageCandidate() {
        const sel = document.getElementById('ota-model-select');
        const selectedModel = sel ? sel.value : '';
        try {
            const res = await fetch('/api/v1/ota/stage', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ model_id: selectedModel })
            });
            const data = await res.json();
            if (data.status === 'error') {
                this.logFeedback(`[-] ${data.message}`);
            } else {
                this.logFeedback(`[+] Staged ${data.model_id || selectedModel} -> ${data.stage} (SHA256: ${(data.sha256 || '').slice(0, 16)}...)`);
            }
            await this.refreshStatus();
        } catch (e) {
            this.logFeedback(`[-] Stage request failed: ${e.message}`);
        }
    }

    async advanceStage() {
        try {
            const res = await fetch('/api/v1/ota/advance', { method: 'POST' });
            const data = await res.json();
            this.logFeedback(`[+] Rollout response: ${data.status} -> ${data.stage || 'unchanged'}`);
            await this.refreshStatus();
        } catch (e) {
            this.logFeedback(`[-] Advance failed: ${e.message}`);
        }
    }

    async rollback() {
        try {
            const res = await fetch('/api/v1/ota/rollback', { method: 'POST' });
            const data = await res.json();
            this.logFeedback(`[!] ${data.status || 'Emergency Rollback Executed!'}`);
            await this.refreshStatus();
        } catch (e) {
            this.logFeedback(`[-] Rollback failed: ${e.message}`);
        }
    }

    logFeedback(msg) {
        const el = document.getElementById('ota-status-log');
        if (el) el.textContent = `[${new Date().toLocaleTimeString()}] ${msg}`;
    }

    escapeHtml(str) {
        if (typeof str !== 'string') return String(str || '');
        return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    }
}

document.addEventListener('DOMContentLoaded', () => {
    window.otaManager = new OtaManager();
});