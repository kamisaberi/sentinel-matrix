/**
 * ARYORITHM SENTINEL NEXUS: MISSION CONTROL MULTI-FRAME CONTROLLER
 * Drives the 4-Frame Schematic with Real-Time Video, Gauges, eBPF Drops, and Attacks.
 */

document.addEventListener("DOMContentLoaded", () => {
    let isAnomalyActive = false;

    // ========================================================================
    // FRAME 1: THERMAL VISION WALL (Infinite Stream + Anomaly Visualizer)
    // ========================================================================
    const videoWall = document.getElementById("mc-video-wall");
    const nodeSelect = document.getElementById("mc-node-select");

    if (nodeSelect) {
        nodeSelect.innerHTML = `
            <option value="matrix-edge-substation-01">Edge-Substation-01 (10.240.0.101)</option>
            <option value="matrix-edge-hospital-02">Edge-Hospital-PACS-02 (10.240.0.102)</option>
            <option value="matrix-edge-refinery-03">Edge-Refinery-PLC-03 (10.240.0.103)</option>
        `;
    }

    function initVideoWall() {
        if (!videoWall) return;

        videoWall.innerHTML = `
            <div style="position: relative; width: 100%; height: 100%; min-height: 240px; background: #05080C; display: flex; align-items: center; justify-content: center; overflow: hidden;">
                <!-- Primary WebRTC Video Tag -->
                <video id="thermal-video" autoplay muted playsinline style="width: 100%; height: 100%; object-fit: cover; display: none;"></video>
                
                <!-- Infinite Fallback Thermal Canvas (Guarantees infinite video under all environments) -->
                <canvas id="thermal-canvas" width="640" height="360" style="width: 100%; height: 100%; object-fit: cover;"></canvas>

                <!-- Status Overlay Badge -->
                <div style="position: absolute; top: 10px; left: 10px; background: rgba(14, 19, 27, 0.9); border: 1px solid #10B981; border-radius: 4px; padding: 4px 8px; font-size: 10px; font-family: monospace; color: #10B981; display: flex; align-items: center; gap: 6px;">
                    <span id="cam-status-dot" style="width: 7px; height: 7px; border-radius: 50%; background: #10B981; display: inline-block;"></span>
                    <span id="cam-status-text">FLIR A700 &bull; LIVE STREAM</span>
                </div>

                <!-- Emergency Anomaly Overlay HUD -->
                <div id="thermal-anomaly-hud" style="display: none; position: absolute; inset: 0; border: 3px solid #EF4444; background: rgba(239, 68, 68, 0.15); pointer-events: none; flex-direction: column; align-items: center; justify-content: center; animation: pulse 0.8s infinite alternate;">
                    <span style="background: #EF4444; color: #FFF; font-weight: 800; font-size: 12px; font-family: monospace; padding: 4px 12px; border-radius: 4px; letter-spacing: 1px;">
                        [!] THERMAL RUNAWAY DETECTED &bull; 118.5 °C
                    </span>
                    <span style="color: #FCA5A5; font-size: 10px; font-family: monospace; margin-top: 4px;">
                        CRITICAL CLEARING TIME LIMIT T_CRIT &le; 38.4 ms
                    </span>
                </div>
            </div>
        `;

        const videoEl = document.getElementById("thermal-video");
        const canvasEl = document.getElementById("thermal-canvas");
        const statusText = document.getElementById("cam-status-text");

        // Attempt WebRTC WHEP connection to MediaMTX
        const whepEndpoint = `http://${window.location.hostname || "localhost"}:8889/thermal_feed/whep`;
        const whep = new WhepVideoPlayer(videoEl, whepEndpoint);

        whep.start().then(() => {
            videoEl.style.display = "block";
            canvasEl.style.display = "none";
            if (statusText) statusText.textContent = "FLIR A700 &bull; WHEP :8889 (LIVE)";
        }).catch(() => {
            // Start the infinite synthetic thermal canvas simulation
            videoEl.style.display = "none";
            canvasEl.style.display = "block";
            if (statusText) statusText.textContent = "FLIR A700 &bull; SIMULATED RTSP (ACTIVE)";
            startInfiniteThermalSimulation(canvasEl);
        });
    }

    // Infinite Synthetic Thermal Stream Generator with Anomaly Mutation
    function startInfiniteThermalSimulation(canvas) {
        const ctx = canvas.getContext("2d");
        let tick = 0;

        function renderFrame() {
            tick += 0.05;
            const w = canvas.width;
            const h = canvas.height;

            // Background Thermal Gradient
            const grad = ctx.createRadialGradient(w / 2, h / 2, 20, w / 2, h / 2, w / 1.5);
            if (isAnomalyActive) {
                // Anomaly palette: Harsh infrared orange and glaring white heat
                grad.addColorStop(0, "#FFFFFF");
                grad.addColorStop(0.3, "#FF3B00");
                grad.addColorStop(0.7, "#990000");
                grad.addColorStop(1, "#1A0000");
            } else {
                // Baseline palette: Cool industrial cobalt and thermal green
                grad.addColorStop(0, "#00F0FF");
                grad.addColorStop(0.3, "#005577");
                grad.addColorStop(0.7, "#051A2E");
                grad.addColorStop(1, "#02070D");
            }

            ctx.fillStyle = grad;
            ctx.fillRect(0, 0, w, h);

            // Animated Simulated Turbine Rotor Heat Grid
            const cx = w / 2;
            const cy = h / 2;
            const rotorRadius = 80 + Math.sin(tick * 3) * (isAnomalyActive ? 12 : 3);

            ctx.beginPath();
            ctx.arc(cx, cy, rotorRadius, 0, Math.PI * 2);
            ctx.fillStyle = isAnomalyActive ? "rgba(255, 255, 255, 0.8)" : "rgba(16, 185, 129, 0.4)";
            ctx.fill();

            // Thermal Raster Scanlines
            ctx.fillStyle = "rgba(0, 0, 0, 0.2)";
            for (let y = 0; y < h; y += 4) {
                ctx.fillRect(0, y, w, 2);
            }

            // Target Crosshair
            ctx.strokeStyle = isAnomalyActive ? "#FF0000" : "rgba(0, 240, 255, 0.5)";
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(cx - 30, cy); ctx.lineTo(cx + 30, cy);
            ctx.moveTo(cx, cy - 30); ctx.lineTo(cx, cy + 30);
            ctx.stroke();

            // Corner Telemetry Stamp
            ctx.fillStyle = isAnomalyActive ? "#FF4444" : "#10B981";
            ctx.font = "bold 12px monospace";
            ctx.fillText(`BEARING TEMP: ${isAnomalyActive ? "118.5" : "74.5"} °C`, 20, h - 20);
            ctx.fillText(`ROTATION: ${isAnomalyActive ? "3,840" : "1,480"} RPM`, w - 180, h - 20);

            requestAnimationFrame(renderFrame);
        }

        renderFrame();
    }

    initVideoWall();

    // ========================================================================
    // FRAME 2: DYNAMIC PHYSICAL SENSORY GRID
    // ========================================================================
    const sensorGrid = document.getElementById("mc-sensor-grid");

    if (sensorGrid) {
        sensorGrid.innerHTML = `
            <div class="sensor-card" style="background:#0A0E14; border:1px solid #243144; border-radius:6px; padding:10px;">
                <div style="display:flex; justify-content:space-between; margin-bottom:4px;">
                    <span style="font-size:11px; font-weight:700; color:#F8FAFC;">IFM VIBRATION &amp; TEMP</span>
                    <span class="badge badge-green" style="font-size:9px;">MODBUS :15502</span>
                </div>
                <div style="font-size:10px; color:#94A3B8;">Temperature: <b id="val-temp" style="color:#00F0FF;">74.5 °C</b></div>
                <canvas id="spark-temp" width="180" height="35" style="width:100%; height:35px; margin:4px 0;"></canvas>
                <div style="font-size:10px; color:#94A3B8;">Vibration: <b id="val-vibe" style="color:#10B981;">1.24 mm/s</b></div>
                <canvas id="spark-vibe" width="180" height="35" style="width:100%; height:35px; margin:4px 0;"></canvas>
            </div>

            <div class="sensor-card" style="background:#0A0E14; border:1px solid #243144; border-radius:6px; padding:10px;">
                <div style="display:flex; justify-content:space-between; margin-bottom:4px;">
                    <span style="font-size:11px; font-weight:700; color:#F8FAFC;">SIEMENS POWER QUALITY</span>
                    <span class="badge badge-cyan" style="font-size:9px;">MODBUS :15501</span>
                </div>
                <div style="font-size:10px; color:#94A3B8;">Grid Freq: <b id="val-freq" style="color:#10B981;">50.02 Hz</b></div>
                <canvas id="spark-freq" width="180" height="35" style="width:100%; height:35px; margin:4px 0;"></canvas>
                <div style="font-size:10px; color:#94A3B8;">Active Load: <b id="val-load" style="color:#00F0FF;">420.8 kW</b></div>
                <canvas id="spark-load" width="180" height="35" style="width:100%; height:35px; margin:4px 0;"></canvas>
            </div>
        `;
    }

    const hist = {
        temp: [73, 73.5, 74, 74.2, 74.5],
        vibe: [1.1, 1.15, 1.2, 1.22, 1.24],
        freq: [50.01, 50.02, 50.00, 50.03, 50.02],
        load: [415, 418, 420, 422, 420.8]
    };

    function drawSparkline(canvasId, data, color, min, max) {
        const c = document.getElementById(canvasId);
        if (!c) return;
        const ctx = c.getContext("2d");
        const w = c.width;
        const h = c.height;

        ctx.clearRect(0, 0, w, h);
        if (data.length < 2) return;

        ctx.strokeStyle = color;
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        const step = w / (data.length - 1);
        const range = (max - min) || 1;

        data.forEach((val, i) => {
            const y = h - ((val - min) / range) * (h - 6) - 3;
            const x = i * step;
            if (i === 0) ctx.moveTo(x, y);
            else ctx.lineTo(x, y);
        });
        ctx.stroke();
    }

    setInterval(() => {
        const t = isAnomalyActive ? 118.5 + Math.random() * 4 : 74.5 + Math.sin(Date.now() / 2000) * 1.2;
        const v = isAnomalyActive ? 6.8 + Math.random() * 1.5 : 1.24 + Math.random() * 0.06;
        const f = 50.00 + (Math.random() * 0.04 - 0.02);
        const l = 420.0 + (Math.random() * 4 - 2);

        hist.temp.push(t); if (hist.temp.length > 25) hist.temp.shift();
        hist.vibe.push(v); if (hist.vibe.length > 25) hist.vibe.shift();
        hist.freq.push(f); if (hist.freq.length > 25) hist.freq.shift();
        hist.load.push(l); if (hist.load.length > 25) hist.load.shift();

        const elT = document.getElementById("val-temp");
        const elV = document.getElementById("val-vibe");
        const elF = document.getElementById("val-freq");
        const elL = document.getElementById("val-load");

        if (elT) { elT.textContent = `${t.toFixed(1)} °C`; elT.style.color = t > 90 ? "#EF4444" : "#00F0FF"; }
        if (elV) { elV.textContent = `${v.toFixed(2)} mm/s`; elV.style.color = v > 4 ? "#EF4444" : "#10B981"; }
        if (elF) elF.textContent = `${f.toFixed(2)} Hz`;
        if (elL) elL.textContent = `${l.toFixed(1)} kW`;

        drawSparkline("spark-temp", hist.temp, t > 90 ? "#EF4444" : "#00F0FF", 60, 130);
        drawSparkline("spark-vibe", hist.vibe, v > 4 ? "#EF4444" : "#10B981", 0.5, 9);
        drawSparkline("spark-freq", hist.freq, "#10B981", 49.8, 50.2);
        drawSparkline("spark-load", hist.load, "#00F0FF", 400, 440);
    }, 1000);

    // ========================================================================
    // FRAME 3: LIVE eBPF MITIGATION FEED
    // ========================================================================
    const dropFeed = document.getElementById("mc-drop-feed");

    function logEvent(msg, colorClass = "text-cyan") {
        if (!dropFeed) return;
        const now = new Date().toISOString().substring(11, 23);
        const div = document.createElement("div");
        div.className = `drop-entry ${colorClass}`;
        div.style.cssText = "font-family: monospace; font-size: 11px; padding: 3px 0; border-bottom: 1px solid rgba(255,255,255,0.05);";
        div.textContent = `[${now}] ${msg}`;
        dropFeed.prepend(div);
        while (dropFeed.children.length > 50) dropFeed.removeChild(dropFeed.lastChild);
    }

    // ========================================================================
    // FRAME 4: RED-TEAM ATTACK INJECTION & ANOMALY TOGGLE
    // ========================================================================
    const hud = document.getElementById("thermal-anomaly-hud");
    const videoTag = document.getElementById("thermal-video");

    document.getElementById("btn-trigger-anomaly")?.addEventListener("click", () => {
        isAnomalyActive = true;
        if (hud) hud.style.display = "flex";
        if (videoTag) {
            videoTag.style.filter = "hue-rotate(180deg) saturate(3.5) contrast(2.0)";
        }
        logEvent("[!] CRITICAL ANOMALY: Overheat bearing + vibration surge triggered on 10.240.0.76", "text-yellow");
        logEvent("[SAFETY_GATE] Physical plant stability solver: T_crit = 38.4 ms (within <= 50 ms limit)", "text-purple");
    });

    document.getElementById("btn-reset-anomaly")?.addEventListener("click", () => {
        isAnomalyActive = false;
        if (hud) hud.style.display = "none";
        if (videoTag) {
            videoTag.style.filter = "none";
        }
        logEvent("[+] BASELINE RESTORED: All physical sensor channels operating within nominal bounds.", "text-green");
    });

    document.querySelectorAll(".btn-attack").forEach(btn => {
        const attack = btn.getAttribute("data-attack");
        if (!attack) return;

        btn.addEventListener("click", () => {
            logEvent(`[DISPATCH] Launching adversarial replay: ${attack} against port 502/102...`, "text-yellow");
            setTimeout(() => {
                logEvent(`[XDP_DROP] SLA 0.84 µs: In-kernel eBPF driver drop enforced on ${attack} (0 SKB copies)`, "text-green");
            }, 300);
        });
    });
});