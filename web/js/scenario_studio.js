// File: /home/kami/sentinel-nexus/web/js/scenario_studio.js
// ==============================================================================
// ARYORITHM SENTINEL NEXUS: SCENARIO STUDIO (SINGLE-VIEW FLEET + SENSOR EDITOR)
// Zero Hardcoding: Renders All Active Sentries & All Sensors in One Canvas
// ==============================================================================

class DigitalTwinScenarioStudio {
    constructor() {
        this.engine = new VisioStudioEngine('scenario-studio-container', {
            paletteTitle: 'SCENARIO ARCHETYPES',
            createNodeFromType: this.createNodeDefinition.bind(this),
            renderInspector: this.renderInspector.bind(this)
        });

        this.availableModels = [];
        this.availablePcaps = [];
        this.scenarioMeta = {
            scenario_name: 'active_scenario',
            nexus_host: '',
            subnet: '10.240.0.0/24',
            gateway: '10.240.0.1'
        };
        this.contextNodes = [];

        this.initToolbar();
        this.loadContextAndRender();
    }

    async loadContextAndRender() {
        try {
            const resp = await fetch('/api/v1/scenarios/context');
            if (resp.ok) {
                const ctx = await resp.json();
                this.availableModels = Array.isArray(ctx.models) ? ctx.models : [];
                this.availablePcaps = Array.isArray(ctx.pcaps) ? ctx.pcaps : [];
                this.contextNodes = Array.isArray(ctx.nodes) ? ctx.nodes : [];
                this.scenarioMeta = {
                    scenario_name: ctx.scenario_name || 'active_scenario',
                    nexus_host: ctx.nexus_host || window.location.hostname || '127.0.0.1',
                    subnet: ctx.subnet && ctx.subnet !== 'auto-discovered' ? ctx.subnet : '10.240.0.0/24',
                    gateway: ctx.gateway || '10.240.0.1'
                };
            }
        } catch (e) {
            console.warn('[ScenarioStudio] Context discovery deferred:', e);
        }

        this.initPalette();
        this.renderFullScenarioTopology();
    }

    initPalette() {
        const palette = document.getElementById('scenario-studio-container-palette');
        if (!palette) return;

        // Collect unique sensor categories and protocols discovered in this scenario
        const uniqueSensorTypes = [];
        const seenCat = new Set();
        this.contextNodes.forEach(n => {
            (n.sensors || []).forEach(s => {
                const k = `${s.category}::${s.unit}`;
                if (!seenCat.has(k)) {
                    seenCat.add(k);
                    uniqueSensorTypes.push(s);
                }
            });
        });

        const categories = [
            {
                title: 'NETWORK & COMMAND PLANE',
                nodes: [
                    { key: 'net_bus', name: 'Virtual Subnet Bus', sub: this.scenarioMeta.subnet, color: '#3B82F6' },
                    { key: 'nexus_c2', name: 'Sentinel Nexus C2', sub: this.scenarioMeta.nexus_host || 'C2 :9443', color: '#00F0FF' }
                ]
            },
            {
                title: 'EDGE APPLIANCES',
                nodes: [
                    { key: 'edge_node', name: 'Sentinel Edge Sentry', sub: 'Multi-Model Appliance', color: '#10B981' }
                ]
            },
            {
                title: 'SCENARIO SENSOR PROBES',
                nodes: uniqueSensorTypes.length > 0
                    ? uniqueSensorTypes.map(s => ({
                        key: `sensor::${s.category}::${s.unit}::${s.port || 502}`,
                        name: `${s.category} Probe`,
                        sub: `${s.unit || 'units'} (:${s.port || 502})`,
                        color: this.getCategoryColor(s.category)
                    }))
                    : [{ key: 'sensor::GENERIC::units::502', name: 'Field Sensor Probe', sub: 'device-runtime', color: '#F59E0B' }]
            },
            {
                title: 'TRAFFIC & ADVERSARIES',
                nodes: [
                    { key: 'actor_stream', name: 'Protocol Transmitter', sub: 'Wire Telemetry Feed', color: '#F97316' },
                    { key: 'actor_adversary', name: 'Red-Team Injector', sub: 'Active Exploit Node', color: '#DC2626' }
                ]
            }
        ];

        palette.innerHTML = categories.map(cat => `
            <div class="palette-category-title">${this.escapeHtml(cat.title)}</div>
            ${cat.nodes.map(n => `
                <div class="palette-node-item" draggable="true" data-key="${this.escapeHtml(n.key)}">
                    <div class="palette-node-icon" style="background:${n.color}"></div>
                    <div class="palette-node-info">
                        <span class="palette-node-title">${this.escapeHtml(n.name)}</span>
                        <span class="palette-node-sub">${this.escapeHtml(n.sub)}</span>
                    </div>
                </div>
            `).join('')}
        `).join('');

        palette.querySelectorAll('.palette-node-item').forEach(item => {
            item.addEventListener('dragstart', (e) => {
                e.dataTransfer.setData('node_type', item.getAttribute('data-key'));
            });
        });
    }

    initToolbar() {
        const toolbar = document.getElementById('scenario-studio-container-toolbar');
        if (!toolbar) return;

        toolbar.innerHTML = `
            <div class="studio-toolbar-group">
                <span id="scen-summary-badge" style="font-size:10px; font-weight:800; color:#00E5FF; font-family:monospace;">DISCOVERING...</span>
                <button class="btn-tb btn-tb-dark" id="btn-scen-sync">SYNC</button>
                <button class="btn-tb btn-tb-dark" id="btn-scen-fit">FIT VIEW</button>
            </div>
            <div class="studio-toolbar-group">
                <button class="btn-tb btn-tb-green" id="btn-scen-validate">[✓] VALIDATE MESH</button>
                <button class="btn-tb btn-tb-dark" id="btn-scen-export-yaml">EXPORT YAML</button>
            </div>
            <div class="studio-toolbar-group" style="border-right:none;">
                <button class="btn-tb btn-tb-purple" id="btn-scen-pack-ref">PACK (REF)</button>
                <button class="btn-tb btn-tb-purple" id="btn-scen-pack-embed">PACK (EMBED)</button>
            </div>
        `;

        document.getElementById('btn-scen-sync')?.addEventListener('click', () => this.loadContextAndRender());
        document.getElementById('btn-scen-fit')?.addEventListener('click', () => this.fitToViewport());
        document.getElementById('btn-scen-validate')?.addEventListener('click', () => this.validateTopology());
        document.getElementById('btn-scen-export-yaml')?.addEventListener('click', () => this.exportYaml());
        document.getElementById('btn-scen-pack-ref')?.addEventListener('click', () => this.packScenario(false));
        document.getElementById('btn-scen-pack-embed')?.addEventListener('click', () => this.packScenario(true));
    }

    getCategoryColor(category) {
        const cat = (category || '').toUpperCase();
        if (cat.includes('RF') || cat.includes('GNSS') || cat.includes('CYBER')) return '#00F0FF';
        if (cat.includes('KINEMATIC') || cat.includes('VIBRAT')) return '#00FFA3';
        if (cat.includes('AVIONICS') || cat.includes('PRESS')) return '#FFB800';
        if (cat.includes('THERM') || cat.includes('TEMP') || cat.includes('OPTIC')) return '#EF4444';
        if (cat.includes('ELECTR') || cat.includes('GRID')) return '#A855F7';
        return '#38BDF8';
    }

    clearCanvas() {
        this.engine.nodes = [];
        this.engine.connections = [];
        this.engine.selectedNode = null;
        if (this.engine.nodesLayer) this.engine.nodesLayer.innerHTML = '';
        if (this.engine.wiresLayer) this.engine.wiresLayer.innerHTML = '';
        if (this.engine.inspector) {
            this.engine.inspector.innerHTML = '<div style="color: #64748B; text-align: center; margin-top: 40px;">Select any sentry or sensor node to inspect</div>';
        }
    }

    renderFullScenarioTopology() {
        this.clearCanvas();
        const badge = document.getElementById('scen-summary-badge');

        const sentries = this.contextNodes;
        let totalSensors = 0;
        sentries.forEach(n => { totalSensors += (n.sensors || []).length; });

        if (badge) {
            badge.textContent = `${sentries.length} SENTRIES | ${totalSensors} SENSORS | ${this.scenarioMeta.subnet}`;
        }

        if (sentries.length === 0) {
            return;
        }

        // Left-to-Right Column Layout matching VisioStudioEngine ports (inputs=left, outputs=right):
        // Col 1 (x=20):  ALL Physical Sensors (stacked per sentry) + Wire Ingress Sources
        // Col 2 (x=310): ALL Edge Sentry Appliances
        // Col 3 (x=610): Active Subnet Bus
        // Col 4 (x=890): Sentinel Nexus C2
        const COL_SENSORS_X = 20;
        const COL_SENTRY_X = 310;
        const COL_NET_X = 610;
        const COL_NEXUS_X = 890;
        const ROW_STEP_Y = 82;
        const GROUP_GAP_Y = 26;

        let cursorY = 20;
        const sentryCenterYs = [];
        const createdSentries = [];
        const seenRoutes = new Map(); // proto:port -> list of createdSentry

        sentries.forEach((n) => {
            const sensors = Array.isArray(n.sensors) ? n.sensors : [];
            const rowsForGroup = Math.max(1, sensors.length);
            const groupTopY = cursorY;
            const groupBottomY = groupTopY + (rowsForGroup - 1) * ROW_STEP_Y + 68;
            const sentryY = Math.round((groupTopY + groupBottomY) / 2 - 36);
            sentryCenterYs.push(sentryY);

            const route = (Array.isArray(n.routes) && n.routes.length > 0) ? n.routes[0] : null;
            const inputPorts = Array.from({ length: Math.max(1, sensors.length + (route ? 1 : 0)) }, (_, i) => i + 1);

            const sentryNode = this.engine.addNode({
                x: COL_SENTRY_X,
                y: sentryY,
                width: 205,
                height: Math.max(72, Math.min(120, 44 + inputPorts.length * 14)),
                title: n.identifier || n.hostname || n.node_id,
                sub: `${n.primary_backend || 'AUTO'} | ${n.active_model || 'No Model'}`,
                color: (n.status || '').toUpperCase() === 'ONLINE' ? '#10B981' : '#EF4444',
                inputs: inputPorts,
                outputs: [1],
                config: {
                    node_type: 'edge_sentry',
                    hostname: n.hostname || '',
                    site: n.site || '',
                    backend: n.primary_backend || 'INTEL_OPENVINO',
                    mounted_model: n.active_model || (this.availableModels[0] || ''),
                    ebpf_drops: String(n.ebpf_drops || 0)
                }
            });
            createdSentries.push({ node: sentryNode, data: n, route });

            if (route) {
                const rKey = `${(route.transport || 'udp').toUpperCase()} :${route.port || 0}`;
                if (!seenRoutes.has(rKey)) seenRoutes.set(rKey, []);
                seenRoutes.get(rKey).push({ sentryNode, portIdx: sensors.length });
            }

            // Render ALL physical sensors belonging to this sentry in Column 1
            sensors.forEach((s, sIdx) => {
                const sy = groupTopY + sIdx * ROW_STEP_Y;
                const sNode = this.engine.addNode({
                    x: COL_SENSORS_X,
                    y: sy,
                    width: 215,
                    height: 66,
                    title: s.sensor_id || s.name,
                    sub: `${s.name} (${s.baseline} ${s.unit} | :${s.port})`,
                    color: this.getCategoryColor(s.category),
                    inputs: [],
                    outputs: [1],
                    config: {
                        node_type: 'sensor',
                        parent_sentry: n.identifier || n.hostname,
                        sensor_id: s.sensor_id,
                        category: s.category || 'SENSOR',
                        port: String(s.port || 502),
                        unit: s.unit || 'units',
                        baseline: String(s.baseline ?? 0)
                    }
                });
                this.engine.completeConnection(sNode.id, 0, sentryNode.id, sIdx);
            });

            cursorY = groupBottomY + GROUP_GAP_Y;
        });

        // Render active wire protocol sources (e.g. UDP :50050 Transmitter & Adversary) below sensors in Column 1
        seenRoutes.forEach((targets, rKey) => {
            const txNode = this.engine.addNode({
                x: COL_SENSORS_X,
                y: cursorY,
                width: 215,
                height: 66,
                title: `Wire Stream (${rKey})`,
                sub: 'Live Telemetry & Attack Ingress',
                color: '#F97316',
                inputs: [],
                outputs: [1],
                config: {
                    node_type: 'traffic_source',
                    protocol_port: rKey,
                    selected_pcap: this.availablePcaps[0] || '',
                    target_count: String(targets.length)
                }
            });
            targets.forEach(t => {
                this.engine.completeConnection(txNode.id, 0, t.sentryNode.id, t.portIdx);
            });
            cursorY += ROW_STEP_Y;
        });

        // Center vertically for Subnet Bus (Col 3) and Nexus C2 (Col 4)
        const midY = sentryCenterYs.length > 0
            ? Math.round((sentryCenterYs[0] + sentryCenterYs[sentryCenterYs.length - 1]) / 2)
            : 160;

        const busPorts = Array.from({ length: createdSentries.length }, (_, i) => i + 1);
        const netBus = this.engine.addNode({
            x: COL_NET_X,
            y: midY,
            width: 205,
            height: Math.max(76, 44 + busPorts.length * 16),
            title: `Subnet (${this.scenarioMeta.subnet})`,
            sub: `GW: ${this.scenarioMeta.gateway} | Air-Gapped`,
            color: '#3B82F6',
            inputs: busPorts,
            outputs: [1],
            config: {
                node_type: 'network_bus',
                subnet: this.scenarioMeta.subnet,
                gateway: this.scenarioMeta.gateway,
                airgap: 'true'
            }
        });

        const nexusNode = this.engine.addNode({
            x: COL_NEXUS_X,
            y: midY,
            width: 200,
            height: 76,
            title: 'Sentinel Nexus C2',
            sub: `${this.scenarioMeta.nexus_host || 'C2'} (:9443 / :50051)`,
            color: '#00F0FF',
            inputs: [1],
            outputs: [],
            config: {
                node_type: 'nexus_c2',
                scenario: this.scenarioMeta.scenario_name,
                nexus_host: this.scenarioMeta.nexus_host,
                http_port: '9443',
                grpc_port: '50051'
            }
        });

        createdSentries.forEach((item, idx) => {
            this.engine.completeConnection(item.node.id, 0, netBus.id, idx);
        });
        this.engine.completeConnection(netBus.id, 0, nexusNode.id, 0);

        this.fitToViewport();
    }

    fitToViewport() {
        if (!this.engine || !this.engine.workspace || this.engine.nodes.length === 0) return;
        const rect = this.engine.workspace.getBoundingClientRect();
        if (rect.width <= 50 || rect.height <= 50) return;

        let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
        this.engine.nodes.forEach(n => {
            minX = Math.min(minX, n.x);
            minY = Math.min(minY, n.y);
            maxX = Math.max(maxX, n.x + n.width);
            maxY = Math.max(maxY, n.y + n.height);
        });

        const contentW = Math.max(100, maxX - minX);
        const contentH = Math.max(100, maxY - minY);
        const pad = 48;

        const scaleX = (rect.width - pad * 2) / contentW;
        const scaleY = (rect.height - pad * 2) / contentH;
        const zoom = Math.min(1.0, Math.max(0.35, Math.min(scaleX, scaleY)));

        this.engine.zoom = zoom;
        this.engine.panX = Math.round((rect.width - contentW * zoom) / 2 - minX * zoom);
        this.engine.panY = Math.round((rect.height - contentH * zoom) / 2 - minY * zoom);
        this.engine.updateViewportTransform();
    }

    createNodeDefinition(typeKey, x, y) {
        if (typeKey === 'net_bus') {
            return {
                x, y, width: 205, height: 76,
                title: `Subnet (${this.scenarioMeta.subnet})`, sub: 'Bridge Network', color: '#3B82F6',
                inputs: [1, 2, 3], outputs: [1],
                config: { node_type: 'network_bus', subnet: this.scenarioMeta.subnet, gateway: this.scenarioMeta.gateway, airgap: 'true' }
            };
        }
        if (typeKey === 'nexus_c2') {
            return {
                x, y, width: 200, height: 76,
                title: 'Sentinel Nexus C2', sub: `${this.scenarioMeta.nexus_host} :9443`, color: '#00F0FF',
                inputs: [1], outputs: [],
                config: { node_type: 'nexus_c2', nexus_host: this.scenarioMeta.nexus_host, http_port: '9443', grpc_port: '50051' }
            };
        }
        if (typeKey === 'edge_node') {
            return {
                x, y, width: 205, height: 74,
                title: 'New Edge Sentry', sub: this.availableModels[0] || 'No Model', color: '#10B981',
                inputs: [1], outputs: [1],
                config: { node_type: 'edge_sentry', hostname: 'edge-new.matrix.internal', backend: 'INTEL_OPENVINO', mounted_model: this.availableModels[0] || '' }
            };
        }
        if (typeKey.startsWith('sensor::')) {
            const [, cat, unit, port] = typeKey.split('::');
            return {
                x, y, width: 215, height: 66,
                title: `${cat}_SENSOR`, sub: `${unit} (:${port})`, color: this.getCategoryColor(cat),
                inputs: [], outputs: [1],
                config: { node_type: 'sensor', sensor_id: `${cat}_01`, category: cat, port: port || '502', unit: unit || 'units', baseline: '10.0' }
            };
        }
        if (typeKey === 'actor_stream') {
            return {
                x, y, width: 215, height: 66,
                title: 'Protocol Transmitter', sub: 'Wire Telemetry Feed', color: '#F97316',
                inputs: [], outputs: [1],
                config: { node_type: 'traffic_source', protocol_port: 'UDP :50050', selected_pcap: this.availablePcaps[0] || '' }
            };
        }
        return {
            x, y, width: 215, height: 66,
            title: 'Red-Team Injector', sub: 'Exploit Generator', color: '#DC2626',
            inputs: [], outputs: [1],
            config: { node_type: 'adversary', protocol_port: 'UDP :50050', target_sentry: this.contextNodes[0]?.hostname || '' }
        };
    }

    renderInspector(node, container) {
        let specializedHtml = '';

        if (node.config.mounted_model !== undefined) {
            const models = [...new Set([...this.availableModels, node.config.mounted_model].filter(Boolean))];
            specializedHtml += `
                <div class="inspector-field">
                    <span class="inspector-label">Mounted ONNX Model (/api/v1/models)</span>
                    <select class="inspector-select scen-config-select" data-key="mounted_model">
                        ${models.length > 0
                            ? models.map(m => `<option value="${this.escapeHtml(m)}" ${node.config.mounted_model === m ? 'selected' : ''}>${this.escapeHtml(m)}</option>`).join('')
                            : '<option value="">(None mounted)</option>'}
                    </select>
                </div>
                <div class="inspector-field">
                    <span class="inspector-label">Execution Backend</span>
                    <select class="inspector-select scen-config-select" data-key="backend">
                        <option value="INTEL_OPENVINO" ${node.config.backend === 'INTEL_OPENVINO' ? 'selected' : ''}>INTEL_OPENVINO</option>
                        <option value="NVIDIA_TENSORRT" ${node.config.backend === 'NVIDIA_TENSORRT' ? 'selected' : ''}>NVIDIA_TENSORRT</option>
                        <option value="ROCKCHIP_RKNN" ${node.config.backend === 'ROCKCHIP_RKNN' ? 'selected' : ''}>ROCKCHIP_RKNN</option>
                    </select>
                </div>
            `;
        }

        if (node.config.selected_pcap !== undefined) {
            specializedHtml += `
                <div class="inspector-field">
                    <span class="inspector-label">Scenario PCAP Capture</span>
                    <select class="inspector-select scen-config-select" data-key="selected_pcap">
                        ${this.availablePcaps.length > 0
                            ? this.availablePcaps.map(p => `<option value="${this.escapeHtml(p)}" ${node.config.selected_pcap === p ? 'selected' : ''}>${this.escapeHtml(p)}</option>`).join('')
                            : '<option value="">(Live generator / no .pcap mounted)</option>'}
                    </select>
                </div>
            `;
        }

        if (node.config.airgap !== undefined) {
            specializedHtml += `
                <div class="inspector-checkbox-row">
                    <input type="checkbox" id="scen-chk-airgap" ${node.config.airgap === 'true' ? 'checked' : ''} />
                    <span class="inspector-label" style="margin:0;">Air-Gapped Subnet ($0.00 Cloud Egress)</span>
                </div>
            `;
        }

        const handled = new Set(['node_type', 'mounted_model', 'backend', 'selected_pcap', 'airgap']);
        const standardFields = Object.entries(node.config || {})
            .filter(([k]) => !handled.has(k))
            .map(([k, v]) => `
                <div class="inspector-field">
                    <span class="inspector-label">${this.escapeHtml(k.replace(/_/g, ' '))}</span>
                    <input class="inspector-input scen-config-field" data-key="${this.escapeHtml(k)}" value="${this.escapeHtml(v)}" />
                </div>
            `).join('');

        container.innerHTML = `
            <div class="inspector-field">
                <span class="inspector-label">Node Title</span>
                <input class="inspector-input" id="scen-inp-title" value="${this.escapeHtml(node.title)}" />
            </div>
            <div class="inspector-field">
                <span class="inspector-label">Subtitle</span>
                <input class="inspector-input" id="scen-inp-sub" value="${this.escapeHtml(node.sub)}" />
            </div>
            <div style="border-top:1px solid #1E293B; margin: 8px 0;"></div>
            <div style="font-weight:700; color:#00FF88; font-size:10px; margin-bottom:4px;">SCENARIO ATTRIBUTES:</div>
            ${specializedHtml}
            ${standardFields}
        `;

        document.getElementById('scen-inp-title')?.addEventListener('input', (e) => {
            node.title = e.target.value;
            const el = document.getElementById(`node-${node.id}`);
            if (el) el.querySelector('.graph-node-title').textContent = node.title;
        });

        document.getElementById('scen-inp-sub')?.addEventListener('input', (e) => {
            node.sub = e.target.value;
            const el = document.getElementById(`node-${node.id}`);
            if (el) el.querySelector('.graph-node-sub').textContent = node.sub;
        });

        document.getElementById('scen-chk-airgap')?.addEventListener('change', (e) => {
            node.config.airgap = e.target.checked ? 'true' : 'false';
        });

        container.querySelectorAll('.scen-config-select').forEach(sel => {
            sel.addEventListener('change', (e) => {
                node.config[e.target.getAttribute('data-key')] = e.target.value;
            });
        });

        container.querySelectorAll('.scen-config-field').forEach(inp => {
            inp.addEventListener('input', (e) => {
                node.config[e.target.getAttribute('data-key')] = e.target.value;
            });
        });
    }

    validateTopology() {
        const netNode = this.engine.nodes.find(n => n.config.subnet !== undefined);
        if (!netNode) {
            alert('[-] Topology Validation Error: Scenario requires a Subnet Bus node.');
            return false;
        }
        const sentryCount = this.engine.nodes.filter(n => n.config.node_type === 'edge_sentry').length;
        const sensorCount = this.engine.nodes.filter(n => n.config.node_type === 'sensor').length;

        alert(`[✓] Scenario Mesh Validated!\n` +
              `• Scenario: ${this.scenarioMeta.scenario_name}\n` +
              `• Subnet: ${netNode.config.subnet} (Air-Gap: ${netNode.config.airgap})\n` +
              `• Edge Sentries: ${sentryCount} | Physical Sensors: ${sensorCount}\n` +
              `• Total Graph Links: ${this.engine.connections.length}`);
        return true;
    }

    generateScenarioYaml() {
        const netNode = this.engine.nodes.find(n => n.config.subnet !== undefined) || {
            config: { subnet: this.scenarioMeta.subnet, gateway: this.scenarioMeta.gateway, airgap: 'true' }
        };
        const sentries = this.engine.nodes.filter(n => n.config.node_type === 'edge_sentry');
        const sensors = this.engine.nodes.filter(n => n.config.node_type === 'sensor');

        const lines = [
            'version: "1.0"',
            'scenario:',
            `  name: "${this.scenarioMeta.scenario_name}"`,
            `  description: "Compiled from Sentinel Nexus Scenario Studio (${sentries.length} sentries, ${sensors.length} sensors)"`,
            '',
            'networks:',
            '  sentinel-net:',
            '    driver: bridge',
            `    subnet: "${netNode.config.subnet}"`,
            `    gateway: "${netNode.config.gateway}"`,
            `    internal: ${netNode.config.airgap || 'true'}`,
            '',
            'services:'
        ];

        sentries.forEach(s => {
            const slug = (s.title || 'sentry').toLowerCase().replace(/[^a-z0-9]+/g, '-');
            lines.push(`  ${slug}:`);
            lines.push(`    hostname: "${s.config.hostname || slug + '.matrix.internal'}"`);
            lines.push(`    environment:`);
            lines.push(`      - PRIMARY_BACKEND=${s.config.backend || 'INTEL_OPENVINO'}`);
            lines.push(`      - ACTIVE_MODEL=${s.config.mounted_model || ''}`);
        });

        sensors.forEach(s => {
            const slug = (s.config.sensor_id || s.title).toLowerCase().replace(/[^a-z0-9]+/g, '-');
            lines.push(`  sensor-${slug}:`);
            lines.push(`    image: "sentinel-matrix/device-runtime:latest"`);
            lines.push(`    ports: ["${s.config.port || 502}:${s.config.port || 502}"]`);
            lines.push(`    command: ["--archetype", "sensor", "--name", "${s.config.sensor_id || s.title}"]`);
        });

        return lines.join('\n') + '\n';
    }

    exportYaml() {
        const yaml = this.generateScenarioYaml();
        const blob = new Blob([yaml], { type: 'text/yaml' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'scenario.yaml';
        a.click();
        URL.revokeObjectURL(url);
    }

    packScenario(embedMode = false) {
        const defaultName = (this.scenarioMeta.scenario_name || 'custom_scenario')
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, '_')
            .replace(/^_+|_+$/g, '');
        const name = prompt('Enter Scenario Name for Packaging:', defaultName);
        if (!name) return;

        const cmd = embedMode
            ? `aryo scenario pack scenarios/${name} --embed`
            : `aryo scenario pack scenarios/${name}`;

        navigator.clipboard?.writeText(cmd).catch(() => {});
        alert(`[+] Packaging Command:\n${cmd}`);
    }

    escapeHtml(str) {
        if (typeof str !== 'string') return String(str || '');
        return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    }
}