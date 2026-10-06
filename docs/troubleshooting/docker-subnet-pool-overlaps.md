# Resolving Docker Subnet Overlaps & VMware Routing Collisions

When launching the simulation mesh via `docker compose up` inside a VMware virtual machine, Docker may fail during network creation with an overlapping pool error.

---

## 1. Symptom & Error Trace

```text
ERROR: for sentinel-nexus  Cannot create container for service nexus: 
failed to create network matrix_net: Error response from daemon: 
Pool overlaps with other one on this address space
```

---

## 2. Root Cause Analysis

By default, Docker allocates subnets dynamically from `172.17.0.0/16` through `172.31.0.0/16`. Concurrently, VMware Workstation / Fusion assigns default virtual network adapters to `172.16.x.0/24` (`VMnet1`) and `172.28.x.0/24` (`VMnet8`).

If an existing Docker network or VMware adapter already claims `172.28.0.0/16`, Docker rejects creating `matrix_net`.

---

## 3. Permanent Remediation: The `10.240.0.0/24` Isolated Subnet

`sentinel-matrix` specifies an isolated Class C subnet block in `docker-compose.yml`:

```yaml
networks:
  matrix_net:
    name: matrix_net
    driver: bridge
    ipam:
      driver: default
      config:
        - subnet: 10.240.0.0/24
          gateway: 10.240.0.1
```

### Clearing Conflicting Networks on the Host:
```bash
# 1. Stop any orphaned containers
docker kill $(docker ps -q) 2>/dev/null || true

# 2. Prune unused Docker network bridges
docker network prune -f

# 3. Verify that 10.240.0.0/24 is clean
ip route show | grep 10.240.0
```

Relaunch the mesh using `make up`.

