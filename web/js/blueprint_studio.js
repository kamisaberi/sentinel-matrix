// File: /home/kami/sentinel-nexus/web/js/blueprint_studio.js
// ==============================================================================
// ARYORITHM SENTINEL NEXUS: SCENARIO-DRIVEN BLUEPRINT STUDIO (DAG COMPILER)
// Zero Hardcoding: Hydrated from /api/v1/blueprints/context
// ==============================================================================

class ThreatBlueprintStudio {
    constructor() {
        this.engine = new VisioStudioEngine('blueprint-studio-container', {
            paletteTitle: 'PIPELINE STAGES & ASSETS',
            createNodeFromType: this.createNodeDefinition.bind(this),
            renderInspector: this.renderInspector.bind(this)
        });

        this.availableModels = [];
        this.availablePackages = [];
        this.availablePlugins = [];
        this.availableNics = [];
        this.contextNodes = [];
        this.selectedContextNode = null;

        this.siliconTargets = [
            'INTEL_OPENVINO',
            'NVIDIA_TENSORRT',
            'ROCKCHIP_RKNN',
            'AMD_VITIS_AI',
            'QUALCOMM_QNN',
            'APPLE_COREML',
            'AMD_RYZEN_AI',
            'HAILO',
            'EDGE_TPU'
        ];

        this.initToolbar();
        this.loadContextAndRender();
    }

    async loadContextAndRender() {
        try {
            const resp = await fetch('/api/v1/blueprints/context');
            if (resp.ok) {
                const ctx = await resp.json();
                this.availableModels = Array.isArray(ctx.models) ? ctx.models : [];
                this.availablePackages = Array.isArray(ctx.packages) ? ctx.packages : [];
                this.availablePlugins = Array.isArray(ctx.plugins) ? ctx.plugins : [];
                this.availableNics = Array.isArray(ctx.nics) ? ctx.nics : [];
                this.contextNodes = Array.isArray(ctx.nodes) ? ctx.nodes : [];
            }
        } catch (e) {
            console.warn('[BlueprintStudio] Context discovery deferred:', e);
        }

        this.initPalette();
        this.populateNodeSelector();
        this.loadSelectedNodeDag();
    }

    initPalette() {
        const palette = document.getElementById('blueprint-studio-container-palette');
        if (!palette) return;

        const categories = [
            {
                title: 'STAGE 0: HARDWARE INGRESS',
                nodes: (this.availableNics.length > 0 ? this.availableNics : ['eth0']).slice(0, 3).map(nic => ({
                    key: `hw_nic::${nic}`,
                    name: `NIC Ingest (${nic})`,
                    sub: 'AF_XDP / SKB Ring',
                    color: '#94A3B8'
                }))
            },
            {
                title: 'STAGE 1: REFLEX & DISSECTORS',
                nodes: [
                    ...this.availablePlugins.map(p => ({
                        key: `plugin::${p}`,
                        name: p,
                        sub: 'Native Dissector Plugin',
                        color: '#00FF88'
                    })),
                    ...this.availablePackages.map(pkg => ({
                        key: `package::${pkg}`,
                        name: pkg.split('.').pop(),
                        sub: pkg,
                        color: '#10B981'
                    })),
                    { key: 'reflex_custom', name: 'Custom Dissector Stage', sub: 'Tier-1 Reflex Gate', color: '#00B4D8' }
                ]
            },
            {
                title: 'STAGE 2: NEURAL INFERENCE',
                nodes: (this.availableModels.length > 0
                    ? this.availableModels.map(m => ({
                        key: `model::${m}`,
                        name: m,
                        sub: 'libxinfer ONNX Stage',
                        color: '#00F0FF'
                    }))
                    : [{ key: 'model_custom', name: 'ONNX Inference Stage', sub: 'libxinfer.so', color: '#00F0FF' }])
            },
            {
                title: 'STAGE 4: PHYSICAL FUSION',
                nodes: [
                    { key: 'fusion_guard', name: 'Cross-Modal Fusion', sub: 'ThreatCorrelator Invariant', color: '#A855F7' }
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
        const toolbar = document.getElementById('blueprint-studio-container-toolbar');
        if (!toolbar) return;

        toolbar.innerHTML = `
            <div class="studio-toolbar-group">
                <span style="font-size:10px; font-weight:700; color:#94A3B8; font-family:monospace;">SENTRY:</span>
                <select id="bp-node-select" class="form-select-sm" style="min-width:170px;"></select>
                <button class="btn-tb btn-tb-dark" id="btn-bp-refresh" title="Reload scenario blueprint context">SYNC</button>
            </div>
            <div class="studio-toolbar-group">
                <button class="btn-tb btn-tb-green" id="btn-bp-validate">[✓] VALIDATE DAG</button>
                <button class="btn-tb btn-tb-dark" id="btn-bp-export-yaml">EXPORT YAML</button>
            </div>
            <div class="studio-toolbar-group">
                <button class="btn-tb btn-tb-purple" id="btn-bp-pack-ref">PACK (REF)</button>
                <button class="btn-tb btn-tb-purple" id="btn-bp-pack-embed">PACK (EMBED)</button>
            </div>
            <div class="studio-toolbar-group" style="border-right:none;">
                <button class="btn-tb btn-tb-cyan" id="btn-bp-deploy">STAGE DEPLOY</button>
                <button class="btn-tb btn-tb-danger" id="btn-bp-rollback">ROLLBACK</button>
            </div>
        `;

        document.getElementById('bp-node-select')?.addEventListener('change', (e) => {
            const nid = e.target.value;
            this.selectedContextNode = this.contextNodes.find(n => n.node_id === nid) || null;
            this.loadSelectedNodeDag();
        });
        document.getElementById('btn-bp-refresh')?.addEventListener('click', () => this.loadContextAndRender());
        document.getElementById('btn-bp-validate')?.addEventListener('click', () => this.validateDag());
        document.getElementById('btn-bp-export-yaml')?.addEventListener('click', () => this.exportYaml());
        document.getElementById('btn-bp-pack-ref')?.addEventListener('click', () => this.packBlueprint(false));
        document.getElementById('btn-bp-pack-embed')?.addEventListener('click', () => this.packBlueprint(true));
        document.getElementById('btn-bp-deploy')?.addEventListener('click', () => this.deployToLocalEdge());
        document.getElementById('btn-bp-rollback')?.addEventListener('click', () => this.rollbackBackup());
    }

    populateNodeSelector() {
        const sel = document.getElementById('bp-node-select');
        if (!sel) return;

        if (this.contextNodes.length === 0) {
            sel.innerHTML = '<option value="">No Registered Sentries</option>';
            this.selectedContextNode = null;
            return;
        }

        const prevId = this.selectedContextNode?.node_id;
        if (!prevId || !this.contextNodes.some(n => n.node_id === prevId)) {
            this.selectedContextNode = this.contextNodes[0];
        }

        sel.innerHTML = this.contextNodes.map(n => {
            const label = `${n.identifier || n.hostname} (${n.primary_backend || 'AUTO'})`;
            return `<option value="${this.escapeHtml(n.node_id)}" ${n.node_id === this.selectedContextNode.node_id ? 'selected' : ''}>${this.escapeHtml(label)}</option>`;
        }).join('');
    }

    clearCanvas() {
        this.engine.nodes = [];
        this.engine.connections = [];
        this.engine.selectedNode = null;
        if (this.engine.nodesLayer) this.engine.nodesLayer.innerHTML = '';
        if (this.engine.wiresLayer) this.engine.wiresLayer.innerHTML = '';
        if (this.engine.inspector) {
            this.engine.inspector.innerHTML = '<div style="color: #64748B; text-align: center; margin-top: 40px;">Select a node to inspect properties</div>';
        }
    }

    loadSelectedNodeDag() {
        this.clearCanvas();
        const node = this.selectedContextNode;
        const defaultNic = this.availableNics[0] || 'eth0';

        if (!node) {
            return;
        }

        const route = (Array.isArray(node.routes) && node.routes.length > 0) ? node.routes[0] : null;
        const fusion = (Array.isArray(node.fusion_rules) && node.fusion_rules.length > 0) ? node.fusion_rules[0] : null;

        const n0 = this.engine.addNode({
            x: 30, y: 150, width: 185, height: 74,
            title: route ? route.sensor_id : (node.identifier || 'Wire Ingest'),
            sub: `${defaultNic} (${node.xdp_driver_mode || 'SKB'})`,
            color: '#94A3B8',
            inputs: [], outputs: [1],
            config: {
                interface: defaultNic,
                af_xdp_mode: node.xdp_driver_mode || 'SKB',
                sensor_id: route ? route.sensor_id : 'ingress_nic0',
                tpm_attested: 'true'
            }
        });

        const n1 = this.engine.addNode({
            x: 265, y: 150, width: 195, height: 74,
            title: route && route.plugin_id ? route.plugin_id : 'Tier-1 Reflex Gate',
            sub: route ? `${(route.transport || 'any').toUpperCase()} :${route.port || 0}` : 'No active route',
            color: '#00FF88',
            inputs: [1], outputs: [1],
            config: {
                plugin_id: route ? route.plugin_id : (this.availablePlugins[0] || ''),
                package_id: route ? route.package_id : (this.availablePackages[0] || ''),
                transport: route ? route.transport : 'udp',
                port: route ? String(route.port || 0) : '0',
                latency_budget_ns: route ? String(route.latency_budget_ns || 20000) : '20000'
            }
        });

        const n2 = this.engine.addNode({
            x: 510, y: 150, width: 195, height: 74,
            title: route && route.model_id ? route.model_id : 'Tier-2 ONNX Stage',
            sub: `${route?.silicon_target || node.primary_backend || 'INTEL_OPENVINO'} (${route?.precision || 'INT8'})`,
            color: '#00F0FF',
            inputs: [1], outputs: [1],
            config: {
                model_id: route ? route.model_id : (this.availableModels[0] || ''),
                silicon_target: route?.silicon_target || node.primary_backend || 'INTEL_OPENVINO',
                precision: route?.precision || 'INT8',
                threshold_drop: '0.85'
            }
        });

        const n3 = this.engine.addNode({
            x: 755, y: 150, width: 195, height: 74,
            title: fusion ? fusion.correlation_id : 'Stage-4 Fusion Guard',
            sub: fusion ? `${fusion.physical_sensor_id} >= ${fusion.physical_min_temp}` : 'Cross-Modal Correlator',
            color: '#A855F7',
            inputs: [1], outputs: [1],
            config: {
                correlation_id: fusion ? fusion.correlation_id : 'CROSS_MODAL_INVARIANT',
                cyber_sensor_id: fusion ? fusion.cyber_sensor_id : (route?.sensor_id || ''),
                cyber_max_score: fusion ? String(fusion.cyber_max_score) : '0.20',
                physical_sensor_id: fusion ? fusion.physical_sensor_id : '',
                physical_min_temp: fusion ? String(fusion.physical_min_temp) : '45.0',
                action: fusion ? fusion.action : 'KERNEL_DROP_AND_ISOLATE'
            }
        });

        this.engine.completeConnection(n0.id, 0, n1.id, 0);
        this.engine.completeConnection(n1.id, 0, n2.id, 0);
        this.engine.completeConnection(n2.id, 0, n3.id, 0);
    }

    createNodeDefinition(typeKey, x, y) {
        const defaultNic = this.availableNics[0] || 'eth0';
        const defaultBackend = this.selectedContextNode?.primary_backend || 'INTEL_OPENVINO';

        if (typeKey.startsWith('hw_nic::')) {
            const nic = typeKey.slice(8);
            return {
                x, y, width: 185, height: 74,
                title: `NIC Ingest (${nic})`, sub: 'AF_XDP / SKB Ring', color: '#94A3B8',
                inputs: [], outputs: [1],
                config: { interface: nic, af_xdp_mode: 'SKB', sensor_id: `sensor_${nic}`, tpm_attested: 'true' }
            };
        }
        if (typeKey.startsWith('plugin::')) {
            const plugin = typeKey.slice(8);
            return {
                x, y, width: 195, height: 74,
                title: plugin, sub: 'Native Dissector Plugin', color: '#00FF88',
                inputs: [1], outputs: [1],
                config: { plugin_id: plugin, package_id: this.availablePackages[0] || '', transport: 'udp', port: '50050', latency_budget_ns: '20000' }
            };
        }
        if (typeKey.startsWith('package::')) {
            const pkg = typeKey.slice(9);
            return {
                x, y, width: 195, height: 74,
                title: pkg.split('.').pop(), sub: pkg, color: '#10B981',
                inputs: [1], outputs: [1],
                config: { package_id: pkg, plugin_id: this.availablePlugins[0] || '', transport: 'udp', port: '50050', latency_budget_ns: '20000' }
            };
        }
        if (typeKey.startsWith('model::')) {
            const model = typeKey.slice(7);
            return {
                x, y, width: 195, height: 74,
                title: model, sub: `${defaultBackend} ONNX`, color: '#00F0FF',
                inputs: [1], outputs: [1],
                config: { model_id: model, silicon_target: defaultBackend, precision: model.includes('int8') ? 'INT8' : 'FP16', threshold_drop: '0.85' }
            };
        }
        if (typeKey === 'fusion_guard') {
            return {
                x, y, width: 195, height: 74,
                title: 'Cross-Modal Fusion', sub: 'ThreatCorrelator', color: '#A855F7',
                inputs: [1], outputs: [1],
                config: { correlation_id: 'CUSTOM_FUSION_RULE', cyber_sensor_id: '', cyber_max_score: '0.20', physical_sensor_id: '', physical_min_temp: '45.0', action: 'KERNEL_DROP_AND_ISOLATE' }
            };
        }

        return {
            x, y, width: 185, height: 74,
            title: 'Custom Stage', sub: 'Pipeline Component', color: '#00B4D8',
            inputs: [1], outputs: [1],
            config: { plugin_id: this.availablePlugins[0] || '', package_id: this.availablePackages[0] || '', transport: 'tcp', port: '502', latency_budget_ns: '25000' }
        };
    }

    renderInspector(node, container) {
        let specializedHtml = '';

        if (node.config.interface !== undefined) {
            const nicOpts = this.availableNics.length > 0 ? this.availableNics : [node.config.interface];
            specializedHtml += `
                <div class="inspector-field">
                    <span class="inspector-label">Host Network Interface (/sys/class/net)</span>
                    <select class="inspector-select config-select" data-key="interface">
                        ${nicOpts.map(nic => `<option value="${this.escapeHtml(nic)}" ${node.config.interface === nic ? 'selected' : ''}>${this.escapeHtml(nic)}</option>`).join('')}
                    </select>
                </div>
                <div class="inspector-field">
                    <span class="inspector-label">AF_XDP Driver Mode</span>
                    <select class="inspector-select config-select" data-key="af_xdp_mode">
                        <option value="ZEROCOPY" ${node.config.af_xdp_mode === 'ZEROCOPY' ? 'selected' : ''}>ZEROCOPY</option>
                        <option value="SKB" ${node.config.af_xdp_mode === 'SKB' ? 'selected' : ''}>SKB (Generic / Virtual)</option>
                    </select>
                </div>
                <div class="inspector-checkbox-row">
                    <input type="checkbox" id="chk-tpm" ${node.config.tpm_attested === 'true' ? 'checked' : ''} />
                    <span class="inspector-label" style="margin:0;">Require Hardware Identity</span>
                </div>
            `;
        }

        if (node.config.plugin_id !== undefined || node.config.package_id !== undefined) {
            const pkgOpts = [...new Set([...this.availablePackages, node.config.package_id].filter(Boolean))];
            const plugOpts = [...new Set([...this.availablePlugins, node.config.plugin_id].filter(Boolean))];
            specializedHtml += `
                <div class="inspector-field">
                    <span class="inspector-label">Dissector Plugin (.so / .lua / .wasm)</span>
                    <select class="inspector-select config-select" data-key="plugin_id">
                        <option value="">(None)</option>
                        ${plugOpts.map(p => `<option value="${this.escapeHtml(p)}" ${node.config.plugin_id === p ? 'selected' : ''}>${this.escapeHtml(p)}</option>`).join('')}
                    </select>
                </div>
                <div class="inspector-field">
                    <span class="inspector-label">SPKG Package ID</span>
                    <select class="inspector-select config-select" data-key="package_id">
                        <option value="">(None)</option>
                        ${pkgOpts.map(p => `<option value="${this.escapeHtml(p)}" ${node.config.package_id === p ? 'selected' : ''}>${this.escapeHtml(p)}</option>`).join('')}
                    </select>
                </div>
            `;
        }

        if (node.config.model_id !== undefined) {
            const modelOpts = [...new Set([...this.availableModels, node.config.model_id].filter(Boolean))];
            specializedHtml += `
                <div class="inspector-field">
                    <span class="inspector-label">Scenario ONNX Model (/api/v1/models)</span>
                    <select class="inspector-select config-select" data-key="model_id">
                        ${modelOpts.map(m => `<option value="${this.escapeHtml(m)}" ${node.config.model_id === m ? 'selected' : ''}>${this.escapeHtml(m)}</option>`).join('')}
                    </select>
                </div>
                <div class="inspector-field">
                    <span class="inspector-label">xInfer Silicon Target</span>
                    <select class="inspector-select config-select" data-key="silicon_target">
                        ${this.siliconTargets.map(t => `<option value="${t}" ${node.config.silicon_target === t ? 'selected' : ''}>${t}</option>`).join('')}
                    </select>
                </div>
            `;
        }

        const handledKeys = new Set(['interface', 'af_xdp_mode', 'tpm_attested', 'plugin_id', 'package_id', 'model_id', 'silicon_target']);
        const standardFields = Object.entries(node.config || {})
            .filter(([k]) => !handledKeys.has(k))
            .map(([k, v]) => `
                <div class="inspector-field">
                    <span class="inspector-label">${this.escapeHtml(k.replace(/_/g, ' '))}</span>
                    <input class="inspector-input config-field" data-key="${this.escapeHtml(k)}" value="${this.escapeHtml(v)}" />
                </div>
            `).join('');

        container.innerHTML = `
            <div class="inspector-field">
                <span class="inspector-label">Stage Component Name</span>
                <input class="inspector-input" id="inp-node-title" value="${this.escapeHtml(node.title)}" />
            </div>
            <div class="inspector-field">
                <span class="inspector-label">Pipeline Subtitle</span>
                <input class="inspector-input" id="inp-node-sub" value="${this.escapeHtml(node.sub)}" />
            </div>
            <div style="border-top:1px solid #1E293B; margin: 8px 0;"></div>
            <div style="font-weight:700; color:#00F0FF; font-size:10px; margin-bottom:4px;">STAGE SPECIFICATIONS:</div>
            ${specializedHtml}
            ${standardFields}
        `;

        document.getElementById('inp-node-title')?.addEventListener('input', (e) => {
            node.title = e.target.value;
            const el = document.getElementById(`node-${node.id}`);
            if (el) el.querySelector('.graph-node-title').textContent = node.title;
        });

        document.getElementById('inp-node-sub')?.addEventListener('input', (e) => {
            node.sub = e.target.value;
            const el = document.getElementById(`node-${node.id}`);
            if (el) el.querySelector('.graph-node-sub').textContent = node.sub;
        });

        document.getElementById('chk-tpm')?.addEventListener('change', (e) => {
            node.config.tpm_attested = e.target.checked ? 'true' : 'false';
        });

        container.querySelectorAll('.config-select').forEach(sel => {
            sel.addEventListener('change', (e) => {
                node.config[e.target.getAttribute('data-key')] = e.target.value;
            });
        });

        container.querySelectorAll('.config-field').forEach(inp => {
            inp.addEventListener('input', (e) => {
                node.config[e.target.getAttribute('data-key')] = e.target.value;
            });
        });
    }

    validateDag() {
        const hasIngest = this.engine.nodes.some(n => n.inputs.length === 0);
        if (!hasIngest) {
            alert('[-] DAG Validation Error: Pipeline requires an ingress source node.');
            return false;
        }
        const dissectorNodes = this.engine.nodes.filter(n => n.config.plugin_id !== undefined || n.config.package_id !== undefined);
        const modelNodes = this.engine.nodes.filter(n => n.config.model_id !== undefined);

        alert(`[✓] Blueprint DAG Validated!\n` +
              `• Target Sentry: ${this.selectedContextNode?.identifier || 'Custom'}\n` +
              `• Pipeline Stages: ${this.engine.nodes.length} nodes (${this.engine.connections.length} links)\n` +
              `• Tier-1 Dissectors: ${dissectorNodes.length} | Tier-2 ONNX Models: ${modelNodes.length}`);
        return true;
    }

    generateModelRoutesYaml() {
        const ingest = this.engine.nodes.find(n => n.config.interface !== undefined);
        const tier1 = this.engine.nodes.find(n => n.config.plugin_id !== undefined || n.config.package_id !== undefined);
        const modelNodes = this.engine.nodes.filter(n => n.config.model_id !== undefined);
        const fusionNodes = this.engine.nodes.filter(n => n.config.correlation_id !== undefined);

        const sensorId = ingest?.config?.sensor_id || 'sensor_nic_0';
        const driverMode = ingest?.config?.af_xdp_mode === 'ZEROCOPY' ? 'AF_XDP_UMEM' : 'AF_XDP_SKB';

        const lines = [
            `# Compiled by Sentinel Nexus Blueprint Studio (${new Date().toISOString()})`,
            `routes:`,
            `  - sensor_id: ${sensorId}`,
            `    sensor_type: EDGE_INGRESS`,
            `    driver_mode: ${driverMode}`,
            `    match:`,
            `      port: ${tier1?.config?.port || 0}`,
            `      transport: ${tier1?.config?.transport || 'udp'}`,
            `      package_id: ${tier1?.config?.package_id || ''}`,
            `      plugin_id: ${tier1?.config?.plugin_id || ''}`,
            `      execution_mode: CASCADE_SHORT_CIRCUIT`
        ];

        modelNodes.forEach(m => {
            lines.push(`      model_id: ${m.config.model_id || ''}`);
            lines.push(`      silicon_target: ${m.config.silicon_target || 'INTEL_OPENVINO'}`);
            lines.push(`      format: ONNX`);
            lines.push(`      precision: ${m.config.precision || 'INT8'}`);
            lines.push(`      latency_budget_ns: ${tier1?.config?.latency_budget_ns || 20000}`);
            lines.push(`      threshold_drop: ${m.config.threshold_drop || 0.85}`);
        });

        if (fusionNodes.length > 0) {
            lines.push('');
            lines.push('fusion_rules:');
            fusionNodes.forEach(f => {
                lines.push(`  - correlation_id: ${f.config.correlation_id}`);
                lines.push(`    cyber_sensor_id: ${f.config.cyber_sensor_id || sensorId}`);
                lines.push(`    cyber_max_score: ${f.config.cyber_max_score || '0.20'}`);
                lines.push(`    physical_sensor_id: ${f.config.physical_sensor_id || ''}`);
                lines.push(`    physical_min_temp: ${f.config.physical_min_temp || '45.0'}`);
                lines.push(`    action: ${f.config.action || 'KERNEL_DROP_AND_ISOLATE'}`);
            });
        }

        return lines.join('\n') + '\n';
    }

    exportYaml() {
        const yaml = this.generateModelRoutesYaml();
        const blob = new Blob([yaml], { type: 'text/yaml' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'model_routes.yaml';
        a.click();
        URL.revokeObjectURL(url);
    }

    packBlueprint(embedMode = false) {
        const defaultSlug = (this.selectedContextNode?.site || this.selectedContextNode?.identifier || 'edge_blueprint')
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, '_')
            .replace(/^_+|_+$/g, '');
        const name = prompt('Enter Blueprint Name for Packaging:', defaultSlug);
        if (!name) return;

        const cmd = embedMode
            ? `aryo blueprint pack ${name} --embed`
            : `aryo blueprint pack ${name}`;

        navigator.clipboard?.writeText(cmd).catch(() => {});
        alert(`[+] Packaging Command:\n${cmd}`);
    }

    async deployToLocalEdge() {
        if (!this.validateDag()) return;
        const yaml = this.generateModelRoutesYaml();

        try {
            const res = await fetch('/api/v1/blueprints/deploy', {
                method: 'POST',
                headers: { 'Content-Type': 'text/yaml' },
                body: yaml
            });
            const data = await res.json();
            alert(`[+] Blueprint Stage Response (${data.status}):\nPath: ${data.path}\nBytes: ${data.bytes}`);
        } catch (e) {
            alert(`[-] Stage deployment failed: ${e.message}`);
        }
    }

    async rollbackBackup() {
        if (!confirm('Revert staged model_routes.yaml to previous backup?')) return;
        try {
            const res = await fetch('/api/v1/blueprints/rollback', { method: 'POST' });
            const data = await res.json();
            alert(`[+] Rollback Status: ${data.status}\n${data.message || data.path || ''}`);
        } catch (e) {
            alert(`[-] Rollback failed: ${e.message}`);
        }
    }

    escapeHtml(str) {
        if (typeof str !== 'string') return String(str || '');
        return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    }
}