# Host Dynamic Library Bundling

> **Status:** Draft — placeholder content. Final technical prose is forthcoming.


Harvesting libabsl, libre2, and libgrpc into /shared/lib/.

## Harvest

make init copies host libs into the shared bundle.

## Mount

Containers map the bundle with LD_LIBRARY_PATH configured.

---

*Part of the sentinel-matrix documentation set. See mkdocs.yml for navigation.*
