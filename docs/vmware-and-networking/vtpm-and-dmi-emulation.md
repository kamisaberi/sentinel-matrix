---

### File: `sentinel-matrix/docs/vmware-and-networking/vtpm-and-dmi-emulation.md`

```markdown
# Hardware Identity Emulation: vTPM & DMI Serial Mapping

`blackbox-sentinel` requires a verified hardware root of trust before arming its kernel mitigation filters. In containerized digital twins without physical discrete TPM chips, `sentinel-matrix` emulates **Tier 2 (vTPM)** and **Tier 3 (DMI Motherboard Hash)** identities.

---

## 1. DMI System UUID Passthrough

To provide unique hardware serials to containerized nodes, the host's DMI subsystem is mapped read-only into each container in `docker-compose.yml`:

```yaml
    volumes:
      - /sys/class/dmi/id/product_uuid:/sys/class/dmi/id/product_uuid:ro
      - /sys/class/dmi/id/board_serial:/sys/class/dmi/id/board_serial:ro
      - /etc/machine-id:/etc/machine-id:ro
```

---

## 2. Software TPM Emulation (`swtpm`)

For nodes validating Tier 2 vTPM hardware attestation, `sentinel-matrix` provisions isolated software TPM 2.0 instances using `swtpm`:

```bash
# Launch background software TPM socket
swtpm socket \
    --tpmstate dir=/opt/sentinel-matrix/shared/tpm/node-01 \
    --tpm2 \
    --ctrl type=unixio,path=/tmp/swtpm-node-01.sock \
    --flags not-need-init &
```

The resulting control socket is mapped into the container, exposing a functional `/dev/tpmrm0` interface that generates valid TPM 2.0 PCR quotes across PCR 0 and PCR 4.
```

---

### File: `sentinel-matrix/docs/vmware-and-networking/glibc-alignment-ubuntu-devel.md`

```markdown
# GLIBC 2.43 Host-Container Toolchain Alignment

When building binaries on cutting-edge Linux host environments (e.g., Ubuntu 26.04 Devel running **GNU C Library `glibc 2.43`**), running those binaries inside standard stable container images (e.g., `ubuntu:24.04` with `glibc 2.39`) causes runtime linker failures:

```text
/usr/local/bin/sentinel: /lib/x86_64-linux-gnu/libm.so.6: version 'GLIBC_2.43' not found
```

---

## 1. The Root Cause: Forward ABI Incompatibility

Compiled C++20 binaries link against specific versioned symbols exported by `libc.so.6` and `libm.so.6`:

```text
 Host Build Environment: Ubuntu 26.04 (GLIBC 2.43)
  • Binaries link against: GLIBC_2.43, GLIBCXX_3.4.33
                      │
                      ▼ Executed inside standard container
 Target Container: ubuntu:24.04 (GLIBC 2.39)
  • Container only provides symbols up to: GLIBC_2.39
  • Result: Dynamic linker aborts with FATAL symbol mismatch
```

---

## 2. The Architectural Fix: `FROM ubuntu:devel`

`sentinel-matrix` updates all container `Dockerfile` specifications to inherit from **`ubuntu:devel`**:

```dockerfile
# Dockerfile.node
FROM ubuntu:devel

ENV DEBIAN_FRONTEND=noninteractive

# Install matching runtime dependencies
RUN apt-get update && apt-get install -y \
    libelf1 \
    libssl3 \
    libstdc++6 \
    iproute2 \
    net-tools \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Copies host-built native C++20 binaries
COPY bin/sentinel /usr/local/bin/sentinel
COPY bpf/xdp_filter.o /usr/local/lib/bpf/xdp_filter.o

ENTRYPOINT ["/usr/local/bin/sentinel"]
```

Inheriting from `ubuntu:devel` ensures that the container's C runtime library matches `glibc 2.43`, allowing host-compiled binaries to execute inside containers without relinking.
```

---

### File: `sentinel-matrix/docs/vmware-and-networking/host-dynamic-library-bundling.md`

```markdown
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
```

---

### File: `sentinel-matrix/docs/vmware-and-networking/internal-mtls-pki.md`

```markdown
# Internal Mesh mTLS PKI Generation (`scripts/gen_matrix_pki.sh`)

All communication between the simulated edge nodes (`sentinel-node-01` through `node-03`) and the central command hub (`sentinel-nexus`) is authenticated via **Mutual TLS 1.3**.

---

## 1. PKI Generation Workflow

`make init` runs `gen_matrix_pki.sh` to generate the testing Certificate Authority and signed node keys:

```bash
#!/usr/bin/env bash
set -euo pipefail

CERT_DIR="/opt/sentinel-matrix/shared/certs"
mkdir -p "${CERT_DIR}"

echo "[*] Provisioning internal mTLS PKI for 10.240.0.0/24 simulation mesh..."

# 1. Generate Root CA
openssl req -x509 -new -nodes -newkey rsa:2048 -days 365 \
    -keyout "${CERT_DIR}/ca.key" \
    -out "${CERT_DIR}/ca.crt" \
    -subj "/C=DE/O=Aryorithm/CN=Matrix-Internal-CA"

# 2. Generate Server Certificate for Nexus Hub (10.240.0.10)
openssl req -new -nodes -newkey rsa:2048 \
    -keyout "${CERT_DIR}/nexus_server.key" \
    -out "${CERT_DIR}/nexus_server.csr" \
    -subj "/C=DE/O=Aryorithm/CN=sentinel-nexus"

cat <<EOF > /tmp/nexus_ext.cnf
subjectAltName = DNS:sentinel-nexus,IP:10.240.0.10,IP:127.0.0.1
EOF

openssl x509 -req -days 365 \
    -in "${CERT_DIR}/nexus_server.csr" \
    -CA "${CERT_DIR}/ca.crt" \
    -CAkey "${CERT_DIR}/ca.key" \
    -CAcreateserial \
    -out "${CERT_DIR}/nexus_server.crt" \
    -extfile /tmp/nexus_ext.cnf

# 3. Generate Edge Appliance Node Client Certificate
openssl req -new -nodes -newkey rsa:2048 \
    -keyout "${CERT_DIR}/node_client.key" \
    -out "${CERT_DIR}/node_client.csr" \
    -subj "/C=DE/O=Aryorithm/CN=matrix-edge-node"

openssl x509 -req -days 365 \
    -in "${CERT_DIR}/node_client.csr" \
    -CA "${CERT_DIR}/ca.crt" \
    -CAkey "${CERT_DIR}/ca.key" \
    -CAcreateserial \
    -out "${CERT_DIR}/node_client.crt"

echo "[+] Internal PKI generated successfully in ${CERT_DIR}."
```

---

## 2. Invariants

* **Shared Mount:** Mounted read-only (`:ro`) across all containers.
* **Strict Validation:** If a node attempts connection with an invalid or expired certificate, `sentinel-nexus` rejects the gRPC handshake with code `UNAUTHENTICATED (16)`.
```

