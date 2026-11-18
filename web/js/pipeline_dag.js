// File: /home/kami/sentinel-nexus/web/js/pipeline_dag.js
// ============================================================================
// ARYORITHM SENTINEL NEXUS: SCENARIO-DRIVEN PIPELINE DAG VISUALIZER
// Zero Hardcoding: Driven by /api/v1/fleet/nodes & /api/v1/extensions/status
// ============================================================================

class PipelineDagVisualizer {
    constructor(canvasId) {
        this.canvas = document.getElementById(canvasId);
        if (!this.canvas) return;

        this.ctx = this.canvas.getContext('2d');
        this.nodes = [];
        this.activeNodeId = null;
        this.activeNodeDetail = null;
        this.rawExtensions = [];
        this.stageHitBoxes = [];
        this.selectedStageId = null;
        this.pulsePhase = 0;
        this.logicalWidth = 0;
        this.logicalHeight = 0;

        this.injectDynamicChrome();
        this.resize();

        window.addEventListener('resize', () => {
            this.resize();
            this.draw();
        });

        if (typeof ResizeObserver !== 'undefined' && this.canvas.parentElement) {
            this.resizeObserver = new ResizeObserver(() => {
                this.resize();
                this.draw();
            });
            this.resizeObserver.observe(this.canvas.parentElement);
        }

        // Refresh immediately whenever the Pipeline DAG tab is opened
        document.querySelectorAll('.admin-nav-item, .nav-tab').forEach(btn => {
            btn.addEventListener('click', () => {
                if (btn.getAttribute('data-tab') === 'tab-pipeline') {
                    setTimeout(() => {
                        this.resize();
                        this.fetchDynamicStages();
                    }, 40);
                }
            });
        });

        this.canvas.addEventListener('click', (e) => {
            const rect = this.canvas.getBoundingClientRect();
            const mx = e.clientX - rect.left;
            const my = e.clientY - rect.top;
            const hit = this.stageHitBoxes.find(b =>
                mx >= b.x && mx <= b.x + b.w && my >= b.y && my <= b.y + b.h
            );
            if (hit) {
                this.selectedStageId = hit.stage.id;
                this.renderStageDetailStrip(hit.stage);
                this.draw();
            }
        });

        this.fetchDynamicStages();
        setInterval(() => this.fetchDynamicStages(), 4000);
        this.animate();
    }

    injectDynamicChrome() {
        const container = this.canvas.parentElement;
        if (!container || !container.parentElement) return;
        const card = container.parentElement;

        // Ensure canvas container has deterministic height
        container.style.height = '420px';
        container.style.minHeight = '420px';
        container.style.position = 'relative';

        // Update header title & badge without editing index.html
        const header = card.querySelector('.panel-header');
        if (header && !document.getElementById('dag-node-select')) {
            const h3 = header.querySelector('h3');
            if (h3) h3.textContent = 'LIVE SENSOR-TO-DEFENSE ROUTING DAG';

            const controls = document.createElement('div');
            controls.style.cssText = 'display:flex; align-items:center; gap:10px; flex-wrap:wrap;';
            controls.innerHTML = `
                <label for="dag-node-select" style="font-size:10px; font-weight:700; color:#94A3B8; font-family:monospace;">ACTIVE SENTRY:</label>
                <select id="dag-node-select" class="form-select-sm" style="min-width:210px;"></select>
                <span class="badge badge-cyan" id="dag-pipeline-badge">DISCOVERING...</span>
            `;

            // Replace static badge if present
            const oldBadge = header.querySelector('.badge');
            if (oldBadge) oldBadge.remove();
            header.appendChild(controls);

            document.getElementById('dag-node-select').addEventListener('change', (e) => {
                this.activeNodeId = e.target.value;
                this.selectedStageId = null;
                this.fetchSelectedNodeDetail();
            });
        }

        // Inject bottom live stage detail strip
        if (!document.getElementById('dag-stage-detail-strip')) {
            const strip = document.createElement('div');
            strip.id = 'dag-stage-detail-strip';
            strip.style.cssText = 'margin-top:12px; padding:10px 14px; background:rgba(7,10,15,0.85); border:1px solid #1E293B; border-radius:4px; font-family:monospace; font-size:11px; color:#94A3B8;';
            strip.textContent = 'Click any pipeline stage above to inspect live sensors, loaded plugins, or mitigation rules.';
            card.appendChild(strip);
        }
    }

    resize() {
        if (!this.canvas || !this.canvas.parentElement) return;
        const parentW = this.canvas.parentElement.clientWidth || this.canvas.parentElement.offsetWidth;
        const parentH = this.canvas.parentElement.clientHeight || this.canvas.parentElement.offsetHeight;

        if (parentW <= 20 || parentH <= 20) return;

        const dpr = window.devicePixelRatio || 1;
        this.canvas.width = Math.floor(parentW * dpr);
        this.canvas.height = Math.floor(parentH * dpr);
        this.canvas.style.width = `${parentW}px`;
        this.canvas.style.height = `${parentH}px`;

        this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        this.logicalWidth = parentW;
        this.logicalHeight = parentH;
    }

    async fetchDynamicStages() {
        try {
            const [nodesResp, extResp] = await Promise.all([
                fetch('/api/v1/fleet/nodes').catch(() => null),
                fetch('/api/v1/extensions/status').catch(() => null)
            ]);

            if (extResp && extResp.ok) {
                const extData = await extResp.json();
                this.rawExtensions = Array.isArray(extData) ? extData : (extData.extensions || []);
            } else {
                this.rawExtensions = [];
            }

            if (nodesResp && nodesResp.ok) {
                const nData = await nodesResp.json();
                this.nodes = Array.isArray(nData) ? nData : (nData.nodes || []);
                this.syncNodeSelector();
                await this.fetchSelectedNodeDetail();
            } else {
                this.nodes = [];
                this.activeNodeDetail = null;
                this.syncNodeSelector();
            }
        } catch (_) {
            // Keep UI responsive on transient disconnect
        }
        this.draw();
    }

    syncNodeSelector() {
        const sel = document.getElementById('dag-node-select');
        const badge = document.getElementById('dag-pipeline-badge');
        if (!sel) return;

        if (this.nodes.length === 0) {
            sel.innerHTML = '<option value="">No Sentries Registered</option>';
            this.activeNodeId = null;
            if (badge) badge.textContent = '0 NODES';
            return;
        }

        if (!this.activeNodeId || !this.nodes.some(n => (n.node_id || n.id) === this.activeNodeId)) {
            this.activeNodeId = this.nodes[0].node_id || this.nodes[0].id;
        }

        const prevVal = this.activeNodeId;
        sel.innerHTML = this.nodes.map(n => {
            const nid = n.node_id || n.id;
            const label = `${n.hostname || nid} (${n.site || nid})`;
            return `<option value="${this.escapeHtml(nid)}" ${nid === prevVal ? 'selected' : ''}>${this.escapeHtml(label)}</option>`;
        }).join('');
    }

    async fetchSelectedNodeDetail() {
        if (!this.activeNodeId) {
            this.activeNodeDetail = null;
            return;
        }
        try {
            const resp = await fetch(`/api/v1/fleet/nodes/${encodeURIComponent(this.activeNodeId)}`);
            if (resp.ok) {
                this.activeNodeDetail = await resp.json();
                const badge = document.getElementById('dag-pipeline-badge');
                if (badge) {
                    const proto = this.activeNodeDetail.primary_instrument?.protocol || 'ACTIVE';
                    badge.textContent = `${proto} | ${this.activeNodeDetail.status || 'ONLINE'}`;
                }
            }
        } catch (_) {
            // Retain last known detail for active node
        }
    }

    buildStageConfigs() {
        const node = this.activeNodeDetail;
        const exts = Array.isArray(this.rawExtensions) ? this.rawExtensions : [];

        // Allow micro-frontend plugins to enrich DAG metadata if present
        const pluginMeta = (window.SentinelUI && typeof window.SentinelUI.getPipelineMetadata === 'function' && node)
            ? window.SentinelUI.getPipelineMetadata(node)
            : null;

        const nativeExts = exts.filter(e => ((e.tier || '') + (e.type || '')).toLowerCase().includes('native'));
        const luaExts = exts.filter(e => ((e.tier || '') + (e.type || '')).toLowerCase().includes('lua'));
        const wasmExts = exts.filter(e => ((e.tier || '') + (e.type || '')).toLowerCase().includes('wasm'));

        if (!node) {
            return [
                { id: 'S0', title: 'INGRESS', sub: 'Awaiting registered sentry', tag: '0 CHANNELS', color: '#64748B', details: 'No edge sentry nodes currently registered in Nexus C2.' },
                { id: 'S1', title: 'STAGE 1: RULES', sub: `${luaExts.length + wasmExts.length} Rule(s)`, tag: 'IDLE', color: '#64748B', details: 'Waiting for runtime telemetry.' },
                { id: 'S2', title: 'STAGE 2: DISSECTOR', sub: `${nativeExts.length} Native Plugin(s)`, tag: 'IDLE', color: '#64748B', details: 'Waiting for runtime telemetry.' },
                { id: 'S3', title: 'STAGE 3: EVALUATION', sub: 'No active model/node', tag: 'IDLE', color: '#64748B', details: 'Waiting for runtime telemetry.' },
                { id: 'S4', title: 'STAGE 4: MITIGATION', sub: '0 Drops', tag: 'OFFLINE', color: '#64748B', details: 'Waiting for runtime telemetry.' }
            ];
        }

        const sensors = Array.isArray(node.sensors) ? node.sensors : [];
        const attacks = Array.isArray(node.attacks) ? node.attacks : [];
        const inst = node.primary_instrument || {};
        const protoShort = inst.protocol ? inst.protocol.split('/')[0].trim() : 'WIRE INGEST';

        const pkts = Number(node.packets_inspected || 0);
        const drops = Number(node.ebpf_drops || 0);
        const slaUs = node.mitigation_latency_us !== undefined ? Number(node.mitigation_latency_us).toFixed(2) : '0.00';

        // Stage 1: Lua / Wasm Rules (strictly real counts)
        const ruleExts = [...luaExts, ...wasmExts];
        const s1Sub = ruleExts.length > 0
            ? ruleExts.map(r => r.name || r.id || 'Rule').slice(0, 2).join(', ')
            : `${luaExts.length} Lua | ${wasmExts.length} Wasm`;
        const s1Tag = ruleExts.length > 0 && ruleExts[0].latency_ns
            ? `${ruleExts[0].latency_ns} ns`
            : `${ruleExts.length} ACTIVE`;

        // Stage 2: Native Dissectors (strictly real counts — no +1)
        const s2Sub = nativeExts.length > 0
            ? nativeExts.map(n => n.name || n.plugin_id || n.id || 'Native Plugin').slice(0, 1)[0]
            : `${protoShort} Dissector`;
        const s2Tag = nativeExts.length > 0
            ? `${nativeExts.length} NATIVE`
            : `${slaUs} µs SLA`;

        // Stage 3: Model / Apparatus Evaluation
        const modelLabel = pluginMeta?.modelId
            || node.active_model_name
            || (inst.type ? `Apparatus: ${inst.type.toUpperCase()}` : `Kernel ${node.kernel || 'Linux'}`);
        const s3Tag = `CPU ${Number(node.cpu_pct || 0).toFixed(1)}%`;

        // Stage 4: Mitigation & Fusion
        const s4Sub = `${attacks.length} Contextual Guard${attacks.length === 1 ? '' : 's'}`;
        const s4Tag = `${drops} DROPS`;

        return [
            {
                id: 'S0',
                title: 'SENSOR INGEST',
                sub: `${protoShort} (${sensors.length} channels)`,
                tag: `${pkts.toLocaleString()} PKTS`,
                color: '#94A3B8',
                details: `Node: ${node.hostname || node.node_id} | Protocol: ${inst.protocol || 'N/A'} | Channels: ${sensors.map(s => `${s.sensor_id}(${s.port ? ':' + s.port : s.unit})`).join(', ') || 'None'}`
            },
            {
                id: 'S1',
                title: 'STAGE 1: RULES',
                sub: s1Sub,
                tag: s1Tag,
                color: ruleExts.length > 0 ? '#10B981' : '#64748B',
                details: ruleExts.length > 0
                    ? `Active LuaJIT/Wasm Rules (${ruleExts.length}): ${ruleExts.map(r => r.name || r.id).join(', ')}`
                    : `0 LuaJIT / 0 Wasm sandboxed rules loaded on ${node.hostname || node.node_id}.`
            },
            {
                id: 'S2',
                title: 'STAGE 2: REFLEX',
                sub: s2Sub,
                tag: s2Tag,
                color: '#00B4D8',
                details: nativeExts.length > 0
                    ? `Active Native C++20 Plugins (${nativeExts.length}): ${nativeExts.map(n => n.name || n.id).join(', ')}`
                    : `Protocol guard active for ${inst.protocol || 'node ingress'} | Driver SLA: ${slaUs} µs.`
            },
            {
                id: 'S3',
                title: 'STAGE 3: AI / CORE',
                sub: modelLabel,
                tag: s3Tag,
                color: '#00F0FF',
                details: `Site: ${node.site || 'N/A'} | Kernel: ${node.kernel || 'N/A'} | RAM: ${Number(node.ram_mb || 0).toFixed(0)} MB | CPU: ${Number(node.cpu_pct || 0).toFixed(1)}%`
            },
            {
                id: 'S4',
                title: 'STAGE 4: MITIGATION',
                sub: s4Sub,
                tag: s4Tag,
                color: '#A855F7',
                details: `Active Threat Vectors (${attacks.length}): ${attacks.map(a => a.name || a.id).join(', ') || 'None'} | Total Drops: ${drops}`
            }
        ];
    }

    renderStageDetailStrip(stage) {
        const strip = document.getElementById('dag-stage-detail-strip');
        if (!strip || !stage) return;
        strip.innerHTML = `<span style="color:${stage.color}; font-weight:800;">[${stage.id} - ${this.escapeHtml(stage.title)}]</span> ${this.escapeHtml(stage.details)}`;
    }

    animate() {
        this.pulsePhase = (this.pulsePhase + 0.018) % 1.0;
        if (this.logicalWidth > 20) {
            this.draw();
        }
        requestAnimationFrame(() => this.animate());
    }

    draw() {
        if (!this.canvas || !this.ctx) return;
        if (!this.logicalWidth || this.logicalWidth < 100) {
            this.resize();
            if (!this.logicalWidth || this.logicalWidth < 100) return;
        }

        const ctx = this.ctx;
        const w = this.logicalWidth;
        const h = this.logicalHeight;

        ctx.clearRect(0, 0, w, h);

        // Subtle technical grid
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.03)';
        ctx.lineWidth = 1;
        for (let x = 0; x < w; x += 40) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, h); ctx.stroke(); }
        for (let y = 0; y < h; y += 40) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke(); }

        const stageConfigs = this.buildStageConfigs();
        const totalStages = stageConfigs.length;
        const marginX = 32;
        const totalSpan = w - marginX * 2;
        const nodeW = Math.min(185, (totalSpan / totalStages) - 24);
        const nodeH = 82;
        const centerY = h * 0.42;
        const gap = (totalSpan - (totalStages * nodeW)) / (totalStages - 1);

        const nodes = stageConfigs.map((cfg, idx) => {
            const x = marginX + (idx * (nodeW + gap));
            return { ...cfg, x, y: centerY - (nodeH / 2), w: nodeW, h: nodeH, cx: x + (nodeW / 2), cy: centerY };
        });

        this.stageHitBoxes = nodes.map(n => ({ stage: n, x: n.x, y: n.y, w: n.w, h: n.h }));

        const isOnline = (this.activeNodeDetail?.status || '').toUpperCase() === 'ONLINE';

        // 1. Directional Wires & Animated Packet Flow
        for (let i = 0; i < nodes.length - 1; i++) {
            const from = nodes[i];
            const to = nodes[i + 1];
            const x1 = from.x + from.w;
            const x2 = to.x;

            ctx.strokeStyle = 'rgba(0, 240, 255, 0.16)';
            ctx.lineWidth = 4;
            ctx.beginPath();
            ctx.moveTo(x1, from.cy);
            ctx.lineTo(x2, to.cy);
            ctx.stroke();

            ctx.strokeStyle = isOnline ? '#00F0FF' : '#475569';
            ctx.lineWidth = 1.5;
            ctx.beginPath();
            ctx.moveTo(x1, from.cy);
            ctx.lineTo(x2, to.cy);
            ctx.stroke();

            // Moving pulse along wire when online
            if (isOnline) {
                const t = (this.pulsePhase + i * 0.2) % 1.0;
                const px = x1 + (x2 - x1) * t;
                ctx.fillStyle = '#00FFA3';
                ctx.beginPath();
                ctx.arc(px, from.cy, 3, 0, Math.PI * 2);
                ctx.fill();
            }

            // Arrowhead
            const arrowX = x2 - 4;
            ctx.fillStyle = isOnline ? '#00F0FF' : '#475569';
            ctx.beginPath();
            ctx.moveTo(arrowX, to.cy);
            ctx.lineTo(arrowX - 6, to.cy - 4);
            ctx.lineTo(arrowX - 6, to.cy + 4);
            ctx.closePath();
            ctx.fill();
        }

        // 2. Short-Circuit Kernel Drop Branch under Stage 2 (Reflex Gate)
        const s2 = nodes[2];
        const dropY = s2.cy + 84;
        const drops = Number(this.activeNodeDetail?.ebpf_drops || 0);
        const slaUs = this.activeNodeDetail?.mitigation_latency_us !== undefined
            ? Number(this.activeNodeDetail.mitigation_latency_us).toFixed(2)
            : '0.00';

        ctx.strokeStyle = 'rgba(239, 68, 68, 0.7)';
        ctx.lineWidth = 1.5;
        ctx.setLineDash([4, 4]);
        ctx.beginPath();
        ctx.moveTo(s2.cx, s2.y + s2.h);
        ctx.lineTo(s2.cx, dropY);
        ctx.stroke();
        ctx.setLineDash([]);

        ctx.fillStyle = 'rgba(239, 68, 68, 0.14)';
        ctx.strokeStyle = '#EF4444';
        ctx.lineWidth = 1.2;
        const dropBoxW = 190;
        const dropBoxH = 40;
        const dropBoxX = s2.cx - (dropBoxW / 2);
        this._roundRect(ctx, dropBoxX, dropY, dropBoxW, dropBoxH, 4, true, true);

        ctx.fillStyle = '#EF4444';
        ctx.font = 'bold 10px monospace';
        ctx.textAlign = 'center';
        ctx.fillText(`KERNEL_DROP (${slaUs} µs SLA)`, s2.cx, dropY + 16);
        ctx.fillStyle = '#FCA5A5';
        ctx.font = '9px monospace';
        ctx.fillText(`${drops} Blocked \u2022 Zero-Copy Bypass`, s2.cx, dropY + 30);

        // 3. Child Sensor Feed Pills under S0
        const s0 = nodes[0];
        const sensors = Array.isArray(this.activeNodeDetail?.sensors) ? this.activeNodeDetail.sensors : [];
        if (sensors.length > 0) {
            const startY = s0.y + s0.h + 18;
            sensors.slice(0, 4).forEach((s, idx) => {
                const sy = startY + idx * 22;
                ctx.strokeStyle = 'rgba(0, 240, 255, 0.25)';
                ctx.lineWidth = 1;
                ctx.beginPath();
                ctx.moveTo(s0.cx, s0.y + s0.h);
                ctx.lineTo(s0.cx, sy + 8);
                ctx.lineTo(s0.x + 12, sy + 8);
                ctx.stroke();

                ctx.fillStyle = 'rgba(14, 19, 27, 0.9)';
                ctx.strokeStyle = '#243144';
                this._roundRect(ctx, s0.x, sy, s0.w, 17, 3, true, true);

                ctx.fillStyle = '#CBD5E1';
                ctx.font = '8.5px monospace';
                ctx.textAlign = 'left';
                const label = `${s.sensor_id}${s.port ? ' :' + s.port : ''}`;
                ctx.fillText(this._truncateText(ctx, label, s0.w - 10), s0.x + 5, sy + 11.5);
            });
        }

        // 4. Draw Stage Cards
        nodes.forEach(st => {
            const isSel = st.id === this.selectedStageId;
            ctx.fillStyle = isSel ? 'rgba(0, 229, 255, 0.10)' : 'rgba(14, 19, 27, 0.95)';
            ctx.strokeStyle = isSel ? '#00F0FF' : st.color;
            ctx.lineWidth = isSel ? 2.2 : 1.5;
            this._roundRect(ctx, st.x, st.y, st.w, st.h, 6, true, true);

            // Header strip
            ctx.fillStyle = 'rgba(255, 255, 255, 0.05)';
            this._roundRect(ctx, st.x, st.y, st.w, 22, 6, true, false);

            ctx.fillStyle = st.color;
            ctx.font = 'bold 9.5px monospace';
            ctx.textAlign = 'left';
            ctx.fillText(st.id, st.x + 8, st.y + 15);

            ctx.fillStyle = '#F8FAFC';
            ctx.font = 'bold 8.5px monospace';
            ctx.textAlign = 'right';
            ctx.fillText(st.tag, st.x + st.w - 8, st.y + 15);

            ctx.fillStyle = '#F8FAFC';
            ctx.font = 'bold 10px monospace';
            ctx.textAlign = 'center';
            ctx.fillText(this._truncateText(ctx, st.title, st.w - 12), st.cx, st.y + 42);

            ctx.fillStyle = '#94A3B8';
            ctx.font = '9px sans-serif';
            ctx.fillText(this._truncateText(ctx, st.sub, st.w - 14), st.cx, st.y + 60);
        });
    }

    _truncateText(ctx, text, maxW) {
        if (!text) return '';
        if (ctx.measureText(text).width <= maxW) return text;
        let s = text;
        while (s.length > 3 && ctx.measureText(s + '...').width > maxW) {
            s = s.slice(0, -1);
        }
        return s + '...';
    }

    _roundRect(ctx, x, y, width, height, radius, fill, stroke) {
        if (ctx.roundRect) {
            ctx.beginPath();
            ctx.roundRect(x, y, width, height, radius);
            if (fill) ctx.fill();
            if (stroke) ctx.stroke();
            return;
        }
        ctx.beginPath();
        ctx.moveTo(x + radius, y);
        ctx.lineTo(x + width - radius, y);
        ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
        ctx.lineTo(x + width, y + height - radius);
        ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
        ctx.lineTo(x + radius, y + height);
        ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
        ctx.lineTo(x, y + radius);
        ctx.quadraticCurveTo(x, y, x + radius, y);
        ctx.closePath();
        if (fill) ctx.fill();
        if (stroke) ctx.stroke();
    }

    escapeHtml(str) {
        if (typeof str !== 'string') return String(str || '');
        return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    }
}

document.addEventListener('DOMContentLoaded', () => {
    window.dagVisualizer = new PipelineDagVisualizer('pipelineDagCanvas');
});