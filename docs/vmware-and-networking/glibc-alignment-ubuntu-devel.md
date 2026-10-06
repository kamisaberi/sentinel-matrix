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

