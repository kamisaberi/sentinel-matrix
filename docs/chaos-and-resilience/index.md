# Chaos Engineering & Resilience Testing

`sentinel-matrix` incorporates a dedicated Chaos Engineering framework to test automated fail-safes under adversarial stress.

## Section Navigation

- [Chaos Engineering Overview](./chaos-engineering-overview.md): The 4 pillars of chaos injection in the digital twin range.
- [Latency Spike Injection](./latency-spike-injection.md): Injecting $1{,}420\,\mu\text{s}$ compute delays (`make chaos-latency`) to test `RollbackGuard`.
- [Automated Rollback Verification](./automated-rollback-verification.md): Verifying sub-50ms automated model rollbacks upon SLA breaches.
- [Node Sever Testing](./node-sever-testing.md): Abrupt container termination (`make chaos-sever`) and 15s liveness grace timeouts.
- [Instant 0ms Disconnect](./instant-0ms-disconnect-validation.md): Validating instant 0ms graceful disconnects (`make chaos-disconnect`).
- [Automated Recovery Testing](./automated-recovery-testing.md): Testing container restart and automated TPM 2.0 re-enrollment (`make recover`).
