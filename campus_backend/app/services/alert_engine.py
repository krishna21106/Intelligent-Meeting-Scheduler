import datetime
import asyncio
from typing import Optional
from sqlalchemy.orm import Session
from ..models import Alert, BlockedRule, CustomerSystem, Router
from ..websocket.manager import ws_manager

class AlertEngine:
    @staticmethod
    def create_alert(
        db: Session,
        router_id: int,
        severity: str,
        title: str,
        description: str,
        osi_layer: str,
        rule_name: str,
        source_ip: Optional[str] = None,
        source_mac: Optional[str] = None,
    ) -> Alert:
        """
        Creates an alert in the database and broadcasts it via WebSocket.
        """
        alert = Alert(
            router_id=router_id,
            severity=severity.upper(),
            title=title,
            description=description,
            osi_layer=osi_layer.upper(),
            rule_name=rule_name.upper(),
            source_ip=source_ip,
            source_mac=source_mac,
            status="NEW",
            created_at=datetime.datetime.utcnow(),
        )
        db.add(alert)
        db.commit()
        db.refresh(alert)

        # Broadcast via WebSocket asynchronously if loop is running
        alert_payload = {
            "type": "NEW_ALERT",
            "alert": {
                "id": alert.id,
                "router_id": alert.router_id,
                "severity": alert.severity,
                "title": alert.title,
                "description": alert.description,
                "source_ip": alert.source_ip,
                "source_mac": alert.source_mac,
                "osi_layer": alert.osi_layer,
                "rule_name": alert.rule_name,
                "status": alert.status,
                "created_at": alert.created_at.isoformat(),
            }
        }

        try:
            loop = asyncio.get_event_loop()
            if loop.is_running():
                asyncio.create_task(ws_manager.broadcast_alert(alert_payload))
        except Exception:
            pass

        return alert

    @staticmethod
    def check_ip_conflict(db: Session, router_id: int, ip: str, mac: str) -> Optional[Alert]:
        """
        Checks if another customer has the same IP but a different MAC address.
        """
        existing = db.query(CustomerSystem).filter(
            CustomerSystem.router_id == router_id,
            CustomerSystem.ip_address == ip,
            CustomerSystem.mac_address != mac.upper()
        ).first()

        if existing:
            return AlertEngine.create_alert(
                db=db,
                router_id=router_id,
                severity="CRITICAL",
                title=f"IP Conflict Detected on {ip}",
                description=f"Duplicate IP {ip} claimed by MAC {mac} and registered system '{existing.name}' ({existing.mac_address}).",
                osi_layer="L3",
                rule_name="IP_CONFLICT",
                source_ip=ip,
                source_mac=mac,
            )
        return None

    @staticmethod
    def check_router_ip_changed(db: Session, router: Router, old_ip: str, new_ip: str, changed_by: str) -> Alert:
        return AlertEngine.create_alert(
            db=db,
            router_id=router.id,
            severity="MEDIUM",
            title=f"Router Gateway IP Reconfigured",
            description=f"Router '{router.name}' IP address changed from {old_ip} to {new_ip} by operator {changed_by}. Lab routing tables and DHCP re-evaluating.",
            osi_layer="L3",
            rule_name="ROUTER_IP_CHANGED",
            source_ip=new_ip,
        )

    @staticmethod
    def check_unknown_device(db: Session, router_id: int, mac: str, ip: str) -> Optional[Alert]:
        mac_clean = mac.upper()
        registered = db.query(CustomerSystem).filter(
            CustomerSystem.router_id == router_id,
            CustomerSystem.mac_address == mac_clean
        ).first()

        if not registered:
            return AlertEngine.create_alert(
                db=db,
                router_id=router_id,
                severity="MEDIUM",
                title="Unregistered Device Joined Lab Network",
                description=f"New device with unregistered MAC address {mac_clean} requested network connection (IP: {ip}).",
                osi_layer="L2",
                rule_name="UNKNOWN_DEVICE",
                source_ip=ip,
                source_mac=mac_clean,
            )
        return None

    @staticmethod
    def trigger_arp_spoof_alert(db: Session, router_id: int, ip: str, spoofed_mac: str, real_mac: str) -> Alert:
        return AlertEngine.create_alert(
            db=db,
            router_id=router_id,
            severity="HIGH",
            title="ARP Spoofing / Cache Poisoning Suspicion",
            description=f"ARP reply received claiming {ip} is at {spoofed_mac}, but legitimate system has MAC {real_mac}. Potential MITM attack.",
            osi_layer="L2",
            rule_name="ARP_SPOOFING",
            source_ip=ip,
            source_mac=spoofed_mac,
        )

    @staticmethod
    def trigger_port_scan_alert(db: Session, router_id: int, src_ip: str, target_ip: str, scanned_ports: list) -> Alert:
        return AlertEngine.create_alert(
            db=db,
            router_id=router_id,
            severity="HIGH",
            title="TCP/UDP Port Scan Detected",
            description=f"Source host {src_ip} initiated rapid multi-port scan against {target_ip} hitting ports: {', '.join(map(str, scanned_ports[:6]))}...",
            osi_layer="L4",
            rule_name="PORT_SCAN",
            source_ip=src_ip,
        )

    @staticmethod
    def trigger_flood_alert(db: Session, router_id: int, src_ip: str, flood_type: str, rate: int) -> Alert:
        return AlertEngine.create_alert(
            db=db,
            router_id=router_id,
            severity="CRITICAL",
            title=f"Abnormal Traffic Spike / {flood_type} Flood Detected",
            description=f"Excessive packet generation rate ({rate} packets/sec) from {src_ip}. Lab switch queue threshold exceeded.",
            osi_layer="L4",
            rule_name="TRAFFIC_FLOOD",
            source_ip=src_ip,
        )

    @staticmethod
    def trigger_device_offline_alert(db: Session, router: Router, system: CustomerSystem) -> Alert:
        return AlertEngine.create_alert(
            db=db,
            router_id=router.id,
            severity="LOW",
            title=f"Lab System Went Offline: {system.name}",
            description=f"System {system.system_number} ({system.ip_address} - {system.mac_address}) stopped responding to periodic ICMP ping keepalive.",
            osi_layer="L1",
            rule_name="DEVICE_OFFLINE",
            source_ip=system.ip_address,
            source_mac=system.mac_address,
        )

    @staticmethod
    def check_blocked_access(db: Session, router_id: int, src_ip: str, domain_or_port: str) -> Optional[Alert]:
        rule = db.query(BlockedRule).filter(
            BlockedRule.router_id == router_id,
            BlockedRule.is_active == True,
            BlockedRule.value == domain_or_port
        ).first()

        if rule:
            return AlertEngine.create_alert(
                db=db,
                router_id=router_id,
                severity="HIGH",
                title=f"Blocked Access Violation: {domain_or_port}",
                description=f"Host {src_ip} attempted to access restricted {rule.rule_type.lower()}: '{domain_or_port}'. Connection blocked by Lab Security Rule.",
                osi_layer="L7" if rule.rule_type == "DOMAIN" else "L4",
                rule_name="BLOCKED_ACCESS",
                source_ip=src_ip,
            )
        return None
