# Architecture & Low-Level Design

`sentinel-matrix` encapsulates a complete enterprise and industrial defense ecosystem inside a multi-container Docker bridge (`matrix_net`) running on `10.240.0.0/24`.

## Section Navigation

- [Simulation Mesh Architecture](./simulation-mesh-architecture.md): Multi-container digital twin bridge architecture and in-kernel eBPF fidelity.
- [Decoupled Scenario Engine](./decoupled-scenario-engine.md): Dynamic scenario engine (`scenario_engine.py`) with multi-network Purdue models (DMZ, SCADA, Fieldbus).
- [Universal Device Container](./universal-device-container.md): Universal parameterized container (`Dockerfile.device_runtime`) emulating 8 universal device archetypes with HTTP anomaly hooks.
- [The Infinite Flywheel](./the-infinite-flywheel.md): The 6-step closed-loop active learning adaptation sequence.
- [Container Topology Matrix](./container-topology-matrix.md): Master service allocation table, static IP addresses, and resource budgets.
- [Shared Volumes & IPC](./shared-volumes-and-ipc.md): Shared NVMe storage layout (`/shared/models`, `/shared/datasets`, `/shared/lib`).
- [VMware Hypervisor Optimization](./vmware-hypervisor-optimization.md): Nested virtualization settings (`.vmx`) and virtual switch security policies.
