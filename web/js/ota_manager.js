// Standalone OTA Controller for Sentinel Nexus
class OtaManager {
    constructor() {
        this.stages = ["DISABLED", "SHADOW_MODE", "CANARY_5_PCT", "FLEET_WIDE"];
        this.initEventListeners();
    }

    initEventListeners() {
        console.log("[*] OTA Manager initialized.");
    }

    async refreshStatus() {
        try {
            const res = await fetch('/api/v1/ota/status');
            const data = await res.json();
            const stageText = document.getElementById('val-model-stage');
            if (stageText) {
                stageText.innerText = `Stage: ${this.stages[data.stage] || "UNKNOWN"}`;
            }
        } catch (e) {
            console.error("Could not query OTA status:", e);
        }
    }

    async stageCandidate() {
        const res = await fetch('/api/v1/ota/stage', { method: 'POST' });
        const data = await res.json();
        this.logFeedback(`Candidate staged: ${data.stage}`);
        this.refreshStatus();
    }

    async advanceStage() {
        const res = await fetch('/api/v1/ota/advance', { method: 'POST' });
        const data = await res.json();
        this.logFeedback(`Stage advanced: ${data.stage}`);
        this.refreshStatus();
    }

    async rollback() {
        const res = await fetch('/api/v1/ota/rollback', { method: 'POST' });
        const data = await res.json();
        this.logFeedback("Emergency Rollback Executed!");
        this.refreshStatus();
    }

    logFeedback(msg) {
        const el = document.getElementById('ota-status-log');
        if (el) el.innerText = msg;
    }
}

window.otaManager = new OtaManager();