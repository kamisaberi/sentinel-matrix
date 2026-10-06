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

