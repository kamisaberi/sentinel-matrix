# One-Command Launch

> **Status:** Draft — placeholder content. Final technical prose is forthcoming.


Three-minute launch: make init → make build → make up.

## Steps

Init prepares shared state; build compiles images; up starts the mesh.

## Verify

make status shows 7+ healthy containers with bound IPs.

```bash
$ make init && make build
$ sudo make up
$ make status   # 7+ containers healthy
```

---

*Part of the sentinel-matrix documentation set. See mkdocs.yml for navigation.*
