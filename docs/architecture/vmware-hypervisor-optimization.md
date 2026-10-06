# VMware Hypervisor Optimization & Nested Virtualization

Running containerized eBPF filters, raw packet injection, and neural network compilation inside a Linux virtual machine hosted on VMware Workstation Pro or ESXi requires specific hypervisor configuration to avoid nested virtualization bottlenecks.

---

## 1. VMware Virtual Machine Settings (`.vmx`)

Ensure the following configuration flags are set in your VMware guest configuration:

```ini
# Enable hardware virtualization extensions (VT-x / AMD-V)
vhv.enable = "TRUE"
vpmc.enable = "TRUE"

# Enforce 100% memory reservation (Eliminates ESXi memory ballooning)
sched.mem.min = "16384"
sched.mem.pin = "TRUE"

# Disable memory trimming and background page sharing
MemTrimRate = "0"
sched.mem.pshare.enable = "FALSE"

# Assign high-performance vNIC adapter
ethernet0.virtualDev = "vmxnet3"
```

---

## 2. Virtual Switch Security Policies

If testing multi-NIC bridging or Promiscuous taps:
1. In VMware ESXi or Workstation Virtual Network Editor, locate the active virtual network bridge (`VMnet0` or Port Group).
2. Set **Promiscuous Mode**, **MAC Address Changes**, and **Forged Transmits** to **`Accept`**.
3. This allows `sentinel-adversary` and `sentinel-traffic` to inject synthetic packets with diverse source IP and MAC addresses without hypervisor dropping.

