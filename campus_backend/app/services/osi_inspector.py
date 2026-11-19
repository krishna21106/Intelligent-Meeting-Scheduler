from typing import List, Dict, Any
from sqlalchemy.orm import Session
from sqlalchemy import func
from ..models import Router, PacketLog, Alert, OsiLayerStat
from ..schemas import OsiComplianceResponse, OsiLayerItem

OSI_STATIC_DEFINITIONS = [
    {
        "layer_number": 1,
        "layer_name": "Physical Layer",
        "description": "Hardware transmission medium, RJ-45 Cat6 Ethernet cabling, physical NIC transceiver, and link bitrates.",
        "protocols": ["Cat6 UTP", "1000BASE-T Ethernet", "RJ-45 Port", "NIC PHY"],
        "implementation_details": "Real-time physical link carrier detection on switch ports (eth0/eth1). Monitored at 1 Gbps full-duplex with auto-negotiation and link heartbeat.",
    },
    {
        "layer_number": 2,
        "layer_name": "Data Link Layer",
        "description": "Node-to-node framing, IEEE 802.3 Ethernet framing, 48-bit MAC address filtering, and ARP address resolution.",
        "protocols": ["Ethernet II", "ARP (0x0806)", "IEEE 802.1Q VLAN", "MAC Filtering"],
        "implementation_details": "Lab switch CAM table tracking, MAC-to-port bindings, ARP request/reply generation, and ARP spoofing / rogue MAC detection.",
    },
    {
        "layer_number": 3,
        "layer_name": "Network Layer",
        "description": "Logical IPv4/IPv6 packet addressing, CIDR subnetting, gateway routing, and ICMP diagnostics.",
        "protocols": ["IPv4", "IPv6", "ICMP (Ping)", "CIDR Routing", "DHCP Option 3"],
        "implementation_details": "Subnet division (/24), default gateway assignment, IP conflict detection, overlap validation, and inter-VLAN forwarding.",
    },
    {
        "layer_number": 4,
        "layer_name": "Transport Layer",
        "description": "End-to-end process-to-process communication, TCP 3-way handshakes, sequence numbers, flow control, and UDP datagrams.",
        "protocols": ["TCP", "UDP", "ICMP Error", "Port Multiplexing"],
        "implementation_details": "Port allocation tracking (ports 1-65535), TCP sequence & acknowledgment inspection, sliding-window port scan detection, and SYN flood defense.",
    },
    {
        "layer_number": 5,
        "layer_name": "Session Layer",
        "description": "Inter-host dialog establishment, session token maintenance, socket connection tracking, and keep-alive timers.",
        "protocols": ["Sockets (IP:Port)", "RPC", "TCP Session State", "Keep-Alive"],
        "implementation_details": "Stateful session lifecycle monitoring (SYN_SENT -> ESTABLISHED -> TIME_WAIT), session timeout tracking, and concurrent connection quotas.",
    },
    {
        "layer_number": 6,
        "layer_name": "Presentation Layer",
        "description": "Data representation, cryptographic cipher suites (TLS 1.2/1.3), JSON/XML serialization, and character encoding (UTF-8).",
        "protocols": ["TLS 1.3", "SSL Record Layer", "AES-256-GCM", "UTF-8 / ASCII", "MIME"],
        "implementation_details": "Cryptographic handshake dissection, Server Name Indication (SNI) parsing, certificate validation, and raw hex/ASCII payload formatting.",
    },
    {
        "layer_number": 7,
        "layer_name": "Application Layer",
        "description": "End-user network software, HTTP REST APIs, DNS name resolution, DHCP dynamic host configuration, SSH remote management, and FTP.",
        "protocols": ["HTTP / HTTPS", "DNS (Port 53)", "DHCP (Port 67/68)", "SSH (Port 22)", "FTP (Port 21)"],
        "implementation_details": "Educational campus network services: DNS resolution for local lab domains, HTTP student portal access, dynamic DHCP lease allocation, and blocked URL/port filtering.",
    }
]

class OsiInspector:
    @staticmethod
    def get_router_compliance(db: Session, router: Router) -> OsiComplianceResponse:
        # Tally live packets for this router
        total_packets = db.query(PacketLog).filter(PacketLog.router_id == router.id).count()

        # Query packets by protocol
        proto_counts = dict(
            db.query(PacketLog.protocol, func.count(PacketLog.id))
            .filter(PacketLog.router_id == router.id)
            .group_by(PacketLog.protocol)
            .all()
        )

        # Active unresolved alerts for this router
        active_alerts = db.query(Alert).filter(
            Alert.router_id == router.id,
            Alert.status != "RESOLVED"
        ).all()

        alert_layers = {}
        for a in active_alerts:
            alert_layers[a.osi_layer.upper()] = a.title

        layers: List[OsiLayerItem] = []

        for meta in OSI_STATIC_DEFINITIONS:
            l_num = meta["layer_number"]
            l_code = f"L{l_num}"

            # Calculate live packet count & byte estimations based on protocols at this layer
            if l_num == 1:
                # All physical frames
                p_count = total_packets
                bytes_est = p_count * 512
            elif l_num == 2:
                # Ethernet + ARP
                p_count = proto_counts.get("ARP", 0) + int(total_packets * 0.95)
                bytes_est = p_count * 256
            elif l_num == 3:
                # IPv4, IPv6, ICMP
                p_count = proto_counts.get("IPv4", 0) + proto_counts.get("ICMP", 0) + int(total_packets * 0.85)
                bytes_est = p_count * 400
            elif l_num == 4:
                # TCP, UDP
                p_count = proto_counts.get("TCP", 0) + proto_counts.get("UDP", 0)
                bytes_est = p_count * 350
            elif l_num == 5:
                # Active sessions
                p_count = int((proto_counts.get("TCP", 0) + proto_counts.get("TLS", 0)) * 0.8)
                bytes_est = p_count * 300
            elif l_num == 6:
                # TLS / Encrypted / Serialized
                p_count = proto_counts.get("TLS", 0) + proto_counts.get("HTTP", 0)
                bytes_est = p_count * 450
            else:
                # L7: DNS, HTTP, DHCP, SSH
                p_count = proto_counts.get("DNS", 0) + proto_counts.get("HTTP", 0) + proto_counts.get("TLS", 0)
                bytes_est = p_count * 500

            # Determine status: ACTIVE, ISSUE, or INACTIVE
            issue_title = alert_layers.get(l_code)
            if issue_title:
                layer_status = "ISSUE"
                diagnostic = f"Anomaly Alert Active: {issue_title}"
            elif p_count > 0:
                layer_status = "ACTIVE"
                diagnostic = f"Nominal operation. {p_count:,} packets processed through Layer {l_num} stack."
            else:
                layer_status = "ACTIVE"
                diagnostic = "Stack initialized and awaiting ingress/egress frames."

            layers.append(OsiLayerItem(
                layer_number=l_num,
                layer_name=meta["layer_name"],
                description=meta["description"],
                protocols=meta["protocols"],
                implementation_details=meta["implementation_details"],
                status=layer_status,
                live_packet_count=p_count,
                bytes_transferred=bytes_est,
                diagnostic_issue=diagnostic if layer_status == "ISSUE" else None
            ))

        return OsiComplianceResponse(
            router_id=router.id,
            router_name=router.name,
            lab_name=router.lab.name if router.lab else "Main Networking Lab",
            ip_address=router.ip_address,
            layers=layers
        )
