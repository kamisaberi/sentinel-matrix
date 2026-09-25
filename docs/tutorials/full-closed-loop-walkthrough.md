### Part 11: Hands-On Simulation Walkthroughs & Tutorials (`tutorials/*`)

This section contains 5 practical simulation walkthroughs for `sentinel-matrix`: the end-to-end closed-loop adaptation demonstration, simulating electrical substation blackout attacks (Industroyer), simulating hospital ransomware and DICOM exfiltration, importing custom Wireshark PCAPs, and deploying the testbed headlessly on enterprise VMware ESXi clusters.

---

### File: `sentinel-matrix/docs/tutorials/full-closed-loop-walkthrough.md`

```markdown
# End-to-End Walkthrough: Attack $\to$ Mitigation $\to$ Retrain $\to$ Hot-Reload

This tutorial demonstrates the complete closed-loop lifecycle of the Aryorithm ecosystem inside `sentinel-matrix`. Within **60 seconds**, an adversary launches a novel exploit, an edge appliance mitigates the attack in kernel space, Nexus curates training data, Forge retrains weights, and the edge fleet hot-reloads the updated model without packet loss.

---

## 1. Test Execution Sequence

```text
 [ Step 1: Launch Grid & Open Terminal TUI ]
    $ make up && make tui
                       │
                       ▼
 [ Step 2: Trigger Zero-Day Attack from Adversary (.99) ]
    $ make attack-modbus
    -> In-Kernel XDP Filter drops attack on Node 01 in 0.81 µs.
    -> Threat score lies in uncertainty boundary (0.52).
                       │
                       ▼
 [ Step 3: Nexus Dataset Curator Packages Batch ]
    -> Ingests boundary flow into forge_dataset_*.csv.
    -> Writes to /shared/datasets/.
                       │
                       ▼
 [ Step 4: Forge Executes Continual Adaptation Loop ]
    -> forge_watcher.py detects batch via inotify.
    -> Trains TabularMAE across 5 epochs (MAE + InfoNCE).
    -> Passes Golden Attacks Safety Gate (100% Score: 52/52).
    -> Compiles PyTorch -> network_threat_v2.onnx.
                       │
                       ▼
 [ Step 5: Nexus Promotes Model to Canary ]
    -> Stages model via POST /api/v1/ota/stage.
    -> Node 01 executes in-memory atomic pointer swap (< 50ms).
                       │
                       ▼
 [ Step 6: Parity Confirmation ]
    -> Re-launching the attack yields confidence score > 0.95!
```

---

## 2. Step-by-Step Command Walkthrough

### Terminal 1: Launch Matrix & Open Dashboard
```bash
cd /opt/sentinel-matrix
make up
make tui
```

### Terminal 2: Trigger the Live Adversary Attack
```bash
make attack-modbus
```

### Observation in Terminal 1 (TUI Dashboard):
1. **Under 1 Millisecond:** `sentinel-node-01` increments its drop counter. The XAI panel renders the root-cause deviation (`MODBUS_REGISTER_SETPOINT_40001` delta: $+7{,}750\,\text{PSI}$).
2. **At 15 Seconds:** The bottom status bar indicates: `DatasetCurator: Packaged 5,000 samples to /shared/datasets/`.
3. **At 35 Seconds:** The TUI logs: `Forge: Candidate weights verified by Safety Gate (52/52). Compiled to ONNX Opset 17.`
4. **At 45 Seconds:** Nexus promotes the model: `OTA Canary: Node 01 hot-reloaded to network_threat_v2.onnx (0.00ms downtime).`
```

---

### File: `sentinel-matrix/docs/tutorials/simulating-substation-blackout-attack.md`

```markdown
# Simulating an Electrical Substation Blackout Attack (Industroyer2)

This tutorial demonstrates how `sentinel-matrix` simulates and neutralizes a high-voltage electrical grid sabotage attempt by replaying authentic **Industroyer2 (CrashOverride)** IEC 60870-5-104 packets targeting Substation Alpha (`sentinel-node-01`).

---

## 1. Attack Mechanics in the Testbed

```text
 [ sentinel-traffic (10.240.0.50) ]
                 │
                 ▼ Replays authentic industroyer_iec104.pcap
 ┌─────────────────────────────────────────────────────────────┐
 │ 1. TCP Port 2404 Handshake (STARTDT Act / Con)              │
 │ 2. General Interrogation: Maps Information Object Addresses │
 │ 3. ASDU Type 46 (Double Command):                           │
 │    IOA 1124 (Feeder Breaker) -> Command: DCS=1 (OPEN)       │
 └──────────────────────────────┬──────────────────────────────┘
                                │ Live Wire Transmission
                                ▼
 ┌─────────────────────────────────────────────────────────────┐
 │ sentinel-node-01 (10.240.0.101: In-Kernel eBPF Filter)      │
 │  - Subsystem 18 (18_cps_sec) & libiec104_dissector.so       │
 │  - Dissects ASDU header in 0.38 µs                          │
 │  - Identifies unauthorized breaker trip command             │
 │  - Executes XDP_DROP in 0.81 µs                             │
 └─────────────────────────────────────────────────────────────┘
```

---

## 2. Executing the Replay

Run the attack replay command from the host:

```bash
make replay-industroyer
```

---

## 3. Verifying Grid Containment

Check the telemetry output on Node 01:

```bash
docker exec -it sentinel-node-01 sentinel --dump-drops
```

### Output:
```text
Target IP       Rule ID   Triggering Subsystem   Drop Count   Status
10.240.0.50     2401      18_cps_sec (IEC 104)   12 pkts      ACTIVE_DROP (0.81 µs)
```

The double-command trip frame was dropped in kernel driver memory; the virtual breaker never transitioned to open, preventing the simulated power outage.
```

---

### File: `sentinel-matrix/docs/tutorials/simulating-hospital-ransomware-wave.md`

```markdown
# Simulating a Hospital Enclave Ransomware & DICOM Exfiltration Wave

This tutorial walks through testing multi-subsystem coordination under a composite attack scenario targeting **`sentinel-node-02` (`10.240.0.102`)**: simultaneous DICOM PACS patient data siphoning paired with a high-entropy ransomware encryption wave.

---

## 1. Composite Attack Vectors

```text
 ATTACK VECTOR A (Data Exfiltration):
  • Ingress: TCP Port 104 (DICOM PACS)
  • Operation: Rogue Calling AE Title issues bulk C-MOVE requests.
  • Mitigated by: Subsystem 17 (17_iot_sec).

 ATTACK VECTOR B (Local Ransomware Encryption):
  • Ingress: UDP Port 9995 (Simulated filesystem writes)
  • Operation: High-velocity stream with Shannon Entropy >= 7.95 bits/byte.
  • Mitigated by: Subsystem 07 (07_epp_ngav).
```

---

## 2. Launching the Composite Attack

Execute the hospital attack scenario script:

```bash
docker exec -it sentinel-traffic python3 /app/src/traffic/scenarios/hospital_attack.py \
    --target-ip 10.240.0.102
```

---

## 3. Observation in the Web Console (`https://localhost:9443`)

Open the Web Command Center:
1. **IoT Security Card:** Subsystem `17_iot_sec` flags the unauthorized Calling AET (`ROGUE_CLIENT`), severing the DICOM association.
2. **Antivirus Card:** Subsystem `07_epp_ngav` trips on the entropy burst ($7.98\text{ bits/byte}$), freezing simulated process write handles.
3. Both attacks are mitigated in parallel without cross-subsystem deadlocks.
```

---

### File: `sentinel-matrix/docs/tutorials/adding-custom-malware-pcap.md`

```markdown
# Importing Custom Wireshark Captures into the Replay Streamer

Security researchers can introduce custom network captures (captured via Wireshark or `tcpdump`) into the OmniFlow replay pipeline.

---

## 1. Step 1: Copy PCAP to Shared Storage

Place your `.pcap` or `.pcapng` file in `/opt/sentinel-matrix/shared/pcaps/`:

```bash
sudo cp /tmp/my_custom_exploit.pcap /opt/sentinel-matrix/shared/pcaps/
sudo chmod 644 /opt/sentinel-matrix/shared/pcaps/my_custom_exploit.pcap
```

If the file is in `.pcapng` format, convert it to standard libpcap format:

```bash
tshark -r my_custom_exploit.pcapng -w my_custom_exploit.pcap -F pcap
```

---

## 2. Step 2: Register in `matrix.yaml`

Edit `configs/matrix.yaml` to register the new capture:

```yaml
traffic_streamer:
  custom_replays:
    - name: "custom_exploit"
      pcap_path: "/shared/pcaps/my_custom_exploit.pcap"
      target_node: "10.240.0.101"
      target_port: 502
      replay_pps: 500
```

---

## 3. Step 3: Stream on the Wire

Stream the custom capture using the streamer CLI:

```bash
docker exec -it sentinel-traffic python3 /app/src/traffic/pcap_streamer.py \
    --pcap /shared/pcaps/my_custom_exploit.pcap \
    --target-ip 10.240.0.101 \
    --pps-limit 500
```

`pcap_streamer.py` will rewrite destination IP addresses to `10.240.0.101`, recalculate checksums, and inject frames across `matrix_net`.
```

---

### File: `sentinel-matrix/docs/tutorials/running-matrix-in-esxi-headless.md`

```markdown
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
```

