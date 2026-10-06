# Technical Frequently Asked Questions (FAQ)

---

### Q1: Can I run `sentinel-matrix` on macOS or Windows?
`sentinel-matrix` requires a native 64-bit Linux kernel supporting eBPF, BTF, and raw socket injection. To run on macOS or Windows, install **VMware Workstation Pro** or **VMware Fusion**, provision an Ubuntu 24.04/26.04 virtual machine with **"Virtualize Intel VT-x/EPT"** enabled, and execute `sentinel-matrix` inside the Linux guest.

---

### Q2: Why does the matrix mesh use `10.240.0.0/24` instead of standard Docker defaults?
Docker's default bridge pools (`172.17.0.0/16` - `172.28.0.0/16`) conflict with VMware's host-only (`VMnet1`) and NAT (`VMnet8`) adapters, causing routing loops and dropped gRPC packets. Migrating to an isolated Class C subnet (`10.240.0.0/24`) guarantees collision-free execution across all hypervisors.

---

### Q3: Does `sentinel-adversary` generate real network traffic?
**Yes.** `sentinel-adversary` (`10.240.0.99`) uses real Linux networking utilities (`nmap`, `mbpoll`, `curl`, `hping3`) transmitting live frames over the `matrix_net` bridge. When an edge appliance detects an attack, it drops subsequent packets directly in the kernel via eBPF/XDP.

---

### Q4: How much RAM is required to run all 7 containers concurrently?
The minimum recommended RAM allocation is **16 GB** for the VMware virtual machine. Under active simulation, all 7 containers consume approximately **$8.5\text{ GB}$ of physical RAM**.

