# nmap TCP SYN Sweeps

> **Status:** Draft — placeholder content. Final technical prose is forthcoming.


Executing live nmap -sS port discovery sweeps on the wire (T1046).

## Command

Targeted sweeps against monitor and service ports.

## Observe

Ports flip open → filtered as eBPF rules land.

```bash
$ nmap -sS -Pn -p 80,443,502,102,2404 10.240.0.101
# watch states change live as drops engage
```

---

*Part of the sentinel-matrix documentation set. See mkdocs.yml for navigation.*
