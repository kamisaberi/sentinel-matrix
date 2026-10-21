// ============================================================================
// ARYORITHM SENTINEL NEXUS: PIPELINE DAG VISUALIZER (DYNAMIC)
// ============================================================================

class PipelineDagVisualizer {
    constructor(canvasId) {
        this.canvas = document.getElementById(canvasId);
        if (!this.canvas) return;
        this.ctx = this.canvas.getContext('2d');
        this.stages = [];
        this.resize();
        window.addEventListener('resize', () => this.resize());
        this.fetchDynamicStages();
        setInterval(() => this.fetchDynamicStages(), 5000);
    }

    async fetchDynamicStages() {
        try {
            const resp = await fetch('/api/v1/extensions/status');
            if (resp.ok) {
                const data = await resp.json();
                this.updateStagesFromTelemetry(data);
                return;
            }
        } catch (e) {
            // Fallback default
        }
        this.useDefaultStages();
    }

    useDefaultStages() {
        const w = this.canvas.width;
        const h = this.canvas.height;
        this.stages = [
            { title: "SENSOR INGESTION", sub: "AF_XDP UMEM (10GbE)", x: w * 0.1, y: h * 0.45, color: "#94A3B8" },
            { title: "STAGE 1: SPKG REFLEX", sub: "88 ns Fast-Drop", x: w * 0.32, y: h * 0.45, color: "#10B981" },
            { title: "STAGE 2: DISSECTOR", sub: "Dynamic Tensor", x: w * 0.54, y: h * 0.45, color: "#00B4D8" },
            { title: "STAGE 3: NEURAL AI", sub: "Silicon Model (< 75 µs)", x: w * 0.76, y: h * 0.45, color: "#00F0FF" },
            { title: "STAGE 4: FUSION", sub: "ThreatCorrelator Engine", x: w * 0.92, y: h * 0.45, color: "#A855F7" }
        ];
        this.draw();
    }

    updateStagesFromTelemetry(extensions) {
        const w = this.canvas.width;
        const h = this.canvas.height;

        let activeNative = extensions.filter(e => e.tier.includes('Native')).length;
        let activeWasm = extensions.filter(e => e.tier.includes('Wasm')).length;

        this.stages = [
            { title: "SENSOR INGESTION", sub: "AF_XDP (SKB/Zero-Copy)", x: w * 0.1, y: h * 0.45, color: "#94A3B8" },
            { title: "STAGE 1: SPKG REFLEX", sub: activeNative + " Native Modules", x: w * 0.32, y: h * 0.45, color: "#10B981" },
            { title: "STAGE 2: DISSECTOR", sub: activeWasm + " Wasm/Lua Plugins", x: w * 0.54, y: h * 0.45, color: "#00B4D8" },
            { title: "STAGE 3: NEURAL AI", sub: "xInfer-Essential Core", x: w * 0.76, y: h * 0.45, color: "#00F0FF" },
            { title: "STAGE 4: FUSION", sub: "ThreatCorrelator Active", x: w * 0.92, y: h * 0.45, color: "#A855F7" }
        ];
        this.draw();
    }

    resize() {
        this.canvas.width = this.canvas.parentElement.clientWidth;
        this.canvas.height = 360;
        this.draw();
    }

    draw() {
        if (!this.stages || this.stages.length === 0) {
            this.useDefaultStages();
            return;
        }

        const ctx = this.ctx;
        const w = this.canvas.width;
        const h = this.canvas.height;

        ctx.clearRect(0, 0, w, h);

        // Draw Connecting Data Lines
        ctx.strokeStyle = "rgba(0, 240, 255, 0.25)";
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(this.stages[0].x, this.stages[0].y);
        for (let i = 1; i < this.stages.length; i++) {
            ctx.lineTo(this.stages[i].x, this.stages[i].y);
        }
        ctx.stroke();

        // Draw Short-Circuit Drop Branch on Stage 1
        ctx.strokeStyle = "rgba(239, 68, 68, 0.4)";
        ctx.setLineDash([4, 4]);
        ctx.beginPath();
        ctx.moveTo(this.stages[1].x, this.stages[1].y);
        ctx.lineTo(this.stages[1].x, this.stages[1].y + 80);
        ctx.stroke();
        ctx.setLineDash([]);

        // Label on Short-Circuit
        ctx.fillStyle = "#EF4444";
        ctx.font = "9px monospace";
        ctx.fillText("eBPF DROP (< 0.84 µs)", this.stages[1].x - 45, this.stages[1].y + 95);

        // Draw Stage Nodes
        this.stages.forEach(st => {
            ctx.fillStyle = "rgba(14, 19, 27, 0.9)";
            ctx.beginPath();
            ctx.roundRect(st.x - 70, st.y - 35, 140, 70, 6);
            ctx.fill();

            ctx.strokeStyle = st.color;
            ctx.lineWidth = 1.5;
            ctx.stroke();

            ctx.fillStyle = "#F8FAFC";
            ctx.font = "bold 10px monospace";
            ctx.textAlign = "center";
            ctx.fillText(st.title, st.x, st.y - 6);

            ctx.fillStyle = st.color;
            ctx.font = "9px sans-serif";
            ctx.fillText(st.sub, st.x, st.y + 12);
        });
    }
}

document.addEventListener('DOMContentLoaded', () => {
    window.dagVisualizer = new PipelineDagVisualizer('pipelineDagCanvas');
});