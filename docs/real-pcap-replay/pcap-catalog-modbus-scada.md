# Attack Catalog: Genuine Modbus SCADA Overrides (Univ. of Illinois)

* **Dataset Origin:** University of Illinois Urbana-Champaign SCADA Lab
* **Target Protocol:** Modbus TCP (Port **`502`**)
* **Attack Class:** Multi-stage reconnaissance followed by Function Code `05` coil overrides and Function Code `16` register setpoint tampering.
* **MITRE ATT&CK for ICS:** **T0855 (Unauthorized Command Message)**

---

## 1. Replay Behavior

The capture contains over $45{,}000$ packets of mixed normal polling interspersed with stealthy coil write bursts attempting to disable cooling water pumps. 

Replaying this dataset verifies that the neural autoencoder (`libxinfer.so`) accurately differentiates between normal cyclic polls and malicious coil override instructions.

