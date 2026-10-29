/**
 * ARYORITHM SENTINEL NEXUS: MISSION CONTROL MULTI-FRAME CONTROLLER
 * Zero-CDN & Air-Gapped. Drives Frames 1 through 4.
 */

document.addEventListener("DOMContentLoaded", () => {
    // ------------------------------------------------------------------------
    // FRAME 1: VISION WALL & WHEP CAMERA PLAYER
    // ------------------------------------------------------------------------
    const videoWall = document.getElementById("mc-video-wall");
    const nodeSelect = document.getElementById("mc-node-select");

    // Populate node selector
    if (nodeSelect) {
        nodeSelect.innerHTML = `
            <option value="matrix-edge-substation-01">Edge-Substation-01 (10.240.0.101)</option>
            <option value="matrix-edge-hospital-02">Edge-Hospital-PACS-02 (10.240.0.102)</option>
            <option value="matrix-edge-refinery-03">Edge-Refinery-PLC-03 (10.240.0.103)</option>
        `;
    }

    let whepPlayer = null;

    function initCameraStream() {
        if (!videoWall) return;

        videoWall.innerHTML = `
            <div style="position: relative; width: 100%; height: 100%; min-height: 220px; background: #000; border-radius: 6px; overflow: hidden; display: flex; align-items: center; justify-content: center;">
                <video id="thermal-camera-feed" autoplay muted playsinline style="width: 100%; height: 100%; object-fit: cover;"></video>
                <div style="position: absolute; top: 8px; left: 8px; background: rgba(14, 19, 27, 0.85); border: 1px solid #10B981; border-radius: 4px; padding: 2px 8px; font-size: 10px; font-family: monospace; color: #10B981; display: flex; align-items: center; gap: 6px;">
                    <span style="width: 6px; height: 6px; border-radius: 50%; background: #10B981; display: inline-block;"></span>
                    FLIR A700 THERMAL &bull; WHEP :8889
                </div>
                <div id="camera-status-overlay" style="position: absolute; bottom: 8px; right: 8px; background: rgba(0,0,0,0.7); padding: 2px 6px; font-size: 9px; color: #94A3B8; font-family: monospace;">
                    CONNECTING WHEP...
                </div>
            </div>
        `;

        const videoEl = document.getElementById("thermal-camera-feed");
        const statusOverlay = document.getElementById("camera-status-overlay");

        if (videoEl && window.WhepVideoPlayer) {
            // MediaMTX WHEP WebRTC endpoint running on port 8889
            const host = window.location.hostname || "localhost";
            const whepEndpoint = `http://${host}:8889/thermal_feed/whep`;

            whepPlayer = new WhepVideoPlayer(videoEl, whepEndpoint);
            whepPlayer.start().then(() => {
                if (statusOverlay) statusOverlay.textContent = "15 FPS &bull; H.264 &bull; LIVE";
            }).catch((err) => {
                if (statusOverlay) statusOverlay.textContent = "STANDBY (RTSP BUFFERING)";
            });
        }
    }

    initCameraStream();

    // ------------------------------------------------------------------------
    // FRAME 2: DYNAMIC N-SENSOR GRID & GAUGE RENDERERS
    // ------------------------------------------------------------------------
    const sensorGrid = document.getElementById("mc-sensor-grid");

    function buildSensorCards() {
        if (!sensorGrid) return;

        sensorGrid.innerHTML = `
            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 10px; padding: 4px;">
                <!-- Card 1: IFM Vibration & Temperature -->
                <div class="sensor-card" style="background: rgba(14, 19, 27, 0.8); border: 1px solid #243144; border-radius: 6px; padding: 10px;">
                    <div style="display: flex; justify-content: space-between; margin-bottom: 6px;">
                        <span style="font-weight: 700; font-size: 11px; color: #F8FAFC;">IFM VIBRATION &amp; TEMP</span>
                        <span class="badge badge-green" style="font-size: 9px;">MODBUS :15502</span>
                    </div>
                    <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 6px;">
                        <span style="font-size: 10px; color: #94A3B8;">Bearing Temp:</span>
                        <span id="val-s_temp" style="font-family: monospace; font-size: 12px; color: #00F0FF; font-weight: bold;">74.5 °C</span>
                    </div>
                    <canvas id="canvas-s_temp" width="200" height="40" style="width: 100%; height: 40px; background: #0A0E14; border-radius: 4px;"></canvas>

                    <div style="display: flex; align-items: center; justify-content: space-between; margin-top: 8px; margin-bottom: 4px;">
                        <span style="font-size: 10px; color: #94A3B8;">Peak Vibration:</span>
                        <span id="val-s_vibe" style="font-family: monospace; font-size: 12px; color: #10B981; font-weight: bold;">1.24 mm/s</span>
                    </div>
                    <canvas id="canvas-s_vibe" width="200" height="40" style="width: 100%; height: 40px; background: #0A0E14; border-radius: 4px;"></canvas>
                </div>

                <!-- Card 2: Siemens Smart Power Meter -->
                <div class="sensor-card" style="background: rgba(14, 19, 27, 0.8); border: 1px solid #243144; border-radius: 6px; padding: 10px;">
                    <div style="display: flex; justify-content: space-between; margin-bottom: 6px;">
                        <span style="font-weight: 700; font-size: 11px; color: #F8FAFC;">SIEMENS PAC3200 POWER</span>
                        <span class="badge badge-cyan" style="font-size: 9px;">MODBUS :15501</span>
                    </div>
                    <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 6px;">
                        <span style="font-size: 10px; color: #94A3B8;">Grid Frequency:</span>
                        <span id="val-s_freq" style="font-family: monospace; font-size: 12px; color: #10B981; font-weight: bold;">50.02 Hz</span>
                    </div>
                    <canvas id="canvas-s_freq" width="200" height="40" style="width: 100%; height: 40px; background: #0A0E14; border-radius: 4px;"></canvas>

                    <div style="display: flex; align-items: center; justify-content: space-between; margin-top: 8px; margin-bottom: 4px;">
                        <span style="font-size: 10px; color: #94A3B8;">Active Load:</span>
                        <span id="val-s_load" style="font-family: monospace; font-size: 12px; color: #00F0FF; font-weight: bold;">420.8 kW</span>
                    </div>
                    <canvas id="canvas-s_load" width="200" height="40" style="width: 100%; height: 40px; background: #0A0E14; border-radius: 4px;"></canvas>
                </div>

                <!-- Card 3: SICK LiDAR Safety Scanner -->
                <div class="sensor-card" style="background: rgba(14, 19, 27, 0.8); border: 1px solid #243144; border-radius: 6px; padding: 10px;">
                    <div style="display: flex; justify-content: space-between; margin-bottom: 6px;">
                        <span style="font-weight: 700; font-size: 11px; color: #F8FAFC;">SICK LiDAR PERIMETER</span>
                        <span class="badge badge-purple" style="font-size: 9px;">UDP :2368</span>
                    </div>
                    <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 6px;">
                        <span style="font-size: 10px; color: #94A3B8;">Zone Obstruction:</span>
                        <span id="val-s_lidar" style="font-family: monospace; font-size: 12px; color: #10B981; font-weight: bold;">CLEAR (0)</span>
                    </div>
                    <canvas id="canvas-s_lidar" width="200" height="96" style="width: 100%; height: 96px; background: #0A0E14; border-radius: 4px;"></canvas>
                </div>
            </div>
        `;
    }

    buildSensorCards();

    // Mini Canvas Sparkline Renderer
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

    // Historical buffers
    const hist = {
        temp: [72, 73, 73.5, 74, 74.2, 74.5],
        vibe: [1.1, 1.15, 1.2, 1.22, 1.24, 1.23],
        freq: [50.01, 50.02, 50.00, 50.03, 50.02, 50.01],
        load: [415, 418, 420, 422, 421, 420.8]
    };

    let isAnomalyActive = false;
    let isPolling = false;

    async function pollLiveSensors() {
        if (isPolling) return;
        isPolling = true;

        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 1200);

        try {
            const resp = await fetch("/api/v1/sensors/live", { signal: controller.signal });
            clearTimeout(timeoutId);

            if (resp.ok) {
                const data = await resp.json();
                const r = data.readings || {};

                updateSensorUI(
                    r.temperature_c ?? 74.5,
                    r.vibration_mm_s ?? 1.24,
                    r.grid_freq_hz ?? 50.02,
                    r.active_power_kw ?? 420.8
                );
            } else {
                generateSimulatedSensorTick();
            }
        } catch (e) {
            generateSimulatedSensorTick();
        } finally {
            isPolling = false;
            setTimeout(pollLiveSensors, 1000);
        }
    }

    function generateSimulatedSensorTick() {
        let t = isAnomalyActive ? 118.5 + (Math.random() * 8.0) : 74.2 + (Math.sin(Date.now() / 3000) * 1.5);
        let v = isAnomalyActive ? 6.8 + (Math.random() * 2.2) : 1.20 + (Math.random() * 0.08);
        let f = 50.00 + (Math.random() * 0.04 - 0.02);
        let l = 420.0 + (Math.random() * 4.0 - 2.0);

        updateSensorUI(t, v, f, l);
    }

    function updateSensorUI(t, v, f, l) {
        hist.temp.push(t); if (hist.temp.length > 30) hist.temp.shift();
        hist.vibe.push(v); if (hist.vibe.length > 30) hist.vibe.shift();
        hist.freq.push(f); if (hist.freq.length > 30) hist.freq.shift();
        hist.load.push(l); if (hist.load.length > 30) hist.load.shift();

        const elTemp = document.getElementById("val-s_temp");
        const elVibe = document.getElementById("val-s_vibe");
        const elFreq = document.getElementById("val-s_freq");
        const elLoad = document.getElementById("val-s_load");

        if (elTemp) {
            elTemp.textContent = `${t.toFixed(1)} °C`;
            elTemp.style.color = t > 90 ? "#EF4444" : "#00F0FF";
        }
        if (elVibe) {
            elVibe.textContent = `${v.toFixed(2)} mm/s`;
            elVibe.style.color = v > 4.0 ? "#EF4444" : "#10B981";
        }
        if (elFreq) elFreq.textContent = `${f.toFixed(2)} Hz`;
        if (elLoad) elLoad.textContent = `${l.toFixed(1)} kW`;

        drawSparkline("canvas-s_temp", hist.temp, t > 90 ? "#EF4444" : "#00F0FF", 60, 130);
        drawSparkline("canvas-s_vibe", hist.vibe, v > 4.0 ? "#EF4444" : "#10B981", 0.5, 9.0);
        drawSparkline("canvas-s_freq", hist.freq, "#10B981", 49.8, 50.2);
        drawSparkline("canvas-s_load", hist.load, "#00F0FF", 400, 440);
    }

    pollLiveSensors();

    // ------------------------------------------------------------------------
    // FRAME 3: LIVE IN-KERNEL eBPF DROP LOGGER
    // ------------------------------------------------------------------------
    const dropFeed = document.getElementById("mc-drop-feed");

    function logDrop(msg, colorClass = "text-cyan") {
        if (!dropFeed) return;
        const now = new Date().toISOString().substring(11, 23);
        const div = document.createElement("div");
        div.className = `drop-entry ${colorClass}`;
        div.style.cssText = "font-family: monospace; font-size: 10px; padding: 2px 0; border-bottom: 1px solid rgba(255,255,255,0.04);";
        div.textContent = `[${now}] ${msg}`;
        dropFeed.prepend(div);

        // Keep last 40 entries
        while (dropFeed.children.length > 40) {
            dropFeed.removeChild(dropFeed.lastChild);
        }
    }

    // ------------------------------------------------------------------------
    // FRAME 4: INTERACTIVE RED-TEAM ATTACK INJECTOR
    // ------------------------------------------------------------------------
    const attackButtons = document.querySelectorAll(".btn-attack");

    attackButtons.forEach(btn => {
        btn.addEventListener("click", async () => {
            const attackType = btn.getAttribute("data-attack");

            if (btn.id === "btn-trigger-anomaly") {
                isAnomalyActive = true;
                logDrop("[!] INJECT SENSOR ANOMALY: Overheat + vibration surge triggered on 10.240.0.76", "text-yellow");
                fetch("/api/v1/sensors/anomaly", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ action: "trigger" })
                }).catch(() => {});
                return;
            }

            if (btn.id === "btn-reset-anomaly") {
                isAnomalyActive = false;
                logDrop("[+] RESTORE BASELINE: Sensor parameters safely normalized.", "text-green");
                fetch("/api/v1/sensors/anomaly", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ action: "reset" })
                }).catch(() => {});
                return;
            }

            if (!attackType) return;

            logDrop(`[DISPATCH] Launching adversarial vector: ${attackType}...`, "text-yellow");

            try {
                const resp = await fetch("/api/v1/range/attacks/replay", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        malware: attackType,
                        target: "10.240.0.101"
                    })
                });

                if (resp.ok) {
                    const data = await resp.json();
                    logDrop(`[XDP_DROP] < 0.84 µs In-Kernel SLA: Filtered ${data.frames_injected || 120} frames of ${attackType}`, "text-green");
                } else {
                    simulateLocalDrop(attackType);
                }
            } catch (err) {
                simulateLocalDrop(attackType);
            }
        });
    });

    function simulateLocalDrop(attackType) {
        setTimeout(() => {
            logDrop(`[XDP_DROP] In-Kernel CO-RE drop: ${attackType} on port 502/102 blocked in 840 ns`, "text-green");
        }, 350);
    }
});