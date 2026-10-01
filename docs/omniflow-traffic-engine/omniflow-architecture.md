# OmniFlow Architecture

> **Status:** Draft — placeholder content. Final technical prose is forthcoming.


Concurrent multi-threaded engine design (omniflow_engine.py).

## Threads

Seven workers, one per modality, sharing nothing but the clock.

## Rates

Declarative per-channel rates in omniflow.yaml.

---

*Part of the sentinel-matrix documentation set. See mkdocs.yml for navigation.*
