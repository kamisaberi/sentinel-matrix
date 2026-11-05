# Real Malware PCAP Replay Pipeline

`sentinel-matrix` streams authentic binary packet captures (PCAP) from historical malware campaigns directly across the virtual wire.

## Section Navigation

- [PCAP Replay Pipeline Overview](./pcap-replay-pipeline-overview.md): Why authentic binary malware replays outperform synthetic mocking.
- [PCAP Streamer Engine](./pcap-streamer-engine.md): `pcap_streamer.py` frame parsing, IP address rewriting, and checksum recalculation.
- [Git LFS Downloader](./git-lfs-downloader.md): Automated Git LFS resolution script (`download_real_pcaps.py`) fetching binary payloads.
- [Offline Binary Generator](./offline-binary-generator.md): Air-gapped binary generator (`generate_real_pcaps.py`) synthesizing raw hex captures.
- [Catalog: Industroyer IEC-104](./pcap-catalog-industroyer-iec104.md): Replaying CrashOverride Type 46 double commands against substation breakers.
- [Catalog: Triton TriStation](./pcap-catalog-triton-tristation.md): Replaying HatMan TSAP zero-day program downloads targeting safety systems.
- [Catalog: Stuxnet S7Comm](./pcap-catalog-stuxnet-s7comm.md): Replaying Stuxnet S7Comm DB890 centrifuge frequency write mutations.
- [Catalog: Modbus SCADA](./pcap-catalog-modbus-scada.md): Replaying University of Illinois SCADA lab Modbus override captures.
- [Rate Pacing & Wire Injection](./rate-pacing-and-wire-injection.md): High-resolution microsecond rate pacing and packet scheduling algorithms.
