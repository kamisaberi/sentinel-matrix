// Master App Controller
document.addEventListener('DOMContentLoaded', () => {
    const tabs = document.querySelectorAll('.nav-tab');
    const panes = document.querySelectorAll('.tab-pane');

    tabs.forEach(tab => {
        tab.addEventListener('click', () => {
            tabs.forEach(t => t.classList.remove('active'));
            panes.forEach(p => p.classList.remove('active'));

            tab.classList.add('active');
            const targetId = tab.getAttribute('data-tab');
            const targetPane = document.getElementById(targetId);
            if (targetPane) {
                targetPane.classList.add('active');
            }

            // Trigger redraws if canvas views are opened
            if (targetId === 'tab-topology' && window.fleetTopology) {
                window.fleetTopology.resize();
            }
            if (targetId === 'tab-pipeline' && window.dagVisualizer) {
                window.dagVisualizer.resize();
            }
        });
    });

    // Report Generation Buttons
    const btnCmmc = document.getElementById('btn-report-cmmc');
    const btnScada = document.getElementById('btn-report-scada');
    const reportOut = document.getElementById('report-output');

    if (btnCmmc) {
        btnCmmc.addEventListener('click', async () => {
            reportOut.textContent = "Compiling CMMC 2.0 / NIST SP 800-171 Audit Package...";
            try {
                const res = await fetch('/api/v1/reports/cmmc');
                reportOut.textContent = await res.text();
            } catch (e) {
                reportOut.textContent = "Error: Nexus server unreachable.";
            }
        });
    }

    if (btnScada) {
        btnScada.addEventListener('click', async () => {
            reportOut.textContent = "Compiling IEC 62443 Industrial Cybersecurity Audit Package...";
            try {
                const res = await fetch('/api/v1/reports/scada');
                reportOut.textContent = await res.text();
            } catch (e) {
                reportOut.textContent = "Error: Nexus server unreachable.";
            }
        });
    }
});