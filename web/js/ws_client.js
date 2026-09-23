// Real-time Event-Driven Telemetry Client for Sentinel Nexus
class NexusStreamClient {
    constructor() {
        this.eventSource = null;
        this.reconnectInterval = 3000;
        this.connect();
    }

    connect() {
        console.log("[*] Establishing real-time event stream to Nexus...");
        this.eventSource = new EventSource('/api/v1/telemetry/stream');

        this.eventSource.onopen = () => {
            console.log("[+] Real-time telemetry stream established.");
            const dot = document.querySelector('.pulse-dot');
            if (dot) dot.style.boxShadow = "0 0 12px #2ea043";
        };

        // Live eBPF Drop Event
        this.eventSource.addEventListener('drop_event', (e) => {
            try {
                const drop = JSON.parse(e.data);
                this.handleDropAlert(drop);
            } catch (err) {
                console.error("Malformed drop event:", err);
            }
        });

        // Instant Threat Broadcast Alert
        this.eventSource.addEventListener('threat_broadcast', (e) => {
            try {
                const threat = JSON.parse(e.data);
                this.handleThreatAlert(threat);
            } catch (err) {
                console.error("Malformed threat alert:", err);
            }
        });

        // Live Heartbeat Update
        this.eventSource.addEventListener('heartbeat_sync', (e) => {
            if (typeof fetchFleetData === 'function') {
                fetchFleetData();
            }
        });

        this.eventSource.onerror = () => {
            console.warn("[-] Real-time stream disconnected. Reconnecting in 3s...");
            this.eventSource.close();
            setTimeout(() => this.connect(), this.reconnectInterval);
        };
    }

    handleDropAlert(drop) {
        // Increment UI counter immediately without waiting for poll
        const dropEl = document.getElementById('val-drops');
        if (dropEl) {
            let current = parseInt(dropEl.innerText.replace(/,/g, '')) || 0;
            dropEl.innerText = (current + drop.count).toLocaleString();
        }
    }

    handleThreatAlert(threat) {
        const feedback = document.getElementById('broadcast-result');
        if (feedback) {
            feedback.innerText = `[ALERT] Threat broadcast received: Target IP ${threat.target_ip} blocked in kernel!`;
            feedback.style.color = "#f85149";
            setTimeout(() => { feedback.style.color = "#58a6ff"; }, 5000);
        }
    }
}

// Instantiate live stream
window.addEventListener('DOMContentLoaded', () => {
    window.nexusStream = new NexusStreamClient();
});