# Universal Parameterized Device Container (`Dockerfile.device_runtime`)

`sentinel-matrix` emulates **8 Universal Industrial Device Archetypes** using a single parameterized base container image: `sentinel-matrix/device-runtime:latest` (`docker/Dockerfile.device_runtime`).

Rather than maintaining separate image definitions for PLCs, sensors, cameras, and gateways, a single C/Python runtime binary (`device_runtime.py`) dynamically assumes specific physical behaviors, protocols, and continuous 4th-order Runge-Kutta (RK4) ODE physics calculations based on environment variables.

---

## 1. The 8 Universal Device Archetypes

```text
 ┌─────────────────────────────────────────────────────────────┐
 │ UNIVERSAL DEVICE RUNTIME (sentinel-matrix/device-runtime)   │
 ├─────────────────────────────────────────────────────────────┤
 │ [1] modular_plc    : Modbus/S7/DNP3 Multi-Register Controller│
 │ [2] smart_sensor   : RK4 Continuous Vibration & Temp Physics│
 │ [3] grid_ied       : IEC 61850 GOOSE/MMS Power Substation   │
 │ [4] safety_sis     : SIL3 TriStation Emergency Shutdown     │
 │ [5] edge_ipc       : Linux Gateway running blackbox-sentinel│
 │ [6] vision_lidar   : 640x360 Thermal Video & 360-deg LiDAR  │
 │ [7] 5g_gateway     : 3GPP N3 GTP-U UPF Wireless Gateway     │
 │ [8] space_transceiver: CCSDS 133.0-B-2 LEO Telemetry Node   │
 └──────────────────────────────┬──────────────────────────────┘
                                │ Exposes Interactive Control Hooks
                                ▼
         [ Port 8088 HTTP Fault Injection & Anomaly Triggers ]
```

---

## 2. Interactive Anomaly & Fault Injection Hooks (Port 8088)

Every device container exposes a lightweight HTTP control hook on port **`8088`**, allowing test engineers and adversary scripts to trigger physical process faults:

```bash
# Inject bearing overheating fault into vibration sensor
curl -X POST http://10.240.1.31:8088/trigger_fault \
    -H "Content-Type: application/json" \
    -d '{"fault_type": "bearing_thermal_runaway", "severity": 0.95}'
```

### Supported Fault Types
* `bearing_vibration_spike`: Simulates mechanical bearing failure (Modbus :15502).
* `thermal_hotspot_surge`: Generates 640x360 thermal video hotspot (RTSP :8554 / WHEP :8889).
* `grid_voltage_sag`: Induces 50 Hz grid harmonics and sags (Modbus :15501).
* `perimeter_breach`: Generates synthetic 360-degree LiDAR range finding anomalies (UDP :2368).
