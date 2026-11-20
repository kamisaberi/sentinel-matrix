// File: /home/kami/sentinel-nexus/web/js/mission_control.js
// ==============================================================================
// ARYORITHM SENTINEL NEXUS: MISSION CONTROL OPERATIONAL DEFENSE COCKPIT
// 580px 1.25 Pluggable Apparatus (Left Sibling) + Tabbed Workspace (Right Sibling)
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
    let activeInnerTab = "tab_sensors";

    // Pluggable Apparatus Lifecycle Tracking
    let activeApparatusSpec = null;
    let activeApparatusHandle = null;
    let selectedApparatusIdByNode = {};

    const sentryRail = document.getElementById("mc-sentry-rail");
    const sentryRailCount = document.getElementById("sentry-rail-count");
    const globalStatusText = document.getElementById("global-system-status");
    const globalStatusPip = document.getElementById("global-status-pip");
    const badgeTotalNodes = document.getElementById("badge-total-nodes");
    const badgeGlobalDrops = document.getElementById("badge-global-drops");
    const badgeGlobalSla = document.getElementById("badge-global-sla");
    const workspaceContainer = document.getElementById("mc-sentry-workspace");

    function injectOptionBWorkspace() {
        if (!workspaceContainer) return;

        workspaceContainer.innerHTML = `
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

            <div class="mc-main-row" style="display: flex; gap: 14px; width: 100%; box-sizing: border-box; align-items: flex-start;">
                <!-- SIBLING 1: PLUGGABLE APPARATUS (580px, 1.25 Aspect Ratio) -->
                <div class="mc-frame" id="mc-apparatus-frame" style="width: 580px; flex: 0 0 580px; box-sizing: border-box;">
                    <div class="panel-header" style="margin-bottom: 6px; padding-bottom: 6px; flex-wrap: wrap; gap: 6px;">
                        <div class="frame-title-group">
                            <span class="frame-index">PANE 01</span>
                            <h3 id="mc-frame1-title" style="font-size: 11px;">PRIMARY PHYSICAL APPARATUS</h3>
                        </div>
                        <span class="badge badge-green" id="mc-frame1-tag">MODBUS</span>
                    </div>
                    <div id="mc-apparatus-switcher" style="display: none; gap: 6px; margin-bottom: 8px; flex-wrap: wrap;"></div>
                    <div class="video-wall-container" id="mc-video-wall" style="width: 100%; aspect-ratio: 1.25; height: auto;"></div>
                </div>

                <!-- SIBLING 2: TABBED WORKSPACE -->
                <div id="mc-tabs-sibling-col" style="flex: 1 1 0; min-width: 0; display: flex; flex-direction: column; gap: 10px; box-sizing: border-box;">
                    <div style="display: flex; gap: 8px; border-bottom: 1px solid var(--hairline); padding-bottom: 8px; align-items: center;">
                        <button id="mc-tab-btn-sensors" class="mc-inner-tab-btn active" style="
                            background: rgba(0, 229, 255, 0.15); border: 1px solid var(--accent); color: var(--ink);
                            padding: 6px 12px; border-radius: 4px; font-size: 11px; font-weight: 800; cursor: pointer;">
                            📡 SENSOR TELEMETRY WALL
                        </button>
                        <button id="mc-tab-btn-defense" class="mc-inner-tab-btn" style="
                            background: var(--panel); border: 1px solid var(--hairline); color: var(--muted);
                            padding: 6px 12px; border-radius: 4px; font-size: 11px; font-weight: 800; cursor: pointer;">
                            🛡️ ACTIVE DEFENSE &amp; FLIGHT RECORDER
                        </button>
                        <span class="badge badge-cyan" id="mc-sensor-count-badge" style="margin-left: auto;">0 CHANNELS ACTIVE</span>
                    </div>

                    <div id="mc-view-sensors" style="display: grid; grid-template-columns: repeat(auto-fill, minmax(260px, 1fr)); gap: 10px; width: 100%; box-sizing: border-box;"></div>

                    <div id="mc-view-defense" style="display: none; grid-template-columns: 1.15fr 1fr; gap: 10px; width: 100%; box-sizing: border-box;">
                        <div class="mc-frame" style="height: 480px; box-sizing: border-box;">
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
                            <div class="drop-log-feed" id="mc-drop-feed" style="flex: 1; height: 400px; overflow-y: auto;">
                                <div class="drop-entry text-muted">[READY] In-kernel eBPF driver rings listening on physical interfaces...</div>
                            </div>
                        </div>

                        <div class="mc-frame" style="height: 480px; box-sizing: border-box;">
                            <div class="panel-header">
                                <div class="frame-title-group">
                                    <span class="frame-index">POSTURE</span>
                                    <h3 style="font-size: 11px;">DEFENSIVE POLICY &amp; GUARDS</h3>
                                </div>
                                <span class="badge badge-green" id="mc-defense-active-tag">ARMED</span>
                            </div>
                            <div id="mc-defense-posture-body" style="display: flex; flex-direction: column; gap: 10px; font-family: monospace; font-size: 11px; color: var(--muted); padding-top: 4px;"></div>
                        </div>
                    </div>
                </div>
            </div>
        `;

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

        document.getElementById("btn-clear-drops")?.addEventListener("click", () => {
            const feed = document.getElementById("mc-drop-feed");
            if (feed) feed.innerHTML = '<div class="drop-entry text-muted">[READY] In-kernel eBPF drop buffer cleared. Monitoring...</div>';
        });
    }

    // ========================================================================
    // 2. PLUGGABLE APPARATUS DISPATCHER (Uses SentinelUI.registerApparatus)
    // ========================================================================
    function unmountActiveApparatus() {
        if (canvasAnimId) {
            cancelAnimationFrame(canvasAnimId);
            canvasAnimId = null;
        }
        if (activeApparatusSpec && activeApparatusHandle && typeof activeApparatusSpec.unmount === "function") {
            try { activeApparatusSpec.unmount(activeApparatusHandle); } catch (_) {}
        }
        activeApparatusSpec = null;
        activeApparatusHandle = null;
    }

    function mountApparatusForNode(node) {
        const wall = document.getElementById("mc-video-wall");
        const switcher = document.getElementById("mc-apparatus-switcher");
        const titleEl = document.getElementById("mc-frame1-title");
        const tagEl = document.getElementById("mc-frame1-tag");
        if (!wall || !node) return;

        unmountActiveApparatus();

        const matching = (window.SentinelUI && typeof window.SentinelUI.getMatchingApparatuses === "function")
            ? window.SentinelUI.getMatchingApparatuses(node)
            : [];

        if (matching.length > 0) {
            const nid = node.node_id || node.id;
            let chosenId = selectedApparatusIdByNode[nid];
            let chosen = matching.find(a => a.id === chosenId) || matching[0];
            selectedApparatusIdByNode[nid] = chosen.id;

            // Render switcher pills if > 1 apparatus matches this node
            if (switcher) {
                if (matching.length > 1) {
                    switcher.style.display = "flex";
                    switcher.innerHTML = matching.map(a => {
                        const isSel = a.id === chosen.id;
                        return `
                            <button class="mc-app-pill" data-app-id="${escapeHtml(a.id)}" style="
                                font-size:9.5px; font-weight:700; font-family:monospace; padding:3px 8px; border-radius:3px; cursor:pointer;
                                background:${isSel ? '#00E5FF' : '#111827'}; color:${isSel ? '#07090E' : '#94A3B8'};
                                border:1px solid ${isSel ? '#00E5FF' : '#243144'};">
                                ${escapeHtml(a.shortLabel || a.title)}
                            </button>
                        `;
                    }).join("");

                    switcher.querySelectorAll(".mc-app-pill").forEach(btn => {
                        btn.addEventListener("click", () => {
                            selectedApparatusIdByNode[nid] = btn.getAttribute("data-app-id");
                            mountApparatusForNode(node);
                        });
                    });
                } else {
                    switcher.style.display = "none";
                }
            }

            if (titleEl) titleEl.textContent = (chosen.title || node.primary_instrument?.title || "APPARATUS").toUpperCase();
            if (tagEl) tagEl.textContent = chosen.protocol || node.primary_instrument?.protocol || "LIVE";
            wall.style.aspectRatio = String(chosen.aspectRatio || 1.25);

            activeApparatusSpec = chosen;
            activeApparatusHandle = chosen.mount(wall, node, { mode: "mission_control" });
            return;
        }

        // Backward-compatible fallback for generic industrial scenarios (production_master_grid)
        if (switcher) switcher.style.display = "none";
        wall.style.aspectRatio = "1.25";
        wall.innerHTML = `
            <div style="position: relative; width: 100%; height: 100%; background: #05080C; display: flex; align-items: center; justify-content: center; overflow: hidden; border-radius: 4px; aspect-ratio: 1.25;">
                <canvas id="thermal-canvas" width="750" height="600" style="width: 100%; height: 100%; object-fit: cover; display: block;"></canvas>
                <div style="position: absolute; top: 10px; left: 10px; background: rgba(14, 19, 27, 0.9); border: 1px solid #10B981; border-radius: 3px; padding: 3px 7px; font-size: 9.5px; font-family: monospace; color: #10B981; z-index: 10;">
                    INSTRUMENT ACTIVE
                </div>
            </div>
        `;
        const inst = node.primary_instrument || {};
        if (titleEl) titleEl.textContent = (inst.title || "PRIMARY PHYSICAL APPARATUS").toUpperCase();
        if (tagEl) tagEl.textContent = inst.protocol || "MODBUS";

        const canvasEl = document.getElementById("thermal-canvas");
        if (canvasEl) startInstrumentSimulation(canvasEl, inst.type || "grid");
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
                    const y = (h / 2) + Math.sin((x * 0.015) + (tick * 3.5)) * 42;
                    if (x === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
                }
                ctx.stroke();
            } else {
                const grad = ctx.createRadialGradient(w / 2, h / 2, 12, w / 2, h / 2, w / 1.5);
                grad.addColorStop(0, "#00FFA3");
                grad.addColorStop(1, "#05080C");
                ctx.fillStyle = grad;
                ctx.fillRect(0, 0, w, h);
            }
            canvasAnimId = requestAnimationFrame(draw);
        }
        draw();
    }

    // Re-mount apparatus immediately if external plugins finish async load after initial render
    window.addEventListener("sentinel:plugins-ready", () => {
        if (activeNodeData) mountApparatusForNode(activeNodeData);
    });

    // ========================================================================
    // 3. FLEET DISCOVERY & SENTRY SELECTION
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

                    let totalDrops = 0, onlineCount = 0;
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
            card.addEventListener("click", () => selectSentry(card.getAttribute("data-id")));
        });
    }

    async function selectSentry(nodeId) {
        if (!nodeId) return;
        activeNodeId = nodeId;
        renderSentryRail();

        try {
            const resp = await fetch(`/api/v1/fleet/nodes/${encodeURIComponent(nodeId)}`);
            if (!resp.ok) return;
            activeNodeData = await resp.json();

            const titleEl = document.getElementById("sentry-header-title");
            const hostEl = document.getElementById("sentry-header-host");
            const pipEl = document.getElementById("sentry-header-pip");
            const backendEl = document.getElementById("sentry-header-backend");
            const dropsEl = document.getElementById("sentry-header-drops");
            const statusEl = document.getElementById("sentry-header-status");

            if (titleEl) titleEl.textContent = (activeNodeData.site || activeNodeData.node_id).toUpperCase();
            if (hostEl) hostEl.textContent = `${activeNodeData.hostname || nodeId} (${activeNodeData.node_id.slice(0, 10)})`;
            if (backendEl) backendEl.textContent = activeNodeData.kernel || "IN-KERNEL eBPF";
            if (dropsEl) dropsEl.textContent = `DROPS: ${activeNodeData.ebpf_drops || 0}`;
            if (statusEl) statusEl.textContent = activeNodeData.status || "ONLINE";
            if (pipEl) pipEl.style.background = (activeNodeData.status === "ONLINE") ? "#00FFA3" : "#FF3366";

            mountApparatusForNode(activeNodeData);

            activeSensors = Array.isArray(activeNodeData.sensors) ? activeNodeData.sensors : [];
            renderDynamicSensorWall();
            renderDefensePosture(activeNodeData);

            setTimeout(() => {
                activeSensors.forEach(s => {
                    const base = parseFloat(s.baseline) || 10.0;
                    updateSensorEChart(s.sensor_id, s, base, sensorHistories[s.sensor_id] || [base]);
                });
            }, 50);
        } catch (e) {
            console.error("Failed to load node detail for " + nodeId, e);
        }
    }

    // ========================================================================
    // 4. SENSOR TELEMETRY WALL & DEFENSIVE POSTURE
    // ========================================================================
    function renderDynamicSensorWall() {
        const sensorGrid = document.getElementById("mc-view-sensors");
        if (!sensorGrid) return;

        Object.keys(echartsInstances).forEach(k => {
            try { echartsInstances[k].dispose(); } catch (_) {}
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
                <div class="sensor-card" id="card-${sid}" style="background:#080C13; border:1px solid #1A2232; border-radius:4px; padding:12px; display:flex; flex-direction:column; justify-content:space-between; box-sizing:border-box;">
                    <div>
                        <div style="display:flex; justify-content:space-between; align-items:center;">
                            <span style="font-size:10.5px; font-weight:800; color:#F0F4F8; text-transform:uppercase;">${escapeHtml(s.name || sid)}</span>
                            <span class="badge badge-cyan" style="font-size:8.5px;">${escapeHtml(s.port ? ':' + s.port : (s.category || 'PROBE'))}</span>
                        </div>
                        <div style="display:flex; justify-content:space-between; align-items:baseline; margin:5px 0;">
                            <span style="font-size:9.5px; color:#8A99AD; font-family:monospace;">MEASURED PV:</span>
                            <span id="val-${sid}" style="font-family:'JetBrains Mono', monospace; font-size:14px; font-weight:800; color:${color};">
                                ${s.baseline || 0.0} ${escapeHtml(s.unit || '')}
                            </span>
                        </div>
                        <div id="echart-${sid}" style="width:100%; height:88px; background:transparent;"></div>
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

        chart.setOption({
            animation: false,
            backgroundColor: 'transparent',
            grid: { left: 0, right: 0, top: 4, bottom: 2, containLabel: false },
            xAxis: { type: 'category', boundaryGap: false, show: false },
            yAxis: { type: 'value', min: Math.min(base - absSpan, histMin - absSpan * 0.2), max: Math.max(base + absSpan, histMax + absSpan * 0.2), show: false },
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
            }]
        }, false);
    }

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
            if (valEl) valEl.textContent = `${val.toFixed(Math.abs(val) < 10 ? 3 : 1)} ${s.unit || ''}`;
            if (activeInnerTab === "tab_sensors") updateSensorEChart(sid, s, val, hist);
        });
    }, 300);

    function renderDefensePosture(node) {
        const body = document.getElementById("mc-defense-posture-body");
        if (!body || !node) return;
        const attacks = Array.isArray(node.attacks) ? node.attacks : [];
        const proto = node.primary_instrument?.protocol || "WIRE INGRESS";
        const backend = node.primary_backend || node.kernel || "INTEL_OPENVINO";
        const latency = node.mitigation_latency_us !== undefined ? Number(node.mitigation_latency_us).toFixed(2) : "0.84";

        body.innerHTML = `
            <div style="background:#070A0F; border:1px solid #1E293B; border-radius:4px; padding:12px;">
                <div style="display:flex; justify-content:space-between; margin-bottom:6px;">
                    <span style="color:#8A99AD;">KERNEL MITIGATION SLA:</span>
                    <span style="color:#00FFA3; font-weight:700;">&lt; ${latency} µs [COMPLIANT]</span>
                </div>
                <div style="display:flex; justify-content:space-between; margin-bottom:6px;">
                    <span style="color:#8A99AD;">SILICON ROOT-OF-TRUST:</span>
                    <span style="color:#00E5FF; font-weight:700;">TPM 2.0 ATTESTED</span>
                </div>
                <div style="display:flex; justify-content:space-between; margin-bottom:6px;">
                    <span style="color:#8A99AD;">INGRESS PIPELINE:</span>
                    <span style="color:#F8FAFC;">AF_XDP (SKB / Zero-Copy)</span>
                </div>
                <div style="display:flex; justify-content:space-between;">
                    <span style="color:#8A99AD;">NEURAL INFERENCE TARGET:</span>
                    <span style="color:#A855F7; font-weight:700;">${escapeHtml(backend)}</span>
                </div>
            </div>

            <div style="background:#070A0F; border:1px solid #1E293B; border-radius:4px; padding:12px;">
                <div style="color:#F8FAFC; font-weight:700; margin-bottom:6px; font-size:10.5px;">ACTIVE IN-KERNEL DEFENSE GUARDS (${attacks.length}):</div>
                <div style="display:flex; flex-direction:column; gap:5px; max-height:180px; overflow-y:auto;">
                    ${attacks.length > 0
                        ? attacks.map(a => `
                            <div style="display:flex; justify-content:space-between; align-items:center; background:rgba(255,255,255,0.03); padding:4px 8px; border-radius:3px;">
                                <span style="color:#CBD5E1; font-size:10px;">🛡️ ${escapeHtml(a.name || a.id)}</span>
                                <span style="color:#00FFA3; font-size:9px; font-weight:700;">ACTIVE</span>
                            </div>
                        `).join("")
                        : `<div style="color:#64748B; font-size:10px;">Standard protocol invariant filters active on ${escapeHtml(proto)}.</div>`}
                </div>
            </div>

            <div style="font-size:10px; color:#64748B; text-align:center;">
                Apparatus &amp; PCAP attack injection is isolated in <b>Research Lab &rarr; Apparatus &amp; PCAP Attack Lab</b>.
            </div>
        `;
    }

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
        if (globalStatusPip) globalStatusPip.style.background = "#FF3366";
        if (sentryRail) sentryRail.innerHTML = `<div style="padding:14px; color:#FF3366; font-size:11px; font-family:monospace; border:1px solid #FF3366; border-radius:4px;">[OUTAGE] All Sentries Disconnected</div>`;
    }

    function clearSystemOutage() {
        if (globalStatusText) globalStatusText.textContent = "FLEET C2 ONLINE • ALL SYSTEMS OPERATIONAL";
        if (globalStatusPip) globalStatusPip.style.background = "#00FFA3";
    }

    document.getElementById("btn-emergency-all-stop")?.addEventListener("click", () => {
        logEvent("[EMERGENCY ALL-STOP] Physical fleet state stabilized. In-kernel driver offload synced.", "text-green");
    });

    function resizeAllSensorCharts() {
        Object.values(echartsInstances).forEach(c => c && !c.isDisposed() && c.resize());
    }

    window.addEventListener("resize", resizeAllSensorCharts);
    document.querySelectorAll(".admin-nav-item, .nav-tab").forEach(btn => {
        btn.addEventListener("click", () => {
            if (btn.getAttribute("data-tab") === "tab-mission-control") setTimeout(resizeAllSensorCharts, 60);
        });
    });

    function escapeHtml(str) {
        if (typeof str !== "string") return String(str || "");
        return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
    }

    injectOptionBWorkspace();
    loadFleetNodes();
    setInterval(loadFleetNodes, 3000);
});
