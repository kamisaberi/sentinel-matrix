// ============================================================================
// ARYORITHM SENTINEL NEXUS: PIPELINE DAG VISUALIZER
// ============================================================================

class PipelineDagVisualizer {
    constructor(canvasId) {
        this.canvas = document.getElementById(canvasId);
        if (!this.canvas) return;
        this.ctx = this.canvas.getContext('2d');
        this.resize();
        window.addEventListener('resize', () => this.resize());
        this.draw();
    }

    resize() {
        this.canvas.width = this.canvas.parentElement.clientWidth;
        this.canvas.height = 360;
        this.draw();
    }

    draw() {
        const ctx = this.ctx;
        const w = this.canvas.width;
        const h = this.canvas.height;

        ctx.clearRect(0, 0, w, h);

        // Stages Definition
        const stages = [
            { title: "SENSOR INGESTION", sub: "AF_XDP UMEM (10GbE)", x: w * 0.1, y: h * 0.45, color: "#94A3B8" },
            { title: "STAGE 1: SPKG REFLEX", sub: "88 ns Fast-Drop", x: w * 0.32, y: h * 0.45, color: "#10B981" },
            { title: "STAGE 2: DISSECTOR", sub: "16D Feature Tensor", x: w * 0.54, y: h * 0.45, color: "#00B4D8" },
            { title: "STAGE 3: NEURAL AI", sub: "Intel NPU (< 75 µs)", x: w * 0.76, y: h * 0.45, color: "#00F0FF" },
            { title: "STAGE 4: FUSION", sub: "Stuxnet Anti-Blinding", x: w * 0.92, y: h * 0.45, color: "#A855F7" }
        ];

        // Draw Connecting Data Lines
        ctx.strokeStyle = "rgba(0, 240, 255, 0.25)";
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(stages[0].x, stages[0].y);
        for (let i = 1; i < stages.length; i++) {
            ctx.lineTo(stages[i].x, stages[i].y);
        }
        ctx.stroke();

        // Draw Short-Circuit Drop Branch on Stage 1
        ctx.strokeStyle = "rgba(239, 68, 68, 0.4)";
        ctx.setLineDash([4, 4]);
        ctx.beginPath();
        ctx.moveTo(stages[1].x, stages[1].y);
        ctx.lineTo(stages[1].x, stages[1].y + 80);
        ctx.stroke();
        ctx.setLineDash([]);

        // Label on Short-Circuit
        ctx.fillStyle = "#EF4444";
        ctx.font = "9px monospace";
        ctx.fillText("eBPF DROP (< 0.84 µs)", stages[1].x - 45, stages[1].y + 95);

        // Draw Stage Nodes
        stages.forEach(st => {
            // Outer glow
            ctx.fillStyle = "rgba(14, 19, 27, 0.9)";
            ctx.beginPath();
            ctx.roundRect(st.x - 70, st.y - 35, 140, 70, 6);
            ctx.fill();

            ctx.strokeStyle = st.color;
            ctx.lineWidth = 1.5;
            ctx.stroke();

            // Text
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