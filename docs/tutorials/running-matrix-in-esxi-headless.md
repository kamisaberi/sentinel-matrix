# Headless Deployment on Enterprise VMware ESXi Clusters

For automated regression testing and CI/CD pipelines, `sentinel-matrix` can be deployed on a headless VMware ESXi virtual machine managed via SSH.

---

## 1. Virtual Machine Hardware Profile

Create a virtual machine on ESXi 8.0+ with these settings:
* **OS:** Linux / Ubuntu Linux (64-bit).
* **vCPUs:** 16 vCPUs (Core Pinning enabled, CPU Passthrough active).
* **RAM:** 32 GB RAM (Reserve all guest memory).
* **vNIC:** `vmxnet3` bound to a dedicated Virtual Switch (vSwitch).
* **Nested Virtualization:** Enable `vhv.enable = "TRUE"` in `.vmx`.

---

## 2. ESXi Virtual Switch Security Configuration

On the ESXi host console (via SSH), enable promiscuous mode and forged transmits on the target port group:

```bash
# Allow promiscuous mode and forged transmits on vSwitch0
esxcli network vswitch standard policy security set -v vSwitch0 \
    --allow-promiscuous true \
    --allow-mac-change true \
    --allow-forged-transmits true
```

---

## 3. Launching and Tunneling Web Services

On the headless Linux guest:

```bash
# 1. Boot the matrix mesh in background mode
cd /opt/sentinel-matrix
make init && make build && make up

# 2. Check cluster health
make status
```

To access the Web Command Center from an administrative laptop across the network, tunnel port 9443:

```bash
ssh -N -L 9443:10.240.0.10:9443 -L 9444:10.240.0.10:9444 user@esxi-guest-ip
```

Open `https://localhost:9443` in your desktop browser to manage the range.

