Here is the detailed architectural portfolio of **10 production-scale, real-world dynamic industrial scenarios**. 

Each scenario is modeled after real critical infrastructure (water authorities, national transmission grids, gigafactories, nuclear plants, and satellite stations). Every scenario incorporates **10+ field sensors**, **multiple edge appliances running different AI backends** (Intel OpenVINO, NVIDIA TensorRT, Rockchip RKNN), **a central Sentinel-Nexus command plane**, and **Purdue-model segmented network zones** (with air-gapped subnets).

---

# The 10 Master Industrial Scenarios Portfolio

```text
========================================================================================================================
                          10 REAL-WORLD PRODUCTION SCENARIOS (HUB RELEASE PORTFOLIO)
========================================================================================================================
 #   Scenario Name                    Target Sector               Scale & Hardware Footprint      Primary Protocols
────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────
 01  water_utility_regional_grid      Water & Wastewater          1 Nexus, 3 Edge, 4 PLCs, 12 Sens Modbus TCP, S7Comm
 02  substation_500kv_transmission    Power Transmission (TSO)    1 Nexus, 3 Edge, 4 IEDs, 11 Sens IEC-104, DNP3, C37.118
 03  smart_factory_5g_robotics        Automotive & Private 5G     1 Nexus, 4 Edge, 3 PLCs, 14 Sens 3GPP GTP-U, S7Comm, Profinet
 04  refinery_cracking_sis_triad      Petrochemical & Refining    1 Nexus, 3 Edge, 1 SIS, 13 Sens  Triconex, Modbus, OPC UA
 05  container_terminal_port_mesh     Maritime & Automated Ports  1 Nexus, 3 Edge, 4 PLCs, 11 Sens 5G GTP-U, Modbus, NMEA
 06  nuclear_turbine_island_cooling   Nuclear Energy Generation   1 Nexus, 3 Edge, 4 I&C, 14 Sens  S7Comm, Modbus, Discrete I&C
 07  hospital_pacs_surgical_microgrid Healthcare & Medical IoMT   1 Nexus, 3 Edge, 2 BMS, 11 Sens  DICOM, BACnet/IP, Modbus
 08  transcontinental_gas_pipeline    Gas Transmission Pipeline   1 Nexus, 4 Edge, 4 RTUs, 12 Sens DNP3, Modbus TCP, OPC UA
 09  orbital_satellite_ground_station Aerospace & Space Ground    1 Nexus, 3 Edge, 3 Rad, 11 Sens  CCSDS 133.0-B-2, STANAG 4586
 10  chemical_reactor_copilot_trism   Specialty Chemicals & AI    1 Nexus, 3 Edge, 3 PLCs, 12 Sens Modbus, S7, AI TRiSM, Live-SBOM
========================================================================================================================
```

---

### Deep-Dive Specifications for Each Scenario

---

### Scenario 01: `water_utility_regional_grid`
* **Real-World Reference:** *Vitens / Waternet Drinking Water Production Facility*
* **Total Containers:** **20 nodes** (1 Nexus, 3 Edge Appliances, 4 Mock PLCs, 12 Field Sensors, 1 Adversary, 1 Traffic-Gen).
* **Network Segmentation (Purdue Model):**
  * `enterprise_dmz_net` (`192.168.10.0/24`) $\to$ External reporting & Web C2.
  * `water_scada_core_net` (`10.210.10.0/24`, `internal: true`) $\to$ Supervisory SCADA ring (Strict Air-Gap).
  * `water_fieldbus_net` (`10.210.20.0/24`, `internal: true`) $\to$ Physical pumping & chemical dosing loop.
* **Nodes & Appliances:**
  * `nexus`: Central C2 (Port 9443).
  * `sentinel-edge-intake`: Edge box running OpenVINO inspecting raw river intake pumping.
  * `sentinel-edge-filtration`: Edge box inspecting rapid gravity sand filtration.
  * `sentinel-edge-distribution`: Edge box inspecting high-pressure clean water distribution.
  * 4 Mock PLCs: `intake-plc` (502), `filter-plc` (502), `chlorine-plc` (502), `reservoir-plc` (102).
* **The 12 Field Sensors:**
  1. Electromagnetic Flowmeter (Intake)
  2. Suction Pressure Transmitter
  3. Raw Turbidity Sensor (NTU)
  4. Sand Filter Differential Pressure Sensor
  5. Filter Bed Water Level Ultrasonic Probe
  6. Backwash Flowmeter
  7. Chlorine Residual Analyzer (PPM)
  8. Water pH Electrochemical Probe
  9. Chemical Storage Tank Level Sensor
  10. High-Lift Booster Pump Vibration Sensor
  11. Distribution Discharge Pressure Transmitter
  12. PAC3200 Substation Power Meter
* **Primary Attack Vectors:** Modbus FC05 coil override shutting down chlorine neutralization; water reservoir overflow attack.

---

### Scenario 02: `substation_500kv_transmission`
* **Real-World Reference:** *TenneT / 50Hertz High-Voltage Transmission Substation*
* **Total Containers:** **20 nodes** (1 Nexus, 3 Edge Appliances, 4 Grid IEDs, 11 Substation Sensors, 1 Adversary, 1 Traffic-Gen).
* **Network Segmentation:**
  * `substation_station_bus` (`10.240.10.0/24`, `internal: true`) $\to$ Telecontrol dispatch bus.
  * `substation_process_bus` (`10.240.20.0/24`, `internal: true`) $\to$ Protection relay tripping bus.
  * `tso_wan_telecontrol` (`192.168.50.0/24`) $\to$ TSO wide-area dispatch link.
* **Nodes & Appliances:**
  * `sentinel-edge-bay01`: Transmission line feeder protection (Intel OpenVINO).
  * `sentinel-edge-bay02`: Auto-transformer 500kV/220kV protection (NVIDIA TensorRT).
  * `sentinel-edge-busbar`: Busbar differential protection (Rockchip RKNN).
  * 4 IEDs: ABB Relion 670 twin (2404), Siemens SIPROTEC twin (2404), SEL-411L twin (20000), Bus Coupler IED (2404).
* **The 11 Substation Sensors:**
  1. Active Power Flow (MW) Transducer
  2. Reactive Power Flow (MVAR) Transducer
  3. 50.0 Hz Line Frequency Sensor
  4. 3-Phase Busbar Voltage Transformer (PT)
  5. 3-Phase Line Current Transformer (CT)
  6. Transformer Primary Winding Temperature Probe
  7. Transformer Dielectric Oil Level Sensor
  8. SF6 Circuit Breaker Gas Density Monitor
  9. Circuit Breaker Trip Coil Current Sensor
  10. Substation DC Battery Bank Voltage Monitor
  11. Synchrophasor (PMU) Phase Angle Sensor
* **Primary Attack Vectors:** Industroyer2 IEC-104 high-voltage breaker trip telecommands; Synchrophasor C37.118 time-desync injection.

---

### Scenario 03: `smart_factory_5g_robotics`
* **Real-World Reference:** *BMW / Mercedes-Benz "Factory 56" Private 5G Automotive Assembly Plant*
* **Total Containers:** **24 nodes** (1 Nexus, 4 Edge Appliances, 1 5G UPF Tunnel Gateway, 3 Siemens S7 PACs, 14 Sensors & Robotic Actuators, 1 Adversary).
* **Network Segmentation:**
  * `factory_it_net` (`172.16.10.0/24`) $\to$ Manufacturing Operations Management (MOM).
  * `private_5g_n3_tunnel` (`10.250.10.0/24`, `internal: true`) $\to$ 3GPP GTP-U user plane (UDP 2152).
  * `urllc_robot_cell_net` (`10.250.20.0/24`, `internal: true`) $\to$ Sub-millisecond robotic welding bus.
* **Nodes & Appliances:**
  * `upf-gateway`: 3GPP Standalone UPF terminating N3 GTP-U tunnels.
  * 4 Edge Nodes: Body-in-White Robotic Welding, Paint Shop Conveyors, Battery Pack Insertion, Final Assembly AGVs.
  * 3 Siemens S7-1500 PACs controlling welding turntable, elevator lift, and chassis transfer.
* **The 14 Factory Sensors & Actuators:**
  1. KUKA 6-Axis Robot Arm Joint Torque Sensor
  2. KUKA Robot Arm Motor Temperature Sensor
  3. Laser Weld Seam Tracking Camera
  4. Infrared Thermal Pyrometer (Weld Integrity)
  5. SICK MicroScan3 Safety Area LiDAR Scanner
  6. SICK Optical Light Curtain Beam Detector
  7. Paint Booth VOC Volatile Organic Gas Sensor
  8. Paint Humidity & Airflow Velocity Transmitter
  9. Automated Guided Vehicle (AGV) Wheel Odometry Sensor
  10. AGV Collision Proximity LiDAR
  11. AGV Lithium Battery Pack State-of-Charge (SoC) Monitor
  12. Battery Module Insertion Pneumatic Pressure Sensor
  13. Main Assembly Conveyor Belt Speed Encoder
  14. Central Compressed Air Header Pressure Sensor
* **Primary Attack Vectors:** 3GPP N3 GTP-U TEID spoofing (hopping from eMBB camera slice into URLLC robot arm slice); S7Comm CPU STOP command (0x29).

---

### Scenario 04: `refinery_cracking_sis_triad`
* **Real-World Reference:** *BASF / TotalEnergies Fluid Catalytic Cracking Unit (FCCU)*
* **Total Containers:** **19 nodes** (1 Nexus, 3 Edge Appliances, 1 Triconex SIS TMR Twin, 3 Distillation PLCs, 13 Sensors, 1 Adversary).
* **Network Segmentation:**
  * `refinery_dmz_net` (`192.168.30.0/24`) $\to$ Historian & supervisory consoles.
  * `dcs_process_net` (`10.180.1.0/24`, `internal: true`) $\to$ Continuous refining control loop.
  * `sis_safety_net` (`10.180.99.0/24`, `internal: true`) $\to$ SIL-3 emergency shutdown bus (Strict Air-Gap).
* **Nodes & Appliances:**
  * `triconex-sis`: Triple Modular Redundant (TMR) safety controller listening on TriStation protocol.
  * 3 Edge Appliances inspecting Crude Distillation, Catalytic Cracker, and Hydrotreater.
  * 3 PLCs managing reflux valves, steam injection, and fuel gas supply.
* **The 13 Refinery Sensors:**
  1. Reactor Bed Top Temperature Pyrometer (550°C)
  2. Regenerator Cyclone Flue Gas Temperature
  3. Reactor Riser Differential Pressure Transmitter
  4. Fractionator Column Overhead Pressure Sensor
  5. Reflux Drum Hydrocarbon Liquid Level Sensor
  6. Main Air Blower Suction Flowmeter
  7. Main Air Blower Turbine Vibration Sensor
  8. Heavy Gas Oil Flow Velocity Sensor
  9. Flare Stack Combustion Temperature Thermocouple
  10. Flammable Hydrocarbon Lower Explosive Limit (LEL) Gas Detector
  11. Hydrogen Sulfide (H2S) Toxic Gas Sensor
  12. Emergency Depressurization (ESD) Valve Position Transmitter
  13. Cooling Water Return Thermal Sensor
* **Primary Attack Vectors:** TRITON / Trisis TriStation 1131 safety logic override; runaway reactor bed temperature manipulation.

---

### Scenario 05: `container_terminal_port_mesh`
* **Real-World Reference:** *Port of Rotterdam / Port of Antwerp Automated Container Terminal*
* **Total Containers:** **19 nodes** (1 Nexus, 3 Edge Appliances, 1 5G/LoRa Gateway, 3 Crane PLCs, 11 Sensors, 1 Adversary).
* **Network Segmentation:**
  * `terminal_ops_net` (`172.20.0.0/24`) $\to$ Terminal Operating System (TOS).
  * `port_5g_wireless_net` (`10.230.1.0/24`) $\to$ Automated Guided Vehicle (AGV) radio mesh.
  * `crane_fieldbus_net` (`10.230.10.0/24`, `internal: true`) $\to$ Ship-to-Shore (STS) crane drive bus.
* **Nodes & Appliances:**
  * 3 Edge Appliances: STS Quay Crane 01, Automated Stacking Crane (ASC), AGV Logistics Fleet.
  * 3 PLCs controlling hoist winches, trolley travel, and automated twistlocks.
* **The 11 Port Sensors:**
  1. Ultrasonic Wind Speed Anemometer (Gale Force Cutoff)
  2. Spreader Container Corner Twistlock Engagement Sensor
  3. Hoist Cable Tension Load Cell (Tons)
  4. Hoist Motor Stator Temperature Thermistor
  5. Gantry Rail Anti-Collision LiDAR Scanner
  6. Spreader Optical Alignment Laser Sensor
  7. AGV Drive Motor RPM Encoder
  8. AGV Steering Angle Potentiometer
  9. AGV Radar Object Detection Sensor
  10. Reefer Container Refrigeration Temperature Sensor
  11. Terminal High-Mast Lighting Substation Meter
* **Primary Attack Vectors:** AIS/NMEA GPS vessel position spoofing; crane hoist overload limit override.

---

### Scenario 06: `nuclear_turbine_island_cooling`
* **Real-World Reference:** *EDF / Vattenfall 1,300 MWe Nuclear Power Plant Secondary Island*
* **Total Containers:** **22 nodes** (1 Nexus, 3 Edge Appliances, 4 Nuclear I&C Controllers, 14 Sensors, 1 Adversary).
* **Network Segmentation:**
  * `plant_computer_net` (`192.168.10.0/24`) $\to$ Non-safety technical monitoring.
  * `operational_ic_net` (`10.190.1.0/24`, `internal: true`) $\to$ Reactor secondary control (Strict Air-Gap).
  * `turbine_trip_net` (`10.190.2.0/24`, `internal: true`) $\to$ Turbine overspeed trip bus (Strict Air-Gap).
* **Nodes & Appliances:**
  * 3 Edge Nodes: Secondary Steam Loop, Turbine Generator, Condenser Cooling Water.
  * 4 Nuclear I&C Controllers (Teleperm XS twins running S7Comm and discrete I&C).
* **The 14 Nuclear Secondary Sensors:**
  1. Main Steam Header Pressure (70 bar)
  2. Main Steam Line Temperature (280°C)
  3. Steam Generator Narrow-Range Water Level Sensor
  4. Steam Generator Feedwater Venturi Flowmeter
  5. High-Pressure Turbine Inlet Stop Valve Position Sensor
  6. Turbine Rotor Speed (3,000 RPM) Magnetic Pickup Sensor
  7. Turbine Shaft Radial Vibration Proximity Probe
  8. Turbine Shaft Axial Thrust Position Sensor
  9. Generator Hydrogen Coolant Gas Pressure
  10. Main Condenser Vacuum Pressure Transmitter
  11. Condenser Circulating Cooling Water Intake Flowmeter
  12. Cooling Water Intake Differential Trash Rack Level
  13. Secondary Circuit Steam Line Radiation Monitor (N-16 Gamma Detector)
  14. Auxiliary Feedwater Pump Discharge Pressure Sensor
* **Primary Attack Vectors:** Stuxnet-style rotor overspeed desynchronization; feedwater pump manipulation driving steam generator dryout.

---

### Scenario 07: `hospital_pacs_surgical_microgrid`
* **Real-World Reference:** *Metropolitan Hospital Center Clinical Imaging & Life Support Microgrid*
* **Total Containers:** **18 nodes** (1 Nexus, 3 Edge Appliances, 2 Building Management PLCs, 11 Healthcare Sensors, 1 Adversary).
* **Network Segmentation:**
  * `hospital_enterprise_net` (`10.10.0.0/24`) $\to$ Electronic Health Records (EHR) & administration.
  * `medical_pacs_vlan` (`10.10.50.0/24`, `internal: true`) $\to$ DICOM imaging network.
  * `hospital_bms_power_net` (`10.10.90.0/24`, `internal: true`) $\to$ Backup generators, chillers, medical gas.
* **Nodes & Appliances:**
  * `sentinel-edge-pacs`: DICOM C-STORE anomaly inspection (NVIDIA TensorRT).
  * `sentinel-edge-microgrid`: Automatic Transfer Switch (ATS) & UPS battery monitoring.
  * `sentinel-edge-medgas`: Operating room oxygen & vacuum line monitoring.
* **The 11 Healthcare Sensors:**
  1. GE 3.0T MRI Scanner Liquid Helium Cryostat Pressure Sensor
  2. MRI Superconducting Magnet Shield Temperature Sensor
  3. Medical Liquid Oxygen Bulk Storage Tank Level
  4. Operating Room Medical Vacuum Line Pressure Sensor
  5. Surgical Suite HEPA Filter Differential Air Pressure Sensor
  6. Surgical Suite Relative Humidity Sensor
  7. Blood Bank Cold Storage Thermometer (-80°C)
  8. Critical Vaccine Storage Thermometer
  9. Emergency Diesel Generator 01 Coolant Temperature
  10. Uninterruptible Power Supply (UPS) Inverter Frequency Meter
  11. Isolation Transformer Ground Fault Current Monitor
* **Primary Attack Vectors:** DICOM patient image exfiltration; chiller tampering targeting MRI magnet quench; backup power ATS tripping.

---

### Scenario 08: `transcontinental_gas_pipeline`
* **Real-World Reference:** *Gasunie / Enbridge 48-Inch High-Pressure Gas Transmission Network*
* **Total Containers:** **21 nodes** (1 Nexus, 4 Edge Appliances, 4 Pipeline RTUs, 12 Field Sensors, 1 Adversary).
* **Network Segmentation:**
  * `scada_wan_net` (`192.168.80.0/24`) $\to$ National dispatch SCADA WAN.
  * `compressor_station_net` (`10.140.1.0/24`, `internal: true`) $\to$ Station gas turbine & compressor control.
  * `pipeline_block_valves_net` (`10.140.2.0/24`, `internal: true`) $\to$ Remote mainline valve telemetry.
* **Nodes & Appliances:**
  * 4 Edge Appliances: Compressor Station Alpha, Mainline Block Valve 14, City Gate Metering Skid, Underground Gas Storage.
  * 4 RTUs speaking DNP3 (20000) and Modbus TCP (502).
* **The 12 Pipeline Sensors:**
  1. Pipeline Gas Suction Pressure (75 bar)
  2. Pipeline Gas Discharge Pressure (82 bar)
  3. Gas Turbine Driver Shaft RPM Sensor
  4. Centrifugal Compressor Suction Flow Ultrasonic Meter
  5. Gas Chromatograph Heating Value (BTU / Wobbe Index) Analyzer
  6. Hydrocarbon Dew Point Optical Analyzer
  7. Pipeline Mainline Block Valve 14 Actuator Hydraulic Pressure
  8. Pipeline Soil Ground Strain & Seismic Vibration Sensor
  9. Cathodic Protection Pipe-to-Soil Voltage Potential Sensor
  10. Gas Compressor Station Combustible Gas Sniffer (LEL)
  11. Fuel Gas Pressure Regulator Pressure Transmitter
  12. Emergency Shutdown (ESD) Depressurization Vent Line Flowmeter
* **Primary Attack Vectors:** DNP3 Direct Operate valve slam-shut causing acoustic shockwave rupture; false flow telemetry injection.

---

### Scenario 09: `orbital_satellite_ground_station`
* **Real-World Reference:** *KSAT / SES Earth Observation Ground Link Terminal*
* **Total Containers:** **18 nodes** (1 Nexus, 3 Edge Appliances, 3 Space Telemetry Transceivers, 11 Ground Sensors, 1 Adversary).
* **Network Segmentation:**
  * `ground_station_c2_net` (`192.168.100.0/24`) $\to$ Mission Operations Center (MOC).
  * `space_radio_demod_net` (`10.220.10.0/24`) $\to$ High-speed satellite demodulator stream.
  * `antenna_pedestal_net` (`10.220.20.0/24`, `internal: true`) $\to$ Dish motor servo control bus.
* **Nodes & Appliances:**
  * `sentinel-edge-ccsds`: Inspects CCSDS 133.0-B-2 Space Packets in $< 120\,\text{ns}$.
  * `sentinel-edge-stanag`: Inspects NATO STANAG 4586 UAV telemetry streams.
  * `sentinel-edge-pedestal`: Inspects dish tracking motors and elevation resolvers.
* **The 11 Ground Link Sensors:**
  1. 13-Meter Parabolic Antenna Azimuth Optical Encoder
  2. Antenna Elevation Axis Resolver Sensor
  3. Antenna Azimuth Drive Motor Current Transducer
  4. Ka-Band Feed Horn Cryogenic Temperature Sensor
  5. Low-Noise Amplifier (LNA) DC Bias Current Monitor
  6. Intermediate Frequency (IF 70 MHz) Signal Power Sensor
  7. Receiver Carrier-to-Noise Ratio (C/N0 dB-Hz) Transducer
  8. Bit Error Rate (BER) Pre-Viterbi Stream Counter
  9. Ground Station Atomic Clock (Rubidium/GPSDO) 10 MHz Reference Monitor
  10. High-Power Amplifier (HPA 2 kW Klystron) Forward RF Power Sensor
  11. Radome Internal Air Conditioning Temperature Sensor
* **Primary Attack Vectors:** Unauthorized AOCS satellite de-orbit telecommand (Packet Type 1, APID 0x010); ghost spacecraft sequence count replay attack.

---

### Scenario 10: `chemical_reactor_copilot_trism`
* **Real-World Reference:** *Continuous Exothermic Polyalkylene Reactor Supervised by an OT LLM Copilot*
* **Total Containers:** **20 nodes** (1 Nexus, 3 Edge Appliances, 1 GenAI SCADA Copilot Agent, 3 Chemical PLCs, 12 Sensors, 1 Adversary).
* **Network Segmentation:**
  * `plant_operations_dmz` (`192.168.200.0/24`) $\to$ HMI and Copilot Chat Console.
  * `reactor_safety_net` (`10.160.10.0/24`, `internal: true`) $\to$ Exothermic reactor control (Strict Air-Gap).
  * `ai_tool_calling_bus` (`10.160.20.0/24`, `internal: true`) $\to$ API bus between Copilot and Modbus PLCs.
* **Nodes & Appliances:**
  * `sentinel-edge-trism`: Sub-150ns AI TRiSM streaming token firewall inspecting Copilot prompts.
  * `sentinel-edge-reactor`: Monitors jacket coolant and catalyst feed lines.
  * `sentinel-edge-sbom`: Enforces in-kernel Live-SBOM $W\oplus X$ memory protection on control daemons.
  * `copilot-agent`: Industrial AI assistant exposing an HTTP tool-calling API.
* **The 12 Chemical Reactor Sensors:**
  1. Reactor Core Centerline Thermal Thermocouple (180°C Exothermic Runaway Limit)
  2. Reactor Jacket Cooling Water Inlet Temperature
  3. Reactor Jacket Cooling Water Outlet Temperature
  4. Jacket Coolant Recirculation Flowmeter (m³/h)
  5. Reactor Internal Pressure Transmitter (Bar)
  6. Emergency Rupture Disc Pressure Transducer
  7. Monomer Catalyst Feed Mass Flow Controller
  8. Reactor Mechanical Agitator Shaft RPM Sensor
  9. Agitator Drive Motor Power Consumption (kW)
  10. Agitator Bearing Vibration Accelerometer (mm/s)
  11. Reactor Bottom Discharge Valve Position Transmitter
  12. Toxic Flue Gas Analyzer (CO/CO2 ppm)
* **Primary Attack Vectors:** Indirect prompt injection via sensor logs tricking the AI Copilot into executing `write_single_coil()` to shut down cooling; in-memory shellcode execution intercepted by Live-SBOM.

---

### Step-by-Step Production Roadmap (Rule 3 Compliance)

To produce all 10 scenario `.tar.gz` bundles ready for cloud publishing, we will execute in structured batches:

1. **Batch 1 (Scenarios 01, 02, 03):** Water Utility, Power Grid Transmission, and 5G Automotive Gigafactory.
2. **Batch 2 (Scenarios 04, 05, 06):** Petrochemical Refinery, Maritime Port Terminal, and Nuclear Turbine Cooling.
3. **Batch 3 (Scenarios 07, 08, 09, 10):** Hospital Surgical Microgrid, Gas Pipeline, Orbital Satellite Ground Station, and Chemical AI Copilot.

Each scenario will be scaffolded, populated with its models, configs, and PCAPs, and packed with `--embed` into an independent `.tar.gz` bundle:
```bash
aryo scenario pack /home/kami/sentinel-matrix/scenarios/<scenario_name> --embed
```

---

### Confirmation to Proceed (Rule 1 & 2)

Please confirm if you approve this portfolio structure. Once you say **"Proceed with Batch 1"**, I will generate the complete configuration files, scripts, and packing commands for **Scenarios 01, 02, and 03**.