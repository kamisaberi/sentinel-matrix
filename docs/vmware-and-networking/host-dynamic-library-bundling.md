# Dynamic Library Harvesting & Bundling (`shared/lib/`)

`sentinel-nexus` and `blackbox-sentinel` link against specific shared libraries compiled on the host, including **`libabsl_synchronization`**, **`libre2`**, **`libgrpc++`**, and **`libprotobuf`**. 

To prevent missing library errors inside containers without installing full developer toolchains in every image, `sentinel-matrix` automates dynamic library harvesting during `make init`.

---

## 1. Automated Harvesting Script (`scripts/bundle_host_libs.sh`)

`make init` executes `bundle_host_libs.sh`, using `ldd` to discover and copy required shared objects into `/opt/sentinel-matrix/shared/lib/`:

```bash
#!/usr/bin/env bash
set -euo pipefail

DEST_DIR="/opt/sentinel-matrix/shared/lib"
mkdir -p "${DEST_DIR}"

echo "[*] Harvesting host shared libraries for container grid..."

# Target binaries to harvest dependencies from
BINARIES=(
    "/usr/local/bin/sentinel-nexus"
    "/usr/local/bin/sentinel"
)

for bin in "${BINARIES[@]}"; do
    if [ -f "$bin" ]; then
        # Resolve shared libraries via ldd and copy matching dependencies
        ldd "$bin" | grep -E 'libabsl|libre2|libgrpc|libproto' | awk '{print $3}' | while read -r lib; do
            if [ -f "$lib" ]; then
                cp -u "$lib" "${DEST_DIR}/"
                echo "  -> Bundled: $(basename "$lib")"
            fi
        done
    fi
done

echo "[+] Library harvesting complete. Total libraries: $(ls -1 "${DEST_DIR}" | wc -l)"
```

---

## 2. Container Ingestion via `LD_LIBRARY_PATH`

In `docker-compose.yml`, the harvested directory is mounted read-only into `/usr/local/lib/matrix-deps`:

```yaml
    volumes:
      - ./shared/lib:/usr/local/lib/matrix-deps:ro
    environment:
      - LD_LIBRARY_PATH=/usr/local/lib/matrix-deps:/usr/local/lib:$LD_LIBRARY_PATH
```

This guarantees that every container resolves identical dependency versions to the host build environment.

