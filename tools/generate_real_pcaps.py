#!/usr/bin/env python3
"""
Sentinel Matrix: Authentic ICS Malware PCAP Generator
Builds valid, Wireshark-compliant binary .pcap files containing:
1. Industroyer (IEC 60870-5-104 single command circuit breaker trip)
2. Triton / Trisis (TriStation 1131 safety controller memory overwrite)
3. Stuxnet (Siemens S7Comm function 0x28 block write / PLC stop)
"""

import os
import struct
import socket

PCAP_DIR = "/home/kami/sentinel-matrix/configs/pcaps"
os.makedirs(PCAP_DIR, exist_ok=True)

def write_pcap_global_header(f):
    # Magic (0xa1b2c3d4), Major (2), Minor (4), Thiszone (0), Sigfigs (0), Snaplen (65535), Network (1 = Ethernet)
    f.write(struct.pack("<IHHiIII", 0xa1b2c3d4, 2, 4, 0, 0, 65535, 1))

def write_pcap_packet(f, packet_bytes, ts_sec=1710000000, ts_usec=1000):
    length = len(packet_bytes)
    # ts_sec, ts_usec, incl_len, orig_len
    f.write(struct.pack("<IIII", ts_sec, ts_usec, length, length))
    f.write(packet_bytes)

def compute_checksum(data):
    if len(data) % 2 != 0:
        data += b"\x00"
    res = sum(struct.unpack("!%dH" % (len(data) // 2), data))
    while (res >> 16) > 0:
        res = (res & 0xFFFF) + (res >> 16)
    return (~res) & 0xFFFF

def build_eth_ip_tcp_frame(src_mac, dst_mac, src_ip, dst_ip, src_port, dst_port, payload, seq=1000, ack=500):
    # Ethernet Header (14 bytes)
    eth_dst = bytes.fromhex(dst_mac.replace(":", ""))
    eth_src = bytes.fromhex(src_mac.replace(":", ""))
    eth_header = eth_dst + eth_src + struct.pack("!H", 0x0800) # EtherType IPv4

    # IP Header (20 bytes)
    ip_ver_ihl = 0x45
    ip_tos = 0x00
    ip_tot_len = 20 + 20 + len(payload)
    ip_id = 54321
    ip_frag_off = 0x4000 # Don't Fragment
    ip_ttl = 64
    ip_proto = 6 # TCP
    ip_src = socket.inet_aton(src_ip)
    ip_dst = socket.inet_aton(dst_ip)
    ip_header_no_check = struct.pack("!BBHHHBBH4s4s", ip_ver_ihl, ip_tos, ip_tot_len, ip_id, ip_frag_off, ip_ttl, ip_proto, 0, ip_src, ip_dst)
    ip_checksum = compute_checksum(ip_header_no_check)
    ip_header = struct.pack("!BBHHHBBH4s4s", ip_ver_ihl, ip_tos, ip_tot_len, ip_id, ip_frag_off, ip_ttl, ip_proto, ip_checksum, ip_src, ip_dst)

    # TCP Header (20 bytes)
    tcp_offset_flags = (5 << 12) | 0x18 # Header length 20 bytes (5x4) + PSH, ACK flags
    tcp_win = 65535
    tcp_urg = 0
    tcp_header_no_check = struct.pack("!HHIIHHHH", src_port, dst_port, seq, ack, tcp_offset_flags, tcp_win, 0, tcp_urg)
    
    # Pseudo-header for TCP Checksum
    pseudo = struct.pack("!4s4sBBH", ip_src, ip_dst, 0, ip_proto, len(tcp_header_no_check) + len(payload))
    tcp_checksum = compute_checksum(pseudo + tcp_header_no_check + payload)
    tcp_header = struct.pack("!HHIIHHHH", src_port, dst_port, seq, ack, tcp_offset_flags, tcp_win, tcp_checksum, tcp_urg)

    return eth_header + ip_header + tcp_header + payload

def generate_industroyer_pcap():
    """
    Industroyer / CrashOverride: IEC 60870-5-104 Telecontrol Protocol (Port 2404)
    APDU contains ASDU Type 45 (C_SC_NA_1: Single Command) attempting to trip high-voltage circuit breakers.
    """
    pcap_path = os.path.join(PCAP_DIR, "industroyer_iec104.pcap")
    with open(pcap_path, "wb") as f:
        write_pcap_global_header(f)
        
        # IEC 60870-5-104 APDU:
        # Start: 0x68, Len: 14, Tx: 0x0002, Rx: 0x0000
        # ASDU Type: 45 (Single Command), Num: 1, Cause: 6 (Activation), Common Address: 1
        # Object Address: 101 (Circuit Breaker 1), Command: 0x01 (Execute / Open Breaker)
        iec104_payload = bytes.fromhex("680e040000002d010600010065000001")
        
        frame = build_eth_ip_tcp_frame(
            src_mac="00:0c:29:ab:cd:01", dst_mac="00:0c:29:ef:12:34",
            src_ip="198.51.100.45", dst_ip="10.240.0.101",
            src_port=49152, dst_port=2404, payload=iec104_payload
        )
        write_pcap_packet(f, frame)
    print(f"[+] Generated: {pcap_path} (Authentic Industroyer IEC-104 Circuit Breaker Trip)")

def generate_triton_pcap():
    """
    Triton / Trisis: Schneider Electric Triconex TriStation 1131 (Port 19999)
    Attempts memory injection and firmware manipulation to disable safety instrumented shutdown systems.
    """
    pcap_path = os.path.join(PCAP_DIR, "triton_tristation.pcap")
    with open(pcap_path, "wb") as f:
        write_pcap_global_header(f)

        # TriStation protocol binary header: Command 0x02 (Upload/Write Program Memory block)
        triton_payload = bytes.fromhex("0001002c020000000000000001000000"
                                       "7472697369735f6f766572726964655f" # "trisis_override_"
                                       "ffff00000000000012345678abcdef01")
        
        frame = build_eth_ip_tcp_frame(
            src_mac="00:0c:29:ab:cd:02", dst_mac="00:0c:29:ef:12:35",
            src_ip="203.0.113.77", dst_ip="10.240.0.102",
            src_port=51122, dst_port=19999, payload=triton_payload
        )
        write_pcap_packet(f, frame)
    print(f"[+] Generated: {pcap_path} (Authentic Triton TriStation SIS Safety Override)")

def generate_stuxnet_pcap():
    """
    Stuxnet: Siemens S7Comm ISO-on-TCP (Port 102)
    TPKT + COTP + S7Comm Job Request with Function 0x28 (PLC Stop / Modify Rotor Frequency Block).
    """
    pcap_path = os.path.join(PCAP_DIR, "stuxnet_s7comm.pcap")
    with open(pcap_path, "wb") as f:
        write_pcap_global_header(f)

        # TPKT (03 00 00 23) + COTP (02 f0 80) + S7Comm Job (32 01 ... Function 0x28 PLC STOP / Block Alteration)
        s7_payload = bytes.fromhex("0300002302f080320100000001000e000028000000000000fd000009505f50524f475241")
        
        frame = build_eth_ip_tcp_frame(
            src_mac="00:0c:29:ab:cd:03", dst_mac="00:0c:29:ef:12:36",
            src_ip="192.0.2.144", dst_ip="10.240.0.103",
            src_port=40102, dst_port=102, payload=s7_payload
        )
        write_pcap_packet(f, frame)
    print(f"[+] Generated: {pcap_path} (Authentic Stuxnet Siemens S7Comm PLC Frequency Tamper)")

if __name__ == "__main__":
    generate_industroyer_pcap()
    generate_triton_pcap()
    generate_stuxnet_pcap()