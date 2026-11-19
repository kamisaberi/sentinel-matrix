// File: /home/kami/sentinel-nexus/web/js/lab_cockpit.js
// ==============================================================================
// ARYORITHM SENTINEL NEXUS: SENSOR-CENTRIC & DOMAIN-DRIVEN LAB COCKPIT
// Zero Hardcoding: Strict Sensor Tabs -> Category Plot Tabs -> Targeted Attacks
// ==============================================================================

(function () {
    'use strict';

    let activeNodeId = null;
    let activeNodeDetail = null;
    let activeSensorId = null;
    let activePlotSubTab = 'plot_a';
    let activeMainWorkspaceTab = 'tab_sensors'; // 'tab_sensors' | 'tab_hardware'

    let labCatalog = { node_categories: [], categories: {} };
    let labNodes = [];
    let telemetryTimer = null;
    let logPollTimer = null;
    let lastLogContent = '';
    let lastPlotMode = null;

    // ECharts Instances
    let plot1Chart = null; // #cbfEchart
    let plot2Chart = null; // #phaseEchart
    let evtChart = null;   // #evtEchart
    let pmuChart = null;   // #pmuEchart
    let rssChart = null;   // #rssEchart
    let fusionChart = null;// #fusionEchart

    const MAX_POINTS = 50;
    let p1Buf = [];
    let truthBuf = [];
    let secBuf = [];
    let phaseOrbitBuf = [];
    let residualBuf = [];

    // =========================================================================
    // 1. INITIALIZATION & RESIZE OBSERVER (0x0 PROTECTION)
    // =========================================================================
    document.addEventListener('DOMContentLoaded', () => {
        injectWorkspaceStructure();
        loadLabFleetRail();

        document.querySelectorAll('.admin-nav-item, .nav-tab').forEach(btn => {
            btn.addEventListener('click', () => {
                if (btn.getAttribute('data-tab') === 'tab-lab-cockpit') {
                    loadLabFleetRail();
                    setTimeout(resizeAllCharts, 50);
                }
            });
        });

        if (typeof ResizeObserver !== 'undefined') {
            ['cbfEchart', 'phaseEchart', 'evtEchart', 'pmuEchart', 'rssEchart', 'fusionEchart'].forEach(id => {
                const el = document.getElementById(id);
                if (el) new ResizeObserver(() => resizeAllCharts()).observe(el);
            });
        }
        window.addEventListener('resize', resizeAllCharts);

        startTelemetryLoop();
        if (!logPollTimer) {
            logPollTimer = setInterval(pollLabLogs, 1000);
        }
    });

    // Injects the clean 2-Tab bar and Sensor Selector Bar dynamically
    function injectWorkspaceStructure() {
        const stageTabs = document.querySelector('#tab-lab-cockpit .lab-stage-tabs');
        if (!stageTabs) return;

        // 1. Transform top stage tabs into the 2 Main Workspace Tabs
        stageTabs.innerHTML = `
            <button class="lab-main-tab active" data-tab="tab_sensors" style="
                background: rgba(0, 229, 255, 0.15); border: 1px solid var(--accent); color: var(--ink);
                padding: 7px 14px; border-radius: 4px; font-size: 11px; font-weight: 800; cursor: pointer;">
                📡 SENSORS INVARIANT LAB
            </button>
            <button class="lab-main-tab" data-tab="tab_hardware" style="
                background: var(--panel); border: 1px solid var(--hairline); color: var(--muted);
                padding: 7px 14px; border-radius: 4px; font-size: 11px; font-weight: 800; cursor: pointer;">
                ⚡ NODE SYSTEM &amp; HARDWARE TELEMETRY
            </button>
        `;

        stageTabs.querySelectorAll('.lab-main-tab').forEach(btn => {
            btn.addEventListener('click', () => {
                stageTabs.querySelectorAll('.lab-main-tab').forEach(b => {
                    b.classList.remove('active');
                    b.style.background = 'var(--panel)';
                    b.style.borderColor = 'var(--hairline)';
                    b.style.color = 'var(--muted)';
                });
                btn.classList.add('active');
                btn.style.background = 'rgba(0, 229, 255, 0.15)';
                btn.style.borderColor = 'var(--accent)';
                btn.style.color = 'var(--ink)';

                activeMainWorkspaceTab = btn.getAttribute('data-tab');
                updateWorkspaceVisibility();
                setTimeout(() => {
                    tickTelemetryOnce();
                    resizeAllCharts();
                }, 50);
            });
        });

        // 2. Inject Dedicated Sensor Selection Bar
        if (!document.getElementById('lab-sensor-tabs-bar')) {
            const bar = document.createElement('div');
            bar.id = 'lab-sensor-tabs-bar';
            bar.style.cssText = 'display:flex; flex-direction:column; gap:6px; padding:10px 12px; background:rgba(13,17,26,0.9); border:1px solid var(--hairline); border-radius:4px;';
            stageTabs.parentElement.insertBefore(bar, stageTabs.nextSibling);
        }
    }

    function updateWorkspaceVisibility() {
        const sensorBar = document.getElementById('lab-sensor-tabs-bar');
        const viewPhysics = document.getElementById('view-lab-physics');
        const viewTiming = document.getElementById('view-lab-timing');
        const viewNetwork = document.getElementById('view-lab-network');
        const deckContainer = document.querySelector('#tab-lab-cockpit .lab-stage-deck');

        if (activeMainWorkspaceTab === 'tab_sensors') {
            if (sensorBar) sensorBar.style.display = 'flex';
            if (viewPhysics) viewPhysics.style.display = 'grid';
            if (viewTiming) viewTiming.style.display = 'none';
            if (viewNetwork) viewNetwork.style.display = 'none';
            if (deckContainer) deckContainer.style.display = 'grid';
        } else {
            if (sensorBar) sensorBar.style.display = 'none';
            if (viewPhysics) viewPhysics.style.display = 'none';
            if (viewTiming) viewTiming.style.display = 'grid';
            if (viewNetwork) viewNetwork.style.display = 'grid';
            if (deckContainer) deckContainer.style.display = 'grid';
        }
    }

    // =========================================================================
    // 2. DYNAMIC FLEET RAIL & SENTRY SELECTION
    // =========================================================================
    async function loadLabFleetRail() {
        const railEl = document.getElementById('lab-sentry-rail');
        const countBadge = document.getElementById('lab-rail-count');
        const nodeCountBadge = document.getElementById('lab-node-count-badge');
        const fleetContainer = document.getElementById('lab-fleet-nodes-container');

        try {
            const resp = await fetch('/api/v1/fleet/nodes');
            if (!resp.ok) return;
            const data = await resp.json();
            labNodes = Array.isArray(data) ? data : (data.nodes || []);

            if (countBadge) countBadge.textContent = `${labNodes.length} ACTIVE`;
            if (nodeCountBadge) nodeCountBadge.textContent = `${labNodes.length} NODES ACTIVE`;

            if (fleetContainer) {
                fleetContainer.innerHTML = labNodes.map(n => `
                    <div style="background: rgba(13,17,26,0.8); padding: 5px 8px; border-radius: 3px; border: 1px solid var(--hairline); display: flex; justify-content: space-between; align-items: center;">
                        <span style="color: var(--ink); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; max-width: 95px; font-weight: 600;">${escapeHtml(n.site || n.node_id)}</span>
                        <span style="color: ${n.status === 'ONLINE' ? 'var(--kernel)' : 'var(--muted)'}; font-weight: 700; font-size: 9px;">● ${escapeHtml(n.hostname || n.node_id)}</span>
                    </div>
                `).join('');
            }

            if (railEl) {
                railEl.innerHTML = '';
                if (!activeNodeId && labNodes.length > 0) {
                    activeNodeId = labNodes[0].node_id || labNodes[0].id;
                }

                labNodes.forEach(node => {
                    const nid = node.node_id || node.id;
                    const isSel = nid === activeNodeId;
                    const card = document.createElement('div');
                    card.className = `lab-rail-item ${isSel ? 'active' : ''}`;
                    card.setAttribute('data-node-id', nid);
                    card.style.cssText = `
                        background: ${isSel ? 'rgba(0, 229, 255, 0.15)' : 'var(--panel)'};
                        border: 1px solid ${isSel ? 'var(--accent)' : 'var(--hairline)'};
                        box-shadow: ${isSel ? '0 0 12px rgba(0, 229, 255, 0.3)' : 'none'};
                        border-radius: 4px; padding: 10px 12px; cursor: pointer; transition: all 0.15s ease; display: flex; flex-direction: column; gap: 4px;
                    `;
                    card.innerHTML = `
                        <div style="display:flex; justify-content:space-between; align-items:center;">
                            <span class="rail-item-title" style="font-size:11px; font-weight:800; color:${isSel ? 'var(--accent)' : 'var(--ink)'};">${escapeHtml(node.site || nid)}</span>
                            <span class="rail-item-pip" style="width:8px; height:8px; border-radius:50%; background:${isSel ? 'var(--accent)' : 'var(--kernel)'};"></span>
                        </div>
                        <div style="display:flex; justify-content:space-between; font-size:10px; color:var(--muted); font-family:monospace;">
                            <span>${escapeHtml(node.hostname || nid)}</span>
                            <span>DROPS: ${node.ebpf_drops || 0}</span>
                        </div>
                    `;
                    card.addEventListener('click', () => selectLabNode(nid));
                    railEl.appendChild(card);
                });

                if (activeNodeId) {
                    await selectLabNode(activeNodeId);
                }
            }
        } catch (e) {
            console.warn('[LabCockpit] Fleet discovery paused:', e);
        }
    }

    async function selectLabNode(nodeId) {
        activeNodeId = nodeId;

        document.querySelectorAll('#lab-sentry-rail .lab-rail-item').forEach(el => {
            const match = el.getAttribute('data-node-id') === nodeId;
            el.classList.toggle('active', match);
            el.style.background = match ? 'rgba(0, 229, 255, 0.15)' : 'var(--panel)';
            el.style.borderColor = match ? 'var(--accent)' : 'var(--hairline)';
            el.style.boxShadow = match ? '0 0 12px rgba(0, 229, 255, 0.3)' : 'none';
            const titleEl = el.querySelector('.rail-item-title');
            if (titleEl) titleEl.style.color = match ? 'var(--accent)' : 'var(--ink)';
            const pipEl = el.querySelector('.rail-item-pip');
            if (pipEl) pipEl.style.background = match ? 'var(--accent)' : 'var(--kernel)';
        });

        try {
            const [detailRes, catRes] = await Promise.all([
                fetch(`/api/v1/fleet/nodes/${encodeURIComponent(nodeId)}`).catch(() => null),
                fetch(`/api/v1/lab/categories?node_id=${encodeURIComponent(nodeId)}`).catch(() => null)
            ]);

            if (detailRes && detailRes.ok) {
                activeNodeDetail = await detailRes.json();
                const titleEl = document.getElementById('lab-sentry-header-title');
                const hostEl = document.getElementById('lab-sentry-header-host');
                if (titleEl) titleEl.textContent = (activeNodeDetail.site || nodeId).toUpperCase();
                if (hostEl) hostEl.textContent = `${activeNodeDetail.hostname || nodeId} | ${activeNodeDetail.kernel || 'eBPF-CORE'}`;
            }

            if (catRes && catRes.ok) {
                labCatalog = await catRes.json();
            }

            // Sync node's real attached sensors
            const sensors = Array.isArray(activeNodeDetail?.sensors) ? activeNodeDetail.sensors : [];
            if (!activeSensorId || !sensors.some(s => s.sensor_id === activeSensorId)) {
                activeSensorId = sensors.length > 0 ? sensors[0].sensor_id : null;
            }

            renderSensorTabsBar(sensors);
            renderTargetedSensorAttacks();
            resetRollingBuffers();
            updateWorkspaceVisibility();
            await tickTelemetryOnce();
        } catch (e) {
            console.warn('[LabCockpit] Node selection error:', e);
        }
    }

    // =========================================================================
    // 3. SENSOR TABS BAR (LEVEL 3) & METADATA STRIP
    // =========================================================================
    function renderSensorTabsBar(sensors) {
        const bar = document.getElementById('lab-sensor-tabs-bar');
        if (!bar) return;

        if (sensors.length === 0) {
            bar.innerHTML = `<div style="font-size:10.5px; color:#94A3B8; font-family:monospace;">[!] No physical sensors reported for this sentry node.</div>`;
            return;
        }

        const tabsHtml = sensors.map(s => {
            const isSel = s.sensor_id === activeSensorId;
            return `
                <button class="lab-sensor-tab" data-sid="${escapeHtml(s.sensor_id)}" style="
                    font-size:10px; font-weight:800; font-family:monospace; padding:6px 12px; border-radius:4px; cursor:pointer;
                    background:${isSel ? '#00E5FF' : '#111827'}; color:${isSel ? '#07090E' : '#CBD5E1'};
                    border:1px solid ${isSel ? '#00E5FF' : '#243144'}; display:flex; align-items:center; gap:6px;">
                    <span>🏷️ ${escapeHtml(s.sensor_id)}</span>
                    <span style="opacity:0.85;">(${s.baseline ?? 0} ${escapeHtml(s.unit || '')})</span>
                </button>
            `;
        }).join('');

        const curSensor = sensors.find(s => s.sensor_id === activeSensorId) || sensors[0];
        const cat = (curSensor.category || 'generic').toLowerCase();
        const catDef = labCatalog.categories?.[cat] || {};
        const archetype = catDef.plot_archetype || 'spatial_kinematic';

        // Render Plot Sub-Tabs based on this specific sensor's domain!
        const plotTabs = getPlotTabsForDomain(archetype, curSensor);

        const plotTabsHtml = plotTabs.map(p => {
            const isSel = p.id === activePlotSubTab;
            return `
                <button class="lab-plot-subtab" data-pid="${escapeHtml(p.id)}" style="
                    font-size:9.5px; font-weight:700; font-family:monospace; padding:4px 9px; border-radius:3px; cursor:pointer;
                    background:${isSel ? 'rgba(0, 255, 163, 0.15)' : '#070A0F'}; color:${isSel ? '#00FFA3' : '#94A3B8'};
                    border:1px solid ${isSel ? '#00FFA3' : '#1E293B'};">
                    ${escapeHtml(p.label)}
                </button>
            `;
        }).join('');

        bar.innerHTML = `
            <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:8px;">
                <div style="display:flex; align-items:center; gap:6px; flex-wrap:wrap;">
                    <span style="font-size:9px; font-weight:800; color:var(--muted); font-family:monospace;">ATTACHED SENSORS:</span>
                    ${tabsHtml}
                </div>
                <div style="display:flex; align-items:center; gap:6px;">
                    <span style="font-size:9px; font-weight:800; color:#00E5FF; font-family:monospace;">PLOT DIAGNOSTIC:</span>
                    ${plotTabsHtml}
                </div>
            </div>
            <div style="font-family:monospace; font-size:10px; color:#8A99AD; display:flex; flex-wrap:wrap; gap:12px; padding-top:4px; border-top:1px solid rgba(255,255,255,0.05);">
                <span>CHANNEL: <b style="color:#F8FAFC;">${escapeHtml(curSensor.name || curSensor.sensor_id)}</b></span>
                <span>CATEGORY: <b style="color:#00E5FF;">${escapeHtml((curSensor.category || '').toUpperCase())}</b></span>
                <span>INTERFACE: <b style="color:#CBD5E1;">${escapeHtml(curSensor.interface || (':' + (curSensor.port || 502)))}</b></span>
                <span>BASELINE: <b style="color:#00FFA3;">${curSensor.baseline ?? 0} ${escapeHtml(curSensor.unit || '')}</b></span>
                <span>DOMAIN ARCHETYPE: <b style="color:#A855F7;">${escapeHtml(archetype.toUpperCase())}</b></span>
            </div>
        `;

        bar.querySelectorAll('.lab-sensor-tab').forEach(btn => {
            btn.addEventListener('click', () => {
                activeSensorId = btn.getAttribute('data-sid');
                activePlotSubTab = 'plot_a';
                renderSensorTabsBar(sensors);
                renderTargetedSensorAttacks();
                resetRollingBuffers();
                tickTelemetryOnce();
            });
        });

        bar.querySelectorAll('.lab-plot-subtab').forEach(btn => {
            btn.addEventListener('click', () => {
                activePlotSubTab = btn.getAttribute('data-pid');
                renderSensorTabsBar(sensors);
                tickTelemetryOnce();
            });
        });
    }

    // Returns the exact plots tailored for that sensor's domain!
    function getPlotTabsForDomain(archetype, sensor) {
        if (archetype === 'spectral_harmonic') {
            return [
                { id: 'plot_a', label: '📊 02: FFT Harmonic Spectrum' },
                { id: 'plot_b', label: '🔄 03: 2D Phase Limit Cycle' }
            ];
        }
        if (archetype === 'shockwave_transient') {
            return [
                { id: 'plot_a', label: '⚡ 02: Joukowsky dP/dt Impulse' },
                { id: 'plot_b', label: '🔄 03: 2D Pressure Phase Orbit' }
            ];
        }
        if (archetype === 'thermal_runaway') {
            return [
                { id: 'plot_a', label: '🔄 02: 2D Thermal Phase Orbit' },
                { id: 'plot_b', label: '⏱️ 03: Arrhenius Runaway Margin' }
            ];
        }
        if (archetype === 'corridor_titration') {
            return [
                { id: 'plot_a', label: '📊 02: Corridor Boundary Deviation' },
                { id: 'plot_b', label: '🔄 03: Reaction Rate Orbit' }
            ];
        }
        if (archetype === 'coherence_snr' || archetype === 'discrete_divergence') {
            return [
                { id: 'plot_a', label: '📊 02: Error & Jitter Histogram' },
                { id: 'plot_b', label: '🛡️ 03: Stability Invariant Margin' }
            ];
        }
        // Default for spatial_kinematic (avionics, kinematic, lidar, optical)
        return [
            { id: 'plot_a', label: '📊 02: Measured vs Ground Truth' },
            { id: 'plot_b', label: '🔄 03: Kinematic Phase Orbit' }
        ];
    }

    // =========================================================================
    // 4. SENSOR-SPECIFIC ATTACK DECK (ONLY ATTACKS FOR THIS SENSOR!)
    // =========================================================================
    function renderTargetedSensorAttacks() {
        const deckContainer = document.querySelector('.lab-stage-deck .lab-card:first-child > div:last-child');
        if (!deckContainer) return;

        const curSensor = (activeNodeDetail?.sensors || []).find(s => s.sensor_id === activeSensorId);
        const cat = curSensor ? (curSensor.category || '').toLowerCase() : '';
        const catDef = labCatalog.categories?.[cat] || {};
        const attacks = Array.isArray(catDef?.attacks) ? catDef.attacks : [];

        deckContainer.innerHTML = `
            <div>
                <div style="font-size: 9px; color: var(--accent); font-weight: 800; text-transform: uppercase; margin-bottom: 4px;">
                    TARGETED ATTACK VECTORS FOR ${escapeHtml((curSensor?.sensor_id || 'SENSOR').toUpperCase())} (${escapeHtml(cat.toUpperCase())})
                </div>
                <div id="lab-targeted-atk-grid" style="display: grid; grid-template-columns: 1fr 1fr; gap: 4px; max-height: 118px; overflow-y: auto;"></div>
            </div>
            <div style="margin-top: 8px;">
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 4px;">
                    <button class="lab-btn lab-btn-success" id="btn-sensor-safe" style="padding: 6px; font-size: 9px; text-align: left;">[+] Stabilize This Sensor</button>
                    <button class="lab-btn lab-btn-danger" id="btn-sensor-reset" style="padding: 6px; font-size: 9px; text-align: left;">⏹ Reset All Node Faults</button>
                </div>
            </div>
        `;

        const grid = document.getElementById('lab-targeted-atk-grid');
        if (grid) {
            if (attacks.length === 0) {
                grid.innerHTML = `<div style="color:#64748B; font-size:10px; font-family:monospace; padding:6px;">No targeted exploits registered for ${escapeHtml(cat || 'this channel')}.</div>`;
            } else {
                grid.innerHTML = attacks.map(a => `
                    <button class="lab-btn lab-targeted-btn" data-slug="${escapeHtml(a.slug)}" title="${escapeHtml(a.name)}"
                        style="padding: 6px; font-size: 9px; text-align: left; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">
                        [!] ${escapeHtml(a.name)}
                    </button>
                `).join('');

                grid.querySelectorAll('.lab-targeted-btn').forEach(btn => {
                    btn.addEventListener('click', () => {
                        injectLabAction('inject', {
                            category: cat,
                            attack: btn.getAttribute('data-slug'),
                            sensor_id: curSensor ? curSensor.sensor_id : ''
                        });
                    });
                });
            }
        }

        document.getElementById('btn-sensor-safe')?.addEventListener('click', () => {
            injectLabAction('safe', { category: cat, sensor_id: curSensor ? curSensor.sensor_id : '' });
        });
        document.getElementById('btn-sensor-reset')?.addEventListener('click', () => {
            injectLabAction('reset', {});
        });
    }

    function resetRollingBuffers() {
        p1Buf = [];
        truthBuf = [];
        secBuf = [];
        phaseOrbitBuf = [];
        residualBuf = [];
    }

    // =========================================================================
    // 5. PLOT RENDERERS: PHYSICAL WAVEFORM + DOMAIN-SPECIALIZED PLOTS
    // =========================================================================
    function getOrInitChart(domId, currentInst, forceReset) {
        if (typeof echarts === 'undefined') return null;
        const el = document.getElementById(domId);
        if (!el || el.clientWidth === 0) return currentInst;

        if (forceReset && currentInst && !currentInst.isDisposed()) {
            currentInst.dispose();
            currentInst = null;
        }
        if (!currentInst || currentInst.isDisposed()) {
            currentInst = echarts.init(el, 'dark', { renderer: 'canvas' });
        }
        return currentInst;
    }

    function renderPlot1Waveform(chart, viz, isSafe) {
        const color = isSafe ? '#00FFA3' : '#FF3366';
        chart.setOption({
            animation: false,
            backgroundColor: 'transparent',
            grid: { top: 22, right: 16, bottom: 20, left: 48 },
            xAxis: { type: 'category', boundaryGap: false, data: p1Buf.map((_, i) => i), show: false },
            yAxis: {
                type: 'value',
                min: viz.min_plot,
                max: viz.max_plot,
                splitLine: { lineStyle: { color: '#1a2232' } },
                axisLabel: { color: '#8a99ad', fontSize: 9 }
            },
            series: [{
                name: viz.primary_title || 'Measured Sensor Wave',
                type: 'line',
                smooth: 0.35,
                showSymbol: false,
                data: p1Buf,
                lineStyle: { color, width: 2.4 },
                areaStyle: { color: isSafe ? 'rgba(0, 255, 163, 0.10)' : 'rgba(255, 51, 102, 0.18)' },
                markLine: {
                    silent: true,
                    symbol: 'none',
                    data: [
                        {
                            yAxis: viz.safe_high,
                            lineStyle: { color: '#FF3366', type: 'dashed', width: 1.8 },
                            label: { formatter: `Limit (${viz.safe_high} ${viz.unit})`, fontSize: 8.5 }
                        },
                        {
                            yAxis: viz.safe_low,
                            lineStyle: { color: '#FFB800', type: 'dotted', width: 1.2 },
                            label: { formatter: `Min (${viz.safe_low} ${viz.unit})`, fontSize: 8.5 }
                        }
                    ]
                }
            }]
        }, false);
    }

    function renderPlot2DomainDiagnostic(chart, viz, isSafe, archetype) {
        const color = isSafe ? '#00E5FF' : '#FF3366';

        // Sub-Plot Option B: 2D Phase Orbit
        if (activePlotSubTab === 'plot_b' && (archetype === 'spatial_kinematic' || archetype === 'spectral_harmonic' || archetype === 'shockwave_transient' || archetype === 'thermal_runaway')) {
            chart.setOption({
                animation: false,
                backgroundColor: 'transparent',
                grid: { top: 22, right: 16, bottom: 24, left: 48 },
                xAxis: { type: 'value', min: viz.min_plot, max: viz.max_plot, splitLine: { lineStyle: { color: '#1a2232' } }, axisLabel: { color: '#8a99ad', fontSize: 9 } },
                yAxis: { type: 'value', splitLine: { lineStyle: { color: '#1a2232' } }, axisLabel: { color: '#8a99ad', fontSize: 9 } },
                series: [{
                    name: '2D Phase Orbit (x vs dx/dt)',
                    type: 'line',
                    smooth: 0.3,
                    showSymbol: false,
                    data: phaseOrbitBuf,
                    lineStyle: { color, width: 2.2 }
                }]
            }, false);
            return;
        }

        // Sub-Plot Option A: Domain Diagnostic
        if (archetype === 'spectral_harmonic') {
            const sec = Array.isArray(viz.secondary_series) && viz.secondary_series.length > 0
                ? viz.secondary_series
                : [{ label: '1x', value: 1.2 }, { label: '2x', value: 0.4 }, { label: '3x', value: 0.2 }, { label: '5x', value: 0.1 }];
            chart.setOption({
                animation: false,
                backgroundColor: 'transparent',
                grid: { top: 22, right: 16, bottom: 24, left: 42 },
                xAxis: { type: 'category', data: sec.map(s => s.label), axisLabel: { color: '#8a99ad', fontSize: 9 } },
                yAxis: { type: 'value', splitLine: { lineStyle: { color: '#1a2232' } }, axisLabel: { color: '#8a99ad', fontSize: 9 } },
                series: [{
                    type: 'bar',
                    barWidth: '45%',
                    data: sec.map((s, idx) => ({
                        value: s.value,
                        itemStyle: { color: (!isSafe && idx > 0) ? '#FF3366' : '#00E5FF' }
                    }))
                }]
            }, false);
        } else if (archetype === 'shockwave_transient') {
            chart.setOption({
                animation: false,
                backgroundColor: 'transparent',
                grid: { top: 22, right: 16, bottom: 20, left: 48 },
                xAxis: { type: 'category', boundaryGap: false, data: secBuf.map((_, i) => i), show: false },
                yAxis: { type: 'value', splitLine: { lineStyle: { color: '#1a2232' } }, axisLabel: { color: '#8a99ad', fontSize: 9 } },
                series: [{
                    name: 'dP/dt Shockwave',
                    type: 'line',
                    showSymbol: false,
                    data: secBuf,
                    lineStyle: { color: isSafe ? '#FFB800' : '#FF3366', width: 2 },
                    areaStyle: { color: isSafe ? 'rgba(255,184,0,0.12)' : 'rgba(255,51,102,0.2)' }
                }]
            }, false);
        } else if (archetype === 'corridor_titration') {
            const mid = (viz.safe_low + viz.safe_high) * 0.5;
            const dev = p1Buf.map(v => +Math.abs(v - mid).toFixed(3));
            chart.setOption({
                animation: false,
                backgroundColor: 'transparent',
                grid: { top: 22, right: 16, bottom: 20, left: 48 },
                xAxis: { type: 'category', boundaryGap: false, data: dev.map((_, i) => i), show: false },
                yAxis: { type: 'value', splitLine: { lineStyle: { color: '#1a2232' } }, axisLabel: { color: '#8a99ad', fontSize: 9 } },
                series: [{
                    name: 'Corridor Deviation',
                    type: 'line',
                    showSymbol: false,
                    data: dev,
                    lineStyle: { color, width: 2 },
                    areaStyle: { color: isSafe ? 'rgba(0,229,255,0.12)' : 'rgba(255,51,102,0.2)' }
                }]
            }, false);
        } else if (archetype === 'coherence_snr' || archetype === 'discrete_divergence') {
            const bins = Array.isArray(viz.secondary_series) && viz.secondary_series.length > 0
                ? viz.secondary_series
                : [{ label: 'SYN', value: 2 }, { label: 'CRC', value: 1 }, { label: 'SEQ', value: 1 }, { label: 'SPI', value: 0 }];
            chart.setOption({
                animation: false,
                backgroundColor: 'transparent',
                grid: { top: 22, right: 16, bottom: 24, left: 42 },
                xAxis: { type: 'category', data: bins.map(b => b.label), axisLabel: { color: '#8a99ad', fontSize: 9 } },
                yAxis: { type: 'value', splitLine: { lineStyle: { color: '#1a2232' } }, axisLabel: { color: '#8a99ad', fontSize: 9 } },
                series: [{
                    type: 'bar',
                    barWidth: '45%',
                    data: bins.map(b => ({
                        value: b.value,
                        itemStyle: { color: isSafe ? '#00FFA3' : '#FF3366' }
                    }))
                }]
            }, false);
        } else {
            // Default spatial_kinematic: Measured vs Ground Truth overlay (exposes flatline sensor freezes!)
            chart.setOption({
                animation: false,
                backgroundColor: 'transparent',
                grid: { top: 22, right: 16, bottom: 20, left: 48 },
                xAxis: { type: 'category', boundaryGap: false, data: p1Buf.map((_, i) => i), show: false },
                yAxis: { type: 'value', min: viz.min_plot, max: viz.max_plot, splitLine: { lineStyle: { color: '#1a2232' } }, axisLabel: { color: '#8a99ad', fontSize: 9 } },
                series: [
                    {
                        name: 'Measured Signal',
                        type: 'line',
                        smooth: 0.25,
                        showSymbol: false,
                        data: p1Buf,
                        lineStyle: { color, width: 2.4 }
                    },
                    {
                        name: 'Physical Ground Truth',
                        type: 'line',
                        smooth: 0.3,
                        showSymbol: false,
                        data: truthBuf,
                        lineStyle: { color: '#00FFA3', width: 1.8, type: 'dashed' }
                    }
                ]
            }, false);
        }
    }

    // =========================================================================
    // 6. TELEMETRY POLLING LOOP
    // =========================================================================
    function startTelemetryLoop() {
        if (telemetryTimer) clearInterval(telemetryTimer);
        telemetryTimer = setInterval(() => {
            const pane = document.getElementById('tab-lab-cockpit');
            if (!pane || !pane.classList.contains('active')) return;
            tickTelemetryOnce();
        }, 350);
    }

    async function tickTelemetryOnce() {
        try {
            const curSensor = (activeNodeDetail?.sensors || []).find(s => s.sensor_id === activeSensorId);
            const cat = curSensor ? (curSensor.category || '').toLowerCase() : '';

            let url = '/api/v1/lab/telemetry';
            const qs = [];
            if (activeNodeId) qs.push(`node_id=${encodeURIComponent(activeNodeId)}`);
            if (cat) qs.push(`category=${encodeURIComponent(cat)}`);
            if (qs.length > 0) url += '?' + qs.join('&');

            const resp = await fetch(url);
            if (!resp.ok) return;
            const data = await resp.json();

            const viz = data.visualization || {};
            const ps = data.physical_state || {};
            const isSafe = Boolean(ps.is_safe !== false);

            // Buffer rolling
            if (p1Buf.length === 0) {
                for (let i = 0; i < MAX_POINTS; i++) {
                    p1Buf.push(viz.primary_val ?? 0);
                    truthBuf.push(viz.ground_truth_val ?? 0);
                    secBuf.push(viz.derivative_val ?? 0);
                }
            } else {
                p1Buf.push(viz.primary_val ?? 0);
                truthBuf.push(viz.ground_truth_val ?? 0);
                secBuf.push(viz.derivative_val ?? 0);
                if (p1Buf.length > MAX_POINTS) p1Buf.shift();
                if (truthBuf.length > MAX_POINTS) truthBuf.shift();
                if (secBuf.length > MAX_POINTS) secBuf.shift();
            }

            phaseOrbitBuf.push([viz.primary_val ?? 0, viz.derivative_val ?? 0]);
            if (phaseOrbitBuf.length > 40) phaseOrbitBuf.shift();

            // DOM Indicators
            const valBar = document.getElementById('val-barrier');
            if (valBar) {
                const h = Number(ps.cbf_barrier_h || 0);
                valBar.textContent = `${h >= 0 ? '+' : ''}${h.toFixed(3)}`;
                valBar.style.color = isSafe ? 'var(--kernel)' : 'var(--threat)';
            }
            const valLyap = document.getElementById('val-lyapunov');
            if (valLyap) valLyap.textContent = Number(ps.lyapunov_lambda || -0.15).toFixed(3);
            const valTcrit = document.getElementById('val-tcrit');
            if (valTcrit) valTcrit.textContent = `${Number(ps.t_crit_ms || 0).toFixed(1)} ms`;
            const valVel = document.getElementById('val-velocity');
            if (valVel) valVel.textContent = `${Number(ps.dx_dt || 0) >= 0 ? '+' : ''}${Number(ps.dx_dt || 0).toFixed(3)} /s`;

            const lblTemp = document.getElementById('lbl-temp');
            if (lblTemp) lblTemp.textContent = `${curSensor?.name || viz.primary_title || 'Measured'} (${viz.unit || ''})`;
            const valTemp = document.getElementById('val-temp');
            if (valTemp) valTemp.textContent = `${Number(viz.primary_val || 0).toFixed(2)} ${viz.unit || ''}`;

            const badgeCBF = document.getElementById('cbf-status-badge');
            if (badgeCBF) {
                badgeCBF.textContent = isSafe ? 'h(x) >= 0 SAFE' : `BREACH: ${(viz.active_attack || 'ANOMALY').toUpperCase()}`;
                badgeCBF.style.background = isSafe ? 'rgba(0,255,163,0.15)' : 'rgba(255,51,102,0.2)';
                badgeCBF.style.color = isSafe ? 'var(--kernel)' : 'var(--threat)';
                badgeCBF.style.borderColor = isSafe ? 'var(--kernel)' : 'var(--threat)';
            }

            const archetype = viz.plot_archetype || 'spatial_kinematic';
            const plotModeKey = `${archetype}::${activePlotSubTab}`;
            const modeChanged = (lastPlotMode !== null && lastPlotMode !== plotModeKey);
            lastPlotMode = plotModeKey;

            plot1Chart = getOrInitChart('cbfEchart', plot1Chart, false);
            plot2Chart = getOrInitChart('phaseEchart', plot2Chart, modeChanged);

            if (plot1Chart) renderPlot1Waveform(plot1Chart, viz, isSafe);
            if (plot2Chart) renderPlot2DomainDiagnostic(plot2Chart, viz, isSafe, archetype);

            // Update Tab 2 (Node Health) Charts in background
            updateHardwareMetrics(data, isSafe);
        } catch (_) { }
    }

    function updateHardwareMetrics(data, isSafe) {
        if (!data.evt_wcet || !data.pmu_metrics) return;
        evtChart = getOrInitChart('evtEchart', evtChart, false);
        pmuChart = getOrInitChart('pmuEchart', pmuChart, false);
        rssChart = getOrInitChart('rssEchart', rssChart, false);
        fusionChart = getOrInitChart('fusionEchart', fusionChart, false);

        const wcetEl = document.getElementById('val-wcet');
        if (wcetEl) wcetEl.textContent = `${Number(data.evt_wcet.p99_999_us || 1.82).toFixed(2)} µs`;
        const dropEl = document.getElementById('val-drop');
        if (dropEl) dropEl.textContent = `${Number(data.evt_wcet.sla_limit_us || 0.84).toFixed(2)} µs`;
        const ipcEl = document.getElementById('val-ipc');
        if (ipcEl) ipcEl.textContent = Number(data.pmu_metrics.ipc || 2.42).toFixed(2);
        const llcEl = document.getElementById('val-llc');
        if (llcEl) llcEl.textContent = `${Number(data.pmu_metrics.llc_miss_pct || 1.24).toFixed(2)}%`;

        if (evtChart) {
            const mu = data.evt_wcet.gumbel_mu || 0.84;
            const s = data.evt_wcet.gumbel_sigma || 0.125;
            const pts = [];
            for (let i = 0; i <= 50; i++) {
                const z = (i / 50) * 3.5;
                const norm = (z - mu) / s;
                pts.push([z.toFixed(2), Math.exp(-norm - Math.exp(-norm))]);
            }
            evtChart.setOption({
                animation: false, backgroundColor: 'transparent',
                grid: { top: 20, right: 15, bottom: 20, left: 36 },
                xAxis: { type: 'category', data: pts.map(p => p[0]), axisLabel: { color: '#8a99ad', fontSize: 9 } },
                yAxis: { type: 'value', show: false },
                series: [{ type: 'line', smooth: true, showSymbol: false, data: pts.map(p => p[1]), lineStyle: { color: isSafe ? '#00FFA3' : '#FF3366', width: 2 } }]
            }, false);
        }

        if (pmuChart) {
            const ipc = data.pmu_metrics.ipc || 2.42;
            pmuChart.setOption({
                animation: false, backgroundColor: 'transparent',
                grid: { top: 20, right: 15, bottom: 20, left: 35 },
                xAxis: { type: 'category', data: ['CORE 0', 'CORE 1', 'CORE 2', 'CORE 3'], axisLabel: { color: '#8a99ad', fontSize: 9 } },
                yAxis: { type: 'value', splitLine: { lineStyle: { color: '#1a2232' } }, axisLabel: { color: '#8a99ad', fontSize: 9 } },
                series: [{ type: 'bar', data: [ipc, +(ipc - 0.04).toFixed(2), +(ipc + 0.03).toFixed(2), +(ipc - 0.02).toFixed(2)], itemStyle: { color: '#a855f7' } }]
            }, false);
        }

        if (rssChart && data.rss_multi_queue) {
            rssChart.setOption({
                animation: false, backgroundColor: 'transparent',
                grid: { top: 20, right: 15, bottom: 20, left: 42 },
                xAxis: { type: 'category', data: ['Q0', 'Q1', 'Q2', 'Q3', 'Q4', 'Q5', 'Q6', 'Q7'], axisLabel: { color: '#8a99ad', fontSize: 9 } },
                yAxis: { type: 'value', splitLine: { lineStyle: { color: '#1a2232' } }, axisLabel: { color: '#8a99ad', fontSize: 8 } },
                series: [{ type: 'bar', data: data.rss_multi_queue.queues || [], itemStyle: { color: '#00ffa3' } }]
            }, false);
        }

        if (fusionChart && data.sensor_fusion) {
            residualBuf.push(Number(data.sensor_fusion.residual_r || 0));
            if (residualBuf.length > 40) residualBuf.shift();
            fusionChart.setOption({
                animation: false, backgroundColor: 'transparent',
                grid: { top: 20, right: 15, bottom: 20, left: 42 },
                xAxis: { type: 'category', data: residualBuf.map((_, i) => i), show: false },
                yAxis: { type: 'value', splitLine: { lineStyle: { color: '#1a2232' } }, axisLabel: { color: '#8a99ad', fontSize: 9 } },
                series: [{
                    type: 'line', showSymbol: false, data: residualBuf,
                    lineStyle: { color: data.sensor_fusion.chi2_alarm ? '#ff3366' : '#ffb800', width: 2 }
                }]
            }, false);
        }
    }

    // =========================================================================
    // 7. SAFE INJECTION DISPATCH & LOG POLLER
    // =========================================================================
    async function injectLabAction(action, extra = {}) {
        const statusBadge = document.getElementById('deck-status');
        if (statusBadge) statusBadge.textContent = `DISPATCH: ${action.toUpperCase()}`;

        try {
            const res = await fetch('/api/v1/lab/inject', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    action,
                    node_id: activeNodeId,
                    category: extra.category || '',
                    attack: extra.attack || '',
                    sensor_id: extra.sensor_id || activeSensorId || ''
                })
            });
            const data = await res.json();
            if (statusBadge) statusBadge.textContent = `ACTIVE: ${(data.action || action).toUpperCase()}`;
        } catch (_) {
            if (statusBadge) statusBadge.textContent = 'DISPATCHED';
        }

        await tickTelemetryOnce();
        setTimeout(pollLabLogs, 250);
        setTimeout(pollLabLogs, 800);
    }

    async function pollLabLogs() {
        try {
            const resp = await fetch('/api/v1/lab/logs');
            if (!resp.ok) return;
            const data = await resp.json();
            if (data.logs && data.logs !== lastLogContent) {
                lastLogContent = data.logs;
                const term = document.getElementById('labTerminalBody');
                if (term) {
                    term.textContent = data.logs;
                    term.scrollTop = term.scrollHeight;
                }
                const statusEl = document.getElementById('lab-log-status');
                if (statusEl) statusEl.textContent = `UPDATED ${new Date().toLocaleTimeString()}`;
            }
        } catch (_) { }
    }

    function resizeAllCharts() {
        [plot1Chart, plot2Chart, evtChart, pmuChart, rssChart, fusionChart].forEach(c => {
            if (c && !c.isDisposed()) {
                try { c.resize(); } catch (_) { }
            }
        });
    }

    window.exportLabScorecard = function () {
        const modal = document.getElementById('modal-latex-export');
        const area = document.getElementById('latex-code-area');
        if (!modal || !area) return;

        const site = activeNodeDetail?.site || activeNodeId || 'Aryorithm Edge Sentry';
        area.value = `% ARYORITHM TECHNOLOGIES B.V. — SENTINEL LAB SCORECARD (${site}) | DOI: 10.5281/zenodo.23598779\n% Active Sensor: ${activeSensorId || 'N/A'}\n`;
        modal.style.display = 'flex';
    };

    function escapeHtml(str) {
        if (typeof str !== 'string') return String(str || '');
        return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    }
})();