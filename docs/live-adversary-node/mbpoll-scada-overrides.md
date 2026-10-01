# mbpoll SCADA Overrides

> **Status:** Draft — placeholder content. Final technical prose is forthcoming.


Executing live Modbus FC05 coil overrides via mbpoll (T0855).

## Command

Forced writes against register 105 on the OT twin.

## Observe

Module 18 drops the write and Nexus alerts.

```bash
$ mbpoll -m tcp -a 1 -r 105 -t 0 10.240.0.101 1
# expect: dropped + alerted, coil unchanged
```

---

*Part of the sentinel-matrix documentation set. See mkdocs.yml for navigation.*
