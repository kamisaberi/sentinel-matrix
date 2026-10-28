/**
 * Aryorithm Air-Gapped Dynamic Gauge & Waveform Engine
 * High-performance HTML5 Canvas rendering for real-time sensor streams (60 FPS).
 * Zero external dependencies.
 */
class DynamicSensorVisualizer {
    static drawGauge(canvas, value, minVal, maxVal, label, unit) {
        const ctx = canvas.getContext("2d");
        const w = canvas.width;
        const h = canvas.height;
        const cx = w / 2;
        const cy = h / 2 + 10;
        const radius = Math.min(w, h) / 2 - 15;

        ctx.clearRect(0, 0, w, h);

        // Background Track Arc
        ctx.beginPath();
        ctx.arc(cx, cy, radius, Math.PI * 0.8, Math.PI * 2.2);
        ctx.lineWidth = 10;
        ctx.strokeStyle = "rgba(128, 128, 128, 0.2)";
        ctx.stroke();

        // Active Value Arc
        const pct = Math.max(0, Math.min(1, (value - minVal) / (maxVal - minVal)));
        const endAngle = Math.PI * 0.8 + pct * (Math.PI * 1.4);

        ctx.beginPath();
        ctx.arc(cx, cy, radius, Math.PI * 0.8, endAngle);
        ctx.lineWidth = 10;
        ctx.strokeStyle = pct > 0.85 ? "rgba(235, 60, 60, 0.9)" : "rgba(0, 200, 220, 0.9)";
        ctx.stroke();

        // Center Value & Unit
        ctx.font = "bold 16px monospace";
        ctx.fillStyle = "currentColor";
        ctx.textAlign = "center";
        ctx.fillText(`${value.toFixed(1)} ${unit}`, cx, cy - 2);

        // Subtitle Label
        ctx.font = "10px sans-serif";
        ctx.fillStyle = "rgba(128, 128, 128, 0.8)";
        ctx.fillText(label, cx, cy + 16);
    }

    static drawSparkline(canvas, historyArray, minVal, maxVal) {
        const ctx = canvas.getContext("2d");
        const w = canvas.width;
        const h = canvas.height;

        ctx.clearRect(0, 0, w, h);
        if (historyArray.length < 2) return;

        ctx.beginPath();
        const step = w / (historyArray.length - 1);

        for (let i = 0; i < historyArray.length; i++) {
            const norm = (historyArray[i] - minVal) / (maxVal - minVal);
            const y = h - (Math.max(0, Math.min(1, norm)) * (h - 8)) - 4;
            const x = i * step;

            if (i === 0) ctx.moveTo(x, y);
            else ctx.lineTo(x, y);
        }

        ctx.lineWidth = 2;
        ctx.strokeStyle = "rgba(0, 220, 140, 0.9)";
        ctx.stroke();
    }
}
window.DynamicSensorVisualizer = DynamicSensorVisualizer;