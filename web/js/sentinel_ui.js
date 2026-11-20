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
            } catch (_) {}

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

    // 1. Radiometric Thermal Camera
    SentinelUI.registerApparatus({
        id: "industrial_radiometric_vision",
        title: "RADIOMETRIC THERMAL VISION CAMERA",
        shortLabel: "📷 THERMAL CAM",
        aspectRatio: 1.25,
        protocol: "WHEP / RTSP :8554",
        defaultForTypes: ["video"],
        matches: (node) => (node?.primary_instrument?.type || "").toLowerCase() === "video",
        mount: createIndustrialCanvasMount((canvas, node, state) => {
            const ctx = canvas.getContext("2d");
            const w = canvas.width, h = canvas.height;
            const grad = ctx.createRadialGradient(w / 2, h / 2, 12, w / 2, h / 2, w / 1.5);
            grad.addColorStop(0, "#00FFA3");
            grad.addColorStop(1, "#05080C");
            ctx.fillStyle = grad;
            ctx.fillRect(0, 0, w, h);

            ctx.font = "bold 11px monospace";
            ctx.fillStyle = "#00FFA3";
            ctx.fillText(`[+] ${node?.primary_instrument?.title || 'RADIOMETRIC THERMAL CAMERA'}`, 14, 24);
            ctx.font = "10px monospace";
            ctx.fillStyle = "#94A3B8";
            ctx.fillText("STREAM: RTSP :8554 / WHEP | ROI TEMP: 74.5°C [NORMAL]", 14, 42);
        }),
        unmount: unmountIndustrialCanvas,
        getPcapConfig: () => ({
            apiBase: "",
            attacks: [
                { label: "[!] Replay Triton TriStation PCAP", pcap: "triton_trisis_sis.pcap", attack_type: "triton", mode: "overlay", duration_sec: 15 }
            ]
        })
    });

    // 2. 50 Hz AC Synchrophasor Scope
    SentinelUI.registerApparatus({
        id: "industrial_synchrophasor_scope",
        title: "POWER QUALITY & SYNCHROPHASOR SCOPE",
        shortLabel: "⚡ GRID SCOPE",
        aspectRatio: 1.25,
        protocol: "IEEE C37.118 / MODBUS :15501",
        defaultForTypes: ["grid"],
        matches: (node) => (node?.primary_instrument?.type || "").toLowerCase() === "grid",
        mount: createIndustrialCanvasMount((canvas, node, state) => {
            const ctx = canvas.getContext("2d");
            const w = canvas.width, h = canvas.height;
            ctx.fillStyle = "#05080C";
            ctx.fillRect(0, 0, w, h);

            ctx.strokeStyle = "#00F0FF";
            ctx.lineWidth = 2.0;
            ctx.beginPath();
            for (let x = 0; x < w; x++) {
                const y = (h / 2) + Math.sin((x * 0.015) + (state.tick * 3.5)) * 42;
                if (x === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
            }
            ctx.stroke();

            ctx.font = "bold 11px monospace";
            ctx.fillStyle = "#00E5FF";
            ctx.fillText(`[+] ${node?.primary_instrument?.title || 'SYNCHROPHASOR SCOPE'}`, 14, 24);
            ctx.font = "10px monospace";
            ctx.fillStyle = "#94A3B8";
            ctx.fillText("GRID FREQ: 50.00 Hz | THD: 1.4% | VOLTAGE: 220.4 kV", 14, 42);
        }),
        unmount: unmountIndustrialCanvas,
        getPcapConfig: () => ({
            apiBase: "",
            attacks: [
                { label: "[!] Replay Industroyer2 IEC-104 PCAP", pcap: "industroyer2_substation.pcap", attack_type: "industroyer", mode: "overlay", duration_sec: 15 },
                { label: "[!] Replay UIUC Modbus SCADA PCAP", pcap: "modbus_uiuc_scada_attack.pcap", attack_type: "modbus", mode: "overlay", duration_sec: 15 }
            ]
        })
    });

    // 3. Exothermic Reaction Vessel
    SentinelUI.registerApparatus({
        id: "industrial_exothermic_reactor",
        title: "EXOTHERMIC REACTION VESSEL CORE",
        shortLabel: "☢️ REACTOR CORE",
        aspectRatio: 1.25,
        protocol: "S7COMM :102 / HART-IP",
        defaultForTypes: ["reactor"],
        matches: (node) => (node?.primary_instrument?.type || "").toLowerCase() === "reactor",
        mount: createIndustrialCanvasMount((canvas, node, state) => {
            const ctx = canvas.getContext("2d");
            const w = canvas.width, h = canvas.height;
            const grad = ctx.createRadialGradient(w / 2, h / 2, 10, w / 2, h / 2, w / 1.5);
            grad.addColorStop(0, "#A855F7");
            grad.addColorStop(1, "#05080C");
            ctx.fillStyle = grad;
            ctx.fillRect(0, 0, w, h);

            ctx.font = "bold 11px monospace";
            ctx.fillStyle = "#A855F7";
            ctx.fillText(`[+] ${node?.primary_instrument?.title || 'EXOTHERMIC REACTOR VESSEL'}`, 14, 24);
            ctx.font = "10px monospace";
            ctx.fillStyle = "#94A3B8";
            ctx.fillText("PRESSURE: 100.2 PSI | CORE TEMP: 85.4°C | S7COMM :102", 14, 42);
        }),
        unmount: unmountIndustrialCanvas,
        getPcapConfig: () => ({
            apiBase: "",
            attacks: [
                { label: "[!] Replay Stuxnet S7Comm PCAP", pcap: "stuxnet_s7comm.pcap", attack_type: "stuxnet", mode: "overlay", duration_sec: 15 }
            ]
        })
    });

    window.SentinelUI = SentinelUI;
    document.addEventListener("DOMContentLoaded", () => {
        SentinelUI.initPlugins();
    });
})();