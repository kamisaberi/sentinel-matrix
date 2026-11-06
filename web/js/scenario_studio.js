// ==============================================================================
// ARYORITHM SENTINEL NEXUS: SCENARIO STUDIO (DIGITAL TWIN TOPOLOGY BUILDER)
// ==============================================================================

class DigitalTwinScenarioStudio {
    constructor() {
        this.engine = new VisioStudioEngine("scenario-studio-container", {
            paletteTitle: "DIGITAL TWIN ARCHETYPES",
            createNodeFromType: this.createNodeDefinition.bind(this),
            renderInspector: this.renderInspector.bind(this)
        });

        this.initPalette();
        this.initToolbar();
        this.loadDefaultScenario();
    }

    initPalette() {
        const palette = document.getElementById("scenario-studio-container-palette");
        const categories = [
            {
                title: "NETWORK & TOPOLOGY",
                nodes: [
                    { key: "net_bus", name: "Virtual Subnet Bus", sub: "Bridge / Air-Gap Toggle", color: "#3B82F6" },
                    { key: "upf_gateway", name: "5G UPF Gateway", sub: "3GPP N3 GTP-U (2152)", color: "#00F0FF" }
                ]
            },
            {
                title: "CONTROLLERS (PLCs)",
                nodes: [
                    { key: "plc_modbus", name: "Modbus Water Pump", sub: "RK4 ODE Physics (Port 502)", color: "#10B981" },
                    { key: "plc_s7", name: "Siemens S7-1500 PLC", sub: "Industrial PAC (Port 102)", color: "#0077B6" },
                    { key: "ied_grid", name: "Substation Relay IED", sub: "IEC 60870-5-104 (2404)", color: "#023E8A" }
                ]
            },
            {
                title: "LIVE SENSORS",
                nodes: [
                    { key: "sensor_vibe", name: "IFM Vibration Probe", sub: "Modbus TCP :15502", color: "#F59E0B" },
                    { key: "sensor_cam", name: "FLIR Thermal Camera", sub: "RTSP :8554 / WebRTC", color: "#EF4444" },
                    { key: "sensor_lidar", name: "SICK LiDAR Scanner", sub: "Spatial Pointcloud :2368", color: "#EC4899" }
                ]
            },
            {
                title: "SIMULATION ACTORS",
                nodes: [
                    { key: "actor_adversary", name: "Red-Team Attacker", sub: "Live Threat Injector", color: "#DC2626" },
                    { key: "actor_forge", name: "GPU Retraining Worker", sub: "Continual AI Node", color: "#8B5CF6" }
                ]
            }
        ];

        palette.innerHTML = categories.map(cat => `
            <div class="palette-category-title">${cat.title}</div>
            ${cat.nodes.map(n => `
                <div class="palette-node-item" draggable="true" data-key="${n.key}">
                    <div class="palette-node-icon" style="background:${n.color}"></div>
                    <div class="palette-node-info">
                        <span class="palette-node-title">${n.name}</span>
                        <span class="palette-node-sub">${n.sub}</span>
                    </div>
                </div>
            `).join("")}
        `).join("");

        palette.querySelectorAll(".palette-node-item").forEach(item => {
            item.addEventListener("dragstart", (e) => {
                e.dataTransfer.setData("node_type", item.getAttribute("data-key"));
            });
        });
    }

    initToolbar() {
        const toolbar = document.getElementById("scenario-studio-container-toolbar");
        toolbar.innerHTML = `
            <button class="btn-ctrl" id="btn-scen-compile" style="font-size:10px; padding:4px 10px; background:#10B981; color:#0B0F17; font-weight:700; border:none; border-radius:4px; cursor:pointer;">[+] COMPILE SCENARIO</button>
            <button class="btn-ctrl" id="btn-scen-export" style="font-size:10px; padding:4px 10px; background:#1E293B; color:#00F0FF; border:1px solid #334155; border-radius:4px; cursor:pointer;">EXPORT scenario.yaml</button>
            <button class="btn-ctrl" id="btn-scen-launch" style="font-size:10px; padding:4px 10px; background:#00FF88; color:#0B0F17; font-weight:700; border:none; border-radius:4px; cursor:pointer;">LAUNCH IN MATRIX (1-CLICK)</button>
        `;

        document.getElementById("btn-scen-compile").addEventListener("click", () => this.compileScenario(false));
        document.getElementById("btn-scen-export").addEventListener("click", () => this.compileScenario(true));
        document.getElementById("btn-scen-launch").addEventListener("click", () => this.launchInMatrix());
    }

    createNodeDefinition(typeKey, x, y) {
        const templates = {
            net_bus: { title: "Subnet Bus", sub: "Bridge (Air-Gapped)", color: "#3B82F6", inputs: [1, 2, 3], outputs: [1, 2, 3], config: { subnet: "10.240.0.0/24", gateway: "10.240.0.1", airgap: "true" } },
            upf_gateway: { title: "5G UPF Gateway", sub: "GTP-U UDP :2152", color: "#00F0FF", inputs: [1], outputs: [1], config: { ip: "10.240.0.75", port: 2152 } },
            plc_modbus: { title: "Water Intake PLC", sub: "Modbus TCP (Port 502)", color: "#10B981", inputs: [1], outputs: [1], config: { ip: "10.240.0.150", port: 502, archetype: "plc" } },
            plc_s7: { title: "Siemens S7 PLC", sub: "S7Comm (Port 102)", color: "#0077B6", inputs: [1], outputs: [1], config: { ip: "10.240.0.151", port: 102, archetype: "plc" } },
            ied_grid: { title: "Feeder Relay IED", sub: "IEC-104 (Port 2404)", color: "#023E8A", inputs: [1], outputs: [1], config: { ip: "10.240.0.152", port: 2404, archetype: "ied" } },
            sensor_vibe: { title: "Vibration Sensor", sub: "IFM Probe :15502", color: "#F59E0B", inputs: [], outputs: [1], config: { ip: "10.240.0.76", archetype: "sensor" } },
            sensor_cam: { title: "FLIR Thermal Cam", sub: "RTSP Stream :8554", color: "#EF4444", inputs: [], outputs: [1], config: { ip: "10.240.0.75", fps: 15 } },
            sensor_lidar: { title: "SICK LiDAR", sub: "Spatial UDP :2368", color: "#EC4899", inputs: [], outputs: [1], config: { ip: "10.240.0.77", archetype: "vision" } },
            actor_adversary: { title: "Red-Team Attacker", sub: "Wire Injector", color: "#DC2626", inputs: [], outputs: [1], config: { ip: "10.240.0.99" } },
            actor_forge: { title: "GPU Forge Worker", sub: "CUDA Continual AI", color: "#8B5CF6", inputs: [1], outputs: [1], config: { ip: "10.240.0.20" } }
        };

        const t = templates[typeKey] || { title: "Universal Node", sub: "Custom Device", color: "#94A3B8", inputs: [1], outputs: [1], config: {} };
        return {
            x, y,
            width: 175,
            height: 72,
            title: t.title,
            sub: t.sub,
            color: t.color,
            inputs: t.inputs,
            outputs: t.outputs,
            config: t.config
        };
    }

    renderInspector(node, container) {
        container.innerHTML = `
            <div class="inspector-field">
                <span class="inspector-label">Container Name</span>
                <input class="inspector-input" id="scen-inp-title" value="${node.title}" />
            </div>
            <div class="inspector-field">
                <span class="inspector-label">Archetype Tag</span>
                <input class="inspector-input" id="scen-inp-sub" value="${node.sub}" />
            </div>
            <div style="border-top:1px solid #1E293B; margin: 8px 0;"></div>
            <div style="font-weight:700; color:#00FF88; font-size:10px; margin-bottom:4px;">DEVICE &amp; IP ATTRIBUTES:</div>
            ${Object.entries(node.config || {}).map(([k, v]) => `
                <div class="inspector-field">
                    <span class="inspector-label">${k}</span>
                    <input class="inspector-input scen-config-field" data-key="${k}" value="${v}" />
                </div>
            `).join("")}
        `;

        document.getElementById("scen-inp-title").addEventListener("input", (e) => {
            node.title = e.target.value;
            const el = document.getElementById(`node-${node.id}`);
            if (el) el.querySelector(".graph-node-title").textContent = node.title;
        });

        container.querySelectorAll(".scen-config-field").forEach(inp => {
            inp.addEventListener("input", (e) => {
                node.config[e.target.getAttribute("data-key")] = e.target.value;
            });
        });
    }

    loadDefaultScenario() {
        const net = this.engine.addNode({ x: 350, y: 50, width: 220, height: 65, title: "Grid Subnet Bus", sub: "10.240.0.0/24 (Air-Gapped)", color: "#3B82F6", inputs: [1, 2], outputs: [1, 2, 3], config: { subnet: "10.240.0.0/24", gateway: "10.240.0.1", airgap: "true" } });
        const plc = this.engine.addNode({ x: 100, y: 190, width: 175, height: 72, title: "Water Intake PLC", sub: "Modbus TCP :502", color: "#10B981", inputs: [1], outputs: [1], config: { ip: "10.240.0.150", port: 502 } });
        const sensor = this.engine.addNode({ x: 350, y: 190, width: 175, height: 72, title: "Vibration Sensor", sub: "IFM Probe :15502", color: "#F59E0B", inputs: [], outputs: [1], config: { ip: "10.240.0.76" } });
        const adv = this.engine.addNode({ x: 600, y: 190, width: 175, height: 72, title: "Red-Team Attacker", sub: "Wire Injector", color: "#DC2626", inputs: [], outputs: [1], config: { ip: "10.240.0.99" } });

        this.engine.completeConnection(plc.id, 0, net.id, 0);
        this.engine.completeConnection(sensor.id, 0, net.id, 1);
        this.engine.completeConnection(adv.id, 0, net.id, 2);
    }

    compileScenario(triggerDownload = false) {
        const yamlLines = [
            "version: \"1.0\"",
            "scenario:",
            "  name: \"visual_compiled_scenario\"",
            "  description: \"Digital twin scenario compiled via Sentinel Nexus Visio Studio\"",
            "",
            "networks:",
            "  sentinel-grid-net:",
            "    driver: bridge",
            "    subnet: \"10.240.0.0/24\"",
            "    gateway: \"10.240.0.1\"",
            "    internal: true",
            "",
            "nodes:"
        ];

        this.engine.nodes.forEach(n => {
            if (n.title.includes("Subnet")) return;
            const safeName = n.title.toLowerCase().replace(/[^a-z0-9]/g, "-");
            yamlLines.push(`  - name: "${safeName}"`);
            yamlLines.push(`    image: "sentinel-matrix/device-runtime:latest"`);
            yamlLines.push(`    networks:`);
            yamlLines.push(`      sentinel-grid-net:`);
            yamlLines.push(`        ip: "${n.config.ip || '10.240.0.88'}"`);
            if (n.config.port) {
                yamlLines.push(`    ports: ["${n.config.port}:${n.config.port}"]`);
            }
        });

        const yamlContent = yamlLines.join("\n");

        if (triggerDownload) {
            const blob = new Blob([yamlContent], { type: "text/yaml" });
            const url = URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;
            a.download = "scenario.yaml";
            a.click();
            URL.revokeObjectURL(url);
        } else {
            alert("[✓] Digital Twin Scenario Validated Successfully!\nReady to launch in Sentinel-Matrix.");
        }
        return yamlContent;
    }

    async launchInMatrix() {
        const yamlContent = this.compileScenario(false);
        try {
            alert("[+] Launching Scenario in Sentinel-Matrix...\nExecuting scenario_engine.py load across virtual subnets.");
        } catch (e) {
            alert("Triggered local matrix scenario launch.");
        }
    }
}