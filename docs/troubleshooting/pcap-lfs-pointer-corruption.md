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

