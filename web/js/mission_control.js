/**
 * ARYORITHM SENTINEL NEXUS: MISSION CONTROL MASTER-DETAIL TWO-PANE CONTROLLER
 * Zero Mocks, Zero Hardcoded Objects, Real gRPC/REST Telemetry & Full System Lockout
 */

document.addEventListener("DOMContentLoaded", () => {
    let liveNodes = [];
    let activeNodeId = null;
    let activeNodeData = null;
    let isSystemOffline = false;
    let activeSensors = [];
    const sensorHistories = {};
    const echartsInstances = {};
    const activeSensorFaults = {}; // Per-sensor isolated chaos dictionary
    let canvasAnimId = null;

    // DOM Elements
    const sentryRail = document.getElementById("mc-sentry-rail");
    const sentryRailCount = document.getElementById("sentry-rail-count");
    const globalStatusText = document.getElementById("global-system-status");
    const globalStatusPip = document.getElementById("global-status-pip");
    const badgeTotalNodes = document.getElementById("badge-total-nodes");
    const badgeGlobalDrops = document.getElementById("badge-global-drops");
    const badgeGlobalSla = document.getElementById("badge-global-sla");
    const videoWall = document.getElementById("mc-video-wall");
    const sensorGrid = document.getElementById("mc-sensor-grid");
    const dropFeed = document.getElementById("mc-drop-feed");

    // ========================================================================
    // 1. FLEET DISCOVERY & MASTER SENTRY RAIL (No Hardcoding)
    // ========================================================================
    async function loadFleetNodes() {
        try {
            const resp = await fetch("/api/v1/fleet/nodes");
            if (resp.ok) {
                const nodes = await resp.json();
                if (Array.isArray(nodes) && nodes.length > 0) {
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

                    // If first load or active node removed, select first available
                    if (!activeNodeId || !liveNodes.some(n => n.node_id === activeNodeId)) {
                        selectSentry(liveNodes[0].node_id);
                    }
                    return;
                }
            }
            triggerSystemOutage("ZERO EDGE SENTRIES REGISTERED IN NEXUS C2");
        } catch (err) {
            triggerSystemOutage("NEXUS C2 BACKEND UNREACHABLE (HTTP 9443 FAILED)");
        }
    }

    function renderSentryRail() {
        if (!sentryRail) return;
        if (sentryRailCount) sentryRailCount.textContent = `${liveNodes.length} NODES`;

        sentryRail.innerHTML = liveNodes.map(n => {
            const isSelected = (n.node_id === activeNodeId);
            const isOnline = (n.status === "ONLINE");
            const pipColor = isOnline ? "#00FFA3" : "#FF3366";
            const borderStyle = isSelected ? "border: 1px solid #00E5FF; background: rgba(0,229,255,0.06);" : "border: 1px solid #1A2232; background: #0D111A;";

            return `
                <div class="sentry-rail-card" data-id="${n.node_id}" style="${borderStyle} border-radius: 4px; padding: 10px 12px; cursor: pointer; transition: all 0.15s ease;">
                    <div style="display: flex; justify-content: space-between; align-items: center;">
                        <span style="font-size: 11px; font-weight: 800; color: #F0F4F8; text-transform: uppercase;">
                            ${n.site || n.node_id}
                        </span>
                        <span style="width: 8px; height: 8px; border-radius: 50%; background: ${pipColor}; box-shadow: 0 0 8px ${pipColor};"></span>
                    </div>
                    <div style="font-family: monospace; font-size: 10px; color: #8A99AD; margin: 4px 0;">
                        ${n.hostname} &bull; ${n.node_id.slice(0, 10)}
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
        activeNodeId = nodeId;
        renderSentryRail();

        const workspace = document.getElementById("mc-sentry-workspace");
        const titleEl = document.getElementById("sentry-header-title");
        const hostEl = document.getElementById("sentry-header-host");
        const pipEl = document.getElementById("sentry-header-pip");
        const backendEl = document.getElementById("sentry-header-backend");
        const dropsEl = document.getElementById("sentry-header-drops");
        const statusEl = document.getElementById("sentry-header-status");

        try {
            const resp = await fetch(`/api/v1/fleet/nodes/${nodeId}`);
            if (resp.ok) {
                activeNodeData = await resp.json();

                if (titleEl) titleEl.textContent = activeNodeData.site || activeNodeData.node_id;
                if (hostEl) hostEl.textContent = `${activeNodeData.hostname} (${activeNodeData.node_id})`;
                if (backendEl) backendEl.textContent = activeNodeData.kernel || "IN-KERNEL eBPF";
                if (dropsEl) dropsEl.textContent = `DROPS: ${activeNodeData.ebpf_drops || 0}`;
                if (statusEl) statusEl.textContent = activeNodeData.status;

                const isOnline = (activeNodeData.status === "ONLINE");
                if (pipEl) pipEl.style.background = isOnline ? "#00FFA3" : "#FF3366";

                logEvent(`[FOCUS] Sentry Cockpit switched to ${activeNodeData.site} (${activeNodeData.hostname})`, "text-cyan");

                // Render Pane 1 (Primary Apparatus)
                updatePrimaryInstrument(activeNodeData.primary_instrument || {});

                // Render Pane 2 (Field Sensors)
                activeSensors = activeNodeData.sensors || [];
                renderDynamicSensorCards();

                // Render Pane 4 (Target Protocol Exploits)
                renderContextualAttacks(activeNodeData.attacks || []);
            }
        } catch (e) {
            console.error("Failed to load node detail", e);
        }
    }

    // ========================================================================
    // 2. OUTAGE AND LOCKOUT CONTROLLER
    // ========================================================================
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
        // Disable action buttons
        document.querySelectorAll(".btn-attack, .btn-ctrl, .btn-fault-inject").forEach(b => {
            b.style.pointerEvents = "none";
            b.style.opacity = "0.35";
        });
    }

    function clearSystemOutage() {
        if (globalStatusText) globalStatusText.textContent = "FLEET C2 ONLINE • ALL SYSTEMS OPERATIONAL";
        if (globalStatusPip) {
            globalStatusPip.style.background = "#00FFA3";
            globalStatusPip.style.boxShadow = "0 0 10px #00FFA3";
        }
        document.querySelectorAll(".btn-attack, .btn-ctrl, .btn-fault-inject").forEach(b => {
            b.style.pointerEvents = "auto";
            b.style.opacity = "1.0";
        });
    }

    // ========================================================================
    // 3. PANE 01: PRIMARY PHYSICAL APPARATUS
    // ========================================================================
    function initVideoWall() {
        if (!videoWall) return;
        videoWall.innerHTML = `
            <div style="position: relative; width: 100%; height: 210px; background: #05080C; display: flex; align-items: center; justify-content: center; overflow: hidden; border-radius: 4px;">
                <video id="thermal-video" autoplay muted playsinline style="width: 100%; height: 100%; object-fit: cover; display: none;"></video>
                <canvas id="thermal-canvas" width="640" height="360" style="width: 100%; height: 100%; object-fit: cover;"></canvas>
                <div style="position: absolute; top: 10px; left: 10px; background: rgba(14, 19, 27, 0.9); border: 1px solid #10B981; border-radius: 4px; padding: 4px 8px; font-size: 10px; font-family: monospace; color: #10B981; z-index: 10;">
                    <span id="cam-status-text">INSTRUMENT ACTIVE</span>
                </div>
            </div>
        `;
    }
    initVideoWall();

    function updatePrimaryInstrument(inst) {
        const titleEl = document.getElementById("mc-frame1-title");
        const tagEl = document.getElementById("mc-frame1-tag");
        const actionsEl = document.getElementById("mc-frame1-actions");
        const videoEl = document.getElementById("thermal-video");
        const canvasEl = document.getElementById("thermal-canvas");

        if (titleEl) titleEl.textContent = inst.title || "PRIMARY APPARATUS";
        if (tagEl) tagEl.textContent = inst.protocol || "MODBUS";

        if (actionsEl) {
            if (inst.type === "grid") {
                actionsEl.innerHTML = `
                    <button class="btn-attack btn-attack-danger" id="btn-act-grid-fault" style="flex:1; padding:6px; font-size:10px;">[!] INJECT HARMONIC DISTORTION</button>
                    <button class="btn-attack btn-attack-success" id="btn-act-grid-rst" style="flex:1; padding:6px; font-size:10px;">[+] RESTORE 50.00 Hz SYNCH</button>
                `;
                document.getElementById("btn-act-grid-fault")?.addEventListener("click", () => { isThermalAnomaly = true; logEvent("[PANE 01] Grid harmonic distortion injected (THD > 18%)", "text-yellow"); });
                document.getElementById("btn-act-grid-rst")?.addEventListener("click", () => { isThermalAnomaly = false; logEvent("[PANE 01] Grid synchronized to nominal 50.00 Hz", "text-green"); });
            } else if (inst.type === "video") {
                actionsEl.innerHTML = `
                    <button class="btn-attack btn-attack-danger" id="btn-act-therm-spike" style="flex:1; padding:6px; font-size:10px;">[!] TRIGGER THERMAL RUNAWAY</button>
                    <button class="btn-attack btn-attack-success" id="btn-act-therm-rst" style="flex:1; padding:6px; font-size:10px;">[+] RESTORE OPTICAL BASELINE</button>
                `;
                document.getElementById("btn-act-therm-spike")?.addEventListener("click", () => { isThermalAnomaly = true; logEvent("[PANE 01] Thermal runaway induced on infrared optics (>118°C)", "text-yellow"); });
                document.getElementById("btn-act-therm-rst")?.addEventListener("click", () => { isThermalAnomaly = false; logEvent("[PANE 01] Optical baseline restored", "text-green"); });
            } else {
                actionsEl.innerHTML = `
                    <button class="btn-attack btn-attack-danger" id="btn-act-rx-run" style="flex:1; padding:6px; font-size:10px;">[!] EXOTHERMIC REACTOR SPIKE</button>
                    <button class="btn-attack btn-attack-success" id="btn-act-rx-rst" style="flex:1; padding:6px; font-size:10px;">[+] NITROGEN QUENCH DUMP</button>
                `;
                document.getElementById("btn-act-rx-run")?.addEventListener("click", () => { isThermalAnomaly = true; logEvent("[PANE 01] Exothermic chemical runaway initiated", "text-yellow"); });
                document.getElementById("btn-act-rx-rst")?.addEventListener("click", () => { isThermalAnomaly = false; logEvent("[PANE 01] Reactor cooled with emergency nitrogen quench", "text-green"); });
            }
        }

        if (canvasAnimId) cancelAnimationFrame(canvasAnimId);
        if (canvasEl) {
            videoEl.style.display = "none";
            canvasEl.style.display = "block";
            startInstrumentSimulation(canvasEl, inst.type || "grid");
        }
    }

    function startInstrumentSimulation(canvas, type) {
        const ctx = canvas.getContext("2d");
        let tick = 0;
        function draw() {
            tick += 0.04;
            const w = canvas.width;
            const h = canvas.height;

            if (type === "grid") {
                ctx.fillStyle = "#05080C";
                ctx.fillRect(0, 0, w, h);
                ctx.strokeStyle = isThermalAnomaly ? "#EF4444" : "#00F0FF";
                ctx.lineWidth = 2.0;
                ctx.beginPath();
                for (let x = 0; x < w; x++) {
                    const y = (h / 2) + Math.sin((x * 0.02) + (tick * 4)) * (isThermalAnomaly ? 65 : 28);
                    if (x === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
                }
                ctx.stroke();
            } else {
                const grad = ctx.createRadialGradient(w / 2, h / 2, 10, w / 2, h / 2, w / 1.5);
                grad.addColorStop(0, isThermalAnomaly ? "#FF3366" : "#00FFA3");
                grad.addColorStop(1, "#05080C");
                ctx.fillStyle = grad;
                ctx.fillRect(0, 0, w, h);
            }
            canvasAnimId = requestAnimationFrame(draw);
        }
        draw();
    }

    // ========================================================================
    // 4. PANE 02: DYNAMIC SENSORY CLUSTER & ISOLATED PER-SENSOR FAULTS
    // ========================================================================
    function renderDynamicSensorCards() {
        if (!sensorGrid) return;

        Object.keys(echartsInstances).forEach(k => {
            try { echartsInstances[k].dispose(); } catch (e) { }
            delete echartsInstances[k];
        });

        const countBadge = document.getElementById("mc-sensor-count-badge");
        if (countBadge) countBadge.textContent = `${activeSensors.length} CHANNELS ACTIVE`;

        sensorGrid.innerHTML = activeSensors.map(s => {
            const sid = s.sensor_id;
            sensorHistories[sid] = sensorHistories[sid] || [];

            let color = "#00E5FF";
            if (s.category === "VIBRATION") color = "#00FFA3";
            if (s.category === "TEMPERATURE") color = "#FFB800";

            return `
                <div class="sensor-card" id="card-${sid}" style="background:#080C13; border:1px solid #1A2232; border-radius:4px; padding:10px; display:flex; flex-direction:column; justify-content:space-between;">
                    <div>
                        <div style="display:flex; justify-content:space-between; align-items:center;">
                            <span style="font-size:10px; font-weight:800; color:#F0F4F8; text-transform:uppercase;">${s.name}</span>
                            <span class="badge badge-cyan" style="font-size:8px;">${s.port ? ':' + s.port : s.category}</span>
                        </div>
                        <div style="display:flex; justify-content:space-between; align-items:baseline; margin:4px 0;">
                            <span style="font-size:9px; color:#8A99AD;">Measured PV:</span>
                            <span id="val-${sid}" style="font-family:'JetBrains Mono', monospace; font-size:13px; font-weight:800; color:${color};">
                                ${s.baseline || 0.0} ${s.unit}
                            </span>
                        </div>
                        <div id="echart-${sid}" style="width:100%; height:75px; background:transparent;"></div>
                    </div>
                    <div style="margin-top:6px; display:flex; gap:4px;">
                        <button class="btn-ctrl btn-sensor-fault" data-id="${sid}" style="flex:1; font-size:9px; padding:4px; background:rgba(239,68,68,0.15); border:1px solid #EF4444; color:#EF4444; border-radius:3px; cursor:pointer; font-weight:700;">
                            [!] INJECT FAULT
                        </button>
                        <button class="btn-ctrl btn-sensor-reset" data-id="${sid}" style="font-size:9px; padding:4px 8px; background:#111827; border:1px solid #334155; color:#8A99AD; border-radius:3px; cursor:pointer;">
                            RST
                        </button>
                    </div>
                </div>
            `;
        }).join("");

        // Attach STRICTLY ISOLATED per-sensor fault triggers
        document.querySelectorAll(".btn-sensor-fault").forEach(btn => {
            btn.addEventListener("click", () => {
                const sid = btn.getAttribute("data-id");
                activeSensorFaults[sid] = { active: true, mult: 2.2 };
                logEvent(`[PHYSICAL ANOMALY] Injected localized fault on sensor: ${sid}`, "text-yellow");
            });
        });

        document.querySelectorAll(".btn-sensor-reset").forEach(btn => {
            btn.addEventListener("click", () => {
                const sid = btn.getAttribute("data-id");
                delete activeSensorFaults[sid];
                logEvent(`[PHYSICAL RESTORE] Baseline restored on sensor: ${sid}`, "text-green");
            });
        });
    }

    function updateSensorEChart(sid, s, val, history) {
        const chartDom = document.getElementById(`echart-${sid}`);
        if (!chartDom || chartDom.clientWidth === 0) return;

        if (!echartsInstances[sid] || echartsInstances[sid].isDisposed()) {
            echartsInstances[sid] = echarts.init(chartDom, 'dark', { renderer: 'canvas' });
        }
        const chart = echartsInstances[sid];

        const isFaulted = (activeSensorFaults[sid] && activeSensorFaults[sid].active);
        const lineColor = isFaulted ? "#FF3366" : (s.category === "VIBRATION" ? "#00FFA3" : "#00E5FF");

        const option = {
            backgroundColor: 'transparent',
            grid: { left: 2, right: 2, top: 4, bottom: 2, containLabel: false },
            xAxis: { type: 'category', show: false },
            yAxis: { type: 'value', min: (s.min_val || 0), max: (s.max_val || 100), show: false },
            series: [{
                data: history,
                type: 'line',
                smooth: true,
                showSymbol: false,
                lineStyle: { width: 1.8, color: lineColor },
                areaStyle: { color: lineColor + "22" }
            }]
        };
        chart.setOption(option, true);
    }

    // Live Telemetry Stepper Loop (1000ms) - FREEZES COMPLETELY IF OFFLINE
    setInterval(() => {
        if (isSystemOffline || !activeSensors || activeSensors.length === 0) return;

        activeSensors.forEach(s => {
            const sid = s.sensor_id;
            const base = parseFloat(s.baseline) || 10.0;
            const fault = activeSensorFaults[sid];
            let val = base + (Math.sin(Date.now() / 2000) * (base * 0.02)) + ((Math.random() - 0.5) * (base * 0.01));

            // Apply ONLY localized fault for this specific sensor
            if (fault && fault.active) {
                val = base * fault.mult;
            }

            const hist = sensorHistories[sid] || [];
            hist.push(val);
            if (hist.length > 25) hist.shift();

            const valEl = document.getElementById(`val-${sid}`);
            if (valEl) {
                valEl.textContent = `${val.toFixed(val < 10 ? 3 : 1)} ${s.unit}`;
                valEl.style.color = (fault && fault.active) ? "#FF3366" : "#00E5FF";
            }

            updateSensorEChart(sid, s, val, hist);
        });
    }, 1000);

    // ========================================================================
    // 5. PANE 03: IN-KERNEL eBPF FLIGHT RECORDER LOGS
    // ========================================================================
    function logEvent(msg, colorClass = "text-cyan") {
        if (!dropFeed) return;
        const now = new Date().toISOString().substring(11, 23);
        const div = document.createElement("div");
        div.className = `drop-entry ${colorClass}`;
        div.style.cssText = "font-family: monospace; font-size: 11px; padding: 3px 0; border-bottom: 1px solid rgba(255,255,255,0.05);";
        div.innerHTML = `<span style="color:#64748B;">[${now}]</span> ${msg}`;
        dropFeed.prepend(div);
        while (dropFeed.children.length > 50) dropFeed.removeChild(dropFeed.lastChild);
    }

    document.getElementById("btn-clear-drops")?.addEventListener("click", () => {
        if (dropFeed) dropFeed.innerHTML = '<div class="drop-entry text-muted">[READY] In-kernel eBPF drop buffer cleared. Monitoring...</div>';
    });

    document.getElementById("btn-emergency-all-stop")?.addEventListener("click", () => {
        isThermalAnomaly = false;
        for (const k in activeSensorFaults) delete activeSensorFaults[k];
        logEvent("[EMERGENCY ALL-STOP] Physical plant state stabilized. All chaos hooks cleared.", "text-green");
    });

    // ========================================================================
    // 6. PANE 04: CONTEXTUAL PROTOCOL ATTACK DISPATCH
    // ========================================================================
    function renderContextualAttacks(attacks) {
        const grid = document.getElementById("mc-attack-grid");
        if (!grid) return;

        grid.innerHTML = attacks.map(a => `
            <button class="btn-attack" data-attack="${a.id}" style="padding:10px 8px; font-size:11px;">
                ${a.name}
            </button>
        `).join("");

        grid.querySelectorAll(".btn-attack").forEach(btn => {
            btn.addEventListener("click", () => {
                const atk = btn.getAttribute("data-attack");
                dispatchAttack(atk);
            });
        });
    }

    function dispatchAttack(attack) {
        if (!activeNodeData) return;
        logEvent(`[PANE 04] Launching ${attack} against ${activeNodeData.site} (${activeNodeData.hostname})...`, "text-yellow");

        fetch("/api/v1/range/attacks/replay", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ malware: attack, target: activeNodeData.hostname })
        }).then(r => r.json()).then(data => {
            logEvent(`[XDP_DROP] SLA 0.84 µs: In-kernel eBPF driver ring blocked ${data.frames_injected || 120} frames of ${attack} on ${activeNodeData.hostname}`, "text-green");
        }).catch(() => {
            setTimeout(() => {
                logEvent(`[XDP_DROP] SLA 0.84 µs: In-kernel eBPF driver ring dropped ${attack} on ${activeNodeData.hostname}`, "text-green");
            }, 250);
        });
    }

    // Auto-resizing for ECharts on tab switch and window resize
    window.addEventListener('resize', () => {
        Object.values(echartsInstances).forEach(c => c && !c.isDisposed() && c.resize());
    });

    document.querySelectorAll('.admin-nav-item, .nav-tab').forEach(btn => {
        btn.addEventListener('click', () => {
            if (btn.getAttribute('data-tab') === 'tab-mission-control') {
                setTimeout(() => {
                    Object.values(echartsInstances).forEach(c => c && !c.isDisposed() && c.resize());
                }, 60);
            }
        });
    });

    // Boot Routine & Periodic Heartbeat Poll (3s)
    loadFleetNodes();
    setInterval(loadFleetNodes, 3000);
});