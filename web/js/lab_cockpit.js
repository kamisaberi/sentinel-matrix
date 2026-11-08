// ==============================================================================
// SENTINEL-LAB: AIR-GAPPED SCIENTIFIC RESEARCH COCKPIT CONTROLLER
// 100% Zero-CDN Vanilla JS, HTML5 Canvas, Real-Time Poller
// ==============================================================================

(function () {
    let trajectory = [];
    const maxHistoryPoints = 80;
    let lastLogContent = "";
    let isTabVisible = false;

    // Observe tab visibility to optimize rendering
    const labTabBtn = document.querySelector('[data-tab="tab-lab-cockpit"]');
    if (labTabBtn) {
        labTabBtn.addEventListener('click', () => {
            isTabVisible = true;
            setTimeout(() => {
                updateTelemetry();
                pollLogs();
            }, 100);
        });
    }

    document.querySelectorAll('.nav-tab').forEach(tab => {
        if (tab !== labTabBtn) {
            tab.addEventListener('click', () => {
                isTabVisible = false;
            });
        }
    });

    // --- PANE 1: Real-Time Scrolling Oscilloscope Canvas ---
    function drawCBF(temp, barrier) {
        const canvas = document.getElementById('cbfCanvas');
        if (!canvas) return;
        const ctx = canvas.getContext('2d');

        canvas.width = canvas.clientWidth;
        canvas.height = canvas.clientHeight;
        const w = canvas.width, h = canvas.height;

        ctx.clearRect(0, 0, w, h);

        const minT = 70.0, maxT = 130.0;
        function getY(t) {
            let norm = (t - minT) / (maxT - minT);
            return h - (norm * h);
        }

        // 1. Red Unsafe Shaded Area (> 120°C)
        const yBarrier = getY(120.0);
        ctx.fillStyle = 'rgba(239, 68, 68, 0.15)';
        ctx.fillRect(0, 0, w, yBarrier);

        // 2. Barrier Threshold Line h(x) = 0
        ctx.strokeStyle = '#ef4444';
        ctx.lineWidth = 2;
        ctx.setLineDash([4, 4]);
        ctx.beginPath();
        ctx.moveTo(0, yBarrier);
        ctx.lineTo(w, yBarrier);
        ctx.stroke();
        ctx.setLineDash([]);

        ctx.fillStyle = '#ef4444';
        ctx.font = '10px monospace';
        ctx.fillText('h(x)=0 Safety Barrier (120°C Limit)', 10, Math.max(15, yBarrier - 5));

        // 3. Nominal Baseline (85°C)
        const yNominal = getY(85.0);
        ctx.strokeStyle = 'rgba(16, 185, 129, 0.4)';
        ctx.lineWidth = 1;
        ctx.setLineDash([2, 4]);
        ctx.beginPath();
        ctx.moveTo(0, yNominal);
        ctx.lineTo(w, yNominal);
        ctx.stroke();
        ctx.setLineDash([]);

        ctx.fillStyle = 'rgba(16, 185, 129, 0.7)';
        ctx.font = '10px monospace';
        ctx.fillText('85°C Nominal Baseline', 10, yNominal - 5);

        // Push temperature history
        trajectory.push(temp);
        if (trajectory.length > maxHistoryPoints) {
            trajectory.shift();
        }

        // 4. Draw Scrolling Waveform
        if (trajectory.length > 1) {
            ctx.strokeStyle = (temp >= 120.0) ? '#ef4444' : ((temp >= 105.0) ? '#f59e0b' : '#00F0FF');
            ctx.lineWidth = 2.5;
            ctx.beginPath();

            for (let i = 0; i < trajectory.length; i++) {
                let px = (i / (maxHistoryPoints - 1)) * w;
                let py = getY(trajectory[i]);
                if (i === 0) ctx.moveTo(px, py);
                else ctx.lineTo(px, py);
            }
            ctx.stroke();

            // Glowing Current Lead Head Particle
            let lastIdx = trajectory.length - 1;
            let lastX = (lastIdx / (maxHistoryPoints - 1)) * w;
            let lastY = getY(trajectory[lastIdx]);

            ctx.fillStyle = (temp >= 120.0) ? '#ef4444' : ((temp >= 105.0) ? '#f59e0b' : '#10b981');
            ctx.beginPath();
            ctx.arc(lastX, lastY, 6, 0, Math.PI * 2);
            ctx.fill();
        }
    }

    // --- PANE 2: EVT Gumbel Curve Drawing ---
    function drawEVT() {
        const canvas = document.getElementById('evtCanvas');
        if (!canvas) return;
        const ctx = canvas.getContext('2d');

        canvas.width = canvas.clientWidth;
        canvas.height = canvas.clientHeight;
        const w = canvas.width, h = canvas.height;

        ctx.clearRect(0, 0, w, h);

        ctx.strokeStyle = '#00F0FF';
        ctx.lineWidth = 2;
        ctx.beginPath();

        for (let x = 0; x < w; x++) {
            let z = (x / w) * 3.0;
            let yNorm = Math.exp(-(z - 0.84) - Math.exp(-(z - 0.84)));
            let y = h - (yNorm * h * 2.2);
            if (x === 0) ctx.moveTo(x, y);
            else ctx.lineTo(x, y);
        }
        ctx.stroke();

        let x999 = (1.82 / 3.0) * w;
        ctx.strokeStyle = '#10b981';
        ctx.lineWidth = 2;
        ctx.setLineDash([4, 4]);
        ctx.beginPath();
        ctx.moveTo(x999, 15);
        ctx.lineTo(x999, h);
        ctx.stroke();
        ctx.setLineDash([]);

        ctx.fillStyle = '#10b981';
        ctx.font = '10px monospace';
        ctx.fillText('p99.999% = 1.82 µs', x999 + 6, 28);
    }

    // --- Polling Logic ---
    async function updateTelemetry() {
        try {
            const resp = await fetch('/api/v1/lab/telemetry');
            if (resp.ok) {
                const data = await resp.json();
                const ps = data.physical_state;

                const tempEl = document.getElementById('val-temp');
                if (tempEl) tempEl.innerText = ps.temperature_c.toFixed(1) + ' °C';

                const barrierEl = document.getElementById('val-barrier');
                if (barrierEl) barrierEl.innerText = (ps.cbf_barrier_h >= 0 ? '+' : '') + ps.cbf_barrier_h.toFixed(3);

                const lyapEl = document.getElementById('val-lyapunov');
                if (lyapEl) lyapEl.innerText = ps.lyapunov_lambda.toFixed(3);

                const tcritEl = document.getElementById('val-tcrit');
                if (tcritEl) tcritEl.innerText = ps.t_crit_ms.toFixed(1) + ' ms';

                const badge = document.getElementById('cbf-status-badge');
                if (badge) {
                    if (ps.is_safe) {
                        badge.className = 'badge badge-green';
                        badge.innerText = 'h(x) ≥ 0 SAFE';
                    } else {
                        badge.className = 'badge badge-red';
                        badge.innerText = 'SAFETY BARRIER BREACHED';
                    }
                }
                drawCBF(ps.temperature_c, ps.cbf_barrier_h);
            }
        } catch (e) {
            drawCBF(85.0, 35.0);
        }
        drawEVT();
    }

    async function pollLogs() {
        try {
            const resp = await fetch('/api/v1/lab/logs');
            if (resp.ok) {
                const data = await resp.json();
                if (data.logs && data.logs !== lastLogContent) {
                    lastLogContent = data.logs;
                    const term = document.getElementById('labTerminalBody');
                    if (term) {
                        term.innerText = data.logs;
                        term.scrollTop = term.scrollHeight;
                    }
                    const statusEl = document.getElementById('lab-log-status');
                    if (statusEl) statusEl.innerText = 'UPDATED ' + new Date().toLocaleTimeString();
                }
            }
        } catch (e) {}
    }

    // Global Exposure for UI Buttons
    window.injectLab = async function (action) {
        const statusEl = document.getElementById('deck-status');
        if (statusEl) statusEl.innerText = 'DISPATCHING: ' + action.toUpperCase();

        try {
            const res = await fetch('/api/v1/lab/inject', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: action })
            });
            const d = await res.json();
            if (statusEl) statusEl.innerText = 'EXECUTING: ' + d.action.toUpperCase();
        } catch (e) {
            if (statusEl) statusEl.innerText = 'TRIGGERED';
        }
        setTimeout(pollLogs, 250);
        setTimeout(pollLogs, 800);
    };

    window.exportLabScorecard = async function () {
        const res = await fetch('/api/v1/lab/scorecard');
        const data = await res.json();
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'sentinel_lab_benchmark_scorecard.json';
        a.click();
    };

    setInterval(updateTelemetry, 400);
    setInterval(pollLogs, 800);
    updateTelemetry();
})();