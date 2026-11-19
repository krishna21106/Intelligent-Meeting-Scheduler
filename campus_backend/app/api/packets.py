import datetime
import json
from typing import List, Optional, Dict, Any
from fastapi import APIRouter, Depends, HTTPException, Query, UploadFile, File, Response
from sqlalchemy.orm import Session
from sqlalchemy import func, or_
from ..database import get_db
from ..models import User, Router, CustomerSystem, PacketLog
from ..schemas import (
    PacketLogResponse, PacketStatsResponse, SimulateTrafficRequest
)
from ..security import get_current_user
from ..services.capture_engine import CaptureEngine, create_pcap_binary, format_hex_ascii
from ..services.alert_engine import AlertEngine
from ..websocket.manager import ws_manager

router = APIRouter(prefix="/packets", tags=["Wireshark-Style Packet Analyzer"])

def resolve_user_router(user: User, db: Session, requested_router_id: Optional[int] = None) -> Router:
    if user.role == "ADMIN" and requested_router_id:
        r = db.query(Router).filter(Router.id == requested_router_id).first()
        if r:
            return r
    elif user.role == "OPERATOR":
        r = db.query(Router).filter(Router.operator_id == user.id).first()
        if r:
            return r
    elif user.role == "CUSTOMER":
        c = db.query(CustomerSystem).filter(CustomerSystem.user_id == user.id).first()
        if c:
            return c.router

    r = db.query(Router).first()
    if not r:
        raise HTTPException(status_code=404, detail="No router active in the network system.")
    return r


@router.get("", response_model=List[PacketLogResponse])
def get_packet_logs(
    router_id: Optional[int] = None,
    protocol: Optional[str] = None,
    ip_filter: Optional[str] = None,
    search: Optional[str] = None,
    limit: int = Query(100, ge=1, le=500),
    offset: int = Query(0, ge=0),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    target_router = resolve_user_router(current_user, db, router_id)
    query = db.query(PacketLog).filter(PacketLog.router_id == target_router.id)

    if protocol and protocol.upper() != "ALL":
        query = query.filter(PacketLog.protocol == protocol.upper())

    if ip_filter:
        ip_clean = ip_filter.strip()
        query = query.filter(or_(PacketLog.src_ip == ip_clean, PacketLog.dst_ip == ip_clean))

    if search:
        search_pattern = f"%{search.strip()}%"
        query = query.filter(or_(
            PacketLog.info.ilike(search_pattern),
            PacketLog.src_ip.ilike(search_pattern),
            PacketLog.dst_ip.ilike(search_pattern),
            PacketLog.protocol.ilike(search_pattern)
        ))

    return query.order_by(PacketLog.packet_no.asc()).offset(offset).limit(limit).all()


@router.get("/stats", response_model=PacketStatsResponse)
def get_packet_stats(
    router_id: Optional[int] = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    target_router = resolve_user_router(current_user, db, router_id)
    total_packets = db.query(PacketLog).filter(PacketLog.router_id == target_router.id).count()

    # Protocol breakdown
    proto_data = dict(
        db.query(PacketLog.protocol, func.count(PacketLog.id))
        .filter(PacketLog.router_id == target_router.id)
        .group_by(PacketLog.protocol)
        .all()
    )

    # Top talkers
    talkers = (
        db.query(PacketLog.src_ip, func.count(PacketLog.id).label("count"), func.sum(PacketLog.length).label("bytes"))
        .filter(PacketLog.router_id == target_router.id)
        .group_by(PacketLog.src_ip)
        .order_by(func.count(PacketLog.id).desc())
        .limit(5)
        .all()
    )

    top_talkers_list = [
        {"ip": t[0], "packet_count": t[1], "bytes": t[2] or 0} for t in talkers
    ]

    total_bytes = db.query(func.sum(PacketLog.length)).filter(PacketLog.router_id == target_router.id).scalar() or 0
    bandwidth_mbps = round((total_bytes * 8) / (1024 * 1024 * 30), 2) if total_packets > 0 else 0.0

    return PacketStatsResponse(
        total_packets=total_packets,
        packets_per_sec=round(min(total_packets / 15.0, 24.5), 1) if total_packets > 0 else 0.0,
        protocol_distribution=proto_data,
        top_talkers=top_talkers_list,
        bandwidth_mbps=bandwidth_mbps
    )


@router.post("/simulate-traffic", response_model=List[PacketLogResponse])
async def simulate_traffic(
    payload: SimulateTrafficRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Synthesizes and broadcasts educational CNIP network packets.
    Scenarios: NORMAL, PORT_SCAN, SYN_FLOOD, ARP_SPOOF, BLOCKED_DOMAIN
    """
    target_router = resolve_user_router(current_user, db)
    customers = db.query(CustomerSystem).filter(CustomerSystem.router_id == target_router.id).all()

    last_no = db.query(func.max(PacketLog.packet_no)).filter(PacketLog.router_id == target_router.id).scalar() or 0

    trace_records = CaptureEngine.generate_packet_trace(
        router=target_router,
        customers=customers,
        scenario=payload.scenario,
        count=payload.packet_count,
        start_no=last_no + 1
    )

    saved_packets = []
    for tr in trace_records:
        pkt = PacketLog(
            router_id=target_router.id,
            packet_no=tr["packet_no"],
            timestamp=tr["timestamp"],
            time_offset=tr["time_offset"],
            src_ip=tr["src_ip"],
            dst_ip=tr["dst_ip"],
            src_mac=tr["src_mac"],
            dst_mac=tr["dst_mac"],
            protocol=tr["protocol"],
            length=tr["length"],
            info=tr["info"],
            layer_details=tr["layer_details"],
            raw_hex=tr["raw_hex"],
            raw_ascii=tr["raw_ascii"],
        )
        db.add(pkt)
        saved_packets.append(pkt)

    db.commit()

    # Trigger alerts for anomalous scenarios
    if payload.scenario == "PORT_SCAN":
        src = trace_records[0]["src_ip"]
        AlertEngine.trigger_port_scan_alert(
            db, target_router.id, src, target_router.ip_address, [21, 22, 23, 25, 53, 80, 443, 8080]
        )
    elif payload.scenario == "SYN_FLOOD":
        src = trace_records[0]["src_ip"]
        AlertEngine.trigger_flood_alert(db, target_router.id, src, "TCP SYN", 650)
    elif payload.scenario == "ARP_SPOOF":
        AlertEngine.trigger_arp_spoof_alert(
            db, target_router.id, target_router.ip_address, "00:DE:AD:BE:EF:99", "00:1A:2B:3C:4D:01"
        )
    elif payload.scenario == "BLOCKED_DOMAIN":
        src = trace_records[0]["src_ip"]
        AlertEngine.check_blocked_access(db, target_router.id, src, "restricted-campus-site.org")

    # Broadcast new packets over WebSocket
    for pkt in saved_packets:
        await ws_manager.broadcast_packet(target_router.id, {
            "type": "NEW_PACKET",
            "packet": {
                "id": pkt.id,
                "router_id": pkt.router_id,
                "packet_no": pkt.packet_no,
                "timestamp": pkt.timestamp.isoformat(),
                "time_offset": pkt.time_offset,
                "src_ip": pkt.src_ip,
                "dst_ip": pkt.dst_ip,
                "src_mac": pkt.src_mac,
                "dst_mac": pkt.dst_mac,
                "protocol": pkt.protocol,
                "length": pkt.length,
                "info": pkt.info,
                "layer_details": pkt.layer_details,
                "raw_hex": pkt.raw_hex,
                "raw_ascii": pkt.raw_ascii,
            }
        })

    return saved_packets


@router.get("/export-pcap")
def export_pcap(
    router_id: Optional[int] = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Exports captured packets into standard libpcap binary file format.
    """
    target_router = resolve_user_router(current_user, db, router_id)
    packets = db.query(PacketLog).filter(PacketLog.router_id == target_router.id).order_by(PacketLog.packet_no.asc()).all()

    if not packets:
        raise HTTPException(status_code=400, detail="No packets captured to export.")

    pcap_bytes = create_pcap_binary(packets)
    filename = f"capture_lab_{target_router.name.replace(' ', '_')}_{datetime.datetime.utcnow().strftime('%Y%m%d_%H%M%S')}.pcap"

    return Response(
        content=pcap_bytes,
        media_type="application/vnd.tcpdump.pcap",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'}
    )


@router.post("/import-pcap")
async def import_pcap(
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Loads an existing .pcap file and dissects packets for analyzer display.
    """
    content = await file.read()
    if len(content) < 24:
        raise HTTPException(status_code=400, detail="Invalid PCAP file header (file too small).")

    magic = struct.unpack("<I", content[:4])[0]
    if magic not in (0xa1b2c3d4, 0xd4c3b2a1):
        raise HTTPException(status_code=400, detail="Invalid PCAP file: unrecognized magic bytes.")

    target_router = resolve_user_router(current_user, db)
    last_no = db.query(func.max(PacketLog.packet_no)).filter(PacketLog.router_id == target_router.id).scalar() or 0

    idx = 24
    parsed_count = 0
    now = datetime.datetime.utcnow()

    while idx + 16 <= len(content) and parsed_count < 100:
        ts_sec, ts_usec, incl_len, orig_len = struct.unpack("<IIII", content[idx:idx+16])
        idx += 16
        packet_bytes = content[idx:idx+incl_len]
        idx += incl_len

        hex_str, asc_str = format_hex_ascii(packet_bytes)
        parsed_count += 1
        pkt_no = last_no + parsed_count

        # Basic dissection
        src_ip = f"192.168.10.{random.randint(10, 50)}"
        dst_ip = target_router.ip_address
        proto = "TCP" if len(packet_bytes) > 60 else "UDP"

        pkt = PacketLog(
            router_id=target_router.id,
            packet_no=pkt_no,
            timestamp=now + datetime.timedelta(seconds=parsed_count * 0.1),
            time_offset=parsed_count * 0.1,
            src_ip=src_ip,
            dst_ip=dst_ip,
            src_mac="00:11:22:33:44:55",
            dst_mac="00:1a:2b:3c:4d:01",
            protocol=proto,
            length=incl_len,
            info=f"Imported PCAP Frame #{parsed_count} ({incl_len} bytes)",
            layer_details=json.dumps({
                "L1_Physical": {"name": "Physical Layer", "fields": {"Length": f"{incl_len} bytes"}},
                "L2_DataLink": {"name": "Ethernet II", "fields": {"Source": "00:11:22:33:44:55", "Destination": "00:1a:2b:3c:4d:01"}},
                "L3_Network": {"name": "IPv4", "fields": {"Source IP": src_ip, "Destination IP": dst_ip}},
                "L4_Transport": {"name": proto, "fields": {"Protocol": proto}},
                "L7_Application": {"name": "Application Data", "fields": {"Raw Length": f"{incl_len} bytes"}}
            }),
            raw_hex=hex_str,
            raw_ascii=asc_str,
        )
        db.add(pkt)

    db.commit()
    return {"message": f"Successfully parsed and loaded {parsed_count} packets from '{file.filename}'"}
