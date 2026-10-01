# glibc Alignment (ubuntu:devel)

> **Status:** Draft — placeholder content. Final technical prose is forthcoming.


Aligning host Ubuntu 26.04 (GLIBC 2.43) with container images.

## Mismatch

Host-built binaries fail on older container libc with version errors.

## Fix

devel image tracks the host ABI; bundled libs cover the rest.

---

*Part of the sentinel-matrix documentation set. See mkdocs.yml for navigation.*
