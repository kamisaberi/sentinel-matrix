# PCAP LFS Pointer Corruption

> **Status:** Draft — placeholder content. Final technical prose is forthcoming.


Detecting and resolving 130-byte Git LFS text pointer files.

## Detect

130-byte files starting with version https://git-lfs are pointers, not captures.

## Fix

git lfs pull the path, then re-verify checksums.

---

*Part of the sentinel-matrix documentation set. See mkdocs.yml for navigation.*
