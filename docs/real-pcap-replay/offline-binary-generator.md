# Air-Gapped Binary Generator (`tools/generate_real_pcaps.py`)

In air-gapped testbeds without internet access to GitHub LFS servers, `tools/generate_real_pcaps.py` generates protocol-compliant binary PCAP files directly from raw hex dumps and Python definitions.

---

## 1. Offline Generation Script

```python
#!/usr/bin/env python3
import struct
from pathlib import Path

PCAP_GLOBAL_HEADER = struct.pack("=IHHiIII", 0xa1b2c3d4, 2, 4, 0, 0, 65535, 1)

def write_pcap_frame(f, frame_bytes: bytes, ts_sec: int = 1791172800, ts_usec: int = 0):
    pkt_hdr = struct.pack("=IIII", ts_sec, ts_usec, len(frame_bytes), len(frame_bytes))
    f.write(pkt_hdr + frame_bytes)

def generate_offline_industroyer_pcap(output_path: str):
    p = Path(output_path)
    p.parent.mkdir(parents=True, exist_ok=True)
    
    with open(p, "wb") as f:
        f.write(PCAP_GLOBAL_HEADER)
        
        # Frame 1: IEC 60870-5-104 STARTDT Act
        frame_startdt = bytes.fromhex(
            "005056a1b201005056a1b29908004500002c0001000040067cc20a"
            "f000630af00065c001096400000001000000005002ffff632d0000"
            "680407000000" # APCI: STARTDT Act
        )
        write_pcap_frame(f, frame_startdt)

        # Frame 2: IEC 104 Type 46 (Double Command: Breaker Open)
        frame_trip = bytes.fromhex(
            "005056a1b201005056a1b2990800450000360002000040067cb70a"
            "f000630af00065c001096400000002000000015018ffff541a0000"
            "680e00000200" # APCI I-format
            "2e0106000100" # ASDU: Type 46, COT=6, CommonAddr=1
            "64040001"     # IOA=1124, Breaker State=1 (Trip)
        )
        write_pcap_frame(f, frame_trip, ts_usec=100000)

    print(f"[+] Successfully generated offline binary PCAP: {output_path}")

if __name__ == "__main__":
    generate_offline_industroyer_pcap("shared/pcaps/industroyer_iec104.pcap")
```

