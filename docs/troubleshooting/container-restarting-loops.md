---

### File: `sentinel-matrix/docs/troubleshooting/container-restarting-loops.md`

```markdown
# Debugging Container Crash Loops & Exit Codes

If a container in the mesh enters an immediate `Restarting (1)` loop, inspect its exit code and stdout logs before attempting to rebuild.

---

## 1. Inspecting Container Exit Codes

```bash
docker ps -a --format "table {{.Names}}\t{{.Status}}\t{{.State}}"
```

### Common Exit Codes

| Exit Code | Meaning | Common Cause in `sentinel-matrix` | Remediation |
| :--- | :--- | :--- | :--- |
| **`127`** | Command Not Found | Missing shared library or broken binary entrypoint path. | Run `ldd` on binary; verify `shared/lib` mount. |
| **`139`** | Segmentation Fault | Missing BPF bytecode file or unhandled null pointer. | Check `/usr/local/lib/bpf/xdp_filter.o` existence. |
| **`1`** | Application Exception | Configuration file syntax error or missing certificate. | Check `docker logs <container_name>`. |

---

## 2. Debugging Entrypoint Shell Scripts

Inspect the direct logs of the crashing container:

```bash
docker logs --tail 50 sentinel-traffic
```

If debugging an entrypoint script, override the command to drop into an interactive shell:

```bash
docker run --rm -it --network matrix_net --entrypoint /bin/bash aryorithm/traffic:2.4.0
```
```

---

### File: `sentinel-matrix/docs/troubleshooting/tui-empty-appliances-debugging.md`

```markdown
# Troubleshooting Empty TUI Appliance Lists

When launching `make tui`, the dashboard may initialize properly but display **`Connected Appliances: 0`** despite containers running in `docker ps`.

---

## 1. Diagnosis Sequence

```text
 TUI Displays: "Connected Appliances: 0"
                      │
                      ▼ Check 1: Is sentinel-nexus healthy on port 50051?
 [ nc -zv 10.240.0.10 50051 ] ────────── FAILED ──► Restart Nexus container
                      │ SUCCESS
                      ▼ Check 2: Are edge nodes connecting to Nexus?
 [ docker logs sentinel-node-01 ] ────── ERROR ───► Check NEXUS_HOST routing
                      │ NO ERRORS
                      ▼ Check 3: Is sentinel-monitor polling port 9444?
 [ curl -N http://10.240.0.10:9444/stream ] ──────► Verify SSE event stream
```

---

## 2. Verifying Edge Appliance Environment Variables

Ensure that `sentinel-node-01` through `node-03` are configured with the static IP of `sentinel-nexus`:

```bash
docker exec -it sentinel-node-01 env | grep NEXUS_HOST
# Expected Output: NEXUS_HOST=10.240.0.10
```

If `NEXUS_HOST` is set to `localhost` or `127.0.0.1`, the containerized node attempts to connect to itself rather than the Nexus hub. Update `docker-compose.yml` to set:

```yaml
environment:
  - NEXUS_HOST=10.240.0.10
  - NEXUS_PORT=50051
```
```

---

### File: `sentinel-matrix/docs/troubleshooting/pcap-lfs-pointer-corruption.md`

```markdown
# Resolving 130-Byte Git LFS Pointer File Corruption

When cloning `sentinel-matrix` on systems without `git-lfs` pre-installed, raw PCAP files in `shared/pcaps/` may be populated with small text pointer files rather than real binary captures.

---

## 1. Symptom

Streaming a PCAP causes the Python streamer to crash:

```text
AssertionError: Invalid PCAP magic bytes! Expected 0xa1b2c3d4, found 0x76657273 ('vers')
```

Inspecting the file reveals Git LFS pointer text:

```bash
cat shared/pcaps/industroyer_iec104.pcap
# Output:
# version https://git-lfs.github.com/spec/v1
# oid sha256:e9a2c31e847b2c94b13a7b41e2d9010000000000000000000000000000000000
# size 14820352
```

---

## 2. Remediation via Automated LFS Resolver

Run the built-in LFS download tool:

```bash
python3 tools/download_real_pcaps.py --target-dir shared/pcaps
```

The script queries the GitHub LFS Batch API, resolves pre-signed AWS S3 binary URLs, verifies the binary magic bytes (`0xa1b2c3d4`), and replaces the text pointers with genuine binary packet captures.
```

---

### File: `sentinel-matrix/docs/troubleshooting/faq.md`

```markdown
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
```

---

### File: `sentinel-matrix/docs/troubleshooting/support.md`

```markdown
# Enterprise Support SLAs & Issue Escalation

---

## 1. Automated Matrix Diagnostic Bundle

When reporting an issue with container grid orchestration, PCAP streaming, or eBPF drops, generate an automated diagnostic bundle:

```bash
make diag
```

This bundle packages:
* Host kernel environment and Docker daemon versions.
* Container network inspection records (`docker inspect matrix_net`).
* Active service stdout logs from `shared/logs/`.
* Git LFS PCAP header magic byte verifications.

---

## 2. Commercial Support & Custom Range Scenarios

Aryorithm Technologies B.V. provides commercial engineering support for enterprise cyber-ranges, digital twin testbeds, and defense red/blue exercises:

| Support Tier | Target Response Time | Availability | Scope |
| :--- | :--- | :--- | :--- |
| **Standard Support** | 8 Business Hours | Mon–Fri 08:00–18:00 CET | Docker Compose debugging, PCAP stream updates. |
| **Mission-Critical Defense**| **1 Hour (24/7/365)** | Round-the-Clock | Custom malware replay engineering, hardware-in-the-loop ESXi cluster tuning, on-site exercise support. |

For technical inquiries and enterprise SLA contracts:
* **Customer Portal:** `https://app.aryorithm.com/support`
* **Email:** `support@aryorithm.com`

---

## 3. Coordinated Security Vulnerability Disclosure

If you identify an isolation escape or vulnerability in `sentinel-matrix`:
* Send an encrypted PGP message to **`security@aryorithm.com`**.
* We acknowledge disclosures within **48 hours** and provide CVE assignment, risk remediation, and backported security patches according to coordinated disclosure guidelines.
```

