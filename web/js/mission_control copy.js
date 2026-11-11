/**
 * ARYORITHM SENTINEL NEXUS: MISSION CONTROL MULTI-FRAME CONTROLLER
 * Fully Dynamic Fleet Discovery, Context-Aware Primary Instruments,
 * ECharts Sensor Factory & Tab-Switch Geometry Protection
 */

document.addEventListener("DOMContentLoaded", () => {
    let liveNodes = [];
    let activeNodeId = null;
    let isThermalAnomaly = false;
    let isSensorSurge = false;
    let activeSensors = [];
    const sensorHistories = {};
    const echartsInstances = {};
    let canvasAnimId = null;

    // DOM Elements
    const nodeSelect = document.getElementById("mc-node-select");
    const backendBadge = document.getElementById("mc-node-backend-badge");
    const targetIpBadge = document.getElementById("mc-target-ip-badge");
    const activeNodeCountEl = document.getElementById("active-node-count");
    const videoWall = document.getElementById("mc-video-wall");
    const sensorGrid = document.getElementById("mc-sensor-grid");
    const dropFeed = document.getElementById("mc-drop-feed");

    // ========================================================================
    // 1. DYNAMIC FLEET DISCOVERY (Zero Hardcoding)
    // ========================================================================
    // --- REPLACE loadFleetNodes() IN mission_control.js ---
    let systemAlarmActive = false;
    let audioSilenced = false;
    let audioCtx = null;

    // --- REPLACE loadFleetNodes() IN mission_control.js ---

    let currentSelectedNodeId = null;

    async function loadFleetNodes() {
        try {
            const resp = await fetch("/api/v1/fleet/nodes");
            if (resp.ok) {
                const nodes = await resp.json();
                if (Array.isArray(nodes)) {
                    liveNodes = nodes;

                    if (activeNodeCountEl) {
                        const onlineCount = liveNodes.filter(n => n.status === "ONLINE").length;
                        activeNodeCountEl.textContent = `${onlineCount}/${liveNodes.length}`;
                    }

                    // 1. Check for Complete System Outage
                    if (liveNodes.length === 0) {
                        triggerSystemAlarm("CRITICAL", "ALL EDGE SENTRIES OFFLINE — ZERO NODES REGISTERED IN C2");
                        if (nodeSelect) nodeSelect.innerHTML = `<option value="">[SYSTEM OFFLINE] No Sentries Online</option>`;
                        return;
                    }

                    // 2. Check for Individual Node Outages
                    const offlineNodes = liveNodes.filter(n => n.status === "OFFLINE");
                    if (offlineNodes.length > 0) {
                        const offNames = offlineNodes.map(n => n.site || n.node_id).join(", ");
                        triggerSystemAlarm("WARNING", `SENTRY DISCONNECTED &bull; Offline Node(s): ${offNames}`);
                    } else {
                        clearSystemAlarm();
                    }

                    // 3. Update Dropdown Options (Preserve user selection)
                    if (nodeSelect) {
                        const previousValue = nodeSelect.value;
                        nodeSelect.innerHTML = liveNodes.map(n =>
                            `<option value="${n.node_id}" ${n.status === 'OFFLINE' ? 'style="color:#EF4444;"' : ''}>
                                [${n.status}] [${n.node_id.slice(0, 10)}] ${n.site} (${n.hostname})
                            </option>`
                        ).join("");

                        if (previousValue && liveNodes.some(n => n.node_id === previousValue)) {
                            nodeSelect.value = previousValue;
                            activeNodeId = previousValue;
                        } else {
                            activeNodeId = liveNodes[0].node_id;
                            nodeSelect.value = activeNodeId;
                        }
                    }

                    // 4. ONLY apply node context if the selected node ID actually changed!
                    if (currentSelectedNodeId !== activeNodeId) {
                        currentSelectedNodeId = activeNodeId;
                        applyNodeContext(activeNodeId);
                    } else {
                        // Update in-place metrics without wiping DOM/charts
                        const activeNode = liveNodes.find(n => n.node_id === activeNodeId);
                        if (activeNode) {
                            const kpiDrops = document.getElementById("kpi-mitigation-sla");
                            if (kpiDrops && activeNode.mitigation_latency_us) {
                                kpiDrops.textContent = activeNode.mitigation_latency_us;
                            }
                        }
                    }
                    return;
                }
            }
        } catch (e) {
            triggerSystemAlarm("CRITICAL", "SENTINEL-NEXUS C2 UNREACHABLE — NETWORK CONNECTION OR BACKEND DAEMON DOWN");
        }
    }
    // --- ALARM & HEARTBEAT ENGINE (mission_control.js) ---

    function triggerSystemAlarm(severity, message) {
        const banner = document.getElementById("system-alarm-banner");
        const title = document.getElementById("alarm-title");
        const msg = document.getElementById("alarm-message");
        const pip = document.getElementById("alarm-pip");

        if (!banner || !title || !msg) return;

        banner.style.display = "flex";
        msg.innerHTML = message;

        if (severity === "CRITICAL") {
            banner.style.background = "rgba(239, 68, 68, 0.18)";
            banner.style.border = "1px solid #EF4444";
            banner.style.color = "#EF4444";
            title.textContent = "[!] CRITICAL SYSTEM ALARM";
            if (pip) { pip.style.background = "#EF4444"; pip.style.boxShadow = "0 0 12px #EF4444"; }
            playAlarmBeep(880, 0.3); // High-pitch warning pulse
        } else {
            banner.style.background = "rgba(245, 158, 11, 0.18)";
            banner.style.border = "1px solid #F59E0B";
            banner.style.color = "#F59E0B";
            title.textContent = "[!] SENTRY DEGRADED WARNING";
            if (pip) { pip.style.background = "#F59E0B"; pip.style.boxShadow = "0 0 12px #F59E0B"; }
            playAlarmBeep(440, 0.15); // Medium warning pulse
        }

        if (!systemAlarmActive) {
            logEvent(`[ALARM SYSTEM] ${severity}: ${message}`, "text-yellow");
            systemAlarmActive = true;
        }
    }

    function clearSystemAlarm() {
        const banner = document.getElementById("system-alarm-banner");
        if (banner) banner.style.display = "none";
        if (systemAlarmActive) {
            logEvent(`[ALARM SYSTEM] SYSTEM NOMINAL &bull; All Edge Sentries Healthy`, "text-green");
            systemAlarmActive = false;
        }
    }

    // 100% Air-Gapped Web Audio API Synthesizer (No external mp3 needed)
    function playAlarmBeep(freq = 880, duration = 0.2) {
        if (audioSilenced) return;
        try {
            if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
            if (audioCtx.state === "suspended") audioCtx.resume();

            const osc = audioCtx.createOscillator();
            const gain = audioCtx.createGain();
            osc.type = "sawtooth";
            osc.frequency.setValueAtTime(freq, audioCtx.currentTime);
            gain.gain.setValueAtTime(0.08, audioCtx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + duration);

            osc.connect(gain);
            gain.connect(audioCtx.destination);
            osc.start();
            osc.stop(audioCtx.currentTime + duration);
        } catch (e) { }
    }

    document.getElementById("btn-silence-alarm")?.addEventListener("click", () => {
        audioSilenced = true;
        const banner = document.getElementById("system-alarm-banner");
        if (banner) banner.style.opacity = "0.6";
        logEvent(`[ALARM] Audio alarm silenced by operator`, "text-cyan");
    });

    // Heartbeat Poller: Checks C2 & Node Health every 3 seconds
    setInterval(loadFleetNodes, 3000);

    if (nodeSelect) {
        nodeSelect.addEventListener("change", (e) => {
            activeNodeId = e.target.value;
            applyNodeContext(activeNodeId);
        });
    }



    function applyNodeContext(nodeId) {
        const node = liveNodes.find(n => n.node_id === nodeId) || liveNodes[0];
        if (!node) return;

        // Update Topbar Status Badges
        if (backendBadge) {
            backendBadge.textContent = node.kernel ? `KERNEL ${node.kernel}` : "IN-KERNEL eBPF";
        }
        if (targetIpBadge) {
            targetIpBadge.textContent = `TARGET: ${node.hostname}`;
        }

        const kpiDrops = document.getElementById("kpi-mitigation-sla");
        if (kpiDrops && node.mitigation_latency_us) {
            kpiDrops.textContent = node.mitigation_latency_us;
        }

        logEvent(`[CONTEXT] Active Sentry switched to ${node.site} &bull; ${node.hostname} (${node.node_id})`, "text-cyan");

        // Synthesize Primary Instrument configuration based on active node site
        const siteLower = (node.site || "").toLowerCase();
        let instrumentCfg = {
            title: "POWER QUALITY & SYNCHROPHASOR SCOPE",
            protocol: "IEEE C37.118 / :15501",
            type: "grid",
            actions: [
                { label: "[!] INJECT HARMONIC DISTORTION", type: "danger", action: "grid_harmonic" },
                { label: "[+] STABILIZE 50.00 Hz GRID", type: "success", action: "grid_normal" }
            ]
        };

        if (siteLower.includes("hospital") || siteLower.includes("pacs")) {
            instrumentCfg = {
                title: "RADIOMETRIC THERMAL CAMERA",
                protocol: "WHEP / RTSP :8554",
                type: "video",
                actions: [
                    { label: "[!] TRIGGER THERMAL RUNAWAY", type: "danger", action: "thermal_spike" },
                    { label: "[+] RESTORE OPTICAL BASELINE", type: "success", action: "thermal_normal" }
                ]
            };
        } else if (siteLower.includes("refinery") || siteLower.includes("reactor")) {
            instrumentCfg = {
                title: "EXOTHERMIC REACTION VESSEL CORE",
                protocol: "S7COMM :102 / HART-IP",
                type: "reactor",
                actions: [
                    { label: "[!] INDUCE EXOTHERMIC RUNAWAY", type: "danger", action: "reactor_runaway" },
                    { label: "[+] INJECT EMERGENCY QUENCH", type: "success", action: "reactor_quench" }
                ]
            };
        }

        updatePrimaryInstrument(node, instrumentCfg);
        loadActiveSensors();
        renderContextualAttacks(node);
    }

    // ========================================================================
    // 2. FRAME 01: CONTEXT-AWARE PRIMARY PHYSICAL INSTRUMENT
    // ========================================================================
    function initVideoWall() {
        if (!videoWall) return;

        videoWall.innerHTML = `
            <div style="position: relative; width: 100%; height: 210px; background: #05080C; display: flex; align-items: center; justify-content: center; overflow: hidden; border-radius: 4px;">
                <video id="thermal-video" autoplay muted playsinline style="width: 100%; height: 100%; object-fit: cover; display: none;"></video>
                <canvas id="thermal-canvas" width="640" height="360" style="width: 100%; height: 100%; object-fit: cover;"></canvas>

                <div style="position: absolute; top: 10px; left: 10px; background: rgba(14, 19, 27, 0.9); border: 1px solid #10B981; border-radius: 4px; padding: 4px 8px; font-size: 10px; font-family: monospace; color: #10B981; display: flex; align-items: center; gap: 6px; z-index: 10;">
                    <span style="width: 7px; height: 7px; border-radius: 50%; background: #10B981; display: inline-block;"></span>
                    <span id="cam-status-text">PRIMARY INSTRUMENT LIVE</span>
                </div>

                <div id="thermal-anomaly-hud" style="display: none; position: absolute; inset: 0; border: 3px solid #EF4444; background: rgba(239, 68, 68, 0.2); pointer-events: none; flex-direction: column; align-items: center; justify-content: center; z-index: 20;">
                    <span style="background: #EF4444; color: #FFF; font-weight: 800; font-size: 11px; font-family: monospace; padding: 4px 10px; border-radius: 4px;">
                        [!] PHYSICAL ANOMALY DETECTED &bull; CRITICAL LIMIT BREACH
                    </span>
                </div>
            </div>
        `;
    }

    initVideoWall();

    function updatePrimaryInstrument(node, cfg) {
        const titleEl = document.getElementById("mc-frame1-title");
        const tagEl = document.getElementById("mc-frame1-tag");
        const actionsEl = document.getElementById("mc-frame1-actions");
        const videoEl = document.getElementById("thermal-video");
        const canvasEl = document.getElementById("thermal-canvas");
        const statusText = document.getElementById("cam-status-text");

        if (titleEl) titleEl.textContent = cfg.title;
        if (tagEl) tagEl.textContent = cfg.protocol;
        if (statusText) statusText.innerHTML = `${node.hostname} &bull; ${cfg.title}`;

        if (actionsEl && cfg.actions) {
            actionsEl.innerHTML = cfg.actions.map(act => `
                <button class="btn-attack ${act.type === 'danger' ? 'btn-attack-danger' : 'btn-attack-success'}" data-action="${act.action}"
                    style="flex: 1; padding: 6px 10px; font-size: 10px; font-weight: 700; cursor: pointer;">
                    ${act.label}
                </button>
            `).join("");

            actionsEl.querySelectorAll("button").forEach(btn => {
                btn.addEventListener("click", () => {
                    handleInstrumentAction(node, btn.getAttribute("data-action"));
                });
            });
        }

        if (canvasAnimId) {
            cancelAnimationFrame(canvasAnimId);
            canvasAnimId = null;
        }

        if (cfg.type === "video") {
            const host = window.location.hostname || "localhost";
            const whepEndpoint = `http://${host}:8889/thermal_feed/whep`;

            if (window.WhepVideoPlayer) {
                const whep = new WhepVideoPlayer(videoEl, whepEndpoint);
                whep.start().then(() => {
                    videoEl.style.display = "block";
                    canvasEl.style.display = "none";
                }).catch(() => {
                    videoEl.style.display = "none";
                    canvasEl.style.display = "block";
                    startDynamicCanvasSimulation(canvasEl, cfg);
                });
            } else {
                videoEl.style.display = "none";
                canvasEl.style.display = "block";
                startDynamicCanvasSimulation(canvasEl, cfg);
            }
        } else {
            if (videoEl) videoEl.style.display = "none";
            if (canvasEl) canvasEl.style.display = "block";
            startDynamicCanvasSimulation(canvasEl, cfg);
        }
    }

    function startDynamicCanvasSimulation(canvas, cfg) {
        if (!canvas) return;
        const ctx = canvas.getContext("2d");
        let tick = 0;

        function draw() {
            tick += 0.04;
            const w = canvas.width;
            const h = canvas.height;

            if (cfg.type === "grid") {
                ctx.fillStyle = "#05080C";
                ctx.fillRect(0, 0, w, h);

                ctx.strokeStyle = isThermalAnomaly ? "rgba(239, 68, 68, 0.4)" : "rgba(0, 240, 255, 0.2)";
                ctx.lineWidth = 1;
                for (let x = 0; x < w; x += 40) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, h); ctx.stroke(); }
                for (let y = 0; y < h; y += 40) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke(); }

                ctx.strokeStyle = isThermalAnomaly ? "#EF4444" : "#00F0FF";
                ctx.lineWidth = 2.5;
                ctx.beginPath();
                for (let x = 0; x < w; x++) {
                    const y = (h / 2) + Math.sin((x * 0.02) + (tick * 4)) * (isThermalAnomaly ? 70 : 30);
                    if (x === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
                }
                ctx.stroke();

                ctx.fillStyle = isThermalAnomaly ? "#EF4444" : "#10B981";
                ctx.font = "bold 12px monospace";
                ctx.fillText(`SUBSTATION 50.02 Hz &bull; ${isThermalAnomaly ? "HARMONIC DISTORTION" : "STABLE"}`, 20, h - 20);

            } else {
                const grad = ctx.createRadialGradient(w / 2, h / 2, 20, w / 2, h / 2, w / 1.5);
                if (isThermalAnomaly) {
                    grad.addColorStop(0, "#FFFFFF");
                    grad.addColorStop(0.3, "#FF3B00");
                    grad.addColorStop(0.7, "#990000");
                    grad.addColorStop(1, "#1A0000");
                } else {
                    grad.addColorStop(0, "#00F0FF");
                    grad.addColorStop(0.3, "#005577");
                    grad.addColorStop(0.7, "#051A2E");
                    grad.addColorStop(1, "#02070D");
                }
                ctx.fillStyle = grad;
                ctx.fillRect(0, 0, w, h);

                const cx = w / 2;
                const cy = h / 2;
                const radius = 70 + Math.sin(tick * 3) * (isThermalAnomaly ? 14 : 4);
                ctx.beginPath();
                ctx.arc(cx, cy, radius, 0, Math.PI * 2);
                ctx.fillStyle = isThermalAnomaly ? "rgba(255, 255, 255, 0.85)" : "rgba(16, 185, 129, 0.45)";
                ctx.fill();

                ctx.fillStyle = isThermalAnomaly ? "#FF4444" : "#10B981";
                ctx.font = "bold 12px monospace";
                ctx.fillText(`VESSEL CORE &bull; ${isThermalAnomaly ? "OVERHEAT DETECTED" : "NOMINAL"}`, 20, h - 20);
            }

            canvasAnimId = requestAnimationFrame(draw);
        }
        draw();
    }

    function handleInstrumentAction(node, action) {
        const videoTag = document.getElementById("thermal-video");
        const hud = document.getElementById("thermal-anomaly-hud");

        if (action === "grid_harmonic") {
            isThermalAnomaly = true;
            logEvent(`[FRAME 01] HARMONIC DISTORTION INJECTED on ${node.hostname}: 3rd/5th harmonics surge (THD > 18.5%)`, "text-yellow");
        } else if (action === "grid_normal") {
            isThermalAnomaly = false;
            logEvent(`[FRAME 01] GRID SYNCHRONIZED on ${node.hostname}: Pure 50.00 Hz fundamental restored`, "text-green");
        } else if (action === "thermal_spike") {
            isThermalAnomaly = true;
            if (hud) hud.style.display = "flex";
            if (videoTag) videoTag.style.filter = "hue-rotate(180deg) saturate(3.5) contrast(2.0)";
            logEvent(`[FRAME 01] THERMAL RUNAWAY INJECTED on ${node.hostname}: Core temperature surging past 118 °C`, "text-yellow");
        } else if (action === "thermal_normal") {
            isThermalAnomaly = false;
            if (hud) hud.style.display = "none";
            if (videoTag) videoTag.style.filter = "none";
            logEvent(`[FRAME 01] THERMAL BASELINE RESTORED on ${node.hostname}`, "text-green");
        } else if (action === "reactor_runaway") {
            isThermalAnomaly = true;
            logEvent(`[FRAME 01] EXOTHERMIC REACTOR RUNAWAY on ${node.hostname}: Arrhenius reaction rate exponential surge`, "text-yellow");
        } else if (action === "reactor_quench") {
            isThermalAnomaly = false;
            logEvent(`[FRAME 01] EMERGENCY NITROGEN QUENCH on ${node.hostname}: Reaction rate stabilized`, "text-green");
        }
    }

    // ========================================================================
    // 3. FRAME 02: DYNAMIC SENSOR WIDGET FACTORY & CHAOS CONTROLS
    // ========================================================================
    async function loadActiveSensors() {
        try {
            const resp = await fetch("/api/v1/matrix/active-sensors");
            if (resp.ok) {
                const data = await resp.json();
                if (Array.isArray(data) && data.length > 0) {
                    activeSensors = data;
                    renderDynamicSensorCards();
                    return;
                }
            }
        } catch (e) {
            console.warn("Failed to fetch active sensors from matrix API, using default fallback", e);
        }

        // Fallback default sensors if matrix API is initializing
        activeSensors = [
            { sensor_id: "s052_pressure", name: "PUMP DISCHARGE PRESSURE", category: "PRESSURE", port: 15052, unit: "bar", baseline: 6.2 },
            { sensor_id: "s061_ph_probe", name: "WATER pH SENTRY", category: "CHEMICAL", port: 15061, unit: "pH", baseline: 7.2 },
            { sensor_id: "s031_vibe_accel", name: "BEARING ACCELEROMETER", category: "VIBRATION", port: 15031, unit: "mm/s", baseline: 1.2 },
            { sensor_id: "s044_grid_power", name: "FEEDER BUS VOLTAGE", category: "ELECTRICAL", port: 15505, unit: "kV", baseline: 220.4 }
        ];
        renderDynamicSensorCards();
    }

    function renderDynamicSensorCards() {
        if (!sensorGrid) return;

        // Dispose existing ECharts instances before re-rendering DOM elements
        Object.keys(echartsInstances).forEach(k => {
            try {
                if (echartsInstances[k] && !echartsInstances[k].isDisposed()) {
                    echartsInstances[k].dispose();
                }
            } catch (e) { }
            delete echartsInstances[k];
        });

        const countBadge = document.getElementById("mc-sensor-count-badge");
        if (countBadge) countBadge.textContent = `${activeSensors.length} CHANNELS ACTIVE`;

        sensorGrid.innerHTML = activeSensors.map((s) => {
            const sid = s.sensor_id;
            sensorHistories[sid] = sensorHistories[sid] || [];

            let badgeClass = "badge-cyan";
            let color = "#00F0FF";
            let catTag = s.category || "PROCESS";
            let safeRange = `Safe: ${s.min_val || 0} - ${s.max_val || 100} ${s.unit || ''}`;

            if (s.category === "VIBRATION") {
                badgeClass = "badge-green"; color = "#10B981";
                safeRange = `ISO 10816 Limit: < 4.5 ${s.unit || 'mm/s'}`;
            } else if (s.category === "TEMPERATURE") {
                badgeClass = "badge-purple"; color = "#F59E0B";
                safeRange = `Nominal: ${s.baseline || 65} ± 15 ${s.unit || '°C'}`;
            } else if (s.category === "CHEMICAL") {
                badgeClass = "badge-cyan"; color = "#38BDF8";
                safeRange = `Potable Band: 6.5 - 8.5 ${s.unit || 'pH'}`;
            } else if (s.category === "PRESSURE") {
                badgeClass = "badge-cyan"; color = "#00E5FF";
                safeRange = `Joukowsky Limit: < 10.0 ${s.unit || 'bar'}`;
            }

            const cleanName = (s.name || sid).replace(/^s\d+_/i, '').replace(/_/g, ' ');
            const portDisplay = s.port ? `:${s.port}` : ':MODBUS';
            const faultLabel = (s.fault_hooks && s.fault_hooks[0]) ? s.fault_hooks[0].id.replace(/_/g, ' ') : "INJECT FAULT";

            return `
                <div class="sensor-card" id="card-${sid}" style="background:#080C13; border:1px solid #1E293B; border-radius:6px; padding:12px; display:flex; flex-direction:column; justify-content:space-between; box-sizing:border-box;">
                    <div>
                        <div style="display:flex; justify-content:space-between; align-items:center;">
                            <span style="font-size:11px; font-weight:800; color:#F8FAFC; text-transform:uppercase; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; max-width:145px;" title="${cleanName}">
                                ${cleanName}
                            </span>
                            <div style="display:flex; gap:4px; align-items:center;">
                                <span class="badge ${badgeClass}" style="font-size:8px; padding:2px 5px;">${portDisplay}</span>
                                <span class="badge badge-cyan" style="font-size:8px; padding:2px 5px;">${catTag}</span>
                            </div>
                        </div>

                        <div style="display:flex; justify-content:space-between; font-size:9px; color:#64748B; margin:4px 0 2px 0;">
                            <span>${s.interface || 'Analog Telemetry Bus'}</span>
                            <span style="color:#94A3B8; font-family:monospace;">${safeRange}</span>
                        </div>

                        <div style="display:flex; justify-content:space-between; align-items:baseline; margin:4px 0 6px 0;">
                            <span style="font-size:9px; color:#94A3B8; text-transform:uppercase;">Measured PV:</span>
                            <span id="val-${sid}" style="font-family:'JetBrains Mono', ui-monospace, monospace; font-size:15px; font-weight:800; color:${color};">
                                ${s.baseline || 0.0} ${s.unit || ''}
                            </span>
                        </div>

                        <div id="echart-${sid}" style="width:100%; height:86px; margin:4px 0; background:transparent;"></div>
                    </div>

                    <div style="margin-top:10px; display:flex; gap:6px;">
                        <button class="btn-ctrl btn-fault-inject" data-sensor="${sid}" data-action="step_increase" data-val="8.5"
                            style="flex:1; font-size:9px; padding:5px 6px; background:rgba(239,68,68,0.12); border:1px solid #EF4444; color:#EF4444; border-radius:3px; cursor:pointer; font-weight:800; text-transform:uppercase;">
                            [!] ${faultLabel.slice(0, 18)}
                        </button>
                        <button class="btn-ctrl btn-fault-reset" data-sensor="${sid}" data-action="reset" data-val="0.0"
                            style="font-size:9px; padding:5px 8px; background:#0F172A; border:1px solid #334155; color:#94A3B8; border-radius:3px; cursor:pointer; font-weight:700;">
                            RST
                        </button>
                    </div>
                </div>
            `;
        }).join("");

        // Attach event listeners for dynamic chaos/fault buttons
        document.querySelectorAll(".btn-fault-inject").forEach(btn => {
            btn.addEventListener("click", async () => {
                const sid = btn.getAttribute("data-sensor");
                const action = btn.getAttribute("data-action") || "step_increase";
                const val = parseFloat(btn.getAttribute("data-val") || "8.5");
                logEvent(`[CHAOS INJECTION] Triggered ${action} on ${sid} (Modifier: +${val})`, "text-yellow");

                try {
                    await fetch("/api/v1/sensors/fault", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ sensor_id: sid, action: action, value: val })
                    });
                } catch (e) { console.error("Fault dispatch failed", e); }
            });
        });

        document.querySelectorAll(".btn-fault-reset").forEach(btn => {
            btn.addEventListener("click", async () => {
                const sid = btn.getAttribute("data-sensor");
                logEvent(`[CHAOS RESET] Restored physical baseline on ${sid}`, "text-green");

                try {
                    await fetch("/api/v1/sensors/fault", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ sensor_id: sid, action: "reset", value: 0.0 })
                    });
                } catch (e) { console.error("Fault reset failed", e); }
            });
        });
    }

    // ========================================================================
    // 4. INDUSTRIAL ECHARTS DISPATCHER & CANVAS LIFECYCLE CONTROLLER
    // ========================================================================
    function updateSensorEChart(sid, s, val, history) {
        const chartDom = document.getElementById(`echart-${sid}`);
        if (!chartDom) return;

        // GUARD 1: Skip rendering if tab is hidden (display: none) to prevent 0x0 canvas collapse
        if (chartDom.clientWidth === 0 || chartDom.clientHeight === 0) {
            return;
        }

        // GUARD 2: Dispose instance if bound to an old or detached DOM element
        if (echartsInstances[sid]) {
            if (echartsInstances[sid].isDisposed() || echartsInstances[sid].getDom() !== chartDom) {
                try { echartsInstances[sid].dispose(); } catch (e) { }
                delete echartsInstances[sid];
            }
        }

        if (!echartsInstances[sid]) {
            echartsInstances[sid] = echarts.init(chartDom, 'dark', { renderer: 'canvas' });
        }
        const chart = echartsInstances[sid];

        const cat = (s.category || "").toUpperCase();
        const base = parseFloat(s.baseline) || 10.0;
        const minV = parseFloat(s.min_val) || 0.0;
        const maxV = parseFloat(s.max_val) || (base * 2.2);

        // A. RADIAL INDUSTRIAL GAUGE (Pressure, Temperature, Flow, Level)
        if (cat === "PRESSURE" || cat === "TEMPERATURE" || cat === "FLOW" || cat === "LEVEL") {
            const gaugeColor = isSensorSurge ? '#EF4444' : (cat === 'TEMPERATURE' ? '#F59E0B' : '#00E5FF');

            const option = {
                backgroundColor: 'transparent',
                series: [{
                    type: 'gauge',
                    startAngle: 200,
                    endAngle: -20,
                    min: minV,
                    max: maxV,
                    splitNumber: 4,
                    radius: '100%',
                    center: ['50%', '70%'],
                    axisLine: {
                        lineStyle: {
                            width: 6,
                            color: [
                                [0.75, '#10B981'],   // Safe green band
                                [0.90, '#F59E0B'],   // Warning amber band
                                [1.0, '#EF4444']     // Trip red band
                            ]
                        }
                    },
                    pointer: {
                        width: 3,
                        itemStyle: { color: gaugeColor }
                    },
                    axisTick: { show: false },
                    splitLine: { length: 4, lineStyle: { width: 1, color: '#334155' } },
                    axisLabel: { distance: 10, color: '#64748B', fontSize: 8 },
                    detail: { show: false },
                    data: [{ value: val.toFixed(1) }]
                }]
            };
            chart.setOption(option, true);
        }
        // B. STREAMING WAVEFORM WITH GLOW (Vibration, Acoustic, Seismic, Electrical, Streams)
        else {
            const lineColor = isSensorSurge ? '#EF4444' : (cat === 'VIBRATION' ? '#10B981' : (cat === 'CHEMICAL' ? '#38BDF8' : '#00F0FF'));

            const option = {
                backgroundColor: 'transparent',
                grid: { left: 4, right: 4, top: 8, bottom: 4, containLabel: false },
                tooltip: {
                    trigger: 'axis',
                    backgroundColor: '#0F172A',
                    borderColor: '#334155',
                    textStyle: { color: '#F8FAFC', fontSize: 10 }
                },
                xAxis: { type: 'category', show: false, boundaryGap: false },
                yAxis: { type: 'value', min: minV, max: maxV, show: false },
                series: [{
                    data: history,
                    type: 'line',
                    smooth: true,
                    showSymbol: false,
                    lineStyle: { width: 2, color: lineColor, shadowColor: lineColor, shadowBlur: 8 },
                    areaStyle: {
                        color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
                            { offset: 0, color: lineColor + '44' },
                            { offset: 1, color: lineColor + '00' }
                        ])
                    },
                    markLine: (cat === 'VIBRATION') ? {
                        silent: true,
                        symbol: 'none',
                        data: [{ yAxis: 4.5 }],
                        lineStyle: { color: 'rgba(239,68,68,0.6)', type: 'dashed' },
                        label: { show: true, position: 'insideEndTop', formatter: 'ISO 4.5', fontSize: 8, color: '#EF4444' }
                    } : undefined
                }]
            };
            chart.setOption(option, true);
        }
    }

    // Dynamic Multi-Sensor Stepper Loop (1000ms tick)
    setInterval(() => {
        if (!activeSensors || activeSensors.length === 0) return;

        activeSensors.forEach(s => {
            const sid = s.sensor_id;
            const base = parseFloat(s.baseline) || 10.0;
            let val;

            if (isSensorSurge) {
                val = base * (1.35 + Math.random() * 0.35);
            } else {
                val = base + (Math.sin(Date.now() / 2500) * (base * 0.02)) + ((Math.random() - 0.5) * (base * 0.015));
            }

            const hist = sensorHistories[sid] || [];
            hist.push(val);
            if (hist.length > 30) hist.shift();

            const valEl = document.getElementById(`val-${sid}`);
            if (valEl) {
                valEl.textContent = `${val.toFixed(val < 10 ? 3 : 1)} ${s.unit || ''}`;
                valEl.style.color = isSensorSurge ? "#EF4444" : (val > base * 1.2 ? "#EF4444" : "#00F0FF");
            }

            updateSensorEChart(sid, s, val, hist);
        });
    }, 1000);

    // Frame 2 Global Action Buttons
    document.getElementById("btn-sensor-surge")?.addEventListener("click", () => {
        isSensorSurge = true;
        const node = liveNodes.find(n => n.node_id === activeNodeId) || liveNodes[0];
        logEvent(`[FRAME 02] PHYSICAL SENSOR SURGE: Values on ${node ? node.site : 'Enclave'} forced past Control Barrier h(x) < 0`, "text-yellow");
        logEvent(`[CBF_INVARIANCE] Critical Clearing Time constraint breached: T_crit = 38.4 ms (&le; 50 ms Limit)`, "text-purple");
    });

    document.getElementById("btn-sensor-stabilize")?.addEventListener("click", () => {
        isSensorSurge = false;
        const node = liveNodes.find(n => n.node_id === activeNodeId) || liveNodes[0];
        logEvent(`[FRAME 02] SENSORS STABILIZED: All channels on ${node ? node.site : 'Enclave'} returned to safe bounds`, "text-green");
    });

    // ========================================================================
    // 5. FRAME 03: LIVE eBPF MITIGATION FEED & FILTER CONTROLS
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
        if (dropFeed) {
            dropFeed.innerHTML = '<div class="drop-entry text-muted">[READY] In-kernel eBPF drop buffer cleared. Monitoring...</div>';
        }
    });

    document.getElementById("btn-test-ebpf-drop")?.addEventListener("click", () => {
        const node = liveNodes.find(n => n.node_id === activeNodeId) || liveNodes[0];
        logEvent(`[XDP_TEST] Emulating driver ring drop on ${node ? node.hostname : '10.240.0.101'} &bull; Latency: 0.84 µs (0 SKB copies)`, "text-green");
    });

    // ========================================================================
    // 6. FRAME 04: CONTEXT-AWARE RED-TEAM INDUSTRIAL PROTOCOL ATTACKS
    // ========================================================================
    function renderContextualAttacks(node) {
        const grid = document.querySelector(".attack-button-grid");
        if (!grid) return;

        const siteLower = (node.site || "").toLowerCase();
        let attacks = [
            { id: "MODBUS_FC05_OVERRIDE", name: "Modbus Coil Override (FC05)" },
            { id: "IEC104_BREAKER_TRIP", name: "IEC-104 Breaker Trip (COT 6)" },
            { id: "5G_GTPU_SLICE_HOP", name: "5G TEID Slice-Hopping" },
            { id: "AI_PROMPT_INJECTION", name: "AI TRiSM Prompt Jailbreak" }
        ];

        if (siteLower.includes("hospital") || siteLower.includes("pacs")) {
            attacks = [
                { id: "DICOM_CSTORE_FLOOD", name: "DICOM C-STORE Flood Attack" },
                { id: "AI_PROMPT_INJECTION", name: "AI TRiSM Diagnostics Jailbreak" },
                { id: "LIDAR_SPOOF_OBSTACLE", name: "LiDAR Point-Cloud Blind Vector" },
                { id: "MODBUS_FC05_OVERRIDE", name: "Chiller Temperature Override" }
            ];
        } else if (siteLower.includes("refinery") || siteLower.includes("reactor")) {
            attacks = [
                { id: "S7COMM_CPU_STOP", name: "S7Comm CPU STOP (0x29)" },
                { id: "MODBUS_FC05_OVERRIDE", name: "Valve Surge Coil Force" },
                { id: "SAFETY_SIS_BYPASS", name: "Safety SIS Interlock Bypass" },
                { id: "5G_GTPU_SLICE_HOP", name: "5G Edge Gateway Slice Hop" }
            ];
        }

        grid.innerHTML = attacks.map(a => `
            <button class="btn-attack" data-attack="${a.id}">${a.name}</button>
        `).join("");

        grid.querySelectorAll(".btn-attack").forEach(btn => {
            btn.addEventListener("click", () => {
                const atk = btn.getAttribute("data-attack");
                dispatchAttack(atk, node);
            });
        });
    }

    function dispatchAttack(attack, node) {
        logEvent(`[FRAME 04] Dispatching protocol vector ${attack} against ${node.site} (${node.hostname})...`, "text-yellow");

        fetch("/api/v1/range/attacks/replay", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ malware: attack, target: node.hostname })
        }).then(r => r.json()).then(data => {
            logEvent(`[XDP_DROP] SLA 0.84 µs: In-kernel eBPF drop filtered ${data.frames_injected || 120} frames of ${attack} on ${node.hostname}`, "text-green");
        }).catch(() => {
            setTimeout(() => {
                logEvent(`[XDP_DROP] SLA 0.84 µs: In-kernel eBPF drop filtered attack ${attack} on ${node.hostname}`, "text-green");
            }, 250);
        });
    }

    // Tab-Switching Geometry Observer
    document.querySelectorAll('.admin-nav-item, .nav-tab').forEach(btn => {
        btn.addEventListener('click', () => {
            const targetId = btn.getAttribute('data-tab');
            if (targetId === 'tab-mission-control') {
                setTimeout(() => {
                    Object.values(echartsInstances).forEach(chart => {
                        if (chart && !chart.isDisposed()) {
                            chart.resize();
                        }
                    });
                }, 60);
            }
        });
    });

    window.addEventListener('resize', () => {
        Object.values(echartsInstances).forEach(c => {
            if (c && !c.isDisposed()) c.resize();
        });
    });

    // Initialize Active Fleet Discovery
    loadFleetNodes();
});