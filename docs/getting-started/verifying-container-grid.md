# Verifying Container Health & Network Mappings

Verify that all containers in the digital twin mesh are running, healthy, and communicating over the `10.240.0.0/24` subnet.

---

## 1. Querying Container Status

Run `docker compose ps` or `make status`:

```bash
make status
```

### Expected Output

```text
NAME                 IMAGE                     STATUS         PORTS
sentinel-nexus       aryorithm/nexus:2.4.0     Up (healthy)   0.0.0.0:50051->50051/tcp, 0.0.0.0:9443->9443/tcp, 0.0.0.0:9444->9444/tcp
sentinel-forge       aryorithm/forge:2.4.0     Up (healthy)   -
sentinel-traffic     aryorithm/traffic:2.4.0   Up             -
sentinel-adversary   aryorithm/adversary:2.4.0 Up             -
sentinel-node-01     aryorithm/sentinel:2.4.0  Up (healthy)   -
sentinel-node-02     aryorithm/sentinel:2.4.0  Up (healthy)   -
sentinel-node-03     aryorithm/sentinel:2.4.0  Up (healthy)   -
```

---

## 2. Inspecting Static IP Allocations

Verify that static IPs on `matrix_net` match the architecture:

```bash
docker inspect -f '{{.Name}} - {{range .NetworkSettings.Networks}}{{.IPAddress}}{{end}}' $(docker ps -aq)
```

### Expected Output:
```text
/sentinel-nexus     - 10.240.0.10
/sentinel-forge     - 10.240.0.20
/sentinel-traffic   - 10.240.0.50
/sentinel-adversary - 10.240.0.99
/sentinel-node-01   - 10.240.0.101
/sentinel-node-02   - 10.240.0.102
/sentinel-node-03   - 10.240.0.103
```

---

## 3. Testing Inter-Container Connectivity

Verify that edge node 1 can reach the Nexus gRPC service:

```bash
docker exec -it sentinel-node-01 nc -zv 10.240.0.10 50051
# Output: Connection to 10.240.0.10 50051 port [tcp/*] succeeded!
```

