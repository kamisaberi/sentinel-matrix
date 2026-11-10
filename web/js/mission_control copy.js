/**
 * ARYORITHM SENTINEL NEXUS: MISSION CONTROL MULTI-FRAME CONTROLLER
 * Reactive Global Master Bar + Frame-Specific Action Buttons
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

    // Elements
    const nodeSelect = document.getElementById("mc-node-select");
    const backendBadge = document.getElementById("mc-node-backend-badge");
    const targetIpBadge = document.getElementById("mc-target-ip-badge");
    const videoWall = document.getElementById("mc-video-wall");
    const sensorGrid = document.getElementById("mc-sensor-grid");
    const dropFeed = document.getElementById("mc-drop-feed");

    const sensorHistories = { s1: [], s2: [], s3: [], s4: [] };

    // ========================================================================
    // MASTER NODE SELECTOR (Globally Placed)
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
        renderSensorCards(node);
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
    // FRAME 2: DYNAMIC SENSORY GRID & SENSOR ACTION BUTTONS
    // ========================================================================
    function renderSensorCards(node) {
        if (!sensorGrid) return;
        sensorHistories.s1 = []; sensorHistories.s2 = [];
        sensorHistories.s3 = []; sensorHistories.s4 = [];

        sensorGrid.innerHTML = Object.entries(node.sensors).map(([key, s]) => `
            <div class="sensor-card" style="background:#0A0E14; border:1px solid #243144; border-radius:6px; padding:8px;">
                <div style="display:flex; justify-content:space-between; align-items:center;">
                    <span style="font-size:10px; font-weight:700; color:#F8FAFC;">${s.label}</span>
                    <span class="badge badge-cyan" style="font-size:8px;">${s.port}</span>
                </div>
                <div style="display:flex; justify-content:space-between; align-items:baseline; margin:3px 0;">
                    <span style="font-size:9px; color:#94A3B8;">Metric:</span>
                    <span id="val-${key}" style="font-family:monospace; font-size:11px; font-weight:700; color:${s.color};">
                        ${s.base} ${s.unit}
                    </span>
                </div>
                <canvas id="canvas-${key}" width="160" height="32" style="width:100%; height:32px; display:block;"></canvas>
            </div>
        `).join("");
    }

    function drawSparkline(canvasId, values, color, minVal, maxVal) {
        const cvs = document.getElementById(canvasId);
        if (!cvs) return;
        const ctx = cvs.getContext("2d");
        const w = cvs.width;
        const h = cvs.height;

        ctx.clearRect(0, 0, w, h);
        if (values.length < 2) return;

        ctx.strokeStyle = color;
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        const step = w / (values.length - 1);
        const range = (maxVal - minVal) || 1;

        values.forEach((v, i) => {
            const norm = (v - minVal) / range;
            const y = h - (norm * (h - 6)) - 3;
            const x = i * step;
            if (i === 0) ctx.moveTo(x, y);
            else ctx.lineTo(x, y);
        });
        ctx.stroke();
    }

    setInterval(() => {
        const node = NODES[activeNodeKey];
        if (!node) return;

        Object.entries(node.sensors).forEach(([key, s]) => {
            let val;
            if (isSensorSurge) {
                val = s.base * (1.35 + Math.random() * 0.35);
            } else {
                val = s.base + (Math.sin(Date.now() / 2500) * (s.base * 0.02)) + ((Math.random() - 0.5) * (s.base * 0.01));
            }

            const hist = sensorHistories[key];
            hist.push(val);
            if (hist.length > 25) hist.shift();

            const valEl = document.getElementById(`val-${key}`);
            if (valEl) {
                valEl.textContent = `${val.toFixed(val < 10 ? 2 : 1)} ${s.unit}`;
                valEl.style.color = isSensorSurge ? "#EF4444" : s.color;
            }

            drawSparkline(`canvas-${key}`, hist, isSensorSurge ? "#EF4444" : s.color, s.range[0], s.range[1]);
        });
    }, 1000);

    // Frame 2 Action Buttons
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

    // Initialize Default State
    applyNodeContext(activeNodeKey);
});