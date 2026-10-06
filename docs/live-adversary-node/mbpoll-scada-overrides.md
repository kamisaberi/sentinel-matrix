# Live Modbus Coil & Register Overrides via `mbpoll`

Using the standard industrial utility `mbpoll`, the adversary attempts live write mutations against field controllers to evaluate Subsystem `18_cps_sec`.

---

## 1. Attack Execution Command

Execute an unauthorized Modbus Function Code `05` (Write Single Coil) command:

```bash
docker exec -it sentinel-adversary mbpoll -m tcp -a 1 -r 1 -0 -1 10.240.0.101 1
```

* `-m tcp`: Modbus TCP encapsulation.
* `-a 1`: Target Slave / Unit ID `1`.
* `-r 1 -0`: Coil index `1` (0-based addressing).
* `-1`: Write operation (forcing coil value to `1`).

---

## 2. Expected In-Kernel Rejection

```text
mbpoll 1.0-0 - FieldTalk(tm) Modbus(R) Master Simulator
Copyright (c) 2011-2023 Pascal JEAN, https://github.com/epsilonrt/mbpoll
Web: https://www.epsilonrt.fr/en/

Set 1 reference at address 1: 1
Write failed: Connection timed out
```

The connection times out because Subsystem `18_cps_sec` trapped the unauthorized coil override and executed `XDP_DROP` before the command reached the virtual PLC logic.

