// File: /home/kami/sentinel-nexus/web/js/extensions_manager.js
// ============================================================================
// ARYORITHM SENTINEL NEXUS: SCENARIO-DRIVEN 7-ARTIFACT VAULT MANAGER
// Zero Hardcoding: Discovers Real Artifacts Mounted in Active Scenario
// ============================================================================

class ExtensionsManager {
    constructor() {
        this.dropzone = document.getElementById('spkg-dropzone');
        this.fileInput = document.getElementById('spkg-file-input');
        this.previewCard = document.getElementById('package-preview');
        this.deployBtn = document.getElementById('btn-deploy-fleet');
        this.tableBody = document.getElementById('extensions-tbody');
        this.filterButtons = document.querySelectorAll('.artifact-filter-bar .btn-ctrl');

        this.activeFilter = 'all';
        this.stagedArtifact = null;
        this.artifacts = [];

        this.initEventListeners();
        this.refreshVault();
        setInterval(() => this.refreshVault(), 4000);
    }

    initEventListeners() {
        if (this.dropzone) {
            this.dropzone.addEventListener('dragover', (e) => {
                e.preventDefault();
                this.dropzone.classList.add('drag-hover');
            });
            this.dropzone.addEventListener('dragleave', () => {
                this.dropzone.classList.remove('drag-hover');
            });
            this.dropzone.addEventListener('drop', (e) => {
                e.preventDefault();
                this.dropzone.classList.remove('drag-hover');
                if (e.dataTransfer.files.length > 0) {
                    this.handleFile(e.dataTransfer.files[0]);
                }
            });
        }

        if (this.fileInput) {
            this.fileInput.addEventListener('change', (e) => {
                if (e.target.files.length > 0) {
                    this.handleFile(e.target.files[0]);
                }
            });
        }

        this.filterButtons.forEach(btn => {
            btn.addEventListener('click', () => {
                this.filterButtons.forEach(b => {
                    b.style.background = '#1E293B';
                    b.style.color = '#94A3B8';
                    b.style.border = '1px solid #334155';
                });
                btn.style.background = '#00F0FF';
                btn.style.color = '#0B0F17';
                btn.style.border = 'none';
                this.activeFilter = btn.getAttribute('data-filter') || 'all';
                this.renderTable();
            });
        });

        if (this.deployBtn) {
            this.deployBtn.addEventListener('click', () => this.deployStagedArtifact());
        }

        const refreshBtn = document.getElementById('btn-refresh-ext');
        if (refreshBtn) {
            refreshBtn.addEventListener('click', () => this.refreshVault());
        }

        // Refresh immediately when Artifacts & Vault tab is clicked
        document.querySelectorAll('.admin-nav-item, .nav-tab').forEach(btn => {
            btn.addEventListener('click', () => {
                if (btn.getAttribute('data-tab') === 'tab-extensions') {
                    this.refreshVault();
                }
            });
        });
    }

    async handleFile(file) {
        const name = file.name;
        const headerBytes = new Uint8Array(await file.slice(0, 64).arrayBuffer());
        const magicAscii = Array.from(headerBytes.slice(0, 8))
            .map(b => (b >= 32 && b <= 126 ? String.fromCharCode(b) : '.'))
            .join('');

        let type = 'package';
        let spec = 'Binary Package';
        let badgeColor = '#10B981';
        let sigStatus = 'LOCAL HEADER PARSED';

        if (magicAscii.startsWith('ARYOSPKG')) {
            type = 'package';
            spec = 'ARYOSPKG Container';
            sigStatus = 'MAGIC ARYOSPKG VERIFIED';
        } else if (magicAscii.startsWith('SLAB') || name.endsWith('.slab')) {
            type = 'dataset';
            spec = magicAscii.startsWith('SLAB') ? '0x534C4142 Binary Tensors' : 'Dataset File';
            badgeColor = '#A855F7';
            sigStatus = magicAscii.startsWith('SLAB') ? 'MAGIC SLAB VERIFIED' : 'EXTENSION MATCHED';
        } else if (name.endsWith('.onnx')) {
            type = 'model';
            spec = name.includes('int8') ? 'INT8 ONNX Graph' : 'ONNX Neural Graph';
            badgeColor = '#00F0FF';
            sigStatus = headerBytes.length > 4 ? 'ONNX PROTOBUF PRESENT' : 'EMPTY FILE';
        } else if (name.endsWith('.pcap') || name.endsWith('.pcapng') || name.endsWith('.spcap')) {
            type = 'pcap';
            const isPcapMagic = (headerBytes[0] === 0xd4 && headerBytes[1] === 0xc3) ||
                                (headerBytes[0] === 0xa1 && headerBytes[1] === 0xb2) ||
                                (headerBytes[0] === 0x0a && headerBytes[1] === 0x0d);
            spec = isPcapMagic ? 'PCAP Capture Verified' : 'Packet Capture File';
            badgeColor = '#F59E0B';
            sigStatus = isPcapMagic ? 'PCAP MAGIC VERIFIED' : 'EXTENSION MATCHED';
        } else if (name.endsWith('.tar.gz') || name.endsWith('.tgz')) {
            type = 'scenario';
            const isGzip = headerBytes[0] === 0x1f && headerBytes[1] === 0x8b;
            spec = isGzip ? 'GZIP Scenario Bundle' : 'Scenario Archive';
            badgeColor = '#00B4D8';
            sigStatus = isGzip ? 'GZIP MAGIC VERIFIED' : 'EXTENSION MATCHED';
        } else if (name.endsWith('.blueprint')) {
            type = 'blueprint';
            spec = 'Edge Blueprint Bundle';
            badgeColor = '#EC4899';
        } else if (name.endsWith('.aryopack')) {
            type = 'appliance';
            spec = 'Appliance Bootstrap Pack';
            badgeColor = '#EF4444';
        }

        const fnEl = document.getElementById('prev-filename');
        const typeEl = document.getElementById('prev-type');
        const specEl = document.getElementById('prev-spec');
        const sizeEl = document.getElementById('prev-size');
        const sigEl = document.getElementById('prev-sig');
        const badge = document.getElementById('prev-tier-badge');

        if (fnEl) fnEl.textContent = name;
        if (typeEl) typeEl.textContent = type.toUpperCase();
        if (specEl) specEl.textContent = spec;
        if (sizeEl) sizeEl.textContent = this.formatBytes(file.size);
        if (sigEl) sigEl.textContent = sigStatus;
        if (badge) {
            badge.textContent = type.toUpperCase();
            badge.style.background = badgeColor;
            badge.style.color = '#0B0F17';
        }

        this.stagedArtifact = { file, name, type, spec, size: file.size };
        if (this.previewCard) this.previewCard.classList.remove('hidden');
    }

    async deployStagedArtifact() {
        if (!this.stagedArtifact) return;
        const sigEl = document.getElementById('prev-sig');

        try {
            const resp = await fetch('/api/v1/extensions/deploy', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    rule_name: this.stagedArtifact.name,
                    rule_id: this.stagedArtifact.type.toUpperCase(),
                    spec: this.stagedArtifact.spec,
                    size_bytes: this.stagedArtifact.size
                })
            });
            const result = await resp.json();
            if (sigEl) {
                sigEl.textContent = `${(result.status || 'staged').toUpperCase()} (${result.fanout_latency_ms || 0} ms)`;
            }
            this.artifacts.unshift({
                id: this.stagedArtifact.name,
                type: this.stagedArtifact.type,
                format: this.stagedArtifact.spec,
                target: 'Staged via Console',
                size: this.formatBytes(this.stagedArtifact.size),
                status: 'STAGED'
            });
            this.renderTable();
            this.updateFilterBadges();
        } catch (e) {
            if (sigEl) sigEl.textContent = `DEPLOY ERROR: ${e.message}`;
        }
    }

    async refreshVault() {
        const discovered = [];
        const seen = new Set();

        const addItem = (item) => {
            if (!item || !item.id) return;
            const key = `${item.type || 'unknown'}::${item.id}`;
            if (seen.has(key)) return;
            seen.add(key);
            discovered.push(item);
        };

        try {
            // Primary Source: Unified Backend Scenario Vault Scanner
            const vaultResp = await fetch('/api/v1/vault/inventory');
            if (vaultResp.ok) {
                const vaultItems = await vaultResp.json();
                if (Array.isArray(vaultItems)) {
                    vaultItems.forEach(addItem);
                }
            }
        } catch (_) {
            // Fallback handled below
        }

        // Secondary Enrichment: Active Models, Extensions & Web Plugins
        try {
            const [modelsResp, extResp, manifestResp] = await Promise.all([
                fetch('/api/v1/models').catch(() => null),
                fetch('/api/v1/extensions/status').catch(() => null),
                fetch('/plugins/manifest.json').catch(() => null)
            ]);

            if (modelsResp && modelsResp.ok) {
                const models = await modelsResp.json();
                if (Array.isArray(models)) {
                    models.forEach(m => {
                        addItem({
                            id: m.model_id || m.filename || m.id,
                            type: 'model',
                            format: m.format || 'ONNX Graph',
                            target: m.target || '/opt/sentinel-nexus/models/',
                            size: m.size || (m.size_bytes ? this.formatBytes(m.size_bytes) : 'N/A'),
                            status: m.status || 'STAGED'
                        });
                    });
                }
            }

            if (extResp && extResp.ok) {
                const exts = await extResp.json();
                if (Array.isArray(exts)) {
                    exts.forEach(e => {
                        addItem({
                            id: e.id,
                            type: 'package',
                            format: `${e.tier || 'Native'} (${e.proto || 'WIRE'})`,
                            target: e.latency || 'Runtime',
                            size: e.frames !== undefined ? `${e.frames} pkts` : 'Active',
                            status: e.status || 'ACTIVE'
                        });
                    });
                }
            }

            if (manifestResp && manifestResp.ok) {
                const man = await manifestResp.json();
                if (man && Array.isArray(man.plugins)) {
                    man.plugins.forEach(p => {
                        addItem({
                            id: p.script || p.id,
                            type: 'package',
                            format: 'Micro-Frontend Plugin',
                            target: `/plugins/${p.id}`,
                            size: 'Mounted',
                            status: 'ACTIVE'
                        });
                    });
                }
            }
        } catch (_) {}

        this.artifacts = discovered;
        this.updateFilterBadges();
        this.renderTable();
    }

    updateFilterBadges() {
        const counts = { all: this.artifacts.length, package: 0, model: 0, dataset: 0, pcap: 0, scenario: 0, blueprint: 0, appliance: 0 };
        this.artifacts.forEach(a => {
            if (counts[a.type] !== undefined) counts[a.type]++;
        });

        const labels = {
            all: `ALL (${counts.all})`,
            package: `PACKAGES (${counts.package})`,
            model: `MODELS (${counts.model})`,
            dataset: `DATASETS (${counts.dataset})`,
            pcap: `PCAPS (${counts.pcap})`,
            scenario: `SCENARIOS (${counts.scenario})`,
            blueprint: `BLUEPRINTS (${counts.blueprint})`,
            appliance: `APPLIANCES (${counts.appliance})`
        };

        this.filterButtons.forEach(btn => {
            const f = btn.getAttribute('data-filter');
            if (labels[f]) btn.textContent = labels[f];
        });
    }

    renderTable() {
        if (!this.tableBody) return;

        const filtered = this.activeFilter === 'all'
            ? this.artifacts
            : this.artifacts.filter(a => a.type === this.activeFilter);

        this.tableBody.innerHTML = '';

        if (filtered.length === 0) {
            const tr = document.createElement('tr');
            tr.innerHTML = `<td colspan="6" style="color:#64748B; text-align:center; padding:18px; font-family:monospace;">No ${this.activeFilter === 'all' ? '' : this.activeFilter.toUpperCase() + ' '}artifacts found in the active scenario mounts.</td>`;
            this.tableBody.appendChild(tr);
            return;
        }

        const typeColors = {
            package: '#10B981',
            model: '#00F0FF',
            dataset: '#A855F7',
            pcap: '#F59E0B',
            scenario: '#00B4D8',
            blueprint: '#EC4899',
            appliance: '#EF4444'
        };

        filtered.forEach(art => {
            const tr = document.createElement('tr');
            const typeColor = typeColors[art.type] || '#94A3B8';
            const statusClass = (art.status === 'ACTIVE' || art.status === 'SEALED') ? 'badge-green' : 'badge-cyan';

            tr.innerHTML = `
                <td class="font-mono" style="color: #F8FAFC; font-weight: 700;">${this.escapeHtml(art.id)}</td>
                <td><span style="background: rgba(255,255,255,0.06); border: 1px solid ${typeColor}; color: ${typeColor}; border-radius: 3px; padding: 2px 6px; font-size: 9px; font-weight: 800; font-family: monospace;">${this.escapeHtml((art.type || '').toUpperCase())}</span></td>
                <td style="color: #94A3B8; font-size: 11px;">${this.escapeHtml(art.format || '-')}</td>
                <td style="color: #64748B; font-family: monospace; font-size: 10px;">${this.escapeHtml(art.target || '-')}</td>
                <td style="color: #CBD5E1; font-family: monospace; font-size: 11px;">${this.escapeHtml(art.size || '-')}</td>
                <td><span class="badge ${statusClass}" style="font-size: 9px;">${this.escapeHtml(art.status || 'STAGED')}</span></td>
            `;
            this.tableBody.appendChild(tr);
        });
    }

    formatBytes(bytes) {
        if (!bytes || bytes <= 0) return '0 B';
        if (bytes >= 1024 * 1024) return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
        if (bytes >= 1024) return (bytes / 1024).toFixed(1) + ' KB';
        return bytes + ' B';
    }

    escapeHtml(str) {
        if (typeof str !== 'string') return String(str || '');
        return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    }
}

document.addEventListener('DOMContentLoaded', () => {
    window.extensionsManager = new ExtensionsManager();
});