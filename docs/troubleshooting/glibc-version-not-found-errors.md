# Resolving `GLIBC_2.43 not found` Dynamic Linker Errors

When building native C++20 binaries on an Ubuntu 26.04 (Devel) host and executing them inside containers built from older base images (such as `ubuntu:22.04` or `ubuntu:24.04`), the container's dynamic linker aborts immediately on launch.

---

## 1. Symptom & Error Trace

```text
/usr/local/bin/sentinel: /lib/x86_64-linux-gnu/libm.so.6: version 'GLIBC_2.43' not found (required by /usr/local/bin/sentinel)
/usr/local/bin/sentinel: /lib/x86_64-linux-gnu/libc.so.6: version 'GLIBC_2.43' not found (required by /usr/local/bin/sentinel)
```

---

## 2. Root Cause

Binaries compiled on Ubuntu 26.04 link against GNU C Library version **`GLIBC 2.43`**. Stock `ubuntu:24.04` container images only provide symbols up to `GLIBC 2.39`. The dynamic linker (`ld.so`) will refuse to execute the binary.

---

## 3. Permanent Remediation: Updating Base Images to `ubuntu:devel`

Update the `FROM` directives across all container Dockerfiles in `docker/`:

```dockerfile
# Correct Dockerfile base:
FROM ubuntu:devel

ENV DEBIAN_FRONTEND=noninteractive
RUN apt-get update && apt-get install -y libelf1 libssl3 iproute2 && rm -rf /var/lib/apt/lists/*
```

Rebuild the container images:

```bash
make build
```

Verify that the container's glibc matches the host:

```bash
docker run --rm ubuntu:devel ldd --version | head -n 1
# Output: ldd (Ubuntu GLIBC 2.43-...) 2.43
```

