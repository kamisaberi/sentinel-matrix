# Accessing the Web Command Center from Host Browsers

While `sentinel-matrix` executes inside a virtual machine or container mesh, its Web Command Center is exposed to host desktop browsers over port **9443**.

---

## 1. Port Forwarding & Routing

In `docker-compose.yml`, `sentinel-nexus` maps port 9443 to the host interface:

```yaml
    ports:
      - "9443:9443" # HTTPS REST & Web Console
      - "9444:9444" # Real-Time SSE Stream
```

If running inside a VMware virtual machine, access the web console from your host machine browser by navigating to the VM's assigned IP address:

👉 **`https://<VM_IP_ADDRESS>:9443`**

Or forward ports via SSH:

```bash
ssh -L 9443:localhost:9443 -L 9444:localhost:9444 user@vm-host
```

Then open `https://localhost:9443` in Chrome or Firefox.

---

## 2. Browser Security Exceptions

Because `sentinel-matrix` generates self-signed internal testing certificates during `make init`, modern browsers will present a certificate warning (`NET::ERR_CERT_AUTHORITY_INVALID`).

Click **Advanced $\to$ Proceed to localhost (unsafe)** to open the console.

