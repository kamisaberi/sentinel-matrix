// ==============================================================================
// ARYORITHM SENTINEL NEXUS: REUSABLE VISIO-STYLE GRAPH CANVAS ENGINE
// ==============================================================================

class VisioStudioEngine {
    constructor(containerId, options = {}) {
        this.container = document.getElementById(containerId);
        if (!this.container) return;

        this.options = options;
        this.nodes = [];
        this.connections = [];
        this.selectedNode = null;
        this.selectedWire = null;

        // Viewport transform (Pan & Zoom)
        this.zoom = 1.0;
        this.panX = 40;
        this.panY = 40;
        this.isPanning = false;
        this.panStartX = 0;
        this.panStartY = 0;

        // Connecting wire state
        this.isConnecting = false;
        this.connectionSource = null; // { nodeId, portType, portIndex, x, y }

        this.initDOM();
        this.initEvents();
    }

    initDOM() {
        this.container.innerHTML = `
            <div class="studio-palette">
                <div class="studio-palette-header">
                    <span>${this.options.paletteTitle || "COMPONENT TOOLBOX"}</span>
                </div>
                <div class="studio-palette-items" id="${this.container.id}-palette"></div>
            </div>
            <div class="studio-workspace" id="${this.container.id}-workspace">
                <div class="studio-toolbar" id="${this.container.id}-toolbar"></div>
                <svg class="studio-svg-canvas" id="${this.container.id}-svg">
                    <defs>
                        <pattern id="${this.container.id}-grid" width="30" height="30" patternUnits="userSpaceOnUse">
                            <path d="M 30 0 L 0 0 0 30" class="studio-grid-pattern"/>
                        </pattern>
                    </defs>
                    <rect width="100%" height="100%" fill="url(#${this.container.id}-grid)" />
                    <g id="${this.container.id}-viewport">
                        <g id="${this.container.id}-wires-layer"></g>
                        <g id="${this.container.id}-nodes-layer"></g>
                        <path id="${this.container.id}-draft-wire" class="studio-wire-draft" d="" style="display:none;"/>
                    </g>
                </svg>
            </div>
            <div class="studio-inspector">
                <div class="inspector-header"><span>PROPERTIES INSPECTOR</span></div>
                <div class="inspector-body" id="${this.container.id}-inspector">
                    <div style="color: #64748B; text-align: center; margin-top: 40px;">Select a node to inspect properties</div>
                </div>
            </div>
        `;

        this.workspace = document.getElementById(`${this.container.id}-workspace`);
        this.svg = document.getElementById(`${this.container.id}-svg`);
        this.viewport = document.getElementById(`${this.container.id}-viewport`);
        this.wiresLayer = document.getElementById(`${this.container.id}-wires-layer`);
        this.nodesLayer = document.getElementById(`${this.container.id}-nodes-layer`);
        this.draftWire = document.getElementById(`${this.container.id}-draft-wire`);
        this.inspector = document.getElementById(`${this.container.id}-inspector`);

        this.updateViewportTransform();
    }

    updateViewportTransform() {
        if (!this.viewport) return;
        this.viewport.setAttribute("transform", `translate(${this.panX}, ${this.panY}) scale(${this.zoom})`);
    }

    // Convert Screen Mouse Coordinates to Local Zoomed/Paged SVG space
    screenToCanvas(clientX, clientY) {
        const rect = this.workspace.getBoundingClientRect();
        return {
            x: (clientX - rect.left - this.panX) / this.zoom,
            y: (clientY - rect.top - this.panY) / this.zoom
        };
    }

    initEvents() {
        // Pan & Zoom
        this.workspace.addEventListener("wheel", (e) => {
            e.preventDefault();
            const delta = e.deltaY > 0 ? 0.9 : 1.1;
            const newZoom = Math.min(Math.max(this.zoom * delta, 0.4), 2.5);
            this.zoom = newZoom;
            this.updateViewportTransform();
        }, { passive: false });

        this.workspace.addEventListener("mousedown", (e) => {
            // Middle click or drag on background to pan
            if (e.button === 1 || e.target === this.svg || e.target.tagName === "rect") {
                this.isPanning = true;
                this.panStartX = e.clientX - this.panX;
                this.panStartY = e.clientY - this.panY;
                this.workspace.classList.add("panning");
            }
        });

        window.addEventListener("mousemove", (e) => {
            if (this.isPanning) {
                this.panX = e.clientX - this.panStartX;
                this.panY = e.clientY - this.panStartY;
                this.updateViewportTransform();
            } else if (this.isConnecting && this.connectionSource) {
                const pt = this.screenToCanvas(e.clientX, e.clientY);
                this.drawDraftWire(this.connectionSource.x, this.connectionSource.y, pt.x, pt.y);
            }
        });

        window.addEventListener("mouseup", () => {
            if (this.isPanning) {
                this.isPanning = false;
                this.workspace.classList.remove("panning");
            }
            if (this.isConnecting) {
                this.cancelConnecting();
            }
        });

        // Drag & Drop from Palette into SVG Canvas
        this.workspace.addEventListener("dragover", (e) => e.preventDefault());
        this.workspace.addEventListener("drop", (e) => {
            e.preventDefault();
            const typeKey = e.dataTransfer.getData("node_type");
            if (typeKey && this.options.createNodeFromType) {
                const pt = this.screenToCanvas(e.clientX, e.clientY);
                const nodeData = this.options.createNodeFromType(typeKey, pt.x, pt.y);
                if (nodeData) {
                    this.addNode(nodeData);
                }
            }
        });
    }

    addNode(node) {
        if (!node.id) node.id = "n_" + Math.random().toString(36).substr(2, 6);
        if (node.x === undefined) node.x = 100;
        if (node.y === undefined) node.y = 100;
        if (!node.width) node.width = 170;
        if (!node.height) node.height = 70;
        if (!node.inputs) node.inputs = [];
        if (!node.outputs) node.outputs = [];

        this.nodes.push(node);
        this.renderNode(node);
        this.selectNode(node);
        return node;
    }

    renderNode(node) {
        const g = document.createElementNS("http://www.w3.org/2000/svg", "g");
        g.setAttribute("class", "graph-node");
        g.setAttribute("id", `node-${node.id}`);
        g.setAttribute("transform", `translate(${node.x}, ${node.y})`);

        // Node Container Card
        const rect = document.createElementNS("http://www.w3.org/2000/svg", "rect");
        rect.setAttribute("class", "graph-node-body");
        rect.setAttribute("width", node.width);
        rect.setAttribute("height", node.height);
        rect.style.stroke = node.color || "#00F0FF";

        // Header bar
        const hdr = document.createElementNS("http://www.w3.org/2000/svg", "rect");
        hdr.setAttribute("class", "graph-node-header");
        hdr.setAttribute("width", node.width);
        hdr.setAttribute("height", "22");

        // Title Text
        const title = document.createElementNS("http://www.w3.org/2000/svg", "text");
        title.setAttribute("class", "graph-node-title");
        title.setAttribute("x", "10");
        title.setAttribute("y", "15");
        title.textContent = node.title || node.name || "Node";

        // Subtitle Text
        const sub = document.createElementNS("http://www.w3.org/2000/svg", "text");
        sub.setAttribute("class", "graph-node-sub");
        sub.setAttribute("x", "10");
        sub.setAttribute("y", "38");
        sub.textContent = node.sub || node.type || "";

        g.appendChild(rect);
        g.appendChild(hdr);
        g.appendChild(title);
        g.appendChild(sub);

        // Render Input Ports on Left Border
        node.inputs.forEach((inp, idx) => {
            const py = 25 + ((idx + 1) * (node.height - 30) / (node.inputs.length + 1));
            const port = this.createPortCircle(node.id, "input", idx, 0, py);
            g.appendChild(port);
        });

        // Render Output Ports on Right Border
        node.outputs.forEach((out, idx) => {
            const py = 25 + ((idx + 1) * (node.height - 30) / (node.outputs.length + 1));
            const port = this.createPortCircle(node.id, "output", idx, node.width, py);
            g.appendChild(port);
        });

        // Node Dragging Interaction
        let isDragging = false;
        let dragOffset = { x: 0, y: 0 };

        g.addEventListener("mousedown", (e) => {
            if (e.target.classList.contains("graph-port")) return;
            e.stopPropagation();
            this.selectNode(node);

            isDragging = true;
            const pt = this.screenToCanvas(e.clientX, e.clientY);
            dragOffset.x = pt.x - node.x;
            dragOffset.y = pt.y - node.y;

            const onMouseMove = (ev) => {
                if (!isDragging) return;
                const cur = this.screenToCanvas(ev.clientX, ev.clientY);
                node.x = cur.x - dragOffset.x;
                node.y = cur.y - dragOffset.y;
                g.setAttribute("transform", `translate(${node.x}, ${node.y})`);
                this.updateWires();
            };

            const onMouseUp = () => {
                isDragging = false;
                window.removeEventListener("mousemove", onMouseMove);
                window.removeEventListener("mouseup", onMouseUp);
            };

            window.addEventListener("mousemove", onMouseMove);
            window.addEventListener("mouseup", onMouseUp);
        });

        this.nodesLayer.appendChild(g);
    }

    createPortCircle(nodeId, type, index, cx, cy) {
        const circle = document.createElementNS("http://www.w3.org/2000/svg", "circle");
        circle.setAttribute("class", `graph-port port-${type === "input" ? "in" : "out"}`);
        circle.setAttribute("cx", cx);
        circle.setAttribute("cy", cy);
        circle.setAttribute("r", 4.5);

        circle.addEventListener("mousedown", (e) => {
            e.stopPropagation();
            if (type === "output") {
                this.startConnecting(nodeId, type, index, cx, cy);
            }
        });

        circle.addEventListener("mouseup", (e) => {
            e.stopPropagation();
            if (this.isConnecting && this.connectionSource && type === "input") {
                this.completeConnection(this.connectionSource.nodeId, this.connectionSource.portIndex, nodeId, index);
            }
        });

        return circle;
    }

    startConnecting(nodeId, type, index, localX, localY) {
        const node = this.nodes.find(n => n.id === nodeId);
        if (!node) return;
        this.isConnecting = true;
        this.connectionSource = {
            nodeId,
            portIndex: index,
            x: node.x + localX,
            y: node.y + localY
        };
        this.draftWire.style.display = "block";
    }

    cancelConnecting() {
        this.isConnecting = false;
        this.connectionSource = null;
        this.draftWire.style.display = "none";
    }

    completeConnection(fromNodeId, fromPortIdx, toNodeId, toPortIdx) {
        if (fromNodeId === toNodeId) {
            this.cancelConnecting();
            return;
        }

        // Avoid duplicate links
        const exists = this.connections.some(c =>
            c.from === fromNodeId && c.fromPort === fromPortIdx &&
            c.to === toNodeId && c.toPort === toPortIdx
        );

        if (!exists) {
            this.connections.push({
                from: fromNodeId,
                fromPort: fromPortIdx,
                to: toNodeId,
                toPort: toPortIdx,
                color: "#00F0FF"
            });
            this.updateWires();
        }
        this.cancelConnecting();
    }

    // Cubic Bézier Curvature Calculation
    calculateBezierPath(x1, y1, x2, y2) {
        const dx = Math.max(40, Math.abs(x2 - x1) * 0.55);
        return `M ${x1} ${y1} C ${x1 + dx} ${y1}, ${x2 - dx} ${y2}, ${x2} ${y2}`;
    }

    drawDraftWire(x1, y1, x2, y2) {
        this.draftWire.setAttribute("d", this.calculateBezierPath(x1, y1, x2, y2));
    }

    updateWires() {
        this.wiresLayer.innerHTML = "";
        this.connections.forEach((conn, idx) => {
            const fromNode = this.nodes.find(n => n.id === conn.from);
            const toNode = this.nodes.find(n => n.id === conn.to);
            if (!fromNode || !toNode) return;

            const x1 = fromNode.x + fromNode.width;
            const y1 = fromNode.y + 25 + ((conn.fromPort + 1) * (fromNode.height - 30) / (fromNode.outputs.length + 1));

            const x2 = toNode.x;
            const y2 = toNode.y + 25 + ((conn.toPort + 1) * (toNode.height - 30) / (toNode.inputs.length + 1));

            const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
            path.setAttribute("class", "studio-wire studio-wire-active");
            path.setAttribute("d", this.calculateBezierPath(x1, y1, x2, y2));
            path.style.stroke = conn.color || "#00F0FF";

            // Click to remove wire
            path.addEventListener("click", (e) => {
                e.stopPropagation();
                this.connections.splice(idx, 1);
                this.updateWires();
            });

            this.wiresLayer.appendChild(path);
        });
    }

    selectNode(node) {
        this.selectedNode = node;
        document.querySelectorAll(".graph-node").forEach(el => el.classList.remove("selected"));
        const el = document.getElementById(`node-${node.id}`);
        if (el) el.classList.add("selected");

        if (this.options.renderInspector) {
            this.options.renderInspector(node, this.inspector);
        }
    }
}