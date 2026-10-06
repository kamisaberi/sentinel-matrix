# Common Operational Workflows

This guide outlines routine operational workflows for developers, security researchers, and test engineers working within `sentinel-matrix`.

---

## Workflow 1: Standard Developer Sandbox Launch

Use this workflow to boot the environment, verify connectivity, and inspect live operations:

```bash
# Step 1: Initialize dependencies and start the grid
make init
make build
make up

# Step 2: Confirm container health
make status

# Step 3: Open the terminal dashboard in a dedicated window
make tui
```

---

## Workflow 2: Validating an Attack & In-Kernel eBPF Drop

Use this workflow to test whether a newly developed detection rule drops malicious packets on the wire:

```bash
# Step 1: In Terminal 1, watch active kernel drops on Node 01
docker exec -it sentinel-node-01 sentinel --dump-drops -f

# Step 2: In Terminal 2, launch a Modbus override attack from the adversary node
make attack-modbus

# Step 3: Observe in Terminal 1 that the adversary IP (10.240.0.99) is dropped in < 0.84 µs
```

---

## Workflow 3: Validating Closed-Loop Active Learning

Use this workflow to test that ambiguous traffic triggers retraining and canary deployment:

```bash
# Step 1: Follow Forge continual learning logs
make logs-forge

# Step 2: Trigger an uncertainty burst on Channel 7
docker exec -it sentinel-traffic python3 /app/src/traffic/channels/netflow_channel.py \
    --burst 5000 --uncertainty 1.0

# Step 3: Observe Forge detecting the curated batch, training TabularMAE, passing the safety gate, and staging to Nexus
```

