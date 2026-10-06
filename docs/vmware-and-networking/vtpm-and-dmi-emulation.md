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

