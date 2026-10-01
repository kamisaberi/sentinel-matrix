# Latency Spike Injection

> **Status:** Draft — placeholder content. Final technical prose is forthcoming.


Injecting > 1000µs SLA latency breach via make chaos-latency.

## Inject

Degraded inference shim on one edge twin.

## Expect

RollbackGuard purges and reverts within milliseconds.

```bash
$ make chaos-latency
# expect: SLA breach -> emergency rollback, fleet stable
```

---

*Part of the sentinel-matrix documentation set. See mkdocs.yml for navigation.*
