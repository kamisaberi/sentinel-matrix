// File: /home/kami/sentinel-nexus/web/js/fleet_topology.js
// ============================================================================
// ARYORITHM SENTINEL NEXUS: SCENARIO-DRIVEN FLEET TOPOLOGY MAP
// Zero Hardcoding: Dynamically Discovers Sentries, Instruments & Sensors
// ============================================================================

class FleetTopologyMap {
    constructor(canvasId) {
        this.canvas = document.getElementById(canvasId);
        if (!this.canvas) return;

        this.ctx = this.canvas.getContext('2d');
        this.enclaveListEl = document.getElementById('enclave-list');
        this.enclaveCountEl = document.getElementById('fleet-enclave-count');
        this.dropFeedEl = document.getElementById('drop-log-feed');

        this.nodes = [];
        this.selectedNodeId = null;
        this.lastDropCounts = {};
        this.nodePositions = [];

        // Viewport & Animation State
        this.zoom = 1.0;
        this.panX = 0;
        this.panY = 0;
        this.isDragging = false;
        this.dragStartX = 0;
        this.dragStartY = 0;
        this.angleOffset = 0;
        this.radarAngle = 0;
        this.pulsePhase = 0;
        this.width = 0;
        this.height = 0;

        this.initControls();
        this.resize();

        window.addEventListener('resize', () => this.resize());
        if (typeof ResizeObserver !== 'undefined' && this.canvas.parentElement) {
            this.resizeObserver = new ResizeObserver(() => this.resize());
            this.resizeObserver.observe(this.canvas.parentElement);
        }

        // Refresh immediately when topology tab is selected
        document.querySelectorAll('.admin-nav-item, .nav-tab').forEach(btn => {
            btn.addEventListener('click', () => {
                if (btn.getAttribute('data-tab') === 'tab-topology') {
                    setTimeout(() => {
                        this.resize();
                        this.pollFleetNodes();
                    }, 40);
                }
            });
        });

        this.logDropFeed('[READY] Fleet Topology discovery initialized. Polling Nexus C2...', 'text-cyan');
        this.pollFleetNodes();
        setInterval(() => this.pollFleetNodes(), 3000);
        this.animate();
    }

    initControls() {
        const btnZoomIn = document.getElementById('btn-zoom-in');
        const btnZoomOut = document.getElementById('btn-zoom-out');
        const btnReset = document.getElementById('btn-reset-view');

        if (btnZoomIn) {
            btnZoomIn.addEventListener('click', () => {
                this.zoom = Math.min(2.4, +(this.zoom * 1.15).toFixed(2));
            });
        }
        if (btnZoomOut) {
            btnZoomOut.addEventListener('click', () => {
                this.zoom = Math.max(0.55, +(this.zoom / 1.15).toFixed(2));
            });
        }
        if (btnReset) {
            btnReset.addEventListener('click', () => {
                this.zoom = 1.0;
                this.panX = 0;
                this.panY = 0;
            });
        }

        this.canvas.addEventListener('wheel', (e) => {
            e.preventDefault();
            const factor = e.deltaY < 0 ? 1.1 : 0.9;
            this.zoom = Math.min(2.4, Math.max(0.55, +(this.zoom * factor).toFixed(2)));
        }, { passive: false });

        this.canvas.addEventListener('mousedown', (e) => {
            const rect = this.canvas.getBoundingClientRect();
            const mx = e.clientX - rect.left;
            const my = e.clientY - rect.top;

            // Check if user clicked a rendered sentry node
            const hit = this.nodePositions.find(p => Math.hypot(mx - p.x, my - p.y) <= 22 * this.zoom);
            if (hit) {
                this.selectNode(hit.node);
                return;
            }

            this.isDragging = true;
            this.dragStartX = e.clientX - this.panX;
            this.dragStartY = e.clientY - this.panY;
            this.canvas.style.cursor = 'grabbing';
        });

        window.addEventListener('mousemove', (e) => {
            if (!this.isDragging) return;
            this.panX = e.clientX - this.dragStartX;
            this.panY = e.clientY - this.dragStartY;
        });

        window.addEventListener('mouseup', () => {
            if (this.isDragging) {
                this.isDragging = false;
                this.canvas.style.cursor = 'default';
            }
        });
    }

    resize() {
        if (!this.canvas || !this.canvas.parentElement) return;
        const parentW = this.canvas.parentElement.clientWidth || this.canvas.parentElement.offsetWidth;
        const parentH = this.canvas.parentElement.clientHeight || this.canvas.parentElement.offsetHeight;

        if (parentW <= 20 || parentH <= 20) return;

        const dpr = window.devicePixelRatio || 1;
        this.width = parentW;
        this.height = parentH;
        this.canvas.width = Math.floor(parentW * dpr);
        this.canvas.height = Math.floor(parentH * dpr);
        this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }

    getCategoryColor(category) {
        const cat = (category || '').toUpperCase();
        if (cat.includes('RF') || cat.includes('GNSS') || cat.includes('CYBER')) return '#00F0FF';
        if (cat.includes('KINEMATIC') || cat.includes('VIBRATION')) return '#00FFA3';
        if (cat.includes('AVIONICS') || cat.includes('PRESSURE') || cat.includes('FLOW')) return '#FFB800';
        if (cat.includes('THERMAL') || cat.includes('TEMP') || cat.includes('OPTIC')) return '#EF4444';
        if (cat.includes('RELAY') || cat.includes('POWER') || cat.includes('GRID')) return '#A855F7';
        return '#38BDF8';
    }

    async pollFleetNodes() {
        try {
            const resp = await fetch('/api/v1/fleet/nodes');
            if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
            const raw = await resp.json();
            const list = Array.isArray(raw) ? raw : (raw.nodes || []);

            // Hydrate each discovered sentry with its full detail (sensors, instrument, attacks)
            const detailed = await Promise.all(
                list.map(async (n) => {
                    const nid = n.node_id || n.id;
                    try {
                        const dResp = await fetch(`/api/v1/fleet/nodes/${encodeURIComponent(nid)}`);
                        if (dResp.ok) {
                            return await dResp.json();
                        }
                    } catch (_) {
                        // Fall back to summary record if detail fetch transiently fails
                    }
                    return n;
                })
            );

            // Detect live eBPF drop counter increments for the topology drop feed
            detailed.forEach(n => {
                const nid = n.node_id || n.id;
                const drops = Number(n.ebpf_drops || 0);
                if (this.lastDropCounts[nid] !== undefined && drops > this.lastDropCounts[nid]) {
                    const delta = drops - this.lastDropCounts[nid];
                    const proto = n.primary_instrument?.protocol || 'WIRE';
                    this.logDropFeed(
                        `[XDP_DROP] +${delta} mitigated on ${n.hostname || nid} (${proto}) | SLA ${n.mitigation_latency_us || 0.84} µs`,
                        'text-green'
                    );
                }
                this.lastDropCounts[nid] = drops;
            });

            this.nodes = detailed;
            if (!this.selectedNodeId && this.nodes.length > 0) {
                this.selectedNodeId = this.nodes[0].node_id || this.nodes[0].id;
            }

            this.renderEnclaveList(this.nodes);
        } catch (err) {
            this.nodes = [];
            this.renderEnclaveList([]);
        }
    }

    selectNode(node) {
        if (!node) return;
        this.selectedNodeId = node.node_id || node.id;
        this.renderEnclaveList(this.nodes);
        const inst = node.primary_instrument?.protocol || node.primary_instrument?.type || 'EDGE';
        this.logDropFeed(
            `[INSPECT] Selected ${node.hostname || this.selectedNodeId} (${node.site || 'Enclave'}) | ${inst} | ${(node.sensors || []).length} sensors`,
            'text-cyan'
        );
    }

    renderEnclaveList(nodes) {
        if (this.enclaveCountEl) {
            this.enclaveCountEl.textContent = `${nodes.length} ENCLAVE${nodes.length === 1 ? '' : 'S'}`;
        }

        if (!this.enclaveListEl) return;

        if (!nodes || nodes.length === 0) {
            this.enclaveListEl.innerHTML = `
                <div style="background: rgba(14, 19, 27, 0.85); border: 1px solid #334155; border-radius: 6px; padding: 14px; font-family: monospace; font-size: 11px; color: #94A3B8;">
                    [AWAITING FLEET] No edge sentries registered in Nexus C2.
                </div>
            `;
            return;
        }

        this.enclaveListEl.innerHTML = '';
        nodes.forEach(n => {
            const nid = n.node_id || n.id || 'NODE';
            const isSelected = nid === this.selectedNodeId;
            const isOnline = (n.status || '').toUpperCase() === 'ONLINE';
            const statusColor = isOnline ? '#10B981' : '#EF4444';
            const sensors = Array.isArray(n.sensors) ? n.sensors : [];
            const inst = n.primary_instrument || {};

            const badgesHtml = sensors.length > 0
                ? sensors.map(s => {
                    const c = this.getCategoryColor(s.category);
                    const tag = s.port ? `:${s.port}` : (s.category || 'PROBE');
                    return `
                        <span style="display:inline-flex; align-items:center; gap:4px; background: rgba(15, 23, 42, 0.9); border: 1px solid ${c}; border-radius: 3px; padding: 2px 6px; font-size: 8.5px; font-family: monospace; color: #F8FAFC; margin-right: 4px; margin-top: 4px;">
                            <span style="width:5px; height:5px; border-radius:50%; background:${c}; display:inline-block;"></span>
                            ${this.escapeHtml(s.name || s.sensor_id)} <span style="color:#94A3B8;">(${this.escapeHtml(String(tag))})</span>
                        </span>
                    `;
                }).join('')
                : `<span style="font-size: 9px; color: #64748B; font-family: monospace;">No child telemetry channels reported</span>`;

            const card = document.createElement('div');
            card.className = 'enclave-card';
            card.style.cssText = `
                background: ${isSelected ? 'rgba(0, 229, 255, 0.08)' : 'rgba(14, 19, 27, 0.85)'};
                border: 1px solid ${isSelected ? '#00E5FF' : '#243144'};
                border-radius: 6px;
                padding: 12px;
                margin-bottom: 10px;
                cursor: pointer;
                transition: all 0.15s ease;
            `;

            card.innerHTML = `
                <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:4px;">
                    <span style="font-weight:700; font-size:12px; color:#F8FAFC; letter-spacing:0.5px;">${this.escapeHtml(n.hostname || nid)}</span>
                    <span class="badge ${isOnline ? 'badge-green' : 'badge-purple'}" style="font-size:9px; color:${statusColor}; border-color:${statusColor};">${this.escapeHtml(n.status || 'UNKNOWN')}</span>
                </div>
                <div style="font-size:10px; color:#94A3B8; margin-bottom: 4px;">
                    Enclave: <span style="color:#F1F5F9;">${this.escapeHtml(n.site || nid)}</span>
                </div>
                <div style="font-size:10px; color:#94A3B8; font-family:monospace; margin-bottom: 6px;">
                    ID: <span style="color:#00F0FF;">${this.escapeHtml(nid.slice(0, 14))}</span> &bull;
                    Drops: <span style="color:#10B981;">${n.ebpf_drops || 0}</span> &bull;
                    SLA: <span style="color:#00E5FF;">${n.mitigation_latency_us || 0.84} µs</span>
                </div>
                ${inst.protocol ? `
                <div style="font-size:9px; color:#A855F7; font-family:monospace; margin-bottom: 4px;">
                    Protocol: ${this.escapeHtml(inst.protocol)}
                </div>` : ''}
                <div style="border-top: 1px solid rgba(255,255,255,0.06); padding-top: 6px; margin-top: 4px;">
                    <div style="font-size: 8.5px; font-weight: 800; color: #64748B; text-transform: uppercase; margin-bottom: 2px;">Connected Sensors &amp; Instruments (${sensors.length}):</div>
                    <div style="display:flex; flex-wrap:wrap;">
                        ${badgesHtml}
                    </div>
                </div>
            `;

            card.addEventListener('click', () => this.selectNode(n));
            this.enclaveListEl.appendChild(card);
        });
    }

    logDropFeed(msg, colorClass = 'text-cyan') {
        if (!this.dropFeedEl) return;
        const now = new Date().toISOString().substring(11, 23);
        const div = document.createElement('div');
        div.className = `drop-entry ${colorClass}`;
        div.style.cssText = 'font-family: monospace; font-size: 10px; padding: 3px 0; border-bottom: 1px solid rgba(255,255,255,0.05);';
        div.innerHTML = `<span style="color:#64748B;">[${now}]</span> ${this.escapeHtml(msg)}`;
        this.dropFeedEl.prepend(div);
        while (this.dropFeedEl.children.length > 40) {
            this.dropFeedEl.removeChild(this.dropFeedEl.lastChild);
        }
    }

    animate() {
        this.render();
        this.radarAngle += 0.014;
        this.angleOffset += 0.0012;
        this.pulsePhase = (this.pulsePhase + 0.02) % 1.0;
        requestAnimationFrame(() => this.animate());
    }

    render() {
        if (!this.ctx) return;

        if (!this.width || !this.height || this.width <= 20 || this.height <= 20) {
            this.resize();
            if (!this.width || this.width <= 20) return;
        }

        const ctx = this.ctx;
        const w = this.width;
        const h = this.height;

        ctx.clearRect(0, 0, w, h);

        const cx = (w / 2) + this.panX;
        const cy = (h / 2) + this.panY;
        const maxRadius = Math.min(w, h) * 0.40 * this.zoom;
        if (maxRadius <= 15) return;

        // 1. Concentric Radar Rings
        ctx.strokeStyle = 'rgba(0, 240, 255, 0.10)';
        ctx.lineWidth = 1;
        const ringStep = maxRadius * 0.33;
        for (let r = ringStep; r <= maxRadius + 0.001; r += ringStep) {
            ctx.beginPath();
            ctx.arc(cx, cy, r, 0, Math.PI * 2);
            ctx.stroke();
        }

        // Crosshairs
        ctx.strokeStyle = 'rgba(0, 240, 255, 0.06)';
        ctx.beginPath();
        ctx.moveTo(cx - maxRadius, cy); ctx.lineTo(cx + maxRadius, cy);
        ctx.moveTo(cx, cy - maxRadius); ctx.lineTo(cx, cy + maxRadius);
        ctx.stroke();

        // 2. Radar Sweep Beam
        ctx.save();
        ctx.translate(cx, cy);
        ctx.rotate(this.radarAngle);
        const grad = ctx.createLinearGradient(0, 0, maxRadius, 0);
        grad.addColorStop(0, 'rgba(0, 240, 255, 0)');
        grad.addColorStop(1, 'rgba(0, 240, 255, 0.20)');
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.arc(0, 0, maxRadius, -0.22, 0);
        ctx.closePath();
        ctx.fill();
        ctx.restore();

        // 3. Central NEXUS C2 Hub (Dynamic Endpoint Label)
        const hubR = Math.max(24, 30 * this.zoom);
        ctx.fillStyle = 'rgba(14, 19, 27, 0.96)';
        ctx.beginPath();
        ctx.arc(cx, cy, hubR, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#00F0FF';
        ctx.lineWidth = 2;
        ctx.stroke();

        ctx.fillStyle = '#F8FAFC';
        ctx.font = 'bold 10px monospace';
        ctx.textAlign = 'center';
        ctx.fillText('NEXUS-C2', cx, cy - 2);
        ctx.fillStyle = '#00F0FF';
        ctx.font = '8.5px monospace';
        ctx.fillText(window.location.host || 'C2 :9443', cx, cy + 10);

        // 4. Radial Registered Edge Sentries & Child Sensors
        this.nodePositions = [];
        if (this.nodes && this.nodes.length > 0) {
            const count = this.nodes.length;
            this.nodes.forEach((node, idx) => {
                const nid = node.node_id || node.id;
                const isSelected = nid === this.selectedNodeId;
                const isOnline = (node.status || '').toUpperCase() === 'ONLINE';
                const nodeColor = isOnline ? '#10B981' : '#EF4444';

                const angle = this.angleOffset + (idx * (Math.PI * 2 / count)) - Math.PI / 2;
                const orbitR = maxRadius * 0.72;
                const nx = cx + Math.cos(angle) * orbitR;
                const ny = cy + Math.sin(angle) * orbitR;

                this.nodePositions.push({ node, x: nx, y: ny });

                // Dashed Link from Nexus to Sentry
                ctx.strokeStyle = isSelected ? 'rgba(0, 229, 255, 0.75)' : 'rgba(0, 240, 255, 0.30)';
                ctx.lineWidth = isSelected ? 2 : 1.3;
                ctx.setLineDash([4, 3]);
                ctx.beginPath();
                ctx.moveTo(cx, cy);
                ctx.lineTo(nx, ny);
                ctx.stroke();
                ctx.setLineDash([]);

                // Telemetry Pulse Packet Travelling Along Link
                if (isOnline) {
                    const t = (this.pulsePhase + idx * 0.27) % 1.0;
                    const px = cx + (nx - cx) * t;
                    const py = cy + (ny - cy) * t;
                    ctx.fillStyle = '#00F0FF';
                    ctx.beginPath();
                    ctx.arc(px, py, 2.8, 0, Math.PI * 2);
                    ctx.fill();
                }

                // Child Sensor Orbit Satellites (from node.sensors)
                const sensors = Array.isArray(node.sensors) ? node.sensors : [];
                const sensorOrbitR = Math.max(30, 36 * this.zoom);
                sensors.forEach((sensor, sIdx) => {
                    const spread = sensors.length > 1 ? 0.55 : 0;
                    const sAngle = angle + ((sIdx - (sensors.length - 1) / 2) * spread);
                    const sx = nx + Math.cos(sAngle) * sensorOrbitR;
                    const sy = ny + Math.sin(sAngle) * sensorOrbitR;
                    const sColor = this.getCategoryColor(sensor.category);

                    ctx.strokeStyle = sColor + '66';
                    ctx.lineWidth = 1;
                    ctx.beginPath();
                    ctx.moveTo(nx, ny);
                    ctx.lineTo(sx, sy);
                    ctx.stroke();

                    ctx.fillStyle = sColor;
                    ctx.beginPath();
                    ctx.arc(sx, sy, 4 * Math.min(1.2, this.zoom), 0, Math.PI * 2);
                    ctx.fill();

                    // Sensor port/ID tag when zoomed or selected
                    if (isSelected || this.zoom >= 1.15) {
                        ctx.fillStyle = '#94A3B8';
                        ctx.font = '8px monospace';
                        ctx.textAlign = 'center';
                        ctx.fillText(sensor.port ? `:${sensor.port}` : (sensor.sensor_id || ''), sx, sy - 7);
                    }
                });

                // Outer Sentry Halo
                ctx.strokeStyle = isSelected ? '#00E5FF' : nodeColor + '88';
                ctx.lineWidth = isSelected ? 2 : 1;
                ctx.beginPath();
                ctx.arc(nx, ny, 21 * Math.min(1.2, this.zoom), 0, Math.PI * 2);
                ctx.stroke();

                // Sentry Core Circle
                ctx.fillStyle = '#161F2C';
                ctx.beginPath();
                ctx.arc(nx, ny, 15 * Math.min(1.2, this.zoom), 0, Math.PI * 2);
                ctx.fill();
                ctx.strokeStyle = nodeColor;
                ctx.lineWidth = 2;
                ctx.stroke();

                // Sentry Hostname & Telemetry Sub-Label
                ctx.fillStyle = '#F8FAFC';
                ctx.font = 'bold 10px monospace';
                ctx.textAlign = 'center';
                ctx.fillText(node.hostname || nid, nx, ny - 26);

                ctx.fillStyle = '#94A3B8';
                ctx.font = '8.5px monospace';
                const protoLabel = node.primary_instrument?.protocol
                    ? node.primary_instrument.protocol.split('/')[0].trim()
                    : `${sensors.length} SENSORS`;
                ctx.fillText(`${protoLabel} | ${node.ebpf_drops || 0} drops`, nx, ny + 30);
            });
        }
    }

    escapeHtml(str) {
        if (typeof str !== 'string') return String(str || '');
        return str
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;');
    }
}

document.addEventListener('DOMContentLoaded', () => {
    window.fleetTopology = new FleetTopologyMap('topologyCanvas');
});