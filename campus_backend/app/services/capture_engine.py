import datetime
import json
import random
import struct
import io
from typing import List, Dict, Any, Tuple
from sqlalchemy.orm import Session
from ..models import PacketLog, Router, CustomerSystem
from ..websocket.manager import ws_manager

def format_hex_ascii(data: bytes) -> Tuple[str, str]:
    """
    Produces Wireshark-style 16-bytes per line hex dump and printable ASCII.
    """
    hex_lines = []
    ascii_lines = []

    for i in range(0, len(data), 16):
        chunk = data[i:i+16]
        hex_str = " ".join(f"{b:02x}" for b in chunk)
        # Pad if less than 16 bytes
        if len(chunk) < 16:
            hex_str = hex_str.ljust(16 * 3 - 1)
        ascii_str = "".join(chr(b) if 32 <= b <= 126 else "." for b in chunk)
        
        offset_hex = f"{i:04x}   {hex_str}"
        hex_lines.append(offset_hex)
        ascii_lines.append(ascii_str)

    full_hex = "\n".join(hex_lines)
    full_ascii = "\n".join(ascii_lines)
    return full_hex, full_ascii


def create_pcap_binary(packets: List[PacketLog]) -> bytes:
    """
    Generates a standard libpcap binary file (magic 0xa1b2c3d4, version 2.4, LINKTYPE_ETHERNET)
    readable by any Wireshark, tcpdump, or analyzer tool.
    """
    buf = io.BytesIO()
    # 24-byte PCAP Global Header
    # magic: 0xa1b2c3d4 (little-endian: 0xd4c3b2a1)
    # version_major: 2, version_minor: 4
    # thiszone: 0, sigfigs: 0, snaplen: 65535, network: 1 (Ethernet)
    global_hdr = struct.pack("<IHHiIII", 0xa1b2c3d4, 2, 4, 0, 0, 65535, 1)
    buf.write(global_hdr)

    for p in packets:
        # Convert hex lines back to raw bytes
        hex_content = ""
        for line in p.raw_hex.split("\n"):
            parts = line.split("   ")
            if len(parts) >= 2:
                hex_content += parts[1].replace(" ", "")
        try:
            raw_data = bytes.fromhex(hex_content)
        except Exception:
            # Fallback mock frame of packet length
            raw_data = b"\x00" * max(p.length, 60)

        ts = int(p.timestamp.timestamp())
        usec = int((p.time_offset % 1.0) * 1000000)
        pcap_pkt_hdr = struct.pack("<IIII", ts, usec, len(raw_data), len(raw_data))
        buf.write(pcap_pkt_hdr)
        buf.write(raw_data)

    return buf.getvalue()


class CaptureEngine:
    @staticmethod
    def craft_layer_details(
        frame_no: int,
        timestamp_str: str,
        frame_len: int,
        src_mac: str,
        dst_mac: str,
        eth_type: str,
        l3_proto: str,
        src_ip: str,
        dst_ip: str,
        l4_proto: str,
        src_port: int | None,
        dst_port: int | None,
        info: str,
        payload_details: Dict[str, Any]
    ) -> Dict[str, Any]:
        """
        Structures educational OSI L1-L7 breakdown for the Packet Tree.
        """
        return {
            "L1_Physical": {
                "name": "Frame & Physical Layer (L1)",
                "fields": {
                    "Frame Number": frame_no,
                    "Interface": "eth0 (Lab Gigabit Switch Port)",
                    "Arrival Time": timestamp_str,
                    "Frame Length": f"{frame_len} bytes ({frame_len * 8} bits)",
                    "Link Status": "Full Duplex, 1000 Mbps, Link Up"
                }
            },
            "L2_DataLink": {
                "name": "Ethernet II / Data Link Layer (L2)",
                "fields": {
                    "Destination MAC": dst_mac,
                    "Source MAC": src_mac,
                    "Type": eth_type,
                    "FCS (Frame Check Sequence)": "0x00000000 (Verified Good)"
                }
            },
            "L3_Network": {
                "name": f"{l3_proto} / Network Layer (L3)",
                "fields": {
                    "Source IP": src_ip,
                    "Destination IP": dst_ip,
                    "Version": "4" if "IPv4" in l3_proto or l3_proto == "IP" else "6",
                    "Time to Live (TTL)": 64,
                    "Protocol": l4_proto,
                    "Header Checksum": "0x4a2e [Validation disabled]"
                } if "IP" in l3_proto else {
                    "Hardware type": "Ethernet (1)",
                    "Protocol type": "IPv4 (0x0800)",
                    "Hardware size": 6,
                    "Protocol size": 4,
                    "Opcode": "request (1)" if "Who has" in info else "reply (2)",
                    "Sender MAC address": src_mac,
                    "Sender IP address": src_ip,
                    "Target MAC address": dst_mac,
                    "Target IP address": dst_ip
                }
            },
            "L4_Transport": {
                "name": f"{l4_proto} / Transport Layer (L4)",
                "fields": {
                    "Source Port": src_port,
                    "Destination Port": dst_port,
                    "Transmission Control": "Connection-oriented" if l4_proto == "TCP" else "Connectionless",
                    "Checksum": "0x8f3c"
                } if src_port and dst_port else {
                    "Protocol": l4_proto,
                    "Type": payload_details.get("icmp_type", "Control Message")
                }
            },
            "L5_Session": {
                "name": "Session Layer (L5)",
                "fields": {
                    "Session Tracking": payload_details.get("session_state", "Established / Direct Socket"),
                    "Keepalive": "Active",
                    "Socket Pair": f"{src_ip}:{src_port} <-> {dst_ip}:{dst_port}" if src_port else "N/A"
                }
            },
            "L6_Presentation": {
                "name": "Presentation Layer (L6)",
                "fields": {
                    "Data Representation": payload_details.get("encoding", "Plaintext ASCII / UTF-8"),
                    "Encryption": payload_details.get("encryption", "None (Cleartext)")
                }
            },
            "L7_Application": {
                "name": f"{payload_details.get('app_proto', 'Application Layer')} (L7)",
                "fields": payload_details.get("app_fields", {"Summary": info})
            }
        }

    @classmethod
    def generate_packet_trace(
        cls,
        router: Router,
        customers: List[CustomerSystem],
        scenario: str = "NORMAL",
        count: int = 15,
        start_no: int = 1
    ) -> List[Dict[str, Any]]:
        """
        Synthesizes high-fidelity CNIP educational packets for live analysis.
        """
        results = []
        now = datetime.datetime.utcnow()

        r_ip = router.ip_address
        r_mac = "00:1A:2B:3C:4D:01"
        gateway = router.gateway

        # Fallback system list if no customers registered yet
        client_pool = customers if customers else [
            CustomerSystem(name="PC-01", system_number="PC-01", ip_address=f"192.168.10.{10+i}", mac_address=f"00:11:22:33:44:{10+i:02x}")
            for i in range(5)
        ]

        for i in range(count):
            pkt_no = start_no + i
            offset = i * 0.12 + random.uniform(0.01, 0.08)
            pkt_time = now + datetime.timedelta(seconds=offset)
            time_str = pkt_time.strftime("%H:%M:%S.%f")[:-3]

            client = random.choice(client_pool)
            c_ip = client.ip_address
            c_mac = client.mac_address

            # Scenarios
            if scenario == "PORT_SCAN":
                scan_ports = [21, 22, 23, 25, 53, 80, 110, 143, 443, 8080, 8443, 3306, 5432]
                target_port = scan_ports[i % len(scan_ports)]
                proto = "TCP"
                info = f"{random.randint(49152, 65535)} → {target_port} [SYN] Seq={i*1000} Win=1024 Len=0"
                payload = {
                    "session_state": "SYN_SENT (Port Probing)",
                    "encoding": "Binary Flag",
                    "encryption": "None",
                    "app_proto": "Port Scanner (Reconnaissance)",
                    "app_fields": {"Target Port": target_port, "Flag": "SYN (Scan Probe)", "Risk": "Suspicious Port Sweep"}
                }
                raw_bytes = struct.pack(">14s20s20s", b"\x00"*14, b"\x00"*20, b"\x00"*20) + f"SYN_SCAN_PORT_{target_port}".encode()
                hex_d, asc_d = format_hex_ascii(raw_bytes)
                details = cls.craft_layer_details(
                    pkt_no, time_str, len(raw_bytes), c_mac, r_mac, "IPv4 (0x0800)", "IPv4", c_ip, r_ip,
                    "TCP", random.randint(49152, 65535), target_port, info, payload
                )
                results.append({
                    "packet_no": pkt_no, "timestamp": pkt_time, "time_offset": offset,
                    "src_ip": c_ip, "dst_ip": r_ip, "src_mac": c_mac, "dst_mac": r_mac,
                    "protocol": "TCP", "length": len(raw_bytes), "info": info,
                    "layer_details": json.dumps(details), "raw_hex": hex_d, "raw_ascii": asc_d
                })

            elif scenario == "SYN_FLOOD":
                sport = random.randint(1024, 65535)
                proto = "TCP"
                info = f"{sport} → 80 [SYN] Seq={random.randint(100000, 999999)} Win=64240 Len=0 MSS=1460"
                payload = {
                    "session_state": "Half-Open Connection Attack",
                    "encoding": "Raw Bits",
                    "encryption": "None",
                    "app_proto": "DDoS Traffic Spike",
                    "app_fields": {"Attack": "TCP SYN Flood", "Target Port": 80, "Rate": "High Frequency"}
                }
                raw_bytes = struct.pack(">14s20s20s", b"\x00"*14, b"\x00"*20, b"\x00"*20) + b"SYN_FLOOD_BURST_FRAME"
                hex_d, asc_d = format_hex_ascii(raw_bytes)
                details = cls.craft_layer_details(
                    pkt_no, time_str, len(raw_bytes), c_mac, r_mac, "IPv4 (0x0800)", "IPv4", c_ip, r_ip,
                    "TCP", sport, 80, info, payload
                )
                results.append({
                    "packet_no": pkt_no, "timestamp": pkt_time, "time_offset": offset,
                    "src_ip": c_ip, "dst_ip": r_ip, "src_mac": c_mac, "dst_mac": r_mac,
                    "protocol": "TCP", "length": len(raw_bytes), "info": info,
                    "layer_details": json.dumps(details), "raw_hex": hex_d, "raw_ascii": asc_d
                })

            elif scenario == "ARP_SPOOF":
                rogue_mac = "00:DE:AD:BE:EF:99"
                proto = "ARP"
                info = f"ARP Announcement / Reply: {r_ip} is at {rogue_mac}"
                payload = {
                    "session_state": "Stateless ARP Broadcast",
                    "encoding": "Binary ARP Packet",
                    "encryption": "None",
                    "app_proto": "ARP Poisoning Attack",
                    "app_fields": {"Attacker MAC": rogue_mac, "Target Spoofed IP": r_ip, "Anomaly": "Cache Poisoning"}
                }
                raw_bytes = struct.pack(">14s28s", b"\xff"*6 + b"\x00"*8, b"\x00"*28) + b"ROUTER_IP_SPOOF_INJECTION"
                hex_d, asc_d = format_hex_ascii(raw_bytes)
                details = cls.craft_layer_details(
                    pkt_no, time_str, len(raw_bytes), rogue_mac, "FF:FF:FF:FF:FF:FF", "ARP (0x0806)", "ARP", r_ip, c_ip,
                    "ARP", None, None, info, payload
                )
                results.append({
                    "packet_no": pkt_no, "timestamp": pkt_time, "time_offset": offset,
                    "src_ip": r_ip, "dst_ip": c_ip, "src_mac": rogue_mac, "dst_mac": "FF:FF:FF:FF:FF:FF",
                    "protocol": "ARP", "length": len(raw_bytes), "info": info,
                    "layer_details": json.dumps(details), "raw_hex": hex_d, "raw_ascii": asc_d
                })

            else:
                # NORMAL Realistic Protocol Rotation:
                # 0: ARP, 1: DNS, 2: HTTP, 3: TLS, 4: ICMP, 5: TCP
                p_type = i % 6
                if p_type == 0:
                    # ARP
                    info = f"Who has {gateway}? Tell {c_ip}"
                    payload = {
                        "session_state": "L2 Hardware Address Resolution",
                        "encoding": "Hardware / Protocol Addr",
                        "encryption": "None",
                        "app_proto": "ARP Address Resolution Protocol",
                        "app_fields": {"Target IP": gateway, "Sender IP": c_ip, "Sender MAC": c_mac}
                    }
                    raw_data = bytes.fromhex("ffffffffffff" + c_mac.replace(":", "") + "08060001080006040001" + c_mac.replace(":", "") + "c0a80a0f000000000000c0a80a010000000000000000000000000000")
                    hex_d, asc_d = format_hex_ascii(raw_data)
                    details = cls.craft_layer_details(
                        pkt_no, time_str, len(raw_data), c_mac, "FF:FF:FF:FF:FF:FF", "ARP (0x0806)", "ARP", c_ip, gateway,
                        "ARP", None, None, info, payload
                    )
                    results.append({
                        "packet_no": pkt_no, "timestamp": pkt_time, "time_offset": offset,
                        "src_ip": c_ip, "dst_ip": gateway, "src_mac": c_mac, "dst_mac": "FF:FF:FF:FF:FF:FF",
                        "protocol": "ARP", "length": len(raw_data), "info": info,
                        "layer_details": json.dumps(details), "raw_hex": hex_d, "raw_ascii": asc_d
                    })

                elif p_type == 1:
                    # DNS Query
                    domain = random.choice(["portal.campus.edu", "elearning.univ.edu", "github.com", "google.com"])
                    sport = random.randint(50000, 60000)
                    info = f"Standard query 0x{random.randint(1000, 9999):x} A {domain}"
                    payload = {
                        "session_state": "DNS Transaction (UDP 53)",
                        "encoding": "DNS Wire Format",
                        "encryption": "None",
                        "app_proto": "Domain Name System (Query)",
                        "app_fields": {"Query": domain, "Type": "A (Host Address)", "Class": "IN (Internet)", "Nameserver": r_ip}
                    }
                    raw_data = (b"\x00"*14 + b"\x45\x00\x00\x3c" + b"\x00"*16 + b"\xc0\xa8\x0a\x0f\xc0\xa8\x0a\x01" +
                                struct.pack(">HH", sport, 53) + b"\x00\x1c\x00\x00" + b"\x1a\x2b\x01\x00\x00\x01\x00\x00\x00\x00\x00\x00" + domain.encode() + b"\x00\x00\x01\x00\x01")
                    hex_d, asc_d = format_hex_ascii(raw_data)
                    details = cls.craft_layer_details(
                        pkt_no, time_str, len(raw_data), c_mac, r_mac, "IPv4 (0x0800)", "IPv4", c_ip, r_ip,
                        "UDP", sport, 53, info, payload
                    )
                    results.append({
                        "packet_no": pkt_no, "timestamp": pkt_time, "time_offset": offset,
                        "src_ip": c_ip, "dst_ip": r_ip, "src_mac": c_mac, "dst_mac": r_mac,
                        "protocol": "DNS", "length": len(raw_data), "info": info,
                        "layer_details": json.dumps(details), "raw_hex": hex_d, "raw_ascii": asc_d
                    })

                elif p_type == 2:
                    # HTTP GET
                    sport = random.randint(45000, 55000)
                    info = f"GET /api/v1/lab-schedule HTTP/1.1 (Host: portal.campus.edu)"
                    payload = {
                        "session_state": "HTTP/1.1 TCP Connection",
                        "encoding": "ASCII / MIME",
                        "encryption": "None (Cleartext HTTP)",
                        "app_proto": "Hypertext Transfer Protocol (HTTP)",
                        "app_fields": {
                            "Method": "GET",
                            "URI": "/api/v1/lab-schedule",
                            "Host": "portal.campus.edu",
                            "User-Agent": "Mozilla/5.0 (CampusLabSystem; Linux x86_64)",
                            "Accept": "application/json, text/html"
                        }
                    }
                    http_msg = b"GET /api/v1/lab-schedule HTTP/1.1\r\nHost: portal.campus.edu\r\nUser-Agent: Mozilla/5.0 (CampusLab)\r\nAccept: */*\r\n\r\n"
                    raw_data = b"\x00"*14 + b"\x45\x00\x00\xa0" + b"\x00"*16 + b"\xc0\xa8\x0a\x0f\xc0\xa8\x0a\x01" + struct.pack(">HH", sport, 80) + b"\x00"*16 + http_msg
                    hex_d, asc_d = format_hex_ascii(raw_data)
                    details = cls.craft_layer_details(
                        pkt_no, time_str, len(raw_data), c_mac, r_mac, "IPv4 (0x0800)", "IPv4", c_ip, r_ip,
                        "TCP", sport, 80, info, payload
                    )
                    results.append({
                        "packet_no": pkt_no, "timestamp": pkt_time, "time_offset": offset,
                        "src_ip": c_ip, "dst_ip": r_ip, "src_mac": c_mac, "dst_mac": r_mac,
                        "protocol": "HTTP", "length": len(raw_data), "info": info,
                        "layer_details": json.dumps(details), "raw_hex": hex_d, "raw_ascii": asc_d
                    })

                elif p_type == 3:
                    # TLS Client Hello
                    sport = random.randint(51000, 62000)
                    info = f"Client Hello (SNI: secure-portal.campus.edu) TLSv1.3"
                    payload = {
                        "session_state": "TLS Cryptographic Handshake",
                        "encoding": "TLS Record Layer",
                        "encryption": "TLS_AES_256_GCM_SHA384 (Negotiating)",
                        "app_proto": "Transport Layer Security (TLS 1.3)",
                        "app_fields": {
                            "Handshake Type": "Client Hello (1)",
                            "Version": "TLS 1.3 (0x0304)",
                            "Server Name Indication (SNI)": "secure-portal.campus.edu",
                            "Cipher Suites": "TLS_AES_256_GCM_SHA384, TLS_CHACHA20_POLY1305_SHA256"
                        }
                    }
                    tls_msg = b"\x16\x03\x01\x00\xd2\x01\x00\x00\xce\x03\x03" + b"\xaa"*32 + b"\x00\x00\x04\x13\x02\x13\x01" + b"secure-portal.campus.edu"
                    raw_data = b"\x00"*14 + b"\x45\x00\x00\xf0" + b"\x00"*16 + b"\xc0\xa8\x0a\x0f\xc0\xa8\x0a\x01" + struct.pack(">HH", sport, 443) + b"\x00"*16 + tls_msg
                    hex_d, asc_d = format_hex_ascii(raw_data)
                    details = cls.craft_layer_details(
                        pkt_no, time_str, len(raw_data), c_mac, r_mac, "IPv4 (0x0800)", "IPv4", c_ip, r_ip,
                        "TCP", sport, 443, info, payload
                    )
                    results.append({
                        "packet_no": pkt_no, "timestamp": pkt_time, "time_offset": offset,
                        "src_ip": c_ip, "dst_ip": r_ip, "src_mac": c_mac, "dst_mac": r_mac,
                        "protocol": "TLS", "length": len(raw_data), "info": info,
                        "layer_details": json.dumps(details), "raw_hex": hex_d, "raw_ascii": asc_d
                    })

                elif p_type == 4:
                    # ICMP Ping
                    info = f"Echo (ping) request  id=0x{random.randint(100, 999):04x}, seq={i+1}, ttl=64"
                    payload = {
                        "session_state": "Echo Verification Loop",
                        "encoding": "ICMP Payload",
                        "encryption": "None",
                        "app_proto": "Internet Control Message Protocol (ICMP)",
                        "app_fields": {
                            "Type": "8 (Echo Request)",
                            "Code": "0",
                            "Sequence Number": i + 1,
                            "Diagnostic": "Lab Host Connectivity Verification"
                        }
                    }
                    icmp_body = b"\x08\x00\x4d\x5b\x00\x01\x00\x01" + b"abcdefghijklmnopqrstuvwabcdefghi"
                    raw_data = b"\x00"*14 + b"\x45\x00\x00\x54" + b"\x00"*16 + b"\xc0\xa8\x0a\x0f\xc0\xa8\x0a\x01" + icmp_body
                    hex_d, asc_d = format_hex_ascii(raw_data)
                    details = cls.craft_layer_details(
                        pkt_no, time_str, len(raw_data), c_mac, r_mac, "IPv4 (0x0800)", "IPv4", c_ip, r_ip,
                        "ICMP", None, None, info, payload
                    )
                    results.append({
                        "packet_no": pkt_no, "timestamp": pkt_time, "time_offset": offset,
                        "src_ip": c_ip, "dst_ip": r_ip, "src_mac": c_mac, "dst_mac": r_mac,
                        "protocol": "ICMP", "length": len(raw_data), "info": info,
                        "layer_details": json.dumps(details), "raw_hex": hex_d, "raw_ascii": asc_d
                    })

                else:
                    # TCP Session Handshake
                    sport = random.randint(49152, 65535)
                    info = f"{sport} → 80 [ACK] Seq=1 Ack=1 Win=65535 Len=0"
                    payload = {
                        "session_state": "ESTABLISHED",
                        "encoding": "Raw TCP Byte Stream",
                        "encryption": "None",
                        "app_proto": "Transmission Control Protocol",
                        "app_fields": {
                            "Flags": "ACK (Acknowledgment)",
                            "Window Size": "65535",
                            "Seq Number": "1",
                            "Ack Number": "1"
                        }
                    }
                    raw_data = b"\x00"*14 + b"\x45\x00\x00\x34" + b"\x00"*16 + b"\xc0\xa8\x0a\x0f\xc0\xa8\x0a\x01" + struct.pack(">HH", sport, 80) + b"\x00\x00\x00\x01\x00\x00\x00\x01\x50\x10\xff\xff\x00\x00\x00\x00"
                    hex_d, asc_d = format_hex_ascii(raw_data)
                    details = cls.craft_layer_details(
                        pkt_no, time_str, len(raw_data), c_mac, r_mac, "IPv4 (0x0800)", "IPv4", c_ip, r_ip,
                        "TCP", sport, 80, info, payload
                    )
                    results.append({
                        "packet_no": pkt_no, "timestamp": pkt_time, "time_offset": offset,
                        "src_ip": c_ip, "dst_ip": r_ip, "src_mac": c_mac, "dst_mac": r_mac,
                        "protocol": "TCP", "length": len(raw_data), "info": info,
                        "layer_details": json.dumps(details), "raw_hex": hex_d, "raw_ascii": asc_d
                    })

        return results
