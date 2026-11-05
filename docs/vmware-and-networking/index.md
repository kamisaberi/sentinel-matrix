# VMware & Network Infrastructure

`sentinel-matrix` deploys over an isolated `10.240.0.0/24` subnet, eliminating Docker bridge collisions with host hypervisors.

## Section Navigation

- [10.240.0.0/24 Subnet Design](./10-240-0-subnet-design.md): Resolving VMware NAT collisions (`VMnet1`/`VMnet8`) with an isolated Class C subnet block.
- [XDP Generic SKB Mode](./xdp-generic-skb-mode.md): Running eBPF/XDP filters over container `veth` interfaces in Generic SKB mode.
- [vTPM & DMI Emulation](./vtpm-and-dmi-emulation.md): Passthrough of DMI system UUIDs and software TPM 2.0 (`swtpm`) emulation.
- [GLIBC 2.43 Alignment](./glibc-alignment-ubuntu-devel.md): Inheriting from `ubuntu:devel` to align container C runtimes with Ubuntu 26.04 hosts.
- [Host Dynamic Library Bundling](./host-dynamic-library-bundling.md): Automated harvesting (`bundle_host_libs.sh`) bundling `libabsl`, `libre2`, and `libgrpc++`.
- [Internal mTLS PKI](./internal-mtls-pki.md): Automated PKI generation (`gen_matrix_pki.sh`) provisioning internal mTLS certificates.
