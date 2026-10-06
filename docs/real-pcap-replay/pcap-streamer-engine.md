# Binary PCAP Streamer Engine (`src/traffic/pcap_streamer.py`)

`pcap_streamer.py` parses standard libpcap binary files, rewrites layer-3/layer-4 IP addresses to match the `10.240.0.0/24` digital twin topology, and injects frames onto the wire using raw sockets.

---

## 1. Frame Processing Loop (`pcap_streamer.py`)

```python
import socket
import struct
import time
from pathlib import Path

class PcapStreamer:
    def __init__(self, pcap_path: str, interface: str = "eth0", target_ip: str = "10.240.0.101"):
        self.pcap_path = Path(pcap_path)
        self.interface = interface
        self.target_ip_bytes = socket.inet_aton(target_ip)
        self.sock = socket.socket(socket.AF_PACKET, socket.SOCK_RAW)
        self.sock.bind((interface, 0))

    def stream_pcap(self, pps_limit: int = 1000):
        delay = 1.0 / pps_limit if pps_limit > 0 else 0.0
        
        with open(self.pcap_path, "rb") as f:
            # 1. Read Global Header (24 Bytes)
            global_header = f.read(24)
            magic, v_maj, v_min, thiszone, sigfigs, snaplen, network = struct.unpack("=IHHiIII", global_header)
            assert magic in (0xa1b2c3d4, 0xd4c3b2a1), "Invalid PCAP magic bytes!"

            # 2. Iterate Packet Records
            packet_idx = 0
            while True:
                pkt_header = f.read(16)
                if not pkt_header or len(pkt_header) < 16:
                    break
                
                ts_sec, ts_usec, incl_len, orig_len = struct.unpack("=IIII", pkt_header)
                frame_data = bytearray(f.read(incl_len))

                # 3. Dynamic IP Rewriting: Rewrite destination IPv4 (Bytes 30-33 in Ethernet+IP frame)
                if len(frame_data) >= 34 and frame_data[12:14] == b'\x08\x00':
                    frame_data[30:34] = self.target_ip_bytes
                    # Recalculate IPv4 Checksum
                    frame_data[24:26] = b'\x00\x00'
                    csum = self._compute_checksum(bytes(frame_data[14:34]))
                    frame_data[24:26] = struct.pack(">H", csum)

                # 4. Transmit over Raw Socket
                self.sock.send(frame_data)
                packet_idx += 1
                if delay > 0:
                    time.sleep(delay)

        print(f"[+] Replayed {packet_idx} authentic frames from {self.pcap_path.name}")

    def _compute_checksum(self, data: bytes) -> int:
        if len(data) % 2 == 1:
            data += b'\x00'
        s = sum(struct.unpack(f">{len(data)//2}H", data))
        s = (s >> 16) + (s & 0xffff)
        s += (s >> 16)
        return ~s & 0xffff
```

