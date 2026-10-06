# Debugging Container Crash Loops & Exit Codes

If a container in the mesh enters an immediate `Restarting (1)` loop, inspect its exit code and stdout logs before attempting to rebuild.

---

## 1. Inspecting Container Exit Codes

```bash
docker ps -a --format "table {{.Names}}\t{{.Status}}\t{{.State}}"
```

### Common Exit Codes

| Exit Code | Meaning | Common Cause in `sentinel-matrix` | Remediation |
| :--- | :--- | :--- | :--- |
| **`127`** | Command Not Found | Missing shared library or broken binary entrypoint path. | Run `ldd` on binary; verify `shared/lib` mount. |
| **`139`** | Segmentation Fault | Missing BPF bytecode file or unhandled null pointer. | Check `/usr/local/lib/bpf/xdp_filter.o` existence. |
| **`1`** | Application Exception | Configuration file syntax error or missing certificate. | Check `docker logs <container_name>`. |

---

## 2. Debugging Entrypoint Shell Scripts

Inspect the direct logs of the crashing container:

```bash
docker logs --tail 50 sentinel-traffic
```

If debugging an entrypoint script, override the command to drop into an interactive shell:

```bash
docker run --rm -it --network matrix_net --entrypoint /bin/bash aryorithm/traffic:2.4.0
```

