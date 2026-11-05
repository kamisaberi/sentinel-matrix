# Troubleshooting & Diagnostic Help Desk

Diagnostic procedures, error code remediations, and support channels for `sentinel-matrix`.

## Section Navigation

- [Docker Subnet Overlaps](./troubleshooting/docker-subnet-pool-overlaps.md): Resolving Docker bridge collisions with VMware host-only adapters (`VMnet1`/`VMnet8`).
- [GLIBC Version Not Found](./troubleshooting/glibc-version-not-found-errors.md): Fixing dynamic linker errors (`GLIBC_2.43`) via `ubuntu:devel` bases.
- [Missing Host Libraries](./troubleshooting/missing-host-libraries-absl-re2.md): Automated library harvesting (`make init`) bundling `libabsl` and `libgrpc++`.
- [Container Restarting Loops](./troubleshooting/container-restarting-loops.md): Debugging container exit codes (`127`, `139`) and entrypoint scripts.
- [TUI Empty Appliances](./troubleshooting/tui-empty-appliances-debugging.md): Resolving empty TUI node lists and `NEXUS_HOST` variable bindings.
- [PCAP LFS Pointer Corruption](./troubleshooting/pcap-lfs-pointer-corruption.md): Fixing 130-byte Git LFS pointer file corruption via `download_real_pcaps.py`.
- [Technical FAQ](./faq.md): Frequently asked technical questions regarding hypervisor settings, RAM usage, and attacks.
- [Support Channels](./support.md): Automated diagnostic bundle generation (`make diag`) and enterprise commercial SLAs.
