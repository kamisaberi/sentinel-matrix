# Shared Storage Architecture & Inter-Process File Exchange

`sentinel-matrix` uses high-speed host NVMe volume mounts (`/opt/sentinel-matrix/shared/`) to exchange large model weights, training datasets, and harvested shared libraries without network serialization overhead.

---

## 1. Shared Volume Directory Layout

```text
/opt/sentinel-matrix/shared/
├── models/                  # Shared Neural Model Storage
│   ├── network_threat_v1.onnx
│   ├── network_threat_v1.manifest.json
│   └── network_threat_v2_canary.onnx
├── datasets/                # Active Learning Curated Batches
│   ├── forge_dataset_8f1c2a04.csv
│   ├── forge_dataset_8f1c2a04.manifest.json
│   └── processed/
├── lib/                     # Harvested Host Shared Libraries (GLIBC 2.43)
│   ├── libabsl_synchronization.so.20260107
│   ├── libre2.so.11
│   ├── libgrpc++.so.1.62
│   └── libprotobuf.so.32
├── certs/                   # Internal mTLS PKI Certificates
│   ├── ca.crt / ca.key
│   ├── server.crt / server.key
│   └── node.crt / node.key
└── logs/                    # Centralized Diagnostic Logs
    ├── nexus.log
    ├── forge.log
    └── node-01.log
```

---

## 2. Docker Compose Volume Mount Bindings

```yaml
volumes:
  # Model sharing between Nexus Stager, Forge Compiler, and Edge Nodes
  - ./shared/models:/var/lib/sentinel-nexus/models:rw
  # Dataset exchange between Nexus Curator and Forge Inotify Watcher
  - ./shared/datasets:/var/lib/sentinel-nexus/forge_datasets:rw
  # Shared dynamic library dependencies mounted to container search paths
  - ./shared/lib:/usr/local/lib/matrix-deps:ro
  # Mutual TLS certificates mounted read-only to all containers
  - ./shared/certs:/etc/sentinel/certs:ro
```

