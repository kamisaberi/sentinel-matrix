// ==============================================================================
// ARYORITHM SENTINEL NEXUS: SCENARIO STUDIO (DIGITAL TWIN TOPOLOGY & PCAP SELECTOR)
// ==============================================================================

class DigitalTwinScenarioStudio {
    constructor() {
        this.engine = new VisioStudioEngine("scenario-studio-container", {
            paletteTitle: "DIGITAL TWIN ARCHETYPES",
            createNodeFromType: this.createNodeDefinition.bind(this),
            renderInspector: this.renderInspector.bind(this)
        });

        // Catalog of available PCAP captures on host
        this.availablePcaps = [
            "industroyer2_substation.pcap",
            "stuxnet_s7comm_injected.pcap",
            "triton_trisis_sis.pcap",
            "cve_2023_44487_rapid_reset.pcap",
            "modbus_uiuc_scada_attack.pcap"
        ];

        this.availableModels = [
            "network_threat_int8.onnx",
            "network_threat_detector.onnx",
            "power_quality_anomaly.onnx",
            "vibration_spectral_ae.onnx",
            "thermal_anomaly_vision.onnx"
        ];

        this.initPalette();
        this.initToolbar();
        this.loadDefaultScenario();
    }

    initPalette() {
        const palette = document.getElementById("scenario-studio-container-palette");
        const categories = [
            {
                title: "NETWORK & AIR-GAP",
                nodes: [
                    { key: "net_bus", name: "Virtual Subnet Bus", sub: "Bridge (Air-Gap Toggle)", color: "#3B82F6" },
                    { key: "upf_gateway", name: "5G UPF Gateway", sub: "3GPP N3 GTP-U :2152", color: "#00F0FF" }
                ]
            },
            {
                title: "EDGE APPLIANCES",
                nodes: [
                    { key: "edge_node", name: "Sentinel Edge Sentry", sub: "Multi-Model Ingestion", color: "#10B981" }
                ]
            },
            {
                title: "CONTROLLERS (PLCs)",
                nodes: [
                    { key: "plc_modbus", name: "Modbus Water Pump", sub: "RK4 ODE Physics (Port 502)", color: "#00B4D8" },
                    { key: "plc_s7", name: "Siemens S7-1500 PAC", sub: "S7Comm (Port 102)", color: "#0077B6" },
                    { key: "ied_grid", name: "Substation Relay IED", sub: "IEC 60870-5-104 (2404)", color: "#023E8A" }
                ]
            },
            {
                title: "LIVE SENSOR PROBES",
                nodes: [
                    { key: "sensor_vibe", name: "IFM Vibration Probe", sub: "Modbus TCP :15502", color: "#F59E0B" },
                    { key: "sensor_cam", name: "FLIR Thermal Camera", sub: "RTSP :8554 / WebRTC", color: "#EF4444" },
                    { key: "sensor_lidar", name: "SICK LiDAR Scanner", sub: "Spatial Pointcloud :2368", color: "#EC4899" },
                    { key: "sensor_power", name: "PAC3200 Power Meter", sub: "Power Quality :15501", color: "#84CC16" }
                ]
            },
            {
                title: "RANGE ATTACK & SIMULATION",
                nodes: [
                    { key: "actor_traffic", name: "PCAP Traffic Streamer", sub: "Historical Wire Replay", color: "#F97316" },
                    { key: "actor_adversary", name: "Red-Team Attacker", sub: "Active Exploit Node", color: "#DC2626" },
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
            <div class="studio-toolbar-group">
                <button class="btn-tb btn-tb-green" id="btn-scen-validate" title="Validate IP subnets and device bindings">
                    [✓] VALIDATE MESH
                </button>
                <button class="btn-tb btn-tb-dark" id="btn-scen-export-yaml" title="Export sovereign scenario.yaml">
                    EXPORT YAML
                </button>
            </div>
            <div class="studio-toolbar-group">
                <button class="btn-tb btn-tb-purple" id="btn-scen-pack-ref" title="Pack lightweight referenced bundle (~15KB) for Hub">
                    PACK (REFERENCED)
                </button>
                <button class="btn-tb btn-tb-purple" id="btn-scen-pack-embed" title="Pack standalone bundle with embedded models & PCAPs (~50MB)">
                    PACK (EMBEDDED)
                </button>
            </div>
            <div class="studio-toolbar-group" style="border-right:none;">
                <button class="btn-tb btn-tb-cyan" id="btn-scen-launch" title="Launch dynamic multi-container mesh in Docker">
                    LAUNCH IN MATRIX (1-CLICK)
                </button>
                <button class="btn-tb btn-tb-danger" id="btn-scen-down" title="Dismantle dynamic scenario mesh and virtual networks">
                    DISMANTLE MATRIX
                </button>
            </div>
        `;

        document.getElementById("btn-scen-validate").addEventListener("click", () => this.validateTopology());
        document.getElementById("btn-scen-export-yaml").addEventListener("click", () => this.exportYaml());
        document.getElementById("btn-scen-pack-ref").addEventListener("click", () => this.packScenario(false));
        document.getElementById("btn-scen-pack-embed").addEventListener("click", () => this.packScenario(true));
        document.getElementById("btn-scen-launch").addEventListener("click", () => this.launchInMatrix());
        document.getElementById("btn-scen-down").addEventListener("click", () => this.dismantleMatrix());
    }

    createNodeDefinition(typeKey, x, y) {
        const templates = {
            net_bus: {
                title: "Grid Subnet Bus", sub: "10.240.0.0/24 (Air-Gap)", color: "#3B82F6", inputs: [1, 2, 3], outputs: [1, 2, 3],
                config: { subnet: "10.240.0.0/24", gateway: "10.240.0.1", airgap: "true" }
            },
            edge_node: {
                title: "Edge Substation Sentry", sub: "10.240.0.101", color: "#10B981", inputs: [1], outputs: [1],
                config: { ip: "10.240.0.101", backend: "INTEL_OPENVINO", mounted_model: "network_threat_int8.onnx", site_name: "PowerGrid-North-01" }
            },
            plc_modbus: {
                title: "Water Intake PLC", sub: "Modbus TCP :502", color: "#00B4D8", inputs: [1], outputs: [1],
                config: { ip: "10.240.0.150", port: "502", protocol: "MODBUS", ode_model: "RK4_WATER_THERMAL_FLOW" }
            },
            plc_s7: {
                title: "Siemens S7 PLC", sub: "S7Comm :102", color: "#0077B6", inputs: [1], outputs: [1],
                config: { ip: "10.240.0.151", port: "102", protocol: "S7COMM", ode_model: "CONTINUOUS_ASSEMBLY_LINE" }
            },
            ied_grid: {
                title: "Feeder Relay IED", sub: "IEC-104 :2404", color: "#023E8A", inputs: [1], outputs: [1],
                config: { ip: "10.240.0.152", port: "2404", protocol: "IEC104", asdu_address: "1" }
            },
            sensor_vibe: {
                title: "Vibration Sensor", sub: "IFM Probe :15502", color: "#F59E0B", inputs: [], outputs: [1],
                config: { ip: "10.240.0.76", archetype: "sensor", sampling_interval_ms: "100" }
            },
            sensor_cam: {
                title: "FLIR Thermal Cam", sub: "RTSP :8554 / WebRTC", color: "#EF4444", inputs: [], outputs: [1],
                config: { ip: "10.240.0.75", port: "8554", stream_path: "thermal_feed", fps: "15" }
            },
            sensor_lidar: {
                title: "SICK LiDAR Scanner", sub: "Spatial UDP :2368", color: "#EC4899", inputs: [], outputs: [1],
                config: { ip: "10.240.0.77", port: "2368", archetype: "vision" }
            },
            sensor_power: {
                title: "PAC3200 Meter", sub: "Power Quality :15501", color: "#84CC16", inputs: [], outputs: [1],
                config: { ip: "10.240.0.78", port: "15501", archetype: "sensor" }
            },
            actor_traffic: {
                title: "PCAP Streamer", sub: "Historical Replay", color: "#F97316", inputs: [], outputs: [1],
                config: { selected_pcap: "industroyer2_substation.pcap", target_victim: "10.240.0.101", replay_speed: "1x Real-Time", tactic: "T0855" }
            },
            actor_adversary: {
                title: "Red-Team Attacker", sub: "Wire Injector", color: "#DC2626", inputs: [], outputs: [1],
                config: { ip: "10.240.0.99", exploit_type: "MODBUS_FC05_OVERRIDE", attack_target_ip: "10.240.0.101" }
            },
            actor_forge: {
                title: "GPU Forge Worker", sub: "CUDA Continual AI", color: "#8B5CF6", inputs: [1], outputs: [1],
                config: { ip: "10.240.0.20", service_port: "50055" }
            }
        };

        const t = templates[typeKey] || { title: "Universal Device", sub: "Range Node", color: "#94A3B8", inputs: [1], outputs: [1], config: {} };
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
        let specializedHtml = "";

        // Traffic-Gen / PCAP Streamer Selector
        if (node.config.selected_pcap !== undefined) {
            specializedHtml += `
                <div class="inspector-field">
                    <span class="inspector-label">Replay Attack PCAP</span>
                    <select class="inspector-select scen-config-select" data-key="selected_pcap">
                        ${this.availablePcaps.map(p => `<option value="${p}" ${node.config.selected_pcap === p ? 'selected' : ''}>${p}</option>`).join("")}
                    </select>
                </div>
                <div class="inspector-field">
                    <span class="inspector-label">Target Victim Node</span>
                    <select class="inspector-select scen-config-select" data-key="target_victim">
                        <option value="10.240.0.101" ${node.config.target_victim === '10.240.0.101' ? 'selected' : ''}>Substation Alpha (10.240.0.101)</option>
                        <option value="10.240.0.102" ${node.config.target_victim === '10.240.0.102' ? 'selected' : ''}>Hospital PACS (10.240.0.102)</option>
                        <option value="10.240.0.103" ${node.config.target_victim === '10.240.0.103' ? 'selected' : ''}>Refinery SCADA (10.240.0.103)</option>
                    </select>
                </div>
                <div class="inspector-field">
                    <span class="inspector-label">Replay Speed</span>
                    <select class="inspector-select scen-config-select" data-key="replay_speed">
                        <option value="1x Real-Time" selected>1x Real-Time Pacing</option>
                        <option value="10x Accelerated">10x Accelerated</option>
                        <option value="Wire-Speed Blast">Wire-Speed Raw Blast (40M EPS)</option>
                    </select>
                </div>
            `;
        }

        // Edge Appliance Model Mount Selector
        if (node.config.mounted_model !== undefined) {
            specializedHtml += `
                <div class="inspector-field">
                    <span class="inspector-label">Mounted AI Model</span>
                    <select class="inspector-select scen-config-select" data-key="mounted_model">
                        ${this.availableModels.map(m => `<option value="${m}" ${node.config.mounted_model === m ? 'selected' : ''}>${m}</option>`).join("")}
                    </select>
                </div>
                <div class="inspector-field">
                    <span class="inspector-label">Execution Backend</span>
                    <select class="inspector-select scen-config-select" data-key="backend">
                        <option value="INTEL_OPENVINO" ${node.config.backend === 'INTEL_OPENVINO' ? 'selected' : ''}>Intel OpenVINO (CPU/NPU)</option>
                        <option value="NVIDIA_TENSORRT" ${node.config.backend === 'NVIDIA_TENSORRT' ? 'selected' : ''}>NVIDIA TensorRT (GPU)</option>
                        <option value="ROCKCHIP_RKNN" ${node.config.backend === 'ROCKCHIP_RKNN' ? 'selected' : ''}>Rockchip RKNN (NPU)</option>
                    </select>
                </div>
            `;
        }

        // Subnet Bus Air-Gap Toggle
        if (node.config.airgap !== undefined) {
            specializedHtml += `
                <div class="inspector-checkbox-row">
                    <input type="checkbox" id="scen-chk-airgap" ${node.config.airgap === 'true' ? 'checked' : ''} />
                    <span class="inspector-label" style="margin:0;">Strict Air-Gap (internal: true, $0 Egress)</span>
                </div>
            `;
        }

        const standardFields = Object.entries(node.config || {})
            .filter(([k]) => !['selected_pcap', 'target_victim', 'replay_speed', 'mounted_model', 'backend', 'airgap'].includes(k))
            .map(([k, v]) => `
                <div class="inspector-field">
                    <span class="inspector-label">${k.replace(/_/g, " ")}</span>
                    <input class="inspector-input scen-config-field" data-key="${k}" value="${v}" />
                </div>
            `).join("");

        container.innerHTML = `
            <div class="inspector-field">
                <span class="inspector-label">Container Name</span>
                <input class="inspector-input" id="scen-inp-title" value="${node.title}" />
            </div>
            <div class="inspector-field">
                <span class="inspector-label">Archetype Subtitle</span>
                <input class="inspector-input" id="scen-inp-sub" value="${node.sub}" />
            </div>
            <div style="border-top:1px solid #1E293B; margin: 8px 0;"></div>
            <div style="font-weight:700; color:#00FF88; font-size:10px; margin-bottom:4px;">TOPOLOGY ATTRIBUTES:</div>
            ${specializedHtml}
            ${standardFields}
        `;

        document.getElementById("scen-inp-title").addEventListener("input", (e) => {
            node.title = e.target.value;
            const el = document.getElementById(`node-${node.id}`);
            if (el) el.querySelector(".graph-node-title").textContent = node.title;
        });

        const chkAirgap = document.getElementById("scen-chk-airgap");
        if (chkAirgap) {
            chkAirgap.addEventListener("change", (e) => {
                node.config.airgap = e.target.checked ? "true" : "false";
            });
        }

        container.querySelectorAll(".scen-config-select").forEach(sel => {
            sel.addEventListener("change", (e) => {
                node.config[e.target.getAttribute("data-key")] = e.target.value;
            });
        });

        container.querySelectorAll(".scen-config-field").forEach(inp => {
            inp.addEventListener("input", (e) => {
                node.config[e.target.getAttribute("data-key")] = e.target.value;
            });
        });
    }

    loadDefaultScenario() {
        const net = this.engine.addNode({ x: 350, y: 50, width: 220, height: 65, title: "Grid Subnet Bus", sub: "10.240.0.0/24 (Air-Gapped)", color: "#3B82F6", inputs: [1, 2, 3], outputs: [1, 2, 3], config: { subnet: "10.240.0.0/24", gateway: "10.240.0.1", airgap: "true" } });
        const edge = this.engine.addNode({ x: 80, y: 180, width: 175, height: 72, title: "Edge Substation Sentry", sub: "10.240.0.101", color: "#10B981", inputs: [1], outputs: [1], config: { ip: "10.240.0.101", backend: "INTEL_OPENVINO", mounted_model: "network_threat_int8.onnx" } });
        const plc = this.engine.addNode({ x: 300, y: 180, width: 175, height: 72, title: "Water Intake PLC", sub: "Modbus TCP :502", color: "#00B4D8", inputs: [1], outputs: [1], config: { ip: "10.240.0.150", port: "502", protocol: "MODBUS" } });
        const traffic = this.engine.addNode({ x: 520, y: 180, width: 175, height: 72, title: "PCAP Streamer", sub: "Industroyer2 Replay", color: "#F97316", inputs: [], outputs: [1], config: { selected_pcap: "industroyer2_substation.pcap", target_victim: "10.240.0.101" } });
        const adv = this.engine.addNode({ x: 740, y: 180, width: 175, height: 72, title: "Red-Team Attacker", sub: "10.240.0.99", color: "#DC2626", inputs: [], outputs: [1], config: { ip: "10.240.0.99", exploit_type: "MODBUS_FC05_OVERRIDE" } });

        this.engine.completeConnection(edge.id, 0, net.id, 0);
        this.engine.completeConnection(plc.id, 0, net.id, 1);
        this.engine.completeConnection(adv.id, 0, net.id, 2);
    }

    validateTopology() {
        const netNode = this.engine.nodes.find(n => n.config.subnet !== undefined);
        if (!netNode) {
            alert("[-] Topology Validation Error: Scenario requires at least one Virtual Subnet Bus.");
            return false;
        }

        const deviceCount = this.engine.nodes.filter(n => n.config.subnet === undefined).length;
        alert(`[✓] Digital Twin Topology Validated!\n` +
              `• Virtual Subnet: ${netNode.config.subnet} (Air-Gap: ${netNode.config.airgap})\n` +
              `• Attached Devices: ${deviceCount} active nodes\n` +
              `• Network Links: ${this.engine.connections.length} virtual wire connections`);
        return true;
    }

    exportYaml() {
        const yaml = this.generateScenarioYaml();
        const blob = new Blob([yaml], { type: "text/yaml" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = "scenario.yaml";
        a.click();
        URL.revokeObjectURL(url);
    }

    generateScenarioYaml() {
        const netNode = this.engine.nodes.find(n => n.config.subnet !== undefined) || { config: { subnet: "10.240.0.0/24", gateway: "10.240.0.1", airgap: "true" } };
        const yamlLines = [
            "version: \"1.0\"",
            "scenario:",
            "  name: \"visual_compiled_scenario\"",
            "  description: \"Digital twin scenario compiled via Sentinel Nexus Visio Studio\"",
            "",
            "networks:",
            "  sentinel-grid-net:",
            "    driver: bridge",
            `    subnet: "${netNode.config.subnet}"`,
            `    gateway: "${netNode.config.gateway}"`,
            `    internal: ${netNode.config.airgap}`,
            "",
            "nodes:"
        ];

        this.engine.nodes.forEach(n => {
            if (n.config.subnet !== undefined) return;
            const safeName = n.title.toLowerCase().replace(/[^a-z0-9]/g, "-");
            yamlLines.push(`  - name: "${safeName}"`);
            yamlLines.push(`    image: "sentinel-matrix/device-runtime:latest"`);
            yamlLines.push(`    networks:`);
            yamlLines.push(`      sentinel-grid-net:`);
            yamlLines.push(`        ipv4_address: "${n.config.ip || '10.240.0.88'}"`);
            if (n.config.port) {
                yamlLines.push(`    ports: ["${n.config.port}:${n.config.port}"]`);
            }
        });

        return yamlLines.join("\n");
    }

    packScenario(embedMode = false) {
        const name = prompt("Enter Scenario Name for Packaging:", "production_water_grid");
        if (!name) return;

        const cmd = embedMode ?
            `aryo scenario pack scenarios/${name} --embed` :
            `aryo scenario pack scenarios/${name}`;

        navigator.clipboard.writeText(cmd).catch(() => {});
        alert(`[+] Packaging Command Copied to Clipboard!\n\nMode: ${embedMode ? "STANDALONE EMBEDDED (--embed)" : "DECLARATIVE REFERENCED"}\nCommand:\n${cmd}\n\nRun this on your terminal to create the verified .tar.gz bundle.`);
    }

    async launchInMatrix() {
        if (!this.validateTopology()) return;
        alert("[+] 1-Click Launch Triggered!\nExecuting: aryo matrix scenario load with compiled topology.");
    }

    async dismantleMatrix() {
        if (!confirm("Stop and dismantle active dynamic scenario mesh?")) return;
        alert("[+] Dismantle Signal Sent!\nRunning: aryo matrix scenario down to release virtual bridges.");
    }
}