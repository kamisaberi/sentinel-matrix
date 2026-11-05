# Closed-Loop Active Learning Flywheel

`sentinel-matrix` validates the automated active learning flywheel connecting edge appliances, Nexus hubs, and Forge training loops.

## Section Navigation

- [Flywheel Lifecycle](./flywheel-lifecycle.md): 4-phase interactive lifecycle from uncertainty selection to zero-downtime hot-reload.
- [Forge Watcher Daemon](./forge-watcher-daemon.md): `forge_watcher.py` daemon monitoring `/shared/datasets/` via Linux `inotify`.
- [Staged Rollout Progression](./staged-rollout-progression.md): Validating model progression (`Shadow Mode` $\to$ `Canary 5%` $\to$ `Fleet-Wide`).
- [Zero-Downtime Hot Reload](./zero-downtime-hot-reload-validation.md): Proving zero-downtime atomic memory pointer swaps during line-rate floods.
- [Continuous Drift Adaptation](./continuous-drift-adaptation.md): Maintaining $> 98\%$ accuracy across a 10-minute multi-shift drift scenario.
