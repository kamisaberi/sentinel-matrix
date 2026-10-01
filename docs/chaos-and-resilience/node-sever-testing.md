# Node Sever Testing

> **Status:** Draft — placeholder content. Final technical prose is forthcoming.


Killing edge containers via make chaos-sever.

## Kill

SIGKILL mid-stream — no graceful shutdown allowed.

## Expect

Deregistration path still fires; UI flips in 0ms.

```bash
$ make chaos-sever
# expect: NODE-8fa901 OFFLINE in 0ms
```

---

*Part of the sentinel-matrix documentation set. See mkdocs.yml for navigation.*
