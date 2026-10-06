# Running eBPF/XDP Over Virtual Interfaces (Generic SKB Mode)

In physical bare-metal deployments, `blackbox-essential` attaches its in-kernel filter in **Native Driver Mode (`XDP_FLAGS_DRV_MODE`)** directly to physical NIC rings (e.g., `ixgbe`, `mlx5`). 

However, inside containerized bridges (`veth` pairs) and nested virtual machine environments, network devices do not have hardware DMA rings. `sentinel-matrix` runs eBPF filters using **Generic SKB Mode (`XDP_FLAGS_SKB_MODE`)**.

---

## 1. Driver Mode vs. Generic Mode in Virtualization

```text
 PHYSICAL BARE-METAL (Native Driver Mode):
 [ Physical NIC DMA ] ──► [ Driver Rx Ring ] ──► [ xdp_filter.o ] ──► XDP_DROP (< 0.84 µs)
                                                        │
                                                        ▼ XDP_PASS
                                              [ alloc_skb() ] ──► OS Stack

 -------------------------------------------------------------------------------

 VIRTUAL DIGITAL TWIN MESH (Generic SKB Mode):
 [ Docker veth Pair ] ──► [ alloc_skb() ] ──► [ netif_receive_skb() ]
                                                      │
                                                      ▼
                                             [ xdp_filter.o ] ──► XDP_DROP (~2.5 µs)
                                                      │
                                                      ▼ XDP_PASS
                                             [ Container TCP/IP Stack ]
```

---

## 2. Dynamic Mode Detection in Node Containers

Edge node containers (`sentinel-node-XX`) automatically select Generic SKB mode when bound to container interfaces (`eth0` on `veth`):

```cpp
#include <blackbox/xdp_manager.hpp>

blackbox::XdpConfig get_matrix_xdp_config(const std::string& iface) {
    blackbox::XdpConfig config;
    config.interface_name = iface;
    config.bpf_object_path = "/usr/local/lib/bpf/xdp_filter.o";

    // Virtual container interfaces require SKB Generic attachment
    config.attach_mode = blackbox::XdpAttachMode::SKB_GENERIC;
    config.max_blocked_ips = 16384;

    return config;
}
```

---

## 3. Operational Guarantees

* **Real BPF Verifier Execution:** Bytecode passes through the full Linux in-kernel BPF verifier on the host kernel.
* **Functional Parity:** The data plane executes the same map lookups, nanosecond TTL checks, and `XDP_DROP` instructions as on physical hardware.

