# Resolving Missing Host Libraries (`libabsl`, `libre2`, `libgrpc`)

`sentinel-nexus` and `blackbox-sentinel` link against modern shared libraries compiled on the host, such as **`libabsl_synchronization.so.20260107`**, **`libre2.so.11`**, and **`libgrpc++.so`**. Missing these libraries inside containers causes immediate startup crashes.

---

## 1. Symptom

```text
/usr/local/bin/sentinel-nexus: error while loading shared libraries: 
libabsl_synchronization.so.20260107: cannot open shared object file: No such file or directory
```

---

## 2. Automated Library Harvesting via `make init`

`sentinel-matrix` provides an automated dependency resolver. When you run `make init`, `scripts/bundle_host_libs.sh` executes `ldd` against the host binaries and extracts all matching dependencies into `shared/lib/`:

```bash
make init
```

### Verifying Harvested Libraries
```bash
ls -lh shared/lib/
```

### Expected Output:
```text
-rwxr-xr-x 1 root root  284K libabsl_synchronization.so.20260107
-rwxr-xr-x 1 root root  412K libre2.so.11
-rwxr-xr-x 1 root root  3.8M libgrpc++.so.1.62
-rwxr-xr-x 1 root root  4.1M libprotobuf.so.32
```

---

## 3. Container Path Verification

Confirm that `docker-compose.yml` mounts `shared/lib/` and configures `LD_LIBRARY_PATH`:

```yaml
    volumes:
      - ./shared/lib:/usr/local/lib/matrix-deps:ro
    environment:
      - LD_LIBRARY_PATH=/usr/local/lib/matrix-deps:/usr/local/lib:$LD_LIBRARY_PATH
```

