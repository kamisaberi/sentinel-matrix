// File: /home/kami/sentinel-nexus/web/js/sentinel_ui.js
// ==============================================================================
// ARYORITHM SENTINEL NEXUS: MICRO-FRONTEND PLUGIN & APPARATUS REGISTRY
// Zero-Copy Extensibility: Built-In Industrial & External Plugin Apparatuses
// ==============================================================================

(function () {
    const SentinelUI = {
        nodeAdapters: [],
        apparatuses: [],
        customTabs: [],
        pluginsLoaded: false,

        registerNodeAdapter(adapter) {
            if (!adapter || !adapter.id) return;
            this.nodeAdapters = this.nodeAdapters.filter(a => a.id !== adapter.id);
            this.nodeAdapters.push(adapter);
            console.log(`[SentinelUI] Registered node adapter: ${adapter.id}`);
        },

        getNodeAdapter(node) {
            if (!node) return null;
            return this.nodeAdapters.find(a => a.matches && a.matches(node)) || null;
        },

        registerApparatus(spec) {
            if (!spec || !spec.id || typeof spec.mount !== "function") return;
            this.apparatuses = this.apparatuses.filter(a => a.id !== spec.id);
            this.apparatuses.push(spec);
            console.log(`[SentinelUI] Registered visual apparatus plugin: ${spec.id}`);
        },

        getApparatusById(id) {
            return this.apparatuses.find(a => a.id === id) || null;
        },

        getMatchingApparatuses(node) {
            if (!node) return [];
            const matched = this.apparatuses.filter(a => !a.matches || a.matches(node));
            const prefType = (node.primary_instrument && node.primary_instrument.type)
                ? node.primary_instrument.type.toLowerCase()
                : "";
            if (!prefType) return matched;

            return matched.slice().sort((a, b) => {
                const aDef = Array.isArray(a.defaultForTypes) && a.defaultForTypes.includes(prefType) ? 0 : 1;
                const bDef = Array.isArray(b.defaultForTypes) && b.defaultForTypes.includes(prefType) ? 0 : 1;
                return aDef - bDef;
            });
        },

        registerTab(tabConfig) {
            this.customTabs.push(tabConfig);
            this._injectTab(tabConfig);
        },

        _injectTab(tabConfig) {
            const nav = document.querySelector(".admin-nav");
            const viewport = document.querySelector(".dashboard-viewport");
            if (!nav || !viewport) return;

            if (document.getElementById(tabConfig.id)) return;

            const btn = document.createElement("button");
            btn.className = "admin-nav-item nav-tab";
            btn.setAttribute("data-tab", tabConfig.id);
            btn.innerHTML = `<span>${tabConfig.icon || "🧩"}</span><span>${tabConfig.label}</span>`;
            nav.appendChild(btn);

            const pane = document.createElement("div");
            pane.className = "tab-pane";
            pane.id = tabConfig.id;
            pane.innerHTML = `<div id="${tabConfig.id}-container" style="min-height: 600px;"></div>`;
            viewport.appendChild(pane);

            btn.addEventListener("click", (e) => {
                e.preventDefault();
                document.querySelectorAll(".admin-nav-item").forEach(b => b.classList.remove("active"));
                document.querySelectorAll(".tab-pane").forEach(p => p.classList.remove("active"));
                btn.classList.add("active");
                pane.classList.add("active");
                if (tabConfig.renderView) {
                    tabConfig.renderView(document.getElementById(`${tabConfig.id}-container`));
                }
            });

            console.log(`[SentinelUI] Injected dynamic tab: ${tabConfig.label}`);
        },

        loadScript(src) {
            return new Promise((resolve, reject) => {
                const s = document.createElement("script");
                s.src = src;
                s.onload = resolve;
                s.onerror = reject;
                document.body.appendChild(s);
            });
        },

        async initPlugins() {
            try {
                const resp = await fetch("/plugins/manifest.json");
                if (resp.ok) {
                    const data = await resp.json();
                    if (data && Array.isArray(data.plugins)) {
                        for (const p of data.plugins) {
                            if (p.style) {
                                const link = document.createElement("link");
                                link.rel = "stylesheet";
                                link.href = `/plugins/${p.style}`;
                                document.head.appendChild(link);
                            }
                            if (p.vendor) await this.loadScript(`/plugins/${p.vendor}`);
                            if (p.script) await this.loadScript(`/plugins/${p.script}`);
                        }
                        console.log(`[SentinelUI] Loaded ${data.plugins.length} external UI plugin(s).`);
                    }
                }
            } catch (_) { }

            this.pluginsLoaded = true;
            window.dispatchEvent(new CustomEvent("sentinel:plugins-ready"));
        }
    };

    // =========================================================================
    // BUILT-IN INDUSTRIAL APPARATUS PLUGINS (For Generic Scenarios)
    // =========================================================================

    // Helper: Industrial Canvas Canvas Creation
    function createIndustrialCanvasMount(drawFn) {
        return function mount(container, node) {
            container.innerHTML = `
                <div style="position:relative; width:100%; height:100%; background:#05080C; border-radius:4px; overflow:hidden; aspect-ratio:1.25;">
                    <canvas width="750" height="600" style="width:100%; height:100%; object-fit:cover; display:block;"></canvas>
                </div>
            `;
            const canvas = container.querySelector("canvas");
            const state = { animId: null, alive: true, tick: 0 };

            function loop() {
                if (!state.alive) return;
                state.tick += 0.035;
                drawFn(canvas, node, state);
                state.animId = requestAnimationFrame(loop);
            }
            loop();
            return state;
        };
    }

    function unmountIndustrialCanvas(handle) {
        if (!handle) return;
        handle.alive = false;
        if (handle.animId) cancelAnimationFrame(handle.animId);
    }


    const HOST = window.location.hostname || "127.0.0.1";
    const SYNCHRO_API = `http://${HOST}:18093`;
    const THERMAL_API = `http://${HOST}:18094`;
    const REACTOR_API = `http://${HOST}:18095`;

    // 1. Live Radiometric Thermal Camera
    SentinelUI.registerApparatus({
        id: "industrial_radiometric_vision",
        title: "RADIOMETRIC THERMAL VISION CAMERA",
        shortLabel: "📷 THERMAL CAM",
        aspectRatio: 1.25,
        protocol: "WHEP / RTSP :8554",
        defaultForTypes: ["video"],
        matches: (node) => (node?.primary_instrument?.type || "").toLowerCase() === "video",
        mount: function (container, node) {
            container.innerHTML = `<div style="position:relative; width:100%; height:100%; background:#060418; border-radius:4px; overflow:hidden; aspect-ratio:1.25;"><canvas width="750" height="600" style="width:100%; height:100%; object-fit:cover; display:block;"></canvas></div>`;
            const canvas = container.querySelector("canvas");
            const ctx = canvas.getContext("2d");
            const state = { animId: null, alive: true, data: null };

            const timer = setInterval(async () => {
                try {
                    const r = await fetch(`${THERMAL_API}/telemetry`, { cache: "no-store" });
                    if (r.ok) state.data = await r.json();
                } catch (_) { }
            }, 250);

            function loop() {
                if (!state.alive) return;
                const w = canvas.width, h = canvas.height;
                const flir = state.data?.flir;
                const isDazzle = Boolean(flir?.laser_dazzle || state.data?.active_attack?.active);
                ctx.fillStyle = "#060418";
                ctx.fillRect(0, 0, w, h);

                const grid = flir?.thermal_grid_c || [];
                if (grid.length > 0) {
                    const rows = grid.length, cols = grid[0].length;
                    const cellW = w / cols, cellH = h / rows;
                    for (let r = 0; r < rows; r++) {
                        for (let c = 0; c < cols; c++) {
                            const temp = grid[r][c];
                            const t = Math.max(0, Math.min(1, (temp - 20) / 40));
                            ctx.fillStyle = isDazzle && temp > 100 ? "#FFF" : `rgb(${Math.round(t * 255)}, ${Math.round(40 + t * 160)}, ${Math.round(180 - t * 120)})`;
                            ctx.fillRect(c * cellW, r * cellH, Math.ceil(cellW + 1), Math.ceil(cellH + 1));
                        }
                    }
                }
                ctx.fillStyle = "rgba(7, 11, 20, 0.85)";
                ctx.fillRect(0, 0, w, 28);
                ctx.fillRect(0, h - 26, w, 26);
                ctx.font = "bold 10.5px monospace";
                ctx.fillStyle = isDazzle ? "#FF3366" : "#00FFA3";
                ctx.fillText(isDazzle ? "[!] THERMAL RUNAWAY ANOMALY | 146.5°C" : `[+] RADIOMETRIC FLIR | PEAK: ${Number(flir?.peak_temp_c || 38.5).toFixed(1)}°C | AMBIENT: 21.4°C`, 12, 18);
                ctx.font = "9px monospace";
                ctx.fillStyle = "#94A3B8";
                ctx.fillText(`STREAM: WHEP / RTSP :8554 | ROI TARGET: PATIENT_PACS_MONITOR [LOCKED]`, 12, h - 9);
                state.animId = requestAnimationFrame(loop);
            }
            loop();
            state.cleanup = () => clearInterval(timer);
            return state;
        },
        unmount: function (handle) {
            if (!handle) return;
            handle.alive = false;
            if (handle.animId) cancelAnimationFrame(handle.animId);
            if (handle.cleanup) handle.cleanup();
        },
        getPcapConfig: () => ({
            apiBase: THERMAL_API,
            attacks: [
                { label: "[!] Replay Triton TriStation PCAP (Overlay)", pcap: "triton_trisis_sis.pcap", attack_type: "triton", mode: "overlay", duration_sec: 15 }
            ]
        })
    });

    // 2. Live Synchrophasor Scope
    SentinelUI.registerApparatus({
        id: "industrial_synchrophasor_scope",
        title: "POWER QUALITY & SYNCHROPHASOR SCOPE",
        shortLabel: "⚡ GRID SCOPE",
        aspectRatio: 1.25,
        protocol: "IEEE C37.118 / MODBUS :15501",
        defaultForTypes: ["grid"],
        matches: (node) => (node?.primary_instrument?.type || "").toLowerCase() === "grid",
        mount: function (container, node) {
            container.innerHTML = `<div style="position:relative; width:100%; height:100%; background:#05080C; border-radius:4px; overflow:hidden; aspect-ratio:1.25;"><canvas width="750" height="600" style="width:100%; height:100%; object-fit:cover; display:block;"></canvas></div>`;
            const canvas = container.querySelector("canvas");
            const ctx = canvas.getContext("2d");
            const state = { animId: null, alive: true, data: null, tick: 0 };

            const timer = setInterval(async () => {
                try {
                    const r = await fetch(`${SYNCHRO_API}/telemetry`, { cache: "no-store" });
                    if (r.ok) state.data = await r.json();
                } catch (_) { }
            }, 250);

            function loop() {
                if (!state.alive) return;
                state.tick += 0.04;
                const w = canvas.width, h = canvas.height;
                const syn = state.data?.synchrophasor;
                const isDistorted = Boolean(state.data?.active_attack?.active || (syn?.thd_pct || 0) > 10);

                ctx.fillStyle = "#05080C";
                ctx.fillRect(0, 0, w, h);
                ctx.strokeStyle = isDistorted ? "#FF3366" : "#00F0FF";
                ctx.lineWidth = 2.2;
                ctx.beginPath();
                for (let x = 0; x < w; x++) {
                    const amp = isDistorted ? 52 : 36;
                    const freqMult = isDistorted ? 0.035 : 0.015;
                    const y = (h / 2) + Math.sin((x * freqMult) + (state.tick * 3.5)) * amp;
                    if (x === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
                }
                ctx.stroke();

                ctx.fillStyle = "rgba(7, 11, 20, 0.85)";
                ctx.fillRect(0, 0, w, 28);
                ctx.fillRect(0, h - 26, w, 26);
                ctx.font = "bold 10.5px monospace";
                ctx.fillStyle = isDistorted ? "#FF3366" : "#00E5FF";
                ctx.fillText(isDistorted ? `[!] GRID HARMONIC DISTORTION INJECTED | THD: ${syn?.thd_pct || 21.8}%` : `[+] SYNCHROPHASOR SCOPE | FREQ: ${syn?.freq_hz || 50.00} Hz | THD: 1.4%`, 12, 18);
                ctx.font = "9px monospace";
                ctx.fillStyle = "#94A3B8";
                ctx.fillText(`BUSBAR: ${syn?.busbar_kv || 220.4} kV  |  PHASE: ${syn?.phase_deg || 0}°  |  SLA: < 0.84 µs IN-KERNEL DROP`, 12, h - 9);
                state.animId = requestAnimationFrame(loop);
            }
            loop();
            state.cleanup = () => clearInterval(timer);
            return state;
        },
        unmount: function (handle) {
            if (!handle) return;
            handle.alive = false;
            if (handle.animId) cancelAnimationFrame(handle.animId);
            if (handle.cleanup) handle.cleanup();
        },
        getPcapConfig: () => ({
            apiBase: SYNCHRO_API,
            attacks: [
                { label: "[!] Replay Industroyer2 IEC-104 PCAP (Overlay)", pcap: "industroyer2_substation.pcap", attack_type: "industroyer", mode: "overlay", duration_sec: 15 }
            ]
        })
    });

    // 3. Live Exothermic Reaction Vessel
    SentinelUI.registerApparatus({
        id: "industrial_exothermic_reactor",
        title: "EXOTHERMIC REACTION VESSEL CORE",
        shortLabel: "☢️ REACTOR CORE",
        aspectRatio: 1.25,
        protocol: "S7COMM :102 / HART-IP",
        defaultForTypes: ["reactor"],
        matches: (node) => (node?.primary_instrument?.type || "").toLowerCase() === "reactor",
        mount: function (container, node) {
            container.innerHTML = `<div style="position:relative; width:100%; height:100%; background:#05080C; border-radius:4px; overflow:hidden; aspect-ratio:1.25;"><canvas width="750" height="600" style="width:100%; height:100%; object-fit:cover; display:block;"></canvas></div>`;
            const canvas = container.querySelector("canvas");
            const ctx = canvas.getContext("2d");
            const state = { animId: null, alive: true, data: null, tick: 0 };

            const timer = setInterval(async () => {
                try {
                    const r = await fetch(`${REACTOR_API}/telemetry`, { cache: "no-store" });
                    if (r.ok) state.data = await r.json();
                } catch (_) { }
            }, 250);

            function loop() {
                if (!state.alive) return;
                state.tick += 0.035;
                const w = canvas.width, h = canvas.height;
                const rx = state.data?.reactor || { pressure_psi: 100.2, temp_c: 85.4, agitator_rpm: 1200 };
                const isRunaway = Boolean(state.data?.active_attack?.active || rx.pressure_psi > 140);

                const grad = ctx.createRadialGradient(w / 2, h / 2, 12, w / 2, h / 2, w / 1.5);
                grad.addColorStop(0, isRunaway ? "#FF3366" : "#A855F7");
                grad.addColorStop(1, "#05080C");
                ctx.fillStyle = grad;
                ctx.fillRect(0, 0, w, h);

                ctx.fillStyle = "rgba(7, 11, 20, 0.85)";
                ctx.fillRect(0, 0, w, 28);
                ctx.fillRect(0, h - 26, w, 26);
                ctx.font = "bold 10.5px monospace";
                ctx.fillStyle = isRunaway ? "#FF3366" : "#A855F7";
                ctx.fillText(isRunaway ? `[!] EXOTHERMIC REACTION RUNAWAY | ${rx.pressure_psi} PSI (DANGER)` : `[+] EXOTHERMIC REACTION VESSEL CORE | S7COMM :102`, 12, 18);
                ctx.font = "9px monospace";
                ctx.fillStyle = "#94A3B8";
                ctx.fillText(`CORE TEMP: ${rx.temp_c}°C  |  AGITATOR: ${rx.agitator_rpm} RPM  |  NITROGEN QUENCH: ARMED`, 12, h - 9);
                state.animId = requestAnimationFrame(loop);
            }
            loop();
            state.cleanup = () => clearInterval(timer);
            return state;
        },
        unmount: function (handle) {
            if (!handle) return;
            handle.alive = false;
            if (handle.animId) cancelAnimationFrame(handle.animId);
            if (handle.cleanup) handle.cleanup();
        },
        getPcapConfig: () => ({
            apiBase: REACTOR_API,
            attacks: [
                { label: "[!] Replay Stuxnet S7Comm PCAP (Overlay)", pcap: "stuxnet_s7comm_injected.pcap", attack_type: "stuxnet", mode: "overlay", duration_sec: 15 }
            ]
        })
    });



    window.SentinelUI = SentinelUI;
    document.addEventListener("DOMContentLoaded", () => {
        SentinelUI.initPlugins();
    });
})();