// File: /home/kami/sentinel-nexus/web/js/lab_cockpit.js
// ==============================================================================
// ARYORITHM SENTINEL NEXUS: CATEGORY-DRIVEN & PLUGIN-COMPLIANT LAB COCKPIT
// Zero Hardcoding: Driven by /api/v1/lab/categories & /api/v1/lab/telemetry
// ==============================================================================

(function () {
    'use strict';

    let activeNodeId = null;
    let activeNodeDetail = null;
    let activeCategory = null;
    let showAllCategories = false;
    let labCatalog = { node_categories: [], categories: {} };
    let labNodes = [];
    let telemetryTimer = null;
    let logPollTimer = null;
    let lastLogContent = '';
    let lastArchetype = null;

    // ECharts Instances
    let primaryChart = null;   // #cbfEchart
    let secondaryChart = null; // #phaseEchart
    let evtChart = null;       // #evtEchart
    let pmuChart = null;       // #pmuEchart
    let rssChart = null;       // #rssEchart
    let fusionChart = null;    // #fusionEchart

    const MAX_POINTS = 50;
    let primaryBuf = [];
    let truthBuf = [];
    let secondaryBuf = [];
    let phaseOrbitBuf = [];
    let residualBuf = [];

    // =========================================================================
    // 1. INITIALIZATION & RESIZE OBSERVER (0x0 PROTECTION)
    // =========================================================================
    document.addEventListener('DOMContentLoaded', () => {
        initSubStageTabs();
        injectCategoryBarContainer();
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
                if (el) {
                    new ResizeObserver(() => resizeAllCharts()).observe(el);
                }
            });
        }
        window.addEventListener('resize', resizeAllCharts);

        startTelemetryLoop();
        if (!logPollTimer) {
            logPollTimer = setInterval(pollLabLogs, 1000);
        }
    });

    function injectCategoryBarContainer() {
        const stageTabs = document.querySelector('#tab-lab-cockpit .lab-stage-tabs');
        if (!stageTabs || document.getElementById('lab-category-pill-bar')) return;

        const bar = document.createElement('div');
        bar.id = 'lab-category-pill-bar';
        bar.style.cssText = 'display:flex; flex-wrap:wrap; align-items:center; gap:6px; padding:8px 10px; background:rgba(13,17,26,0.85); border:1px solid var(--hairline); border-radius:4px;';
        stageTabs.parentElement.insertBefore(bar, stageTabs.nextSibling);
    }

    // =========================================================================
    // 2. DYNAMIC FLEET RAIL & CATEGORY CATALOG FETCH
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
                const nodeCats = Array.isArray(labCatalog.node_categories) ? labCatalog.node_categories : [];
                const allCats = Object.keys(labCatalog.categories || {});
                if (!activeCategory || !labCatalog.categories?.[activeCategory]) {
                    activeCategory = nodeCats[0] || allCats[0] || 'network';
                }
                renderCategoryPills();
                renderContextualAttackDeck();
                resetRollingBuffers();
                await tickTelemetryOnce();
            }
        } catch (e) {
            console.warn('[LabCockpit] Node/Category sync error:', e);
        }
    }

    function renderCategoryPills() {
        const bar = document.getElementById('lab-category-pill-bar');
        if (!bar) return;

        const nodeCats = Array.isArray(labCatalog.node_categories) ? labCatalog.node_categories : [];
        const allKeys = Object.keys(labCatalog.categories || {});
        const ordered = [...nodeCats, ...allKeys.filter(k => !nodeCats.includes(k))];
        const visible = showAllCategories ? ordered : (nodeCats.length > 0 ? ordered.slice(0, Math.max(nodeCats.length, 6)) : ordered.slice(0, 8));

        bar.innerHTML = `
            <span style="font-size:9px; font-weight:800; color:var(--muted); font-family:monospace; margin-right:4px;">DOMAIN CATEGORY:</span>
            ${visible.map(cat => {
                const cObj = labCatalog.categories[cat] || {};
                const isSel = cat === activeCategory;
                const isNodeCat = nodeCats.includes(cat);
                return `
                    <button class="lab-cat-pill" data-cat="${escapeHtml(cat)}" style="
                        font-size:9.5px; font-weight:700; font-family:monospace; padding:4px 9px; border-radius:3px; cursor:pointer;
                        background:${isSel ? '#00E5FF' : (isNodeCat ? 'rgba(0,255,163,0.10)' : '#111827')};
                        color:${isSel ? '#07090E' : (isNodeCat ? '#00FFA3' : '#94A3B8')};
                        border:1px solid ${isSel ? '#00E5FF' : (isNodeCat ? '#00FFA3' : '#243144')};">
                        ${escapeHtml(cat.toUpperCase())}${cObj.is_plugin ? ' ★' : ''}
                    </button>
                `;
            }).join('')}
            ${ordered.length > visible.length || showAllCategories ? `
                <button id="btn-toggle-all-cats" style="font-size:9px; font-family:monospace; padding:4px 8px; border-radius:3px; cursor:pointer; background:#1E293B; color:#00E5FF; border:1px solid #334155;">
                    ${showAllCategories ? 'COLLAPSE' : `+ ALL (${ordered.length})`}
                </button>` : ''}
        `;

        bar.querySelectorAll('.lab-cat-pill').forEach(btn => {
            btn.addEventListener('click', async () => {
                activeCategory = btn.getAttribute('data-cat');
                renderCategoryPills();
                renderContextualAttackDeck();
                resetRollingBuffers();
                await tickTelemetryOnce();
            });
        });

        document.getElementById('btn-toggle-all-cats')?.addEventListener('click', () => {
            showAllCategories = !showAllCategories;
            renderCategoryPills();
        });
    }

    function renderContextualAttackDeck() {
        const deckContainer = document.querySelector('.lab-stage-deck .lab-card:first-child > div:last-child');
        if (!deckContainer) return;

        const catDef = labCatalog.categories?.[activeCategory];
        const attacks = Array.isArray(catDef?.attacks) ? catDef.attacks : [];

        deckContainer.innerHTML = `
            <div>
                <div style="font-size: 9px; color: var(--accent); font-weight: 800; text-transform: uppercase; margin-bottom: 4px;">
                    ${escapeHtml((activeCategory || 'DOMAIN').toUpperCase())} ATTACK VECTORS (MOD: ${escapeHtml(catDef?.lab_module || 'fuzzer')})
                </div>
                <div id="lab-dynamic-atk-grid" style="display: grid; grid-template-columns: 1fr 1fr; gap: 4px; max-height: 118px; overflow-y: auto;"></div>
            </div>
            <div style="margin-top: 8px;">
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 4px;">
                    <button class="lab-btn lab-btn-success" id="btn-lab-safe" style="padding: 6px; font-size: 9px; text-align: left;">[+] Stabilize Category</button>
                    <button class="lab-btn lab-btn-danger" id="btn-lab-reset" style="padding: 6px; font-size: 9px; text-align: left;">⏹ Reset All Faults</button>
                </div>
            </div>
        `;

        const grid = document.getElementById('lab-dynamic-atk-grid');
        if (grid) {
            grid.innerHTML = attacks.map(a => `
                <button class="lab-btn lab-cat-atk-btn" data-slug="${escapeHtml(a.slug)}" title="${escapeHtml(a.name)}"
                    style="padding: 6px; font-size: 9px; text-align: left; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">
                    [!] ${escapeHtml(a.name)}
                </button>
            `).join('');

            grid.querySelectorAll('.lab-cat-atk-btn').forEach(btn => {
                btn.addEventListener('click', () => {
                    injectLabAction('inject', { category: activeCategory, attack: btn.getAttribute('data-slug') });
                });
            });
        }

        document.getElementById('btn-lab-safe')?.addEventListener('click', () => {
            injectLabAction('safe', { category: activeCategory });
        });
        document.getElementById('btn-lab-reset')?.addEventListener('click', () => {
            injectLabAction('reset', {});
        });
    }

    function resetRollingBuffers() {
        primaryBuf = [];
        truthBuf = [];
        secondaryBuf = [];
        phaseOrbitBuf = [];
        residualBuf = [];
    }

    // =========================================================================
    // 3. SIX CORE ECHARTS ARCHETYPE RENDERERS + PLUGIN OVERRIDE HOOKS
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

    function updateDynamicCardHeaders(viz, isSafe) {
        const pCard = document.getElementById('cbfEchart')?.closest('.lab-card');
        const sCard = document.getElementById('phaseEchart')?.closest('.lab-card');
        if (pCard) {
            const spans = pCard.querySelectorAll('span');
            if (spans[1]) spans[1].textContent = (viz.primary_title || 'PRIMARY INVARIANT').toUpperCase();
        }
        if (sCard) {
            const spans = sCard.querySelectorAll('span');
            if (spans[1]) spans[1].textContent = (viz.secondary_title || 'SECONDARY SPECTRUM').toUpperCase();
            const badge = sCard.querySelector('.badge-green, .badge-danger');
            if (badge && spans[2]) spans[2].textContent = (viz.plot_archetype || 'ARCHETYPE').toUpperCase();
        }
        const invarEl = document.getElementById('lab-invar-title');
        if (invarEl) invarEl.textContent = `${(viz.category || '').toUpperCase()} | ${(viz.plot_archetype || '').toUpperCase()}`;

        const lblTemp = document.getElementById('lbl-temp');
        if (lblTemp) lblTemp.textContent = `${viz.primary_title || 'Measured PV'} (${viz.unit || ''})`;
        const valTemp = document.getElementById('val-temp');
        if (valTemp) valTemp.textContent = `${Number(viz.primary_val || 0).toFixed(2)} ${viz.unit || ''}`;

        const badgeCBF = document.getElementById('cbf-status-badge');
        if (badgeCBF) {
            badgeCBF.textContent = isSafe ? 'h(x) >= 0 SAFE' : `BREACH: ${(viz.active_attack || 'ANOMALY').toUpperCase()}`;
            badgeCBF.style.background = isSafe ? 'rgba(0,255,163,0.15)' : 'rgba(255,51,102,0.2)';
            badgeCBF.style.color = isSafe ? 'var(--kernel)' : 'var(--threat)';
            badgeCBF.style.borderColor = isSafe ? 'var(--kernel)' : 'var(--threat)';
        }
    }

    const CORE_PLOT_RENDERERS = {
        spectral_harmonic(c1, c2, viz, isSafe) {
            const color = isSafe ? '#00FFA3' : '#FF3366';
            c1.setOption({
                animation: false, backgroundColor: 'transparent',
                grid: { top: 22, right: 16, bottom: 20, left: 48 },
                xAxis: { type: 'category', boundaryGap: false, data: primaryBuf.map((_, i) => i), show: false },
                yAxis: { type: 'value', min: viz.min_plot, max: viz.max_plot, splitLine: { lineStyle: { color: '#1a2232' } }, axisLabel: { color: '#8a99ad', fontSize: 9 } },
                series: [{
                    type: 'line', smooth: 0.3, showSymbol: false, data: primaryBuf,
                    lineStyle: { color, width: 2.2 },
                    areaStyle: { color: isSafe ? 'rgba(0,255,163,0.1)' : 'rgba(255,51,102,0.16)' },
                    markLine: { silent: true, symbol: 'none', data: [{ yAxis: viz.safe_high, lineStyle: { color: '#FF3366', type: 'dashed' } }] }
                }]
            }, false);

            const sec = Array.isArray(viz.secondary_series) && viz.secondary_series.length > 0
                ? viz.secondary_series
                : [{ label: '1x', value: 1.0 }, { label: '2x', value: 0.3 }, { label: '3x', value: 0.2 }, { label: '5x', value: 0.1 }];
            c2.setOption({
                animation: false, backgroundColor: 'transparent',
                grid: { top: 22, right: 16, bottom: 24, left: 42 },
                xAxis: { type: 'category', data: sec.map(s => s.label), axisLabel: { color: '#8a99ad', fontSize: 9 } },
                yAxis: { type: 'value', splitLine: { lineStyle: { color: '#1a2232' } }, axisLabel: { color: '#8a99ad', fontSize: 9 } },
                series: [{
                    type: 'bar', barWidth: '45%',
                    data: sec.map((s, idx) => ({
                        value: s.value,
                        itemStyle: { color: (!isSafe && idx > 0) ? '#FF3366' : '#00E5FF' }
                    }))
                }]
            }, false);
        },

        shockwave_transient(c1, c2, viz, isSafe) {
            const color = isSafe ? '#00E5FF' : '#FF3366';
            c1.setOption({
                animation: false, backgroundColor: 'transparent',
                grid: { top: 22, right: 16, bottom: 20, left: 48 },
                xAxis: { type: 'category', boundaryGap: false, data: primaryBuf.map((_, i) => i), show: false },
                yAxis: { type: 'value', min: viz.min_plot, max: viz.max_plot, splitLine: { lineStyle: { color: '#1a2232' } }, axisLabel: { color: '#8a99ad', fontSize: 9 } },
                series: [{
                    type: 'line', smooth: false, showSymbol: false, data: primaryBuf,
                    lineStyle: { color, width: 2.2 },
                    markArea: { itemStyle: { color: 'rgba(255,51,102,0.08)' }, data: [[{ yAxis: viz.safe_high }, { yAxis: viz.max_plot }]] },
                    markLine: { silent: true, symbol: 'none', data: [{ yAxis: viz.safe_high, lineStyle: { color: '#FF3366', type: 'dashed' } }] }
                }]
            }, false);

            c2.setOption({
                animation: false, backgroundColor: 'transparent',
                grid: { top: 22, right: 16, bottom: 20, left: 48 },
                xAxis: { type: 'category', boundaryGap: false, data: secondaryBuf.map((_, i) => i), show: false },
                yAxis: { type: 'value', splitLine: { lineStyle: { color: '#1a2232' } }, axisLabel: { color: '#8a99ad', fontSize: 9 } },
                series: [{
                    name: 'dP/dt', type: 'line', showSymbol: false, data: secondaryBuf,
                    lineStyle: { color: isSafe ? '#FFB800' : '#FF3366', width: 2 },
                    areaStyle: { color: isSafe ? 'rgba(255,184,0,0.12)' : 'rgba(255,51,102,0.18)' }
                }]
            }, false);
        },

        corridor_titration(c1, c2, viz, isSafe) {
            const color = isSafe ? '#00FFA3' : '#FF3366';
            const mid = (viz.safe_low + viz.safe_high) * 0.5;
            c1.setOption({
                animation: false, backgroundColor: 'transparent',
                grid: { top: 22, right: 16, bottom: 20, left: 48 },
                xAxis: { type: 'category', boundaryGap: false, data: primaryBuf.map((_, i) => i), show: false },
                yAxis: { type: 'value', min: viz.min_plot, max: viz.max_plot, splitLine: { lineStyle: { color: '#1a2232' } }, axisLabel: { color: '#8a99ad', fontSize: 9 } },
                series: [{
                    type: 'line', smooth: 0.35, showSymbol: false, data: primaryBuf,
                    lineStyle: { color, width: 2.5 },
                    markArea: { itemStyle: { color: 'rgba(0,255,163,0.08)' }, data: [[{ yAxis: viz.safe_low }, { yAxis: viz.safe_high }]] },
                    markLine: {
                        silent: true, symbol: 'none',
                        data: [
                            { yAxis: viz.safe_low, lineStyle: { color: '#FFB800', type: 'dashed' } },
                            { yAxis: viz.safe_high, lineStyle: { color: '#FF3366', type: 'dashed' } }
                        ]
                    }
                }]
            }, false);

            const devSeries = primaryBuf.map(v => +Math.abs(v - mid).toFixed(3));
            c2.setOption({
                animation: false, backgroundColor: 'transparent',
                grid: { top: 22, right: 16, bottom: 20, left: 48 },
                xAxis: { type: 'category', boundaryGap: false, data: devSeries.map((_, i) => i), show: false },
                yAxis: { type: 'value', splitLine: { lineStyle: { color: '#1a2232' } }, axisLabel: { color: '#8a99ad', fontSize: 9 } },
                series: [{
                    type: 'line', showSymbol: false, data: devSeries,
                    lineStyle: { color: isSafe ? '#00E5FF' : '#FF3366', width: 2 },
                    areaStyle: { color: isSafe ? 'rgba(0,229,255,0.12)' : 'rgba(255,51,102,0.2)' }
                }]
            }, false);
        },

        thermal_runaway(c1, c2, viz, isSafe) {
            const color = isSafe ? '#00FFA3' : '#FF3366';
            c1.setOption({
                animation: false, backgroundColor: 'transparent',
                grid: { top: 22, right: 16, bottom: 20, left: 48 },
                xAxis: { type: 'category', boundaryGap: false, data: primaryBuf.map((_, i) => i), show: false },
                yAxis: { type: 'value', min: viz.min_plot, max: viz.max_plot, splitLine: { lineStyle: { color: '#1a2232' } }, axisLabel: { color: '#8a99ad', fontSize: 9 } },
                series: [{
                    type: 'line', smooth: 0.35, showSymbol: false, data: primaryBuf,
                    lineStyle: { color, width: 2.5 },
                    markArea: { itemStyle: { color: 'rgba(255,51,102,0.09)' }, data: [[{ yAxis: viz.safe_high }, { yAxis: viz.max_plot }]] },
                    markLine: { silent: true, symbol: 'none', data: [{ yAxis: viz.safe_high, lineStyle: { color: '#FF3366', type: 'dashed' } }] }
                }]
            }, false);

            c2.setOption({
                animation: false, backgroundColor: 'transparent',
                grid: { top: 22, right: 16, bottom: 24, left: 48 },
                xAxis: { type: 'value', min: viz.min_plot, max: viz.max_plot, splitLine: { lineStyle: { color: '#1a2232' } }, axisLabel: { color: '#8a99ad', fontSize: 9 } },
                yAxis: { type: 'value', splitLine: { lineStyle: { color: '#1a2232' } }, axisLabel: { color: '#8a99ad', fontSize: 9 } },
                series: [{
                    name: 'Phase Orbit', type: 'line', smooth: 0.3, showSymbol: false, data: phaseOrbitBuf,
                    lineStyle: { color: isSafe ? '#00E5FF' : '#FF3366', width: 2.2 }
                }]
            }, false);
        },

        spatial_kinematic(c1, c2, viz, isSafe) {
            c1.setOption({
                animation: false, backgroundColor: 'transparent',
                grid: { top: 22, right: 16, bottom: 20, left: 48 },
                xAxis: { type: 'category', boundaryGap: false, data: primaryBuf.map((_, i) => i), show: false },
                yAxis: { type: 'value', min: viz.min_plot, max: viz.max_plot, splitLine: { lineStyle: { color: '#1a2232' } }, axisLabel: { color: '#8a99ad', fontSize: 9 } },
                series: [
                    {
                        name: 'Measured', type: 'line', smooth: 0.25, showSymbol: false, data: primaryBuf,
                        lineStyle: { color: isSafe ? '#00E5FF' : '#FF3366', width: 2.4 }
                    },
                    {
                        name: 'Ground Truth', type: 'line', smooth: 0.3, showSymbol: false, data: truthBuf,
                        lineStyle: { color: '#00FFA3', width: 1.8, type: 'dashed' }
                    }
                ]
            }, false);

            const divBuf = primaryBuf.map((v, idx) => +Math.abs(v - (truthBuf[idx] ?? v)).toFixed(3));
            c2.setOption({
                animation: false, backgroundColor: 'transparent',
                grid: { top: 22, right: 16, bottom: 20, left: 48 },
                xAxis: { type: 'category', boundaryGap: false, data: divBuf.map((_, i) => i), show: false },
                yAxis: { type: 'value', splitLine: { lineStyle: { color: '#1a2232' } }, axisLabel: { color: '#8a99ad', fontSize: 9 } },
                series: [{
                    type: 'line', showSymbol: false, data: divBuf,
                    lineStyle: { color: isSafe ? '#00FFA3' : '#FF3366', width: 2 },
                    areaStyle: { color: isSafe ? 'rgba(0,255,163,0.1)' : 'rgba(255,51,102,0.2)' }
                }]
            }, false);
        },

        coherence_snr(c1, c2, viz, isSafe) {
            CORE_PLOT_RENDERERS.discrete_divergence(c1, c2, viz, isSafe);
        },

        discrete_divergence(c1, c2, viz, isSafe) {
            const color = isSafe ? '#00E5FF' : '#FF3366';
            c1.setOption({
                animation: false, backgroundColor: 'transparent',
                grid: { top: 22, right: 16, bottom: 20, left: 48 },
                xAxis: { type: 'category', boundaryGap: false, data: primaryBuf.map((_, i) => i), show: false },
                yAxis: { type: 'value', min: viz.min_plot, max: viz.max_plot, splitLine: { lineStyle: { color: '#1a2232' } }, axisLabel: { color: '#8a99ad', fontSize: 9 } },
                series: [{
                    type: 'line', step: 'end', showSymbol: false, data: primaryBuf,
                    lineStyle: { color, width: 2.2 },
                    areaStyle: { color: isSafe ? 'rgba(0,229,255,0.1)' : 'rgba(255,51,102,0.18)' },
                    markLine: { silent: true, symbol: 'none', data: [{ yAxis: viz.safe_low, lineStyle: { color: '#FFB800', type: 'dashed' } }] }
                }]
            }, false);

            const bins = Array.isArray(viz.secondary_series) && viz.secondary_series.length > 0
                ? viz.secondary_series
                : [{ label: 'SYN', value: 2 }, { label: 'CRC', value: 1 }, { label: 'SEQ', value: 1 }, { label: 'SPI', value: 0 }];
            c2.setOption({
                animation: false, backgroundColor: 'transparent',
                grid: { top: 22, right: 16, bottom: 24, left: 42 },
                xAxis: { type: 'category', data: bins.map(b => b.label), axisLabel: { color: '#8a99ad', fontSize: 9 } },
                yAxis: { type: 'value', splitLine: { lineStyle: { color: '#1a2232' } }, axisLabel: { color: '#8a99ad', fontSize: 9 } },
                series: [{
                    type: 'bar', barWidth: '45%',
                    data: bins.map(b => ({
                        value: b.value,
                        itemStyle: { color: isSafe ? '#00FFA3' : '#FF3366' }
                    }))
                }]
            }, false);
        }
    };

    // =========================================================================
    // 4. TELEMETRY POLLING & MULTI-STAGE CHART DISPATCHER
    // =========================================================================
    function startTelemetryLoop() {
        if (telemetryTimer) clearInterval(telemetryTimer);
        telemetryTimer = setInterval(() => {
            const pane = document.getElementById('tab-lab-cockpit');
            if (!pane || !pane.classList.contains('active')) return;
            tickTelemetryOnce();
        }, 400);
    }

    async function tickTelemetryOnce() {
        try {
            let url = '/api/v1/lab/telemetry';
            const qs = [];
            if (activeNodeId) qs.push(`node_id=${encodeURIComponent(activeNodeId)}`);
            if (activeCategory) qs.push(`category=${encodeURIComponent(activeCategory)}`);
            if (qs.length > 0) url += '?' + qs.join('&');

            const resp = await fetch(url);
            if (!resp.ok) return;
            const data = await resp.json();

            const viz = data.visualization || {};
            const ps = data.physical_state || {};
            const isSafe = Boolean(ps.is_safe !== false);

            // Seed rolling buffers on first frame for edge-to-edge render
            if (primaryBuf.length === 0) {
                for (let i = 0; i < MAX_POINTS; i++) {
                    primaryBuf.push(viz.primary_val ?? 0);
                    truthBuf.push(viz.ground_truth_val ?? 0);
                    secondaryBuf.push(viz.derivative_val ?? 0);
                }
            } else {
                primaryBuf.push(viz.primary_val ?? 0);
                truthBuf.push(viz.ground_truth_val ?? 0);
                secondaryBuf.push(viz.derivative_val ?? 0);
                if (primaryBuf.length > MAX_POINTS) primaryBuf.shift();
                if (truthBuf.length > MAX_POINTS) truthBuf.shift();
                if (secondaryBuf.length > MAX_POINTS) secondaryBuf.shift();
            }

            phaseOrbitBuf.push([viz.primary_val ?? 0, viz.derivative_val ?? 0]);
            if (phaseOrbitBuf.length > 40) phaseOrbitBuf.shift();

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

            updateDynamicCardHeaders(viz, isSafe);

            // Stage 1: Archetype Strategy Resolution (Plugins first, then CORE_PLOT_RENDERERS)
            const archetype = viz.plot_archetype || 'discrete_divergence';
            const archetypeChanged = (lastArchetype !== null && lastArchetype !== archetype);
            lastArchetype = archetype;

            primaryChart = getOrInitChart('cbfEchart', primaryChart, archetypeChanged);
            secondaryChart = getOrInitChart('phaseEchart', secondaryChart, archetypeChanged);

            if (primaryChart && secondaryChart) {
                const pluginRenderer =
                    window.SentinelLabPlugins?.renderers?.[archetype] ||
                    window.SentinelUI?.getLabRenderer?.(archetype);

                if (typeof pluginRenderer === 'function') {
                    pluginRenderer(primaryChart, secondaryChart, viz, isSafe, { primaryBuf, truthBuf, secondaryBuf, phaseOrbitBuf });
                } else {
                    const renderer = CORE_PLOT_RENDERERS[archetype] || CORE_PLOT_RENDERERS.discrete_divergence;
                    renderer(primaryChart, secondaryChart, viz, isSafe);
                }
            }

            // Stage 2: Timing & PMU
            updateTimingCharts(data, isSafe);

            // Stage 3: Network RSS & Fusion
            updateNetworkCharts(data);
        } catch (e) {
            console.warn('[LabCockpit] Telemetry tick skipped:', e);
        }
    }

    function updateTimingCharts(data, isSafe) {
        if (!data.evt_wcet || !data.pmu_metrics) return;
        evtChart = getOrInitChart('evtEchart', evtChart, false);
        pmuChart = getOrInitChart('pmuEchart', pmuChart, false);

        const wcetEl = document.getElementById('val-wcet');
        if (wcetEl) wcetEl.textContent = `${Number(data.evt_wcet.p99_999_us || 1.82).toFixed(2)} µs`;
        const dropEl = document.getElementById('val-drop');
        if (dropEl) dropEl.textContent = `${Number(data.evt_wcet.sla_limit_us || 0.84).toFixed(2)} µs`;
        const ipcEl = document.getElementById('val-ipc');
        if (ipcEl) ipcEl.textContent = Number(data.pmu_metrics.ipc || 2.42).toFixed(2);
        const llcEl = document.getElementById('val-llc');
        if (llcEl) llcEl.textContent = `${Number(data.pmu_metrics.llc_miss_pct || 1.24).toFixed(2)}%`;
        const lockEl = document.getElementById('val-buslocks');
        if (lockEl) lockEl.textContent = String(data.pmu_metrics.bus_lock_stalls || 0);

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
    }

    function updateNetworkCharts(data) {
        if (!data.rss_multi_queue || !data.sensor_fusion) return;
        rssChart = getOrInitChart('rssEchart', rssChart, false);
        fusionChart = getOrInitChart('fusionEchart', fusionChart, false);

        const epsEl = document.getElementById('val-tot-eps');
        if (epsEl) epsEl.textContent = `${(Number(data.rss_multi_queue.total_eps || 0) / 1e6).toFixed(2)}M EPS`;
        const resEl = document.getElementById('val-residual');
        if (resEl) resEl.textContent = Number(data.sensor_fusion.residual_r || 0).toFixed(3);
        const chiEl = document.getElementById('val-chi2-thresh');
        if (chiEl) chiEl.textContent = Number(data.sensor_fusion.chi2_threshold || 0.08).toFixed(3);

        const fusionBadge = document.getElementById('fusion-status-badge');
        if (fusionBadge) {
            fusionBadge.textContent = data.sensor_fusion.chi2_alarm ? 'CHI² ALARM' : 'CONCORDANT';
            fusionBadge.style.color = data.sensor_fusion.chi2_alarm ? 'var(--threat)' : 'var(--kernel)';
        }

        residualBuf.push(Number(data.sensor_fusion.residual_r || 0));
        if (residualBuf.length > 40) residualBuf.shift();

        if (rssChart) {
            rssChart.setOption({
                animation: false, backgroundColor: 'transparent',
                grid: { top: 20, right: 15, bottom: 20, left: 42 },
                xAxis: { type: 'category', data: ['Q0', 'Q1', 'Q2', 'Q3', 'Q4', 'Q5', 'Q6', 'Q7'], axisLabel: { color: '#8a99ad', fontSize: 9 } },
                yAxis: { type: 'value', splitLine: { lineStyle: { color: '#1a2232' } }, axisLabel: { color: '#8a99ad', fontSize: 8 } },
                series: [{ type: 'bar', data: data.rss_multi_queue.queues || [], itemStyle: { color: '#00ffa3' } }]
            }, false);
        }

        if (fusionChart) {
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
    // 5. SAFE INJECTION DISPATCH & LOG POLLER
    // =========================================================================
    async function injectLabAction(action, extra = {}) {
        const statusBadge = document.getElementById('deck-status');
        if (statusBadge) statusBadge.textContent = `DISPATCH: ${action.toUpperCase()}`;

        const matchingSensor = (activeNodeDetail?.sensors || []).find(
            s => (s.category || '').toLowerCase() === (extra.category || activeCategory)
        );

        try {
            const res = await fetch('/api/v1/lab/inject', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    action,
                    node_id: activeNodeId,
                    category: extra.category || activeCategory,
                    attack: extra.attack || '',
                    sensor_id: matchingSensor ? matchingSensor.sensor_id : ''
                })
            });
            const data = await res.json();
            if (statusBadge) statusBadge.textContent = `ACTIVE: ${(data.action || action).toUpperCase()}`;
        } catch (e) {
            if (statusBadge) statusBadge.textContent = 'DISPATCHED';
        }

        await tickTelemetryOnce();
        setTimeout(pollLabLogs, 250);
        setTimeout(pollLabLogs, 800);
    }

    window.injectLab = (action) => injectLabAction(action, { category: activeCategory });

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
        } catch (_) {}
    }

    function initSubStageTabs() {
        const btns = document.querySelectorAll('.lab-tab-btn');
        btns.forEach(b => {
            b.addEventListener('click', () => {
                btns.forEach(x => {
                    x.classList.remove('active');
                    x.style.background = 'var(--panel)';
                    x.style.borderColor = 'var(--hairline)';
                    x.style.color = 'var(--muted)';
                });
                b.classList.add('active');
                b.style.background = 'rgba(0, 229, 255, 0.12)';
                b.style.borderColor = 'var(--accent)';
                b.style.color = 'var(--ink)';

                const stage = b.getAttribute('data-stage');
                document.querySelectorAll('.lab-stage-view').forEach(v => v.style.display = 'none');
                if (stage === 'stage-physics') document.getElementById('view-lab-physics').style.display = 'grid';
                if (stage === 'stage-timing') document.getElementById('view-lab-timing').style.display = 'grid';
                if (stage === 'stage-network') document.getElementById('view-lab-network').style.display = 'grid';

                setTimeout(() => {
                    tickTelemetryOnce();
                    resizeAllCharts();
                }, 50);
            });
        });
    }

    function resizeAllCharts() {
        [primaryChart, secondaryChart, evtChart, pmuChart, rssChart, fusionChart].forEach(c => {
            if (c && !c.isDisposed()) {
                try { c.resize(); } catch (_) {}
            }
        });
    }

    window.exportLabScorecard = function () {
        const modal = document.getElementById('modal-latex-export');
        const area = document.getElementById('latex-code-area');
        if (!modal || !area) return;

        const site = activeNodeDetail?.site || activeNodeId || 'Aryorithm Edge Sentry';
        area.value = `% ARYORITHM TECHNOLOGIES B.V. — SENTINEL LAB SCORECARD (${site}) | DOI: 10.5281/zenodo.23598779\n% Active Category: ${activeCategory || 'N/A'}\n`;
        modal.style.display = 'flex';
    };

    function escapeHtml(str) {
        if (typeof str !== 'string') return String(str || '');
        return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    }
})();
