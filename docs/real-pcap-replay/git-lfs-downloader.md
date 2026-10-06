# Git LFS Pointer Resolution (`tools/download_real_pcaps.py`)

When cloning repositories that host binary PCAP files via Git Large File Storage (LFS), standard Git clones often download **130-byte text pointer files** rather than binary payloads:

```text
version https://git-lfs.github.com/spec/v1
oid sha256:e9a2c31e847b2c94b13a7b41e2d9010000000000000000000000000000000000
size 14820352
```

`tools/download_real_pcaps.py` automates resolving, verifying, and downloading the binary files.

---

## 1. LFS Batch API Resolution Sequence

```text
 [ Discovers 130-Byte Git LFS Pointer File ]
                      │
                      ▼ Queries GitHub LFS Batch API
 ┌─────────────────────────────────────────────────────────────┐
 │ POST /repo.git/info/lfs/objects/batch                       │
 │ Payload: { "operation": "download", "objects": [{ "oid" }] }│
 └────────────────────┬────────────────────────────────────────┘
                      │
                      ▼ Resolves Pre-Signed AWS S3 Binary URL
 ┌─────────────────────────────────────────────────────────────┐
 │ Direct Binary Download via HTTPS Streaming                  │
 │  - Validates Magic Bytes: 0xa1b2c3d4                        │
 │  - Verifies Full SHA-256 Digest against pointer OID         │
 └────────────────────┬────────────────────────────────────────┘
                      │
                      ▼
 [ Overwrites pointer file with genuine binary PCAP payload ]
```

---

## 2. Ingestion Script Usage

Execute the automated downloader:

```bash
python3 tools/download_real_pcaps.py --target-dir shared/pcaps
```

The script replaces all pointer files with verified binary PCAPs.

