# Centralized Log Inspection & Debugging (`shared/logs/`)

All containers inside `sentinel-matrix` write unbuffered stdout streams and structured JSON log journals to the host mount `/opt/sentinel-matrix/shared/logs/`.

---

## 1. Centralized Log Inventory

```text
/opt/sentinel-matrix/shared/logs/
├── nexus_stdout.log        # Core Fleet Orchestrator output
├── nexus_state.json        # Active fleet node registry journal
├── forge_stdout.log        # Continual training loss logs
├── traffic_stdout.log      # OmniFlow streaming records
├── adversary_stdout.log    # Red-Team attack execution traces
├── node_01_stdout.log      # Substation Alpha XDR engine logs
├── node_02_stdout.log      # Hospital Enclave XDR engine logs
└── node_03_stdout.log      # Chemical Refinery XDR engine logs
```

---

## 2. Live Log Traversal Recipes

### 1. Tail All Drops Across the Entire Mesh:
```bash
tail -f shared/logs/node_*.log | grep "XDP_DROP"
```

### 2. Follow Continual Learning Training Loss:
```bash
tail -f shared/logs/forge_stdout.log | grep -E 'Epoch|Loss'
```

### 3. Monitor Collective Defense Rule Broadcasts:
```bash
tail -f shared/logs/nexus_stdout.log | grep "CollectiveDefense"
```

