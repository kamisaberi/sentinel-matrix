# Microsecond Rate-Pacing & Packet Scheduling

When replaying historical network captures, streaming packets too rapidly can overwhelm virtual queues, while streaming too slowly fails to simulate real-world line-rate pressure.

`pcap_streamer.py` incorporates **High-Resolution Microsecond Rate-Pacing**.

---

## 1. Rate-Pacing Algorithm

```text
 For each packet in PCAP:
   1. Read delta timestamp: Δt = ts_packet[i] - ts_packet[i-1]
   2. Apply speed multiplier: Δt_adjusted = Δt / speed_factor
   3. Busy-spin wait until target epoch reached (bypassing OS sleep jitter)
   4. Transmit frame over raw socket
```

---

## 2. CLI Rate-Pacing Options

Control transmission rates using the streamer CLI:

```bash
# Replay at real-time wire pace (1.0x speed multiplier)
python3 pcap_streamer.py --pcap attack.pcap --speed 1.0

# Replay at maximum wire saturation (10,000 packets/second burst)
python3 pcap_streamer.py --pcap attack.pcap --pps-limit 10000
```

