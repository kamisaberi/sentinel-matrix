# Architecture at a Glance

The diagram below details the private subnet routing, shared storage mount points, traffic injection channels, and adversary attack vectors inside `sentinel-matrix`.

---

```text
 ┌──────────────────────────────────────────────────────────────────────────────────────────┐
 │ VMWARE LINUX GUEST HOST (Ubuntu 24.04 / 26.04)                                           │
 │                                                                                          │
 │  ┌────────────────────────────────────────────────────────────────────────────────────┐  │
 │  │ SHARED NVMe STORAGE VOLUMES (/opt/sentinel-matrix/shared/)                         │  │
 │  │  • /shared/models   : network_threat_v1.onnx & candidate weights                  │  │
 │  │  • /shared/datasets : Active learning curated forge_dataset_*.csv batches          │  │
 │  │  • /shared/lib      : Bundled host shared libraries (libabsl, libre2, libgrpc)     │  │
 │  │  • /shared/logs     : Centralized log aggregation                                  │  │
 │  └────────────────────────────────────────────────────────────────────────────────────┘  │
 │                                                                                          │
 │  ┌────────────────────────────────────────────────────────────────────────────────────┐  │
 │  │ ISOLATED DIGITAL TWIN DOCKER BRIDGE: matrix_net (Subnet: 10.240.0.0/24)            │  │
 │  │                                                                                    │  │
 │  │  ┌──────────────────────┐  ┌──────────────────────┐  ┌──────────────────────────┐  │  │
 │  │  │ sentinel-nexus       │  │ sentinel-forge       │  │ sentinel-adversary       │  │  │
 │  │  │ IP: 10.240.0.10      │  │ IP: 10.240.0.20      │  │ IP: 10.240.0.99          │  │  │
 │  │  │ • Port 50051 gRPC    │  │ • Continual MAE Loop │  │ • Live nmap SYN sweeps   │  │  │
 │  │  │ • Port 9443 Web SPA  │  │ • Safety Gate (100%) │  │ • Live mbpoll overrides  │  │  │
 │  │  │ • Port 9444 Real SSE │  │ • Auto ONNX Stager   │  │ • Live cURL API fuzzing  │  │  │
 │  │  └──────────┬───────────┘  └──────────▲───────────┘  └────────────┬─────────────┘  │  │
 │  │             │                         │                           │                │  │
 │  │             │ gRPC StreamFleetRules   │ Curation Watcher          │ Live Attacks   │  │
 │  │             ▼ (< 50ms Immunity)       │ (/shared/datasets)        ▼ on Wire        │  │
 │  │  ┌────────────────────────────────────┴───────────────────────────────────────┐  │  │
 │  │  │ 3x EDGE APPLIANCE NODES (blackbox-sentinel daemons)                         │  │  │
 │  │  │ • node-01 (10.240.0.101): Substation Alpha (IEC 104, S7, DNP3)              │  │  │
 │  │  │ • node-02 (10.240.0.102): Medical Clinic Enclave (DICOM PACS, HL7, MAVLink)│  │  │
 │  │  │ • node-03 (10.240.0.103): Chemical Refinery (Modbus TCP, BACnet, CIP)      │  │  │
 │  │  │ In-Kernel eBPF/XDP Filters drop attacks in < 0.84 µs at driver hook         │  │  │
 │  │  └────────────────────────────────────▲───────────────────────────────────────┘  │  │
 │  │                                       │ Synthetic Multi-Modal Streams & PCAP Replays│  │
 │  │  ┌────────────────────────────────────┴───────────────────────────────────────┐  │  │
 │  │  │ sentinel-traffic (10.240.0.50): OmniFlow 7-Channel Traffic Generation       │  │  │
 │  │  │  - Ch 1: SCADA OT Modbus/DNP3       - Ch 5: Container Syscalls              │  │  │
 │  │  │  - Ch 2: Edge Vision YOLO Tensors   - Ch 6: Medical DICOM Imaging           │  │  │
 │  │  │  - Ch 3: L7 REST & BAD Bot Traffic  - Ch 7: 32-dim Tabular NetFlow Blaster  │  │  │
 │  │  │  - Ch 4: Identity Kerberos / ATO    - REPLAY: Industroyer, Triton, Stuxnet  │  │  │
 │  │  └─────────────────────────────────────────────────────────────────────────────┘  │  │
 │  └────────────────────────────────────────────────────────────────────────────────────┘  │
 └──────────────────────────────────────────────────────────────────────────────────────────┘
```

