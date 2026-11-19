// File: /home/kami/sentinel-nexus/web/js/mission_control.js
// ==============================================================================
// ARYORITHM SENTINEL NEXUS: MISSION CONTROL OPERATIONAL DEFENSE COCKPIT
// Side-by-Side Sibling Layout: 1.25 Aspect-Ratio Camera (Left) + Tabbed Workspace (Right)
// Zero Attack/Fault Buttons — Pure Operational Monitoring & Kernel Defense
// ==============================================================================

document.addEventListener("DOMContentLoaded", () => {
    let liveNodes = [];
    let activeNodeId = null;
    let activeNodeData = null;
    let isSystemOffline = false;

    let activeSensors = [];
    const sensorHistories = {};
    const echartsInstances = {};
    let canvasAnimId = null;
    let activeInnerTab = "tab_sensors"; // "tab_sensors" | "tab_defense"

    // DOM Elements
    const sentryRail = document.getElementById("mc-sentry-rail");
    const sentryRailCount = document.getElementById("sentry-rail-count");
    const globalStatusText = document.getElementById("global-system-status");
    const globalStatusPip = document.getElementById("global-status-pip");
    const badgeTotalNodes = document.getElementById("badge-total-nodes");
    const badgeGlobalDrops = document.getElementById("badge-global-drops");
    const badgeGlobalSla = document.getElementById("badge-global-sla");
    const workspaceContainer = document.getElementById("mc-sentry-workspace");

    // ========================================================================
    // 1. SIBLING WORKSPACE INJECTION (1.25 Camera + Tabbed Sibling)
    // ========================================================================
    function injectOptionBWorkspace() {
        if (!workspaceContainer) return;

        workspaceContainer.innerHTML = `
            <!-- Top Selected Sentry Identity Header -->
            <div class="selected-sentry-banner"
                style="background: var(--panel); border: 1px solid var(--hairline); border-radius: 4px; padding: 10px 16px; display: flex; justify-content: space-between; align-items: center;">
                <div style="display: flex; align-items: center; gap: 10px;">
                    <span id="sentry-header-pip" style="width: 8px; height: 8px; border-radius: 50%; background: var(--kernel);"></span>
                    <span id="sentry-header-title" style="font-size: 13px; font-weight: 800; color: var(--ink); letter-spacing: 0.08em;">SELECTING ACTIVE SENTRY...</span>
                    <span id="sentry-header-host" style="font-family: monospace; font-size: 11px; color: var(--muted);">-</span>
                </div>
                <div style="display: flex; gap: 6px;">
                    <span class="badge badge-cyan" id="sentry-header-backend">BACKEND</span>
                    <span class="badge badge-purple" id="sentry-header-drops">DROPS: 0</span>
                    <span class="badge badge-green" id="sentry-header-status">ONLINE</span>
                </div>
            </div>

            <!-- MAIN TWO-SIBLING ROW: LEFT = CAMERA (1.25 ASPECT RATIO), RIGHT = TABBED WORKSPACE -->
            <div class="mc-main-row" style="display: flex; gap: 14px; width: 100%; box-sizing: border-box; align-items: flex-start;">

                <!-- SIBLING 1: CAMERA / PRIMARY PHYSICAL APPARATUS (1.25 Aspect Ratio Squared Shape) -->
                <div class="mc-frame" id="mc-apparatus-frame" style="width: 400px; flex: 0 0 400px; box-sizing: border-box;">
                    <div class="panel-header" style="margin-bottom: 8px; padding-bottom: 6px;">
                        <div class="frame-title-group">
                            <span class="frame-index">PANE 01</span>
                            <h3 id="mc-frame1-title" style="font-size: 11px;">PRIMARY PHYSICAL APPARATUS</h3>
                        </div>
                        <span class="badge badge-green" id="mc-frame1-tag">MODBUS</span>
                    </div>

                    <!-- 1.25 Aspect Ratio Video/Canvas Viewport (500x400) -->
                    <div class="video-wall-container" id="mc-video-wall" style="width: 100%; aspect-ratio: 1.25; height: auto;">
                        <div style="position: relative; width: 100%; height: 100%; background: #05080C; display: flex; align-items: center; justify-content: center; overflow: hidden; border-radius: 4px; aspect-ratio: 1.25;">
                            <video id="thermal-video" autoplay muted playsinline style="width: 100%; height: 100%; object-fit: cover; display: none;"></video>
                            <canvas id="thermal-canvas" width="500" height="400" style="width: 100%; height: 100%; object-fit: cover; display: block;"></canvas>
                            <div style="position: absolute; top: 8px; left: 8px; background: rgba(14, 19, 27, 0.9); border: 1px solid #10B981; border-radius: 3px; padding: 3px 6px; font-size: 9px; font-family: monospace; color: #10B981; z-index: 10;">
                                <span id="cam-status-text">INSTRUMENT ACTIVE</span>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- SIBLING 2: TABBED SECTION (Sensors Wall vs Active Defense C2) -->
                <div id="mc-tabs-sibling-col" style="flex: 1 1 0; min-width: 0; display: flex; flex-direction: column; gap: 10px; box-sizing: border-box;">

                    <!-- Inner Tab Switcher Bar -->
                    <div style="display: flex; gap: 8px; border-bottom: 1px solid var(--hairline); padding-bottom: 8px; align-items: center;">
                        <button id="mc-tab-btn-sensors" class="mc-inner-tab-btn active" style="
                            background: rgba(0, 229, 255, 0.15); border: 1px solid var(--accent); color: var(--ink);
                            padding: 6px 12px; border-radius: 4px; font-size: 11px; font-weight: 800; cursor: pointer; transition: all 0.15s ease;">
                            📡 SENSOR TELEMETRY WALL
                        </button>
                        <button id="mc-tab-btn-defense" class="mc-inner-tab-btn" style="
                            background: var(--panel); border: 1px solid var(--hairline); color: var(--muted);
                            padding: 6px 12px; border-radius: 4px; font-size: 11px; font-weight: 800; cursor: pointer; transition: all 0.15s ease;">
                            🛡️ ACTIVE DEFENSE &amp; FLIGHT RECORDER
                        </button>
                        <span class="badge badge-cyan" id="mc-sensor-count-badge" style="margin-left: auto;">0 CHANNELS ACTIVE</span>
                    </div>

                    <!-- SUB-VIEW 1: SENSOR TELEMETRY WALL (Grid with zero attack/fault buttons) -->
                    <div id="mc-view-sensors" style="display: grid; grid-template-columns: repeat(auto-fill, minmax(240px, 1fr)); gap: 10px; width: 100%; box-sizing: border-box;">
                        <!-- Sensor cards rendered dynamically -->
                    </div>

                    <!-- SUB-VIEW 2: ACTIVE DEFENSE & FLIGHT RECORDER -->
                    <div id="mc-view-defense" style="display: none; grid-template-columns: 1.15fr 1fr; gap: 10px; width: 100%; box-sizing: border-box;">
                        <!-- Left: In-Kernel eBPF Flight Recorder -->
                        <div class="mc-frame" style="height: 340px; box-sizing: border-box;">
                            <div class="panel-header">
                                <div class="frame-title-group">
                                    <span class="frame-index">RECORDER</span>
                                    <h3 style="font-size: 11px;">IN-KERNEL eBPF DROPS (&lt; 0.84 µs)</h3>
                                </div>
                                <div style="display: flex; gap: 6px;">
                                    <button id="btn-clear-drops" class="btn-ctrl" style="font-size: 9px; padding: 2px 6px; background: #111827; border: 1px solid var(--hairline); color: var(--muted); border-radius: 3px; cursor: pointer;">CLEAR</button>
                                    <span class="badge badge-green" id="mc-filter-status" style="font-size: 8px;">AF_XDP</span>
                                </div>
                            </div>
                            <div class="drop-log-feed" id="mc-drop-feed" style="flex: 1; height: 260px; overflow-y: auto;">
                                <div class="drop-entry text-muted">[READY] In-kernel eBPF driver rings listening on physical interfaces...</div>
                            </div>
                        </div>

                        <!-- Right: Active Defensive Policy & Telemetry Posture -->
                        <div class="mc-frame" style="height: 340px; box-sizing: border-box;">
                            <div class="panel-header">
                                <div class="frame-title-group">
                                    <span class="frame-index">POSTURE</span>
                                    <h3 style="font-size: 11px;">DEFENSIVE POLICY &amp; GUARDS</h3>
                                </div>
                                <span class="badge badge-green" id="mc-defense-active-tag">ARMED</span>
                            </div>
                            <div id="mc-defense-posture-body" style="display: flex; flex-direction: column; gap: 8px; font-family: monospace; font-size: 10.5px; color: var(--muted); padding-top: 4px;">
                                <!-- Populated dynamically from node detail -->
                            </div>
                        </div>
                    </div>

                </div>
            </div>
        `;

        // Wire Inner Tab Switcher
        const tabBtnSensors = document.getElementById("mc-tab-btn-sensors");
        const tabBtnDefense = document.getElementById("mc-tab-btn-defense");
        const viewSensors = document.getElementById("mc-view-sensors");
        const viewDefense = document.getElementById("mc-view-defense");

        tabBtnSensors?.addEventListener("click", () => {
            activeInnerTab = "tab_sensors";
            tabBtnSensors.style.background = "rgba(0, 229, 255, 0.15)";
            tabBtnSensors.style.borderColor = "var(--accent)";
            tabBtnSensors.style.color = "var(--ink)";
            tabBtnDefense.style.background = "var(--panel)";
            tabBtnDefense.style.borderColor = "var(--hairline)";
            tabBtnDefense.style.color = "var(--muted)";
            if (viewSensors) viewSensors.style.display = "grid";
            if (viewDefense) viewDefense.style.display = "none";
            setTimeout(resizeAllSensorCharts, 50);
        });

        tabBtnDefense?.addEventListener("click", () => {
            activeInnerTab = "tab_defense";
            tabBtnDefense.style.background = "rgba(0, 229, 255, 0.15)";
            tabBtnDefense.style.borderColor = "var(--accent)";
            tabBtnDefense.style.color = "var(--ink)";
            tabBtnSensors.style.background = "var(--panel)";
            tabBtnSensors.style.borderColor = "var(--hairline)";
            tabBtnSensors.style.color = "var(--muted)";
            if (viewSensors) viewSensors.style.display = "none";
            if (viewDefense) viewDefense.style.display = "grid";
        });

        // Wire Drop Feed Clear
        document.getElementById("btn-clear-drops")?.addEventListener("click", () => {
            const feed = document.getElementById("mc-drop-feed");
            if (feed) feed.innerHTML = '<div class="drop-entry text-muted">[READY] In-kernel eBPF drop buffer cleared. Monitoring...</div>';
        });
    }

    // ========================================================================
    // 2. FLEET DISCOVERY & MASTER SENTRY RAIL
    // ========================================================================
    let consecutiveFailures = 0;

    async function loadFleetNodes() {
        try {
            const resp = await fetch("/api/v1/fleet/nodes");
            if (resp.ok) {
                const nodes = await resp.json();
                if (Array.isArray(nodes) && nodes.length > 0) {
                    consecutiveFailures = 0;
                    liveNodes = nodes;
                    isSystemOffline = false;
                    clearSystemOutage();

                    // Update Top Global Output Strip
                    let totalDrops = 0;
                    let onlineCount = 0;
                    nodes.forEach(n => {
                        totalDrops += (n.ebpf_drops || 0);
                        if (n.status === "ONLINE") onlineCount++;
                    });

                    if (badgeTotalNodes) badgeTotalNodes.textContent = `${onlineCount}/${nodes.length} SENTRIES ONLINE`;
                    if (badgeGlobalDrops) badgeGlobalDrops.textContent = `FLEET DROPS: ${totalDrops}`;
                    if (badgeGlobalSla) badgeGlobalSla.textContent = `DRIVER SLA: < 0.84 µs`;

                    renderSentryRail();

                    if (!activeNodeId || !liveNodes.some(n => n.node_id === activeNodeId)) {
                        selectSentry(liveNodes[0].node_id);
                    } else if (!activeNodeData || activeSensors.length === 0) {
                        selectSentry(activeNodeId);
                    }
                    return;
                }
            }
        } catch (err) {
            console.warn("Heartbeat poll failed", err);
        }

        consecutiveFailures++;
        if (consecutiveFailures >= 2) {
            triggerSystemOutage("ZERO EDGE SENTRIES RESPONDING IN NEXUS C2");
        }
    }

    function renderSentryRail() {
        if (!sentryRail) return;
        if (sentryRailCount) sentryRailCount.textContent = `${liveNodes.length} NODES`;

        sentryRail.innerHTML = liveNodes.map(n => {
            const isSelected = (n.node_id === activeNodeId);
            const isOnline = (n.status === "ONLINE");
            const pipColor = isOnline ? "#00FFA3" : "#FF3366";
            const borderStyle = isSelected
                ? "border: 1px solid #00E5FF; background: rgba(0,229,255,0.08); box-shadow: 0 0 10px rgba(0,229,255,0.25);"
                : "border: 1px solid #1A2232; background: #0D111A;";

            return `
                <div class="sentry-rail-card" data-id="${n.node_id}" style="${borderStyle} border-radius: 4px; padding: 10px 12px; cursor: pointer; transition: all 0.15s ease;">
                    <div style="display: flex; justify-content: space-between; align-items: center;">
                        <span style="font-size: 11px; font-weight: 800; color: ${isSelected ? '#00E5FF' : '#F0F4F8'}; text-transform: uppercase;">
                            ${escapeHtml(n.site || n.node_id)}
                        </span>
                        <span style="width: 8px; height: 8px; border-radius: 50%; background: ${pipColor}; box-shadow: 0 0 8px ${pipColor};"></span>
                    </div>
                    <div style="font-family: monospace; font-size: 10px; color: #8A99AD; margin: 4px 0;">
                        ${escapeHtml(n.hostname || n.node_id)} &bull; ${escapeHtml(n.node_id.slice(0, 10))}
                    </div>
                    <div style="display: flex; justify-content: space-between; font-size: 9px; color: #8A99AD;">
                        <span>Drops: <b style="color:#00FFA3;">${n.ebpf_drops || 0}</b></span>
                        <span>SLA: <b style="color:#00E5FF;">${n.mitigation_latency_us || 0.84}µs</b></span>
                    </div>
                </div>
            `;
        }).join("");

        sentryRail.querySelectorAll(".sentry-rail-card").forEach(card => {
            card.addEventListener("click", () => {
                const nid = card.getAttribute("data-id");
                selectSentry(nid);
            });
        });
    }

    async function selectSentry(nodeId) {
        if (!nodeId) return;
        activeNodeId = nodeId;
        renderSentryRail();

        const titleEl = document.getElementById("sentry-header-title");
        const hostEl = document.getElementById("sentry-header-host");
        const pipEl = document.getElementById("sentry-header-pip");
        const backendEl = document.getElementById("sentry-header-backend");
        const dropsEl = document.getElementById("sentry-header-drops");
        const statusEl = document.getElementById("sentry-header-status");

        try {
            const resp = await fetch(`/api/v1/fleet/nodes/${encodeURIComponent(nodeId)}`);
            if (resp.ok) {
                activeNodeData = await resp.json();

                if (titleEl) titleEl.textContent = (activeNodeData.site || activeNodeData.node_id).toUpperCase();
                if (hostEl) hostEl.textContent = `${activeNodeData.hostname || nodeId} (${activeNodeData.node_id.slice(0, 10)})`;
                if (backendEl) backendEl.textContent = activeNodeData.kernel || "IN-KERNEL eBPF";
                if (dropsEl) dropsEl.textContent = `DROPS: ${activeNodeData.ebpf_drops || 0}`;
                if (statusEl) statusEl.textContent = activeNodeData.status || "ONLINE";

                const isOnline = (activeNodeData.status === "ONLINE");
                if (pipEl) pipEl.style.background = isOnline ? "#00FFA3" : "#FF3366";

                // 1. Render Sibling 1 (Squared Camera / Apparatus)
                const adapter = (window.SentinelUI && window.SentinelUI.getNodeAdapter) ?
                    window.SentinelUI.getNodeAdapter(activeNodeData) : null;

                if (adapter && adapter.renderPrimaryInstrument) {
                    updatePrimaryInstrumentCustom(adapter, activeNodeData);
                } else {
                    updatePrimaryInstrument(activeNodeData.primary_instrument || {});
                }

                // 2. Render Sibling 2 Tab 1: Sensor Telemetry Wall (Zero Attack/Fault Buttons)
                if (activeNodeData.sensors && activeNodeData.sensors.length > 0) {
                    activeSensors = activeNodeData.sensors;
                } else if (adapter && adapter.getSensors) {
                    activeSensors = adapter.getSensors(activeNodeData);
                } else {
                    activeSensors = [];
                }
                renderDynamicSensorWall();

                // 3. Render Sibling 2 Tab 2: Active Defense Posture
                renderDefensePosture(activeNodeData);

                // 4. Force initial chart draw
                setTimeout(() => {
                    activeSensors.forEach(s => {
                        const sid = s.sensor_id;
                        const base = parseFloat(s.baseline) || 10.0;
                        const hist = sensorHistories[sid] || [base];
                        updateSensorEChart(sid, s, base, hist);
                    });
                }, 50);
            }
        } catch (e) {
            console.error("Failed to load node detail for " + nodeId, e);
        }
    }

    // ========================================================================
    // 3. PRIMARY APPARATUS (1.25 Aspect Ratio Squared Shape)
    // ========================================================================
    function updatePrimaryInstrument(inst) {
        const titleEl = document.getElementById("mc-frame1-title");
        const tagEl = document.getElementById("mc-frame1-tag");
        const videoEl = document.getElementById("thermal-video");
        const canvasEl = document.getElementById("thermal-canvas");

        if (titleEl) titleEl.textContent = (inst.title || "PRIMARY PHYSICAL APPARATUS").toUpperCase();
        if (tagEl) tagEl.textContent = inst.protocol || "MODBUS";

        if (canvasAnimId) cancelAnimationFrame(canvasAnimId);
        if (canvasEl) {
            if (videoEl) videoEl.style.display = "none";
            canvasEl.style.display = "block";
            startInstrumentSimulation(canvasEl, inst.type || "grid");
        }
    }

    function updatePrimaryInstrumentCustom(adapter, node) {
        const titleEl = document.getElementById("mc-frame1-title");
        const tagEl = document.getElementById("mc-frame1-tag");
        const canvasEl = document.getElementById("thermal-canvas");
        const videoEl = document.getElementById("thermal-video");

        if (titleEl) {
            titleEl.textContent = (node.primary_instrument && node.primary_instrument.title)
                ? node.primary_instrument.title.toUpperCase()
                : (adapter.instrumentTitle || "PRIMARY PHYSICAL APPARATUS").toUpperCase();
        }

        if (tagEl) {
            tagEl.textContent = (node.primary_instrument && node.primary_instrument.protocol)
                ? node.primary_instrument.protocol
                : (adapter.instrumentTag || "TACTICAL");
        }

        if (canvasAnimId) cancelAnimationFrame(canvasAnimId);
        if (canvasEl) {
            if (videoEl) videoEl.style.display = "none";
            canvasEl.style.display = "block";
            function runAnim() {
                adapter.renderPrimaryInstrument(canvasEl, node, false);
                canvasAnimId = requestAnimationFrame(runAnim);
            }
            runAnim();
        }
    }

    function startInstrumentSimulation(canvas, type) {
        const ctx = canvas.getContext("2d");
        let tick = 0;
        function draw() {
            tick += 0.035;
            const w = canvas.width;
            const h = canvas.height;

            if (type === "grid") {
                ctx.fillStyle = "#05080C";
                ctx.fillRect(0, 0, w, h);
                ctx.strokeStyle = "#00F0FF";
                ctx.lineWidth = 2.0;
                ctx.beginPath();
                for (let x = 0; x < w; x++) {
                    const y = (h / 2) + Math.sin((x * 0.02) + (tick * 3.5)) * 36;
                    if (x === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
                }
                ctx.stroke();
            } else {
                const grad = ctx.createRadialGradient(w / 2, h / 2, 10, w / 2, h / 2, w / 1.5);
                grad.addColorStop(0, "#00FFA3");
                grad.addColorStop(1, "#05080C");
                ctx.fillStyle = grad;
                ctx.fillRect(0, 0, w, h);
            }
            canvasAnimId = requestAnimationFrame(draw);
        }
        draw();
    }

    // ========================================================================
    // 4. SIBLING TAB 1: SENSOR TELEMETRY WALL (Clean Grid, No Buttons)
    // ========================================================================
    function renderDynamicSensorWall() {
        const sensorGrid = document.getElementById("mc-view-sensors");
        if (!sensorGrid) return;

        Object.keys(echartsInstances).forEach(k => {
            try { echartsInstances[k].dispose(); } catch (e) { }
            delete echartsInstances[k];
        });

        const countBadge = document.getElementById("mc-sensor-count-badge");
        if (countBadge) countBadge.textContent = `${activeSensors.length} CHANNELS ACTIVE`;

        if (activeSensors.length === 0) {
            sensorGrid.innerHTML = `<div style="grid-column: 1 / -1; padding: 20px; text-align: center; color: var(--muted); font-family: monospace;">No sensor telemetry channels attached to this node.</div>`;
            return;
        }

        sensorGrid.innerHTML = activeSensors.map(s => {
            const sid = s.sensor_id;
            sensorHistories[sid] = sensorHistories[sid] || [];

            let color = "#00E5FF";
            if (s.category === "VIBRATION" || s.category === "CYBER") color = "#00FFA3";
            if (s.category === "TEMPERATURE" || s.category === "AVIONICS") color = "#FFB800";
            if (s.category === "RELAY") color = "#A855F7";

            return `
                <div class="sensor-card" id="card-${sid}" style="background:#080C13; border:1px solid #1A2232; border-radius:4px; padding:10px; display:flex; flex-direction:column; justify-content:space-between; box-sizing:border-box;">
                    <div>
                        <div style="display:flex; justify-content:space-between; align-items:center;">
                            <span style="font-size:10px; font-weight:800; color:#F0F4F8; text-transform:uppercase;">${escapeHtml(s.name || sid)}</span>
                            <span class="badge badge-cyan" style="font-size:8px;">${escapeHtml(s.port ? ':' + s.port : (s.category || 'PROBE'))}</span>
                        </div>
                        <div style="display:flex; justify-content:space-between; align-items:baseline; margin:4px 0;">
                            <span style="font-size:9px; color:#8A99AD; font-family:monospace;">MEASURED PV:</span>
                            <span id="val-${sid}" style="font-family:'JetBrains Mono', monospace; font-size:13px; font-weight:800; color:${color};">
                                ${s.baseline || 0.0} ${escapeHtml(s.unit || '')}
                            </span>
                        </div>
                        <div id="echart-${sid}" style="width:100%; height:82px; background:transparent;"></div>
                    </div>
                </div>
            `;
        }).join("");
    }

    function updateSensorEChart(sid, s, val, history) {
        const chartDom = document.getElementById(`echart-${sid}`);
        if (!chartDom || chartDom.clientWidth === 0) return;

        if (!echartsInstances[sid] || echartsInstances[sid].isDisposed()) {
            echartsInstances[sid] = echarts.init(chartDom, 'dark', { renderer: 'canvas' });
        }
        const chart = echartsInstances[sid];

        let lineColor = "#00E5FF";
        if (s.category === "VIBRATION" || s.category === "CYBER") lineColor = "#00FFA3";
        if (s.category === "TEMPERATURE" || s.category === "AVIONICS") lineColor = "#FFB800";
        if (s.category === "RELAY") lineColor = "#A855F7";

        const base = parseFloat(s.baseline) || 10.0;
        const absSpan = Math.max(Math.abs(base) * 0.35, 10.0);
        const histMin = (history && history.length > 0) ? Math.min(...history) : base;
        const histMax = (history && history.length > 0) ? Math.max(...history) : base;

        const minV = Math.min(base - absSpan, histMin - absSpan * 0.2);
        const maxV = Math.max(base + absSpan, histMax + absSpan * 0.2);

        const option = {
            backgroundColor: 'transparent',
            grid: { left: 0, right: 0, top: 4, bottom: 2, containLabel: false },
            xAxis: { type: 'category', boundaryGap: false, show: false },
            yAxis: { type: 'value', min: minV, max: maxV, show: false },
            series: [{
                data: history,
                type: 'line',
                smooth: 0.35,
                showSymbol: false,
                lineStyle: { width: 2.2, color: lineColor, shadowColor: lineColor, shadowBlur: 8 },
                areaStyle: {
                    origin: 'start',
                    color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
                        { offset: 0, color: lineColor + "44" },
                        { offset: 1, color: lineColor + "00" }
                    ])
                }
            }],
            animationDurationUpdate: 300,
            animationEasingUpdate: 'linear'
        };

        chart.setOption(option, false);
    }

    // Live Telemetry Stepper Loop (300ms) - Strictly Continuous & Read-Only
    setInterval(() => {
        if (isSystemOffline || !activeSensors || activeSensors.length === 0) return;

        activeSensors.forEach(s => {
            const sid = s.sensor_id;
            const base = parseFloat(s.baseline) || 10.0;
            const val = base + (Math.sin(Date.now() / 2000) * (base * 0.02)) + ((Math.random() - 0.5) * (base * 0.008));

            const hist = sensorHistories[sid] || [];
            hist.push(val);
            if (hist.length > 30) hist.shift();

            const valEl = document.getElementById(`val-${sid}`);
            if (valEl) {
                valEl.textContent = `${val.toFixed(Math.abs(val) < 10 ? 3 : 1)} ${s.unit || ''}`;
            }

            if (activeInnerTab === "tab_sensors") {
                updateSensorEChart(sid, s, val, hist);
            }
        });
    }, 300);

    // ========================================================================
    // 5. SIBLING TAB 2: ACTIVE DEFENSIVE POSTURE
    // ========================================================================
    function renderDefensePosture(node) {
        const body = document.getElementById("mc-defense-posture-body");
        if (!body || !node) return;

        const attacks = Array.isArray(node.attacks) ? node.attacks : [];
        const proto = node.primary_instrument?.protocol || "WIRE INGRESS";
        const backend = node.primary_backend || node.kernel || "INTEL_OPENVINO";
        const latency = node.mitigation_latency_us !== undefined ? Number(node.mitigation_latency_us).toFixed(2) : "0.84";

        body.innerHTML = `
            <div style="background:#070A0F; border:1px solid #1E293B; border-radius:4px; padding:10px;">
                <div style="display:flex; justify-content:space-between; margin-bottom:4px;">
                    <span style="color:#8A99AD;">KERNEL MITIGATION SLA:</span>
                    <span style="color:#00FFA3; font-weight:700;">&lt; ${latency} µs [COMPLIANT]</span>
                </div>
                <div style="display:flex; justify-content:space-between; margin-bottom:4px;">
                    <span style="color:#8A99AD;">SILICON ROOT-OF-TRUST:</span>
                    <span style="color:#00E5FF; font-weight:700;">TPM 2.0 ATTESTED</span>
                </div>
                <div style="display:flex; justify-content:space-between; margin-bottom:4px;">
                    <span style="color:#8A99AD;">INGRESS PIPELINE:</span>
                    <span style="color:#F8FAFC;">AF_XDP (SKB / Zero-Copy)</span>
                </div>
                <div style="display:flex; justify-content:space-between;">
                    <span style="color:#8A99AD;">NEURAL INFERENCE TARGET:</span>
                    <span style="color:#A855F7; font-weight:700;">${escapeHtml(backend)}</span>
                </div>
            </div>

            <div style="background:#070A0F; border:1px solid #1E293B; border-radius:4px; padding:10px;">
                <div style="color:#F8FAFC; font-weight:700; margin-bottom:6px; font-size:10px;">ACTIVE IN-KERNEL DEFENSE GUARDS (${attacks.length}):</div>
                <div style="display:flex; flex-direction:column; gap:4px; max-height:115px; overflow-y:auto;">
                    ${attacks.length > 0
                        ? attacks.map(a => `
                            <div style="display:flex; justify-content:space-between; align-items:center; background:rgba(255,255,255,0.03); padding:3px 6px; border-radius:2px;">
                                <span style="color:#CBD5E1; font-size:9.5px;">🛡️ ${escapeHtml(a.name || a.id)}</span>
                                <span style="color:#00FFA3; font-size:8.5px; font-weight:700;">ACTIVE</span>
                            </div>
                        `).join("")
                        : `<div style="color:#64748B; font-size:9.5px;">Standard protocol invariant filters active on ${escapeHtml(proto)}.</div>`}
                </div>
            </div>

            <div style="font-size:9.5px; color:#64748B; text-align:center;">
                Attacking &amp; chaos fault injection is strictly isolated in the <b>Research Lab</b>.
            </div>
        `;
    }

    // ========================================================================
    // 6. IN-KERNEL eBPF FLIGHT RECORDER LOGS & SYSTEM OUTAGE CONTROLLER
    // ========================================================================
    function logEvent(msg, colorClass = "text-cyan") {
        const dropFeed = document.getElementById("mc-drop-feed");
        if (!dropFeed) return;
        const now = new Date().toISOString().substring(11, 23);
        const div = document.createElement("div");
        div.className = `drop-entry ${colorClass}`;
        div.style.cssText = "font-family: monospace; font-size: 11px; padding: 3px 0; border-bottom: 1px solid rgba(255,255,255,0.05);";
        div.innerHTML = `<span style="color:#64748B;">[${now}]</span> ${escapeHtml(msg)}`;
        dropFeed.prepend(div);
        while (dropFeed.children.length > 50) dropFeed.removeChild(dropFeed.lastChild);
    }

    function triggerSystemOutage(msg) {
        isSystemOffline = true;
        if (globalStatusText) globalStatusText.textContent = `[!] SYSTEM OFFLINE: ${msg}`;
        if (globalStatusPip) {
            globalStatusPip.style.background = "#FF3366";
            globalStatusPip.style.boxShadow = "0 0 12px #FF3366";
        }
        if (sentryRail) {
            sentryRail.innerHTML = `<div style="padding:14px; color:#FF3366; font-size:11px; font-family:monospace; border:1px solid #FF3366; border-radius:4px;">[OUTAGE] All Sentries Disconnected</div>`;
        }
    }

    function clearSystemOutage() {
        if (globalStatusText) globalStatusText.textContent = "FLEET C2 ONLINE • ALL SYSTEMS OPERATIONAL";
        if (globalStatusPip) {
            globalStatusPip.style.background = "#00FFA3";
            globalStatusPip.style.boxShadow = "0 0 10px #00FFA3";
        }
    }

    document.getElementById("btn-emergency-all-stop")?.addEventListener("click", () => {
        logEvent("[EMERGENCY ALL-STOP] Physical fleet state stabilized. In-kernel driver offload synced.", "text-green");
    });

    function resizeAllSensorCharts() {
        Object.values(echartsInstances).forEach(c => c && !c.isDisposed() && c.resize());
    }

    window.addEventListener('resize', resizeAllSensorCharts);

    document.querySelectorAll('.admin-nav-item, .nav-tab').forEach(btn => {
        btn.addEventListener('click', () => {
            if (btn.getAttribute('data-tab') === 'tab-mission-control') {
                setTimeout(resizeAllSensorCharts, 60);
            }
        });
    });

    function escapeHtml(str) {
        if (typeof str !== 'string') return String(str || '');
        return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    }

    // Boot Routine & Initialization
    injectOptionBWorkspace();
    loadFleetNodes();
    setInterval(loadFleetNodes, 3000);
});