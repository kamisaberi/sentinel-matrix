# Troubleshooting Empty TUI Appliance Lists

When launching `make tui`, the dashboard may initialize properly but display **`Connected Appliances: 0`** despite containers running in `docker ps`.

---

## 1. Diagnosis Sequence

```text
 TUI Displays: "Connected Appliances: 0"
                      │
                      ▼ Check 1: Is sentinel-nexus healthy on port 50051?
 [ nc -zv 10.240.0.10 50051 ] ────────── FAILED ──► Restart Nexus container
                      │ SUCCESS
                      ▼ Check 2: Are edge nodes connecting to Nexus?
 [ docker logs sentinel-node-01 ] ────── ERROR ───► Check NEXUS_HOST routing
                      │ NO ERRORS
                      ▼ Check 3: Is sentinel-monitor polling port 9444?
 [ curl -N http://10.240.0.10:9444/stream ] ──────► Verify SSE event stream
```

---

## 2. Verifying Edge Appliance Environment Variables

Ensure that `sentinel-node-01` through `node-03` are configured with the static IP of `sentinel-nexus`:

```bash
docker exec -it sentinel-node-01 env | grep NEXUS_HOST
# Expected Output: NEXUS_HOST=10.240.0.10
```

If `NEXUS_HOST` is set to `localhost` or `127.0.0.1`, the containerized node attempts to connect to itself rather than the Nexus hub. Update `docker-compose.yml` to set:

```yaml
environment:
  - NEXUS_HOST=10.240.0.10
  - NEXUS_PORT=50051
```

