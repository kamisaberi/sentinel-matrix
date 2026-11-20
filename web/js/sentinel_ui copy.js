// File: /home/kami/sentinel-nexus/web/js/sentinel_ui.js

(function () {
    const SentinelUI = {
        nodeAdapters: [],
        customTabs: [],

        registerNodeAdapter(adapter) {
            this.nodeAdapters.push(adapter);
            console.log(`[SentinelUI] Registered node adapter: ${adapter.id}`);
        },

        getNodeAdapter(node) {
            if (!node) return null;
            return this.nodeAdapters.find(a => a.matches && a.matches(node)) || null;
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
                if (!resp.ok) return;
                const data = await resp.json();
                if (!data || !Array.isArray(data.plugins)) return;

                for (const p of data.plugins) {
                    if (p.style) {
                        const link = document.createElement("link");
                        link.rel = "stylesheet";
                        link.href = `/plugins/${p.style}`;
                        document.head.appendChild(link);
                    }
                    if (p.vendor) {
                        await this.loadScript(`/plugins/${p.vendor}`);
                    }
                    if (p.script) {
                        await this.loadScript(`/plugins/${p.script}`);
                    }
                }
                console.log(`[SentinelUI] Loaded ${data.plugins.length} external UI plugin(s).`);
            } catch (err) {
                // Silently skip if /plugins/manifest.json is not present
            }
        }
    };

    window.SentinelUI = SentinelUI;
    document.addEventListener("DOMContentLoaded", () => {
        SentinelUI.initPlugins();
    });
})();