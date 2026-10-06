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

