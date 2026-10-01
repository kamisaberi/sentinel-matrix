# Docker Subnet Pool Overlaps

> **Status:** Draft — placeholder content. Final technical prose is forthcoming.


Resolving "Pool overlaps with other one" via 10.240.0.0/24.

## Cause

Default pools collide with VMware VMnet adapters.

## Fix

Pinned /24 in compose; prune stale networks after.

```bash
$ docker network prune
$ docker compose up   # 10.240.0.0/24, no overlaps
```

---

*Part of the sentinel-matrix documentation set. See mkdocs.yml for navigation.*
