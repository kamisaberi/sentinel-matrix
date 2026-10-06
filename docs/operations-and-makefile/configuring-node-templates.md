# Scaling the Mesh: Provisioning from 3 to 20 Nodes

While `sentinel-matrix` boots with 3 edge appliances by default, researchers can scale the simulation mesh to **20 concurrent edge nodes** using modular node templates.

---

## 1. Node Template Definition (`templates/node_template.yaml`)

```yaml
# templates/node_template.yaml
node:
  template_version: "1.0"
  base_image: "aryorithm/sentinel:2.4.0"
  resource_limits:
    cpus: "1.5"
    memory: "2048M"
  capabilities:
    - "CAP_NET_ADMIN"
    - "CAP_NET_RAW"
    - "CAP_BPF"
    - "CAP_SYS_RESOURCE"
  env_defaults:
    XDP_MODE: "SKB"
    NEXUS_HOST: "10.240.0.10"
    NEXUS_PORT: "50051"
```

---

## 2. Automated Node Scaling Script (`scripts/scale_nodes.sh`)

Use the scale script to expand the Docker Compose file:

```bash
# Scale the mesh to 10 edge appliances
./scripts/scale_nodes.sh --count 10
```

### Script Execution Logic:
1. Generates entries for `sentinel-node-04` through `sentinel-node-10` in `docker-compose.override.yml`.
2. Assigns sequential static IP addresses (`10.240.0.104` through `10.240.0.110`).
3. Generates signed mTLS client certificates for each new node.
4. Relaunches the grid:
   ```bash
   make up
   ```

