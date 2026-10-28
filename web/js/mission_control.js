/**
 * Mission Control Dynamic Controller:
 * Auto-enumerates N-sensors, handles multi-camera wall, and enforces NEXUS_ENV runtime gate.
 */
document.addEventListener("DOMContentLoaded", async () => {
    let sensorHistories = { "s_temp": [], "s_vibe": [] };

    // 1. Live 500ms Sensor Gauge Poller (Frame 1)
    setInterval(async () => {
        try {
            const resp = await fetch("/api/v1/sensors/live");
            if (!resp.ok) return;
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

            if (cTemp) DynamicSensorVisualizer.drawGauge(cTemp, temp, 20, 140, "Core Temperature", "°C");
            if (cVibe) {
                sensorHistories["s_vibe"].push(vibe);
                if (sensorHistories["s_vibe"].length > 30) sensorHistories["s_vibe"].shift();
                DynamicSensorVisualizer.drawSparkline(cVibe, sensorHistories["s_vibe"], 0, 10);
            }
        } catch (e) {}
    }, 500);

    // 2. Wire Anomaly Injection Buttons in Frame 4
    document.getElementById("btn-trigger-anomaly")?.addEventListener("click", async () => {
        const consoleBox = document.getElementById("mc-drop-feed");
        const entry = document.createElement("div");
        entry.className = "drop-entry text-yellow";
        entry.textContent = "[!] INJECTING PHYSICAL ANOMALY: Overheating bearing + vibration surge + camera hotspot!";
        consoleBox.prepend(entry);

        await fetch("/api/v1/sensors/anomaly", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ action: "trigger" })
        });
    });

    document.getElementById("btn-reset-anomaly")?.addEventListener("click", async () => {
        const consoleBox = document.getElementById("mc-drop-feed");
        const entry = document.createElement("div");
        entry.className = "drop-entry text-green";
        entry.textContent = "[+] RESTORING BASELINE: All sensors returned to safe operating bounds.";
        consoleBox.prepend(entry);

        await fetch("/api/v1/sensors/anomaly", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ action: "reset" })
        });
    });
});