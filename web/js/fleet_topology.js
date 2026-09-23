// Pure Air-Gapped HTML5 Canvas Fleet Topology Visualizer
class FleetTopologyMap {
    constructor(canvasId) {
        this.canvas = document.getElementById(canvasId);
        if (!this.canvas) return;
        this.ctx = this.canvas.getContext('2d');
        this.nodes = [];
        this.resize();
        window.addEventListener('resize', () => this.resize());
        this.animate();
    }

    resize() {
        if (!this.canvas) return;
        this.width = this.canvas.clientWidth;
        this.height = this.canvas.clientHeight || 340;
        this.canvas.width = this.width;
        this.canvas.height = this.height;
    }

    updateNodes(nodeList) {
        this.nodes = nodeList;
    }

    animate() {
        this.render();
        requestAnimationFrame(() => this.animate());
    }

    render() {
        if (!this.ctx) return;
        this.ctx.clearRect(0, 0, this.width, this.height);

        const centerX = this.width / 2;
        const centerY = this.height / 2;

        // Draw Central Nexus Hub
        this.ctx.beginPath();
        this.ctx.arc(centerX, centerY, 22, 0, Math.PI * 2);
        this.ctx.fillStyle = "#58a6ff";
        this.ctx.shadowColor = "#58a6ff";
        this.ctx.shadowBlur = 15;
        this.ctx.fill();
        this.ctx.shadowBlur = 0;

        this.ctx.fillStyle = "#fff";
        this.ctx.font = "bold 11px monospace";
        this.ctx.textAlign = "center";
        this.ctx.fillText("NEXUS", centerX, centerY + 4);

        if (!this.nodes || this.nodes.length === 0) {
            this.ctx.fillStyle = "#7d8590";
            this.ctx.font = "12px sans-serif";
            this.ctx.fillText("Awaiting appliance connections...", centerX, centerY + 50);
            return;
        }

        const radius = Math.min(this.width, this.height) * 0.38;
        const angleStep = (Math.PI * 2) / this.nodes.length;

        this.nodes.forEach((node, idx) => {
            const angle = idx * angleStep;
            const x = centerX + Math.cos(angle) * radius;
            const y = centerY + Math.sin(angle) * radius;

            // Connection Link Line
            this.ctx.beginPath();
            this.ctx.moveTo(centerX, centerY);
            this.ctx.lineTo(x, y);
            this.ctx.strokeStyle = node.status === "ONLINE" ? "#1f3a2c" : "#3b1e22";
            this.ctx.lineWidth = 1.5;
            this.ctx.stroke();

            // Appliance Node Circle
            this.ctx.beginPath();
            this.ctx.arc(x, y, 14, 0, Math.PI * 2);
            this.ctx.fillStyle = node.status === "ONLINE" ? "#2ea043" : "#f85149";
            this.ctx.shadowColor = node.status === "ONLINE" ? "#2ea043" : "#f85149";
            this.ctx.shadowBlur = 10;
            this.ctx.fill();
            this.ctx.shadowBlur = 0;

            // Labels
            this.ctx.fillStyle = "#e6edf3";
            this.ctx.font = "10px monospace";
            this.ctx.textAlign = "center";
            this.ctx.fillText(node.hostname || node.node_id.substring(0, 10), x, y + 26);
            this.ctx.fillStyle = "#7d8590";
            this.ctx.font = "9px sans-serif";
            this.ctx.fillText(`${node.mitigation_latency_us.toFixed(1)} µs`, x, y + 37);
        });
    }
}

// Instantiate and attach to app data loop
let topologyVisualizer = null;
window.addEventListener('DOMContentLoaded', () => {
    topologyVisualizer = new FleetTopologyMap('topology-canvas');
});

// Hook into app.js node update
const originalRenderNodes = window.renderNodes;
window.renderNodes = function(nodes) {
    if (originalRenderNodes) originalRenderNodes(nodes);
    if (topologyVisualizer) topologyVisualizer.updateNodes(nodes);
};