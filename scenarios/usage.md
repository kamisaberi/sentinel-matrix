#### 1. Test Scenario 1 (Water Treatment Facility):
```bash
# Load and launch the 3 water treatment PLCs dynamically
aryo matrix scenario load scenarios/scenario_01_water_treatment.yaml

# Inspect dynamic nodes in the grid
aryo matrix scenario status

# Tear down the water scenario cleanly
aryo matrix scenario down
```

#### 2. Test Scenario 2 (Electrical Substation + 5G UPF Gateway):
```bash
# Load the 5G substation scenario dynamically
aryo matrix scenario load scenarios/scenario_02_substation_5g.yaml

# Verify the dynamic 5G UPF gateway is running
docker compose ps | grep -E "ied|upf"

# Tear down when done
aryo matrix scenario down
```

#### 3. Test Scenario 3 (Chemical Reactor with GenAI Copilot):
```bash
# Load the chemical reactor and GenAI Copilot
aryo matrix scenario load scenarios/scenario_03_copilot_trism_reactor.yaml

# Test sending a prompt to the Copilot port
curl -s http://localhost:18080/

# Tear down when done
aryo matrix scenario down
```

---

### Summary

* The old `docker-compose.yml` remains in place to manage the network and volumes.
* Any user or researcher can drop a new `.yaml` scenario into `sentinel-matrix/scenarios/` and run `aryo matrix scenario load <file.yaml>`.
* Zero manual edits, zero port collisions, and clean dynamic teardown.