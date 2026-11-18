// ============================================================================
// ARYORITHM SENTINEL NEXUS: PIPELINE DAG VISUALIZER (CLEAN DYNAMIC FLOW)
// ============================================================================

class PipelineDagVisualizer {
    constructor(canvasId) {
        this.canvas = document.getElementById(canvasId);
        if (!this.canvas) return;
        this.ctx = this.canvas.getContext('2d');
        this.rawExtensions = [];

        this.resize();
        window.addEventListener('resize', () => {
            this.resize();
            this.draw();
        });

        this.fetchDynamicStages();
        setInterval(() => this.fetchDynamicStages(), 4000);
    }

    resize() {
        if (!this.canvas || !this.canvas.parentElement) return;

        const parentW = this.canvas.parentElement.clientWidth || this.canvas.parentElement.offsetWidth;
        const parentH = this.canvas.parentElement.clientHeight || this.canvas.parentElement.offsetHeight;

        // Guarantee positive layout bounds even if initialized inside a hidden tab
        const targetW = parentW > 100 ? parentW : (window.innerWidth ? Math.max(window.innerWidth - 320, 800) : 1000);
        const targetH = parentH > 100 ? parentH : 380;

        // High-DPI Crisp Rendering
        const dpr = window.devicePixelRatio || 1;
        this.canvas.width = targetW * dpr;
        this.canvas.height = targetH * dpr;
        this.canvas.style.width = targetW + 'px';
        this.canvas.style.height = targetH + 'px';

        this.ctx.scale(dpr, dpr);
        this.logicalWidth = targetW;
        this.logicalHeight = targetH;
    }

    async fetchDynamicStages() {
        try {
            const resp = await fetch('/api/v1/extensions/status');
            if (resp.ok) {
                this.rawExtensions = await resp.json();
            }
        } catch (e) {
            // Fallback to active runtime baseline
        }
        this.draw();
    }

    draw() {
        if (!this.canvas || !this.ctx) return;

        // If dimensions are collapsed due to tab switching, trigger resize
        if (!this.logicalWidth || this.logicalWidth < 200) {
            this.resize();
        }

        const ctx = this.ctx;
        const w = this.logicalWidth || 960;
        const h = this.logicalHeight || 380;

        ctx.clearRect(0, 0, w, h);

        // Grid Background
        ctx.strokeStyle = "rgba(255, 255, 255, 0.03)";
        ctx.lineWidth = 1;
        for (let x = 0; x < w; x += 40) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, h); ctx.stroke(); }
        for (let y = 0; y < h; y += 40) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke(); }

        let nativeCount = 0;
        let wasmCount = 0;
        let luaCount = 1; // Default modbus_rate_limiter active

        if (Array.isArray(this.rawExtensions)) {
            nativeCount = this.rawExtensions.filter(e => e.tier && e.tier.includes('Native')).length;
            wasmCount = this.rawExtensions.filter(e => e.tier && e.tier.includes('Wasm')).length;
            luaCount = Math.max(luaCount, this.rawExtensions.filter(e => e.tier && e.tier.includes('Lua')).length);
        }

        // Compute 5 Dynamically Spaced Horizontal Stages
        const stageConfigs = [
            { id: "S0", title: "SENSOR INGEST", sub: "AF_XDP UMEM Zero-Copy", tag: "40M+ EPS", color: "#94A3B8" },
            { id: "S1", title: "STAGE 1: REFLEX", sub: `${luaCount} Active LuaJIT Rule(s)`, tag: "< 350 ns", color: "#10B981" },
            { id: "S2", title: "STAGE 2: DISSECTOR", sub: `${nativeCount + 1} Native C++20 Dissectors`, tag: "88 ns SLA", color: "#00B4D8" },
            { id: "S3", title: "STAGE 3: NEURAL AI", sub: "Quantized INT8 QDQ ONNX", tag: "< 20 µs", color: "#00F0FF" },
            { id: "S4", title: "STAGE 4: FUSION", sub: "ThreatCorrelator & RK4 CBF", tag: "h(x) >= 0", color: "#A855F7" }
        ];

        const totalStages = stageConfigs.length;
        const nodeW = Math.min(150, (w - 80) / totalStages - 25);
        const nodeH = 76;
        const centerY = h * 0.44;
        const totalSpan = w - 80;
        const gap = (totalSpan - (totalStages * nodeW)) / (totalStages - 1);

        const nodes = stageConfigs.map((cfg, idx) => {
            const x = 40 + (idx * (nodeW + gap));
            return { ...cfg, x: x, y: centerY - (nodeH / 2), w: nodeW, h: nodeH, cx: x + (nodeW / 2), cy: centerY };
        });

        // 1. Draw Directional Flow Lines Between Stages
        for (let i = 0; i < nodes.length - 1; i++) {
            const from = nodes[i];
            const to = nodes[i + 1];

            // Outer Glow Line
            ctx.strokeStyle = "rgba(0, 240, 255, 0.15)";
            ctx.lineWidth = 4;
            ctx.beginPath();
            ctx.moveTo(from.x + from.w, from.cy);
            ctx.lineTo(to.x, to.cy);
            ctx.stroke();

            // Inner Core Line
            ctx.strokeStyle = "#00F0FF";
            ctx.lineWidth = 1.5;
            ctx.beginPath();
            ctx.moveTo(from.x + from.w, from.cy);
            ctx.lineTo(to.x, to.cy);
            ctx.stroke();

            // Arrow Head
            const arrowX = to.x - 4;
            ctx.fillStyle = "#00F0FF";
            ctx.beginPath();
            ctx.moveTo(arrowX, to.cy);
            ctx.lineTo(arrowX - 6, to.cy - 4);
            ctx.lineTo(arrowX - 6, to.cy + 4);
            ctx.closePath();
            ctx.fill();
        }

        // 2. Draw Stage 1 Short-Circuit In-Kernel eBPF Drop Branch
        const s1 = nodes[1];
        const dropY = s1.cy + 75;

        ctx.strokeStyle = "rgba(239, 68, 68, 0.7)";
        ctx.lineWidth = 1.5;
        ctx.setLineDash([4, 4]);
        ctx.beginPath();
        ctx.moveTo(s1.cx, s1.y + s1.h);
        ctx.lineTo(s1.cx, dropY);
        ctx.stroke();
        ctx.setLineDash([]);

        // Drop Destination Terminal Box
        ctx.fillStyle = "rgba(239, 68, 68, 0.15)";
        ctx.strokeStyle = "#EF4444";
        ctx.lineWidth = 1;
        const dropBoxW = 140;
        const dropBoxH = 34;
        const dropBoxX = s1.cx - (dropBoxW / 2);
        this._roundRect(ctx, dropBoxX, dropY, dropBoxW, dropBoxH, 4, true, true);

        ctx.fillStyle = "#EF4444";
        ctx.font = "bold 10px monospace";
        ctx.textAlign = "center";
        ctx.fillText("[XDP_DROP] < 0.84 µs", s1.cx, dropY + 14);
        ctx.fillStyle = "#FCA5A5";
        ctx.font = "8px monospace";
        ctx.fillText("0 SKB ALLOCS &bull; NIC RING", s1.cx, dropY + 26);

        // 3. Draw Stage Pipeline Nodes
        nodes.forEach(st => {
            // Node Card Body
            ctx.fillStyle = "rgba(14, 19, 27, 0.95)";
            ctx.strokeStyle = st.color;
            ctx.lineWidth = 1.5;
            this._roundRect(ctx, st.x, st.y, st.w, st.h, 6, true, true);

            // Stage Index Header Bar
            ctx.fillStyle = "rgba(255, 255, 255, 0.05)";
            this._roundRect(ctx, st.x, st.y, st.w, 20, 6, true, false);

            // Stage Identifier
            ctx.fillStyle = st.color;
            ctx.font = "bold 9px monospace";
            ctx.textAlign = "left";
            ctx.fillText(st.id, st.x + 8, st.y + 14);

            // Latency / Throughput Tag
            ctx.fillStyle = "#F8FAFC";
            ctx.font = "bold 8px monospace";
            ctx.textAlign = "right";
            ctx.fillText(st.tag, st.x + st.w - 8, st.y + 14);

            // Stage Title
            ctx.fillStyle = "#F8FAFC";
            ctx.font = "bold 10px monospace";
            ctx.textAlign = "center";
            ctx.fillText(st.title, st.cx, st.y + 38);

            // Stage Subtitle / Metric
            ctx.fillStyle = "#94A3B8";
            ctx.font = "9px sans-serif";
            ctx.fillText(st.sub, st.cx, st.y + 54);
        });
    }

    _roundRect(ctx, x, y, width, height, radius, fill, stroke) {
        if (ctx.roundRect) {
            ctx.beginPath();
            ctx.roundRect(x, y, width, height, radius);
            if (fill) ctx.fill();
            if (stroke) ctx.stroke();
            return;
        }
        // Fallback for older canvas engines
        ctx.beginPath();
        ctx.moveTo(x + radius, y);
        ctx.lineTo(x + width - radius, y);
        ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
        ctx.lineTo(x + width, y + height - radius);
        ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
        ctx.lineTo(x + radius, y + height);
        ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
        ctx.lineTo(x, y + radius);
        ctx.quadraticCurveTo(x, y, x + radius, y);
        ctx.closePath();
        if (fill) ctx.fill();
        if (stroke) ctx.stroke();
    }
}

document.addEventListener('DOMContentLoaded', () => {
    window.dagVisualizer = new PipelineDagVisualizer('pipelineDagCanvas');
});