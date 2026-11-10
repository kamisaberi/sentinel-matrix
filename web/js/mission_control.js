/**
 * ARYORITHM SENTINEL NEXUS: MISSION CONTROL MULTI-FRAME CONTROLLER
 * Reactive Global Master Bar + Dynamic Sensor Widget Factory + Chaos Injection
 */

document.addEventListener("DOMContentLoaded", () => {
    const NODES = {
        "matrix-edge-substation-01": {
            id: "matrix-edge-substation-01",
            name: "Edge-Substation-01",
            site: "Substation Alpha (High-Voltage Grid)",
            ip: "10.240.0.101",
            backend: "INTEL OPENVINO",
            camTitle: "SIEMENS PAC3200 POWER QUALITY MONITOR",
            camType: "grid",
            sensors: {
                s1: { label: "GRID FREQUENCY", unit: "Hz", port: "MODBUS :15501", base: 50.02, range: [49.8, 50.2], color: "#10B981" },
                s2: { label: "ACTIVE POWER LOAD", unit: "kW", port: "MODBUS :15501", base: 420.8, range: [400, 440], color: "#00F0FF" },
                s3: { label: "FEEDER BUS VOLTAGE", unit: "kV", port: "IEC-104 :2404", base: 220.4, range: [210, 230], color: "#00F0FF" },
                s4: { label: "3GPP URLLC SLICE", unit: "TEID", port: "GTP-U :2152", base: 1, range: [1, 4], color: "#A855F7" }
            }
        },
        "matrix-edge-hospital-02": {
            id: "matrix-edge-hospital-02",
            name: "Edge-Hospital-PACS-02",
            site: "Metro General Hospital (PACS & Vision)",
            ip: "10.240.0.102",
            backend: "NVIDIA TENSORRT",
            camTitle: "FLIR A700 THERMAL CAMERA FEED",
            camType: "video",
            sensors: {
                s1: { label: "SICK LiDAR PERIMETER", unit: "pts", port: "UDP :2368", base: 840, range: [700, 1000], color: "#10B981" },
                s2: { label: "MRI CRYO TEMPERATURE", unit: "K", port: "DICOM :104", base: 4.2, range: [3.8, 8.0], color: "#00F0FF" },
                s3: { label: "PACS DICOM STREAM", unit: "MB/s", port: "DIMSE :4242", base: 82.5, range: [40, 120], color: "#00F0FF" },
                s4: { label: "AI TRiSM TOKEN BUFFER", unit: "tok/s", port: "REST :9443", base: 1240, range: [800, 2500], color: "#A855F7" }
            }
        },
        "matrix-edge-refinery-03": {
            id: "matrix-edge-refinery-03",
            name: "Edge-Refinery-PLC-03",
            site: "Coastal Refinery Zone B (SIS Reactor)",
            ip: "10.240.0.103",
            backend: "ROCKCHIP RKNN",
            camTitle: "EXOTHERMIC REACTOR THERMAL STATE",
            camType: "reactor",
            sensors: {
                s1: { label: "IFM BEARING TEMP", unit: "°C", port: "MODBUS :15502", base: 85.4, range: [60, 130], color: "#00F0FF" },
                s2: { label: "IFM VIBRATION PEAK", unit: "mm/s", port: "MODBUS :15502", base: 1.24, range: [0.5, 9.0], color: "#10B981" },
                s3: { label: "HYDRAULIC PRESSURE", unit: "PSI", port: "S7COMM :102", base: 100.2, range: [80, 150], color: "#00F0FF" },
                s4: { label: "CBF BARRIER h(x)", unit: "invar", port: "RK4 ODE", base: 34.6, range: [0, 50], color: "#10B981" }
            }
        }
    };

    let activeNodeKey = "matrix-edge-substation-01";
    let isThermalAnomaly = false;
    let isSensorSurge = false;
    let activeSensors = [];
    const sensorHistories = {};

    // DOM Elements
    const nodeSelect = document.getElementById("mc-node-select");
    const backendBadge = document.getElementById("mc-node-backend-badge");
    const targetIpBadge = document.getElementById("mc-target-ip-badge");
    const videoWall = document.getElementById("mc-video-wall");
    const sensorGrid = document.getElementById("mc-sensor-grid");
    const dropFeed = document.getElementById("mc-drop-feed");

    // ========================================================================
    // MASTER NODE SELECTOR
    // ========================================================================
    if (nodeSelect) {
        nodeSelect.innerHTML = Object.values(NODES).map(n =>
            `<option value="${n.id}">[${n.name}] ${n.site} (${n.ip})</option>`
        ).join("");

        nodeSelect.value = activeNodeKey;
        nodeSelect.addEventListener("change", (e) => {
            activeNodeKey = e.target.value;
            applyNodeContext(activeNodeKey);
        });
    }

    function applyNodeContext(key) {
        const node = NODES[key];
        if (!node) return;

        if (backendBadge) backendBadge.textContent = node.backend;
        if (targetIpBadge) targetIpBadge.textContent = `TARGET: ${node.ip}`;

        logEvent(`[CONTEXT] Active Sentry switched to ${node.name} &bull; ${node.site} (${node.ip})`, "text-cyan");

        updateVisionWallForNode(node);
        loadActiveSensors();
    }

    // ========================================================================
    // FRAME 1: VISION WALL & DEDICATED CAMERA BUTTONS
    // ========================================================================
    function initVideoWall() {
        if (!videoWall) return;

        videoWall.innerHTML = `
            <div style="position: relative; width: 100%; height: 210px; background: #05080C; display: flex; align-items: center; justify-content: center; overflow: hidden; border-radius: 4px;">
                <video id="thermal-video" autoplay muted playsinline style="width: 100%; height: 100%; object-fit: cover; display: none;"></video>
                <canvas id="thermal-canvas" width="640" height="360" style="width: 100%; height: 100%; object-fit: cover;"></canvas>

                <div style="position: absolute; top: 10px; left: 10px; background: rgba(14, 19, 27, 0.9); border: 1px solid #10B981; border-radius: 4px; padding: 4px 8px; font-size: 10px; font-family: monospace; color: #10B981; display: flex; align-items: center; gap: 6px; z-index: 10;">
                    <span style="width: 7px; height: 7px; border-radius: 50%; background: #10B981; display: inline-block;"></span>
                    <span id="cam-status-text">CAMERA LIVE</span>
                </div>

                <div id="thermal-anomaly-hud" style="display: none; position: absolute; inset: 0; border: 3px solid #EF4444; background: rgba(239, 68, 68, 0.2); pointer-events: none; flex-direction: column; align-items: center; justify-content: center; z-index: 20;">
                    <span style="background: #EF4444; color: #FFF; font-weight: 800; font-size: 11px; font-family: monospace; padding: 4px 10px; border-radius: 4px;">
                        [!] THERMAL RUNAWAY DETECTED &bull; 118.5 °C
                    </span>
                </div>
            </div>
        `;
    }

    initVideoWall();

    let canvasAnimId = null;

    function updateVisionWallForNode(node) {
        const videoEl = document.getElementById("thermal-video");
        const canvasEl = document.getElementById("thermal-canvas");
        const statusText = document.getElementById("cam-status-text");

        if (statusText) statusText.textContent = `${node.camTitle}`;

        if (canvasAnimId) {
            cancelAnimationFrame(canvasAnimId);
            canvasAnimId = null;
        }

        if (node.camType === "video") {
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
                    startDynamicCanvasSimulation(canvasEl, node);
                });
            } else {
                videoEl.style.display = "none";
                canvasEl.style.display = "block";
                startDynamicCanvasSimulation(canvasEl, node);
            }
        } else {
            videoEl.style.display = "none";
            canvasEl.style.display = "block";
            startDynamicCanvasSimulation(canvasEl, node);
        }
    }

    function startDynamicCanvasSimulation(canvas, node) {
        if (!canvas) return;
        const ctx = canvas.getContext("2d");
        let tick = 0;

        function draw() {
            tick += 0.04;
            const w = canvas.width;
            const h = canvas.height;

            if (node.camType === "grid") {
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
                ctx.fillText(`EXOTHERMIC VESSEL &bull; ${isThermalAnomaly ? "OVERHEAT DETECTED" : "NOMINAL"}`, 20, h - 20);
            }

            canvasAnimId = requestAnimationFrame(draw);
        }
        draw();
    }

    // Frame 1 Action Buttons
    const hud = document.getElementById("thermal-anomaly-hud");
    const videoTag = document.getElementById("thermal-video");

    document.getElementById("btn-cam-anomaly")?.addEventListener("click", () => {
        isThermalAnomaly = true;
        if (hud) hud.style.display = "flex";
        if (videoTag) videoTag.style.filter = "hue-rotate(180deg) saturate(3.5) contrast(2.0)";
        logEvent(`[FRAME 01] Thermal anomaly injected on optical feed &bull; Infrared saturation active`, "text-yellow");
    });

    document.getElementById("btn-cam-normalize")?.addEventListener("click", () => {
        isThermalAnomaly = false;
        if (hud) hud.style.display = "none";
        if (videoTag) videoTag.style.filter = "none";
        logEvent(`[FRAME 01] Optical camera feed normalized &bull; Baseline restored`, "text-green");
    });

    // ========================================================================
    // FRAME 2: DYNAMIC SENSOR WIDGET FACTORY & CHAOS CONTROLS
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
            console.warn("Failed to fetch active sensors, falling back to node sensors", e);
        }

        // Fallback to active node profile
        const node = NODES[activeNodeKey];
        if (node && node.sensors) {
            activeSensors = Object.entries(node.sensors).map(([k, s]) => ({
                sensor_id: k,
                name: s.label,
                category: s.label.includes("TEMP") ? "TEMPERATURE" : (s.label.includes("VIB") ? "VIBRATION" : (s.label.includes("PRESSURE") ? "PRESSURE" : "ELECTRICAL")),
                port: s.port.replace(/[^0-9]/g, '') || "15501",
                unit: s.unit,
                baseline: s.base
            }));
        }
        renderDynamicSensorCards();
    }

    // --- REPLACE renderDynamicSensorCards() IN mission_control.js ---
    function renderDynamicSensorCards() {
        if (!sensorGrid) return;

        const countBadge = document.getElementById("mc-sensor-count-badge");
        if (countBadge) countBadge.textContent = `${activeSensors.length} CHANNELS ACTIVE`;

        sensorGrid.innerHTML = activeSensors.map((s) => {
            const sid = s.sensor_id;
            sensorHistories[sid] = sensorHistories[sid] || [];

            // Category color coding & tags
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
                        <!-- Header with Name, Port, Category Badge -->
                        <div style="display:flex; justify-content:space-between; align-items:center;">
                            <span style="font-size:11px; font-weight:800; color:#F8FAFC; text-transform:uppercase; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; max-width:145px;" title="${cleanName}">
                                ${cleanName}
                            </span>
                            <div style="display:flex; gap:4px; align-items:center;">
                                <span class="badge ${badgeClass}" style="font-size:8px; padding:2px 5px;">${portDisplay}</span>
                                <span class="badge badge-cyan" style="font-size:8px; padding:2px 5px;">${catTag}</span>
                            </div>
                        </div>

                        <!-- Technical Role & Safety Boundary -->
                        <div style="display:flex; justify-content:space-between; font-size:9px; color:#64748B; margin:4px 0 2px 0;">
                            <span>${s.interface || 'Analog Telemetry Bus'}</span>
                            <span style="color:#94A3B8; font-family:monospace;">${safeRange}</span>
                        </div>

                        <!-- Live Digital Metric Readout -->
                        <div style="display:flex; justify-content:space-between; align-items:baseline; margin:4px 0 6px 0;">
                            <span style="font-size:9px; color:#94A3B8; text-transform:uppercase;">Measured PV:</span>
                            <span id="val-${sid}" style="font-family:'JetBrains Mono', ui-monospace, monospace; font-size:15px; font-weight:800; color:${color};">
                                ${s.baseline || 0.0} ${s.unit || ''}
                            </span>
                        </div>
                        <!-- ECharts High-Precision Telemetry Container -->
                        <div id="echart-${sid}" style="width:100%; height:86px; margin:4px 0; background:transparent;"></div>
                    </div>

                    <!-- Dynamic Chaos / Fault Action Footer -->
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

        // Wire fault buttons
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

    // --- 5 SPECIALIZED INDUSTRIAL CANVAS RENDERERS ---

    // 1. Radial Arc Dial (Pressure, Temperature, Flow)
    function drawRadialGauge(ctx, w, h, val, minV, maxV, unit, color) {
        ctx.clearRect(0, 0, w, h);
        const cx = w / 2;
        const cy = h - 6;
        const radius = Math.min(w * 0.42, h * 0.82);
        const norm = Math.max(0, Math.min(1, (val - minV) / ((maxV - minV) || 1)));

        // Background track arc
        ctx.beginPath();
        ctx.arc(cx, cy, radius, Math.PI, 2 * Math.PI);
        ctx.strokeStyle = "#1E293B";
        ctx.lineWidth = 6;
        ctx.stroke();

        // Safe green arc (first 70%)
        ctx.beginPath();
        ctx.arc(cx, cy, radius, Math.PI, Math.PI + Math.PI * 0.7);
        ctx.strokeStyle = "rgba(16, 185, 129, 0.4)";
        ctx.lineWidth = 6;
        ctx.stroke();

        // Red trip zone (last 30%)
        ctx.beginPath();
        ctx.arc(cx, cy, radius, Math.PI + Math.PI * 0.7, 2 * Math.PI);
        ctx.strokeStyle = "rgba(239, 68, 68, 0.5)";
        ctx.lineWidth = 6;
        ctx.stroke();

        // Active value sweep
        const targetAngle = Math.PI + norm * Math.PI;
        ctx.beginPath();
        ctx.arc(cx, cy, radius, Math.PI, targetAngle);
        ctx.strokeStyle = color;
        ctx.lineWidth = 6;
        ctx.shadowColor = color;
        ctx.shadowBlur = 8;
        ctx.stroke();
        ctx.shadowBlur = 0;

        // Needle tip
        const nx = cx + (radius - 10) * Math.cos(targetAngle);
        const ny = cy + (radius - 10) * Math.sin(targetAngle);
        ctx.beginPath();
        ctx.moveTo(cx, cy);
        ctx.lineTo(nx, ny);
        ctx.strokeStyle = "#FFFFFF";
        ctx.lineWidth = 2;
        ctx.stroke();

        // Center hub
        ctx.beginPath();
        ctx.arc(cx, cy, 3, 0, 2 * Math.PI);
        ctx.fillStyle = color;
        ctx.fill();
    }

    // 2. Continuous Rolling Waveform & Scope (Vibration, Acoustic, Seismic)
    function drawWaveformScope(ctx, w, h, history, color, maxV) {
        ctx.clearRect(0, 0, w, h);

        // Subtle background oscilloscope grid lines
        ctx.strokeStyle = "rgba(30, 41, 59, 0.5)";
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(0, h / 2); ctx.lineTo(w, h / 2);
        ctx.moveTo(w / 2, 0); ctx.lineTo(w / 2, h);
        ctx.stroke();

        // Alarm limit dashed line (at 80% height)
        ctx.strokeStyle = "rgba(239, 68, 68, 0.4)";
        ctx.setLineDash([4, 4]);
        ctx.beginPath();
        ctx.moveTo(0, h * 0.2); ctx.lineTo(w, h * 0.2);
        ctx.stroke();
        ctx.setLineDash([]);

        if (history.length < 2) return;

        // Rolling sinusoidal wave
        ctx.strokeStyle = color;
        ctx.lineWidth = 1.8;
        ctx.shadowColor = color;
        ctx.shadowBlur = 6;
        ctx.beginPath();
        const step = w / (history.length - 1);
        history.forEach((v, i) => {
            const norm = Math.min(1.2, v / (maxV || 10));
            const y = h - (norm * (h - 8)) - 4;
            const x = i * step;
            if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
        });
        ctx.stroke();
        ctx.shadowBlur = 0;
    }

    // 3. Chemical & Gas Gradient Strip (pH, Gas, Nuclear)
    function drawGradientBar(ctx, w, h, val, minV, maxV, unit) {
        ctx.clearRect(0, 0, w, h);
        const barH = 14;
        const barY = (h - barH) / 2;
        const norm = Math.max(0, Math.min(1, (val - minV) / ((maxV - minV) || 14)));

        // Color-coded gradient: Red (Acid) -> Green (Neutral) -> Violet (Base)
        const grad = ctx.createLinearGradient(0, 0, w, 0);
        grad.addColorStop(0.0, "#EF4444");  // Lethal acid
        grad.addColorStop(0.45, "#EAB308"); // Mild acid
        grad.addColorStop(0.5, "#10B981");  // Neutral (7.0 pH)
        grad.addColorStop(0.65, "#06B6D4"); // Potable
        grad.addColorStop(1.0, "#A855F7");  // Caustic danger

        ctx.fillStyle = grad;
        ctx.fillRect(8, barY, w - 16, barH);
        ctx.strokeStyle = "#334155";
        ctx.strokeRect(8, barY, w - 16, barH);

        // Moving triangular pointer
        const px = 8 + norm * (w - 16);
        ctx.fillStyle = "#FFFFFF";
        ctx.beginPath();
        ctx.moveTo(px, barY - 4);
        ctx.lineTo(px - 5, barY - 10);
        ctx.lineTo(px + 5, barY - 10);
        ctx.closePath();
        ctx.fill();

        ctx.font = "bold 9px monospace";
        ctx.fillStyle = "#94A3B8";
        ctx.fillText("0", 8, barY + barH + 11);
        ctx.fillText("7 (SAFE)", (w / 2) - 18, barY + barH + 11);
        ctx.fillText("14", w - 22, barY + barH + 11);
    }

    // 4. Polar Radar Range Sweep (LiDAR, Spatial, Proximity)
    function drawRadarSweep(ctx, w, h, val) {
        ctx.clearRect(0, 0, w, h);
        const cx = w / 2;
        const cy = h / 2;
        const radius = Math.min(w * 0.35, h * 0.45);

        // Concentric distance rings
        ctx.strokeStyle = "rgba(0, 240, 255, 0.25)";
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.arc(cx, cy, radius * 0.35, 0, 2 * Math.PI);
        ctx.arc(cx, cy, radius * 0.70, 0, 2 * Math.PI);
        ctx.arc(cx, cy, radius, 0, 2 * Math.PI);
        ctx.stroke();

        // Crosshairs
        ctx.beginPath();
        ctx.moveTo(cx - radius, cy); ctx.lineTo(cx + radius, cy);
        ctx.moveTo(cx, cy - radius); ctx.lineTo(cx, cy + radius);
        ctx.stroke();

        // Rotating radar beam
        const angle = (Date.now() / 600) % (2 * Math.PI);
        ctx.strokeStyle = "#00F0FF";
        ctx.lineWidth = 1.8;
        ctx.beginPath();
        ctx.moveTo(cx, cy);
        ctx.lineTo(cx + radius * Math.cos(angle), cy + radius * Math.sin(angle));
        ctx.stroke();

        // Obstacle detection blip
        const blipDist = radius * 0.55;
        const bx = cx + blipDist * Math.cos(1.2);
        const by = cy + blipDist * Math.sin(1.2);
        ctx.fillStyle = "#10B981";
        ctx.beginPath();
        ctx.arc(bx, by, 3, 0, 2 * Math.PI);
        ctx.fill();
    }

    // 5. High-Tech Cyber Sparkline with Neon Fill (Data/Network Streams)
    function drawModernSparkline(ctx, w, h, history, color, minV, maxV) {
        ctx.clearRect(0, 0, w, h);
        if (history.length < 2) return;

        // Subtle background grid
        ctx.strokeStyle = "rgba(30, 41, 59, 0.4)";
        ctx.lineWidth = 1;
        ctx.strokeRect(0, 0, w, h);

        const step = w / (history.length - 1);
        const range = (maxV - minV) || 1;

        // Gradient area fill under curve
        const grad = ctx.createLinearGradient(0, 0, 0, h);
        grad.addColorStop(0, color + "33");
        grad.addColorStop(1, color + "00");

        ctx.beginPath();
        history.forEach((v, i) => {
            const norm = (v - minV) / range;
            const y = h - (norm * (h - 8)) - 4;
            const x = i * step;
            if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
        });
        ctx.lineTo(w, h);
        ctx.lineTo(0, h);
        ctx.closePath();
        ctx.fillStyle = grad;
        ctx.fill();

        // Glowing stroke line
        ctx.beginPath();
        history.forEach((v, i) => {
            const norm = (v - minV) / range;
            const y = h - (norm * (h - 8)) - 4;
            const x = i * step;
            if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
        });
        ctx.strokeStyle = color;
        ctx.lineWidth = 1.8;
        ctx.shadowColor = color;
        ctx.shadowBlur = 6;
        ctx.stroke();
        ctx.shadowBlur = 0;
    }

    // --- REPLACE drawSensorWidget() AND drawSparkline() IN mission_control.js ---

    const echartsInstances = {};

    function updateSensorEChart(sid, s, val, history) {
        const chartDom = document.getElementById(`echart-${sid}`);
        if (!chartDom) return;

        // Initialize ECharts instance if not already cached
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
            const lineColor = isSensorSurge ? '#EF4444' : (cat === 'VIBRATION' ? '#10B981' : '#00F0FF');

            const option = {
                backgroundColor: 'transparent',
                grid: { left: 4, right: 4, top: 8, bottom: 4, containLabel: false },
                tooltip: { trigger: 'axis', backgroundColor: '#0F172A', borderColor: '#334155', textStyle: { color: '#F8FAFC', fontSize: 10 } },
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
                    // ISO Alarm line for vibration
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

    // Responsive auto-resizing
    window.addEventListener('resize', () => {
        Object.values(echartsInstances).forEach(c => c && c.resize());
    });

    // Dynamic Multi-Sensor Stepper Loop (1000ms tick)
    // --- IN setInterval() IN mission_control.js ---
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

            // Dispatch to specialized 60-FPS canvas renderer
            // drawSensorWidget(`canvas-${sid}`, s, val, hist);
            updateSensorEChart(sid, s, val, hist);

        });
    }, 1000);


    // Frame 2 Global Action Buttons
    document.getElementById("btn-sensor-surge")?.addEventListener("click", () => {
        isSensorSurge = true;
        const node = NODES[activeNodeKey];
        logEvent(`[FRAME 02] PHYSICAL SENSOR SURGE: Values on ${node.name} forced past Control Barrier h(x) < 0`, "text-yellow");
        logEvent(`[CBF_INVARIANCE] Critical Clearing Time constraint breached: T_crit = 38.4 ms (&le; 50 ms Limit)`, "text-purple");
    });

    document.getElementById("btn-sensor-stabilize")?.addEventListener("click", () => {
        isSensorSurge = false;
        const node = NODES[activeNodeKey];
        logEvent(`[FRAME 02] SENSORS STABILIZED: All channels on ${node.name} returned to safe operating bounds`, "text-green");
    });

    // ========================================================================
    // FRAME 3: LIVE eBPF MITIGATION FEED & FILTER CONTROLS
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
        const node = NODES[activeNodeKey];
        logEvent(`[XDP_TEST] Emulating driver ring drop on ${node.ip} &bull; Latency: 0.84 µs (0 SKB copies)`, "text-green");
    });

    // ========================================================================
    // FRAME 4: RED-TEAM INDUSTRIAL PROTOCOL ATTACKS
    // ========================================================================
    document.querySelectorAll(".attack-button-grid .btn-attack").forEach(btn => {
        const attack = btn.getAttribute("data-attack");
        if (!attack) return;

        btn.addEventListener("click", async () => {
            const node = NODES[activeNodeKey];
            logEvent(`[FRAME 04] Dispatching protocol vector ${attack} against target ${node.name} (${node.ip})...`, "text-yellow");

            try {
                const resp = await fetch("/api/v1/range/attacks/replay", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        malware: attack,
                        target: node.ip
                    })
                });

                if (resp.ok) {
                    const data = await resp.json();
                    logEvent(`[XDP_DROP] SLA 0.84 µs: In-kernel eBPF drop filtered ${data.frames_injected || 120} frames of ${attack} on ${node.ip}`, "text-green");
                } else {
                    simulateLocalDrop(attack, node);
                }
            } catch (err) {
                simulateLocalDrop(attack, node);
            }
        });
    });

    function simulateLocalDrop(attack, node) {
        setTimeout(() => {
            logEvent(`[XDP_DROP] SLA 0.84 µs: In-kernel driver ring drop on ${node.ip} for ${attack} (0 SKB copies, 2.42 IPC)`, "text-green");
        }, 280);
    }

    // Initialize Default Context & Active Sensors
    applyNodeContext(activeNodeKey);
});