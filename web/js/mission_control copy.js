/**
 * Mission Control Dynamic Controller:
 * Self-regulating non-blocking sensor poller with zero socket saturation.
 */
document.addEventListener("DOMContentLoaded", async () => {
    let sensorHistories = { "s_temp": [], "s_vibe": [] };
    let isPolling = false;

    // 1. Sequential Non-Blocking Poller (Guarantees only ONE in-flight request)
    async function pollLiveSensors() {
        if (isPolling) return;
        isPolling = true;

        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 1200); // 1.2s abort guard

        try {
            const resp = await fetch("/api/v1/sensors/live", { signal: controller.signal });
            clearTimeout(timeoutId);

            if (resp.ok) {
                const data = await resp.json();
                const r = data.readings || {};

                const temp = r.temperature_c !== undefined ? r.temperature_c : 74.5;
                const vibe = r.vibration_mm_s !== undefined ? r.vibration_mm_s : 1.24;

                const cTemp = document.getElementById("canvas-s_temp");
                const cVibe = document.getElementById("canvas-s_vibe");
                const valTemp = document.getElementById("val-s_temp");
                const valVibe = document.getElementById("val-s_vibe");

                if (valTemp) valTemp.textContent = `${temp} °C`;
                if (valVibe) valVibe.textContent = `${vibe} mm/s`;

                if (cTemp && window.DynamicSensorVisualizer) {
                    DynamicSensorVisualizer.drawGauge(cTemp, temp, 20, 140, "Core Temperature", "°C");
                }
                if (cVibe && window.DynamicSensorVisualizer) {
                    sensorHistories["s_vibe"].push(vibe);
                    if (sensorHistories["s_vibe"].length > 30) sensorHistories["s_vibe"].shift();
                    DynamicSensorVisualizer.drawSparkline(cVibe, sensorHistories["s_vibe"], 0, 10);
                }
            }
        } catch (e) {
            // Silently handle timeouts or offline container states without crashing UI
        } finally {
            isPolling = false;
            // Schedule the NEXT request ONLY after the previous one has completely finished
            setTimeout(pollLiveSensors, 1000);
        }
    }

    // Start single-instance sequential polling
    pollLiveSensors();

    // 2. Wire Anomaly Injection Buttons in Frame 4
    document.getElementById("btn-trigger-anomaly")?.addEventListener("click", async () => {
        const consoleBox = document.getElementById("mc-drop-feed");
        const entry = document.createElement("div");
        entry.className = "drop-entry text-yellow";
        entry.textContent = "[!] INJECTING PHYSICAL ANOMALY: Overheating bearing + vibration surge!";
        consoleBox?.prepend(entry);

        await fetch("/api/v1/sensors/anomaly", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ action: "trigger" })
        }).catch(() => {});
    });

    document.getElementById("btn-reset-anomaly")?.addEventListener("click", async () => {
        const consoleBox = document.getElementById("mc-drop-feed");
        const entry = document.createElement("div");
        entry.className = "drop-entry text-green";
        entry.textContent = "[+] RESTORING BASELINE: All sensors returned to safe operating bounds.";
        consoleBox?.prepend(entry);

        await fetch("/api/v1/sensors/anomaly", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ action: "reset" })
        }).catch(() => {});
    });
});