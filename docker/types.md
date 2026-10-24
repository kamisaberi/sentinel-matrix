If you try to write a separate `Dockerfile` for every brand and model of sensor, PLC, and edge device in the world, you will end up with **hundreds of static files** that duplicate 95% of the same Linux base and differ only by a protocol listener or register configuration.

In industrial automation and cyber-physical systems (CPS), despite thousands of vendor catalog numbers (Siemens, Schneider, ABB, Honeywell, Rockwell, Omron, Phoenix Contact), **all sensors and edge devices in the world collapse into exactly 8 Core Architectural Archetypes**.

Here is the complete taxonomy of those 8 archetypes, the protocols they speak, and the architectural pattern used to simulate all of them without creating hundreds of static Dockerfiles.

---

### The 8 Universal Device Archetypes of the Industrial World

```text
========================================================================================================================
                                     THE 8 UNIVERSAL CPS DEVICE ARCHETYPES
========================================================================================================================
 Archetype #   Device Class               Real-World Hardware Examples               Primary Protocols & Telemetry
────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────
 [Type 1]      Constrained Smart Sensors  Vibration probes, 4-20mA pressure sensors, Modbus RTU/TCP, MQTT,
               & Remote Telemetry Units   IO-Link hubs, Endress+Hauser flowmeters    CoAP, HTTP JSON
 ───────────────────────────────────────────────────────────────────────────────────────────────────────────────────────
 [Type 2]      Modular Industrial PLCs    Siemens S7-1200/1500, Schneider M340/M580, S7Comm, Modbus TCP,
               & Automation PACs          Rockwell ControlLogix, CODESYS Soft-PLCs   EtherNet/IP (CIP), Profinet
 ───────────────────────────────────────────────────────────────────────────────────────────────────────────────────────
 [Type 3]      Substation Protection      ABB Relion, Siemens SIPROTEC,              IEC 60870-5-104, IEC 61850 (GOOSE/SV),
               Relays & Grid IEDs         GE Multilin, SEL-411L Transmission Relay   DNP3, IEEE C37.118 Synchrophasor (PMU)
 ───────────────────────────────────────────────────────────────────────────────────────────────────────────────────────
 [Type 4]      Safety Instrumented        Schneider Triconex, HIMA HIMax,            TriStation 1131, Safety over Profinet,
               Systems (SIS / TMR)        Pilz PNOZmulti, Yokogawa ProSafe-RS        Fail-Safe CIP (Safety Integrity Level 3)
 ───────────────────────────────────────────────────────────────────────────────────────────────────────────────────────
 [Type 5]      Industrial Edge Compute    Advantech IPCs, Siemens Microbox PC,       OPC UA Server/Client, ROS2,
               IPCs & Gateway Controllers Beckhoff CX Embedded PC, KUKA KRC5         gRPC, REST API, Zero-Copy Tensors
 ───────────────────────────────────────────────────────────────────────────────────────────────────────────────────────
 [Type 6]      Vision, Spatial &          FLIR thermal cameras, Axis ONVIF cams,     RTSP video stream, ONVIF profile S/T,
               Imaging Sensors            Sick LiDAR scanners, GE Healthcare PACS    LiDAR Point Cloud (UDP), DICOM C-STORE
 ───────────────────────────────────────────────────────────────────────────────────────────────────────────────────────
 [Type 7]      Wireless Field Gateways    Quectel/Telit 5G SA modems, Kerlink        3GPP N3 GTP-U (UDP 2152), LoRaWAN Semtech
               & Private 5G/Cellular UEs  LoRa gateways, Siemens Scalance W-700      packet forwarder, WirelessHART
 ───────────────────────────────────────────────────────────────────────────────────────────────────────────────────────
 [Type 8]      Aerospace, UAV & Space     CubeSat On-Board Computers (OBC),          CCSDS Space Packet (133.0-B-2),
               Data Link Controllers      Pixhawk/MAVLink autopilots, Drone DLI      NATO STANAG 4586, SpaceWire
========================================================================================================================
```

---

### Detailed Breakdown of the 8 Archetypes

#### 1. Constrained Smart Sensors & Remote Terminal Units (RTUs)
* **What they do:** Low-frequency sensor telemetry (temperature, vibration, pressure, pH, fluid flow).
* **Hardware Profile:** 8-bit/32-bit microcontrollers (ARM Cortex-M, ESP32, PIC). Memory $\le 512\text{ KB}$.
* **Real-World Examples:**
  * Endress+Hauser Promag electromagnetic flowmeters.
  * Emerson Rosemount pressure transmitters.
  * IFM Electronic IO-Link master vibration sensors.
* **Network Behavior:** Emits 1 to 10 packets per second. Polled via Modbus holding registers (function codes `0x03`, `0x04`) or pushes lightweight MQTT/CoAP JSON telemetry.

#### 2. Modular Industrial PLCs & Automation PACs
* **What they do:** Cyclic ladder logic execution (10ms–100ms cycle scans) controlling conveyor belts, pumps, valves, and mixing tanks.
* **Hardware Profile:** Real-Time OS (VxWorks, QNX, Linux RT-Preempt).
* **Real-World Examples:**
  * Siemens Simatic S7-300 / S7-1200 / S7-1500.
  * Schneider Electric Modicon M340 / M580.
  * Rockwell Automation Allen-Bradley ControlLogix 5580.
  * Omron Sysmac NJ/NX.
* **Network Behavior:** Multi-protocol server listening simultaneously on port 102 (S7Comm/ISO-TSAP), port 502 (Modbus), and port 44818 (EtherNet/IP CIP). Contains physical I/O registers (coils, memory blocks).

#### 3. Substation Protection Relays & Smart Grid IEDs
* **What they do:** High-speed circuit breaker tripping, busbar differential protection, voltage phase monitoring.
* **Hardware Profile:** Radiation-hardened, DSP-driven embedded processors with microsecond response times.
* **Real-World Examples:**
  * Siemens SIPROTEC 5 protection relays.
  * ABB Relion 670 series transmission protection.
  * Schweitzer Engineering Laboratories (SEL-411L / SEL-421).
  * GE Multilin UR series.
* **Network Behavior:** Constant high-priority telemetry over IEC 60870-5-104 (TCP port 2404), DNP3 (port 20000), and layer-2 multicast IEC 61850 GOOSE/Sampled Values directly on Ethernet frames.

#### 4. Safety Instrumented Systems (SIS / TMR)
* **What they do:** Emergency Shutdown (ESD), burner management, reactor trip systems. If all software fails, the SIS trips the plant to prevent physical explosions (SIL 3 rated).
* **Hardware Profile:** Triple Modular Redundancy (TMR) with three voting CPUs.
* **Real-World Examples:**
  * Schneider Electric Triconex (Tricon / Trident).
  * HIMA HIMax / HIMatrix.
  * Yokogawa ProSafe-RS.
* **Network Behavior:** Proprietary lock-step safety protocols (e.g. TriStation protocol on UDP port 1502). Very strict session state machine.

#### 5. Industrial Edge Compute IPCs & Smart Gateways
* **What they do:** Runs local analytics, machine vision inference, edge filtering, and protocol translation (e.g. Modbus to OPC UA / MQTT cloud bridge).
* **Hardware Profile:** Fanless industrial PCs (x86_64 Intel Celeron/Core i7 or ARM64 Rockchip/Jetson).
* **Real-World Examples:**
  * Advantech UNO / ARK fanless box IPCs.
  * Siemens Microbox PC (Simatic IPC227E / IPC427E).
  * Beckhoff Embedded PC (CX5140) running TwinCAT 3.
  * KUKA KRC5 robot controllers running ROS2.
* **Network Behavior:** Runs full Linux OS, listens on OPC UA (port 4840), gRPC (port 50051), and local REST APIs.

#### 6. Industrial Vision, Thermal & Spatial Sensors
* **What they do:** Live visual quality inspection, perimeter thermal security, autonomous vehicle navigation, hospital medical imaging.
* **Hardware Profile:** High-throughput streaming DSPs with optical/infrared camera sensors.
* **Real-World Examples:**
  * FLIR A310 / A615 thermal monitoring cameras.
  * Axis Communications industrial IP cameras.
  * SICK microScan3 / Velodyne LiDAR laser scanners.
  * GE Healthcare / Siemens Healthineers CT/MRI scanners.
* **Network Behavior:** Emits high-bandwidth UDP streams: RTSP H.264 video (port 554), DICOM C-STORE image transmission (port 104), or raw LiDAR point clouds (port 2368).

#### 7. Industrial Wireless Field Gateways & Private 5G UEs
* **What they do:** Connects remote oil wells, automated guided vehicles (AGVs), and smart meters to the central control grid over cellular or radio meshes.
* **Hardware Profile:** Ruggedized industrial routers with 5G Standalone (5G SA) basebands and SIM slots.
* **Real-World Examples:**
  * Telit / Quectel 3GPP Rel 16 5G industrial modems.
  * Cisco Catalyst Industrial Wireless 3700.
  * Siemens SCALANCE W / SCALANCE M cellular routers.
  * Kerlink Wirnet industrial LoRaWAN gateways.
* **Network Behavior:** Bridges local Modbus/Ethernet traffic into 3GPP N3 GTP-U tunnels (UDP port 2152) or pushes LoRa Semtech UDP frames (port 1700).

#### 8. Aerospace, Uncrewed Vehicles & Space Link Controllers
* **What they do:** Autopilot navigation for defense drones, flight termination, satellite downlinks and uplink telecommanding.
* **Hardware Profile:** Radiation-hardened microprocessors (LEON3 / RAD750) or STM32 flight controllers.
* **Real-World Examples:**
  * CubeSat On-Board Computers (OBC) (ISISpace, AAC Clyde Space).
  * Pixhawk 6X / ArduPilot / PX4 drone avionics.
  * UAV Ground Data Terminal (GDT) transceivers.
* **Network Behavior:** Transmits and receives CCSDS Space Packets (CCSDS 133.0-B-2), NATO STANAG 4586 DLI messages, or MAVLink v2 telemetry over UDP/serial.

---

### The Architectural Solution: How to Eliminate All Static Dockerfiles

Instead of writing 1,000 static `Dockerfile.<device_name>`, modern digital twins use **The Universal Parameterized Device Container (`Dockerfile.universal_device`)**:

```text
 ┌────────────────────────────────────────────────────────────────────────────────────────┐
 │                      THE UNIVERSAL DEVICE CONTAINER ARCHITECTURE                       │
 └────────────────────────────────────────────────────────────────────────────────────────┘

                                    ONE BASE DOCKERFILE
                             [ docker/Dockerfile.device_runtime ]
                                            │
               ┌────────────────────────────┼────────────────────────────┐
               ▼                            ▼                            ▼
      [ Profile A: Siemens S7 ]    [ Profile B: 5G UPF Gateway ]  [ Profile C: Substation Relay ]
      • Protocol: S7Comm (102)     • Protocol: GTP-U (2152)       • Protocol: IEC-104 (2404)
      • Physics: Thermal Tank      • Tunnel: S-NSSAI URLLC        • Physics: Busbar Breaker
      • Regs: configs/s7.json      • Policy: configs/5g.yaml      • Regs: configs/ied.json
```

### How It Works in Practice:

You only need **two universal base container images** in `sentinel-matrix`:
1. **`Dockerfile.device_runtime` (C/Python Multi-Protocol Engine):**
   * Houses the lightweight protocol engines (Modbus, S7, IEC-104, DNP3, 5G GTP-U, CCSDS, RTSP).
   * Which protocol and register map it launches is chosen by **passing a single environment variable or config parameter in your scenario YAML**:
     ```yaml
     - name: "turbine_vibration_sensor"
       image: "sentinel-matrix/device-runtime:latest"
       command: ["--protocol", "modbus", "--type", "vibration", "--port", "502"]
     ```
2. **`Dockerfile.sentinel` (The Appliance Engine):**
   * Stays identical regardless of the target, because Blackbox Sentinel's ModelRouter and eBPF filters dynamically inspect whatever traffic hits its interfaces.

### Summary

* **You do not need hundreds of Dockerfiles.**
* Every industrial device in existence belongs to one of these **8 universal archetypes**.
* By using **one parameterized device container image** driven by clean scenario YAML profiles, `sentinel-matrix` can simulate thousands of different devices on the fly without writing a single new Dockerfile.