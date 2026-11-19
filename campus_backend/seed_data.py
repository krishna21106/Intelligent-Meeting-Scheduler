import datetime
import json
from app.database import SessionLocal, engine, Base
from app.models import (
    User, OperatorRequest, Lab, Router, RouterIpHistory, CustomerSystem,
    PacketLog, Alert, AuditLog, BlockedRule, OsiLayerStat
)
from app.security import hash_password
from app.services.capture_engine import CaptureEngine

def seed():
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()

    try:
        # Check if already seeded
        if db.query(User).filter(User.username == "admin").first():
            print("[INFO] Database already contains seed data.")
            return

        print("[SEED] Creating Default Users...")
        # 1. Admin
        admin_user = User(
            username="admin",
            hashed_password=hash_password("Admin123!"),
            role="ADMIN",
            full_name="Chief Lab Administrator",
            email="admin@campus.edu",
            is_active=True,
            created_at=datetime.datetime.utcnow(),
        )
        db.add(admin_user)
        db.flush()

        # 2. Approved Operator
        op1_user = User(
            username="operator1",
            hashed_password=hash_password("Operator123!"),
            role="OPERATOR",
            full_name="Prof. Sarah Jenkins",
            email="operator1@campus.edu",
            is_active=True,
            created_at=datetime.datetime.utcnow(),
        )
        db.add(op1_user)
        db.flush()

        op1_req = OperatorRequest(
            user_id=op1_user.id,
            department="Computer Science & Engineering",
            employee_id="EMP-CS-101",
            lab_name="Lab 1 - Computer Networks (CNIP)",
            status="APPROVED",
            reviewed_by_id=admin_user.id,
            reviewed_at=datetime.datetime.utcnow(),
            created_at=datetime.datetime.utcnow() - datetime.timedelta(days=2),
        )
        db.add(op1_req)

        # 3. Pending Operator
        op2_user = User(
            username="operator2",
            hashed_password=hash_password("Operator123!"),
            role="OPERATOR",
            full_name="Dr. Alex Rivera",
            email="operator2@campus.edu",
            is_active=False,
            created_at=datetime.datetime.utcnow() - datetime.timedelta(hours=3),
        )
        db.add(op2_user)
        db.flush()

        op2_req = OperatorRequest(
            user_id=op2_user.id,
            department="Information Technology",
            employee_id="EMP-IT-202",
            lab_name="Lab 2 - Advanced Distributed Systems",
            status="PENDING",
            created_at=datetime.datetime.utcnow() - datetime.timedelta(hours=3),
        )
        db.add(op2_req)

        # 4. Customer (Student PC)
        cust_user = User(
            username="student_pc01",
            hashed_password=hash_password("Student123!"),
            role="CUSTOMER",
            full_name="Student Workstation 01",
            email="student01@campus.edu",
            is_active=True,
            created_at=datetime.datetime.utcnow(),
        )
        db.add(cust_user)
        db.flush()

        print("[SEED] Creating Labs and Routers...")
        # Labs
        lab1 = Lab(
            name="Lab 1 - Computer Networks (CNIP)",
            building="Turing Computing Complex",
            floor="2nd Floor",
            room_number="Room 204",
            description="Dedicated laboratory for Computer Networks, Protocol Analysis, and IP Routing experiments.",
            created_at=datetime.datetime.utcnow(),
        )
        lab2 = Lab(
            name="Lab 2 - Advanced Distributed Systems",
            building="Shannon Engineering Hall",
            floor="3rd Floor",
            room_number="Room 312",
            description="High-performance cluster laboratory for distributed systems and cloud protocols.",
            created_at=datetime.datetime.utcnow(),
        )
        db.add_all([lab1, lab2])
        db.flush()

        # Routers
        router1 = Router(
            lab_id=lab1.id,
            operator_id=op1_user.id,
            name="Router-Lab-1-Cisco-ISR4331",
            ip_address="192.168.10.1",
            subnet_mask="255.255.255.0",
            gateway="192.168.10.1",
            dhcp_start="192.168.10.100",
            dhcp_end="192.168.10.200",
            status="ACTIVE",
            link_speed="1 Gbps",
            created_at=datetime.datetime.utcnow(),
            updated_at=datetime.datetime.utcnow(),
        )
        router2 = Router(
            lab_id=lab2.id,
            operator_id=None,
            name="Router-Lab-2-Juniper-SRX300",
            ip_address="192.168.20.1",
            subnet_mask="255.255.255.0",
            gateway="192.168.20.1",
            dhcp_start="192.168.20.100",
            dhcp_end="192.168.20.200",
            status="ACTIVE",
            link_speed="1 Gbps",
            created_at=datetime.datetime.utcnow(),
            updated_at=datetime.datetime.utcnow(),
        )
        db.add_all([router1, router2])
        db.flush()

        # Router History
        history1 = RouterIpHistory(
            router_id=router1.id,
            changed_by_user_id=op1_user.id,
            old_ip="192.168.10.254",
            new_ip="192.168.10.1",
            old_subnet="255.255.255.0",
            new_subnet="255.255.255.0",
            old_gateway="192.168.10.254",
            new_gateway="192.168.10.1",
            old_dhcp_range="192.168.10.50 - 192.168.10.150",
            new_dhcp_range="192.168.10.100 - 192.168.10.200",
            reason="Standardized default gateway to .1 and expanded student DHCP scope",
            timestamp=datetime.datetime.utcnow() - datetime.timedelta(days=1),
        )
        db.add(history1)

        print("[SEED] Creating Customer Lab Systems...")
        systems_data = [
            ("Lab1-PC-01", "LAB1-PC-01", "00:1A:2B:3C:4D:15", "192.168.10.15", cust_user.id, "ONLINE"),
            ("Lab1-PC-02", "LAB1-PC-02", "00:1A:2B:3C:4D:16", "192.168.10.16", None, "ONLINE"),
            ("Lab1-PC-03", "LAB1-PC-03", "00:1A:2B:3C:4D:17", "192.168.10.17", None, "ONLINE"),
            ("Lab1-PC-04", "LAB1-PC-04", "00:1A:2B:3C:4D:18", "192.168.10.18", None, "ONLINE"),
            ("Lab1-PC-05", "LAB1-PC-05", "00:1A:2B:3C:4D:19", "192.168.10.19", None, "ONLINE"),
            ("Lab1-PC-06", "LAB1-PC-06", "00:1A:2B:3C:4D:20", "192.168.10.20", None, "OFFLINE"),
            ("Lab1-PC-07", "LAB1-PC-07", "00:1A:2B:3C:4D:21", "192.168.10.21", None, "ONLINE"),
            ("Lab1-PC-08", "LAB1-PC-08", "00:1A:2B:3C:4D:22", "192.168.10.22", None, "ONLINE"),
        ]

        customer_objs = []
        for name, num, mac, ip, uid, st in systems_data:
            cust = CustomerSystem(
                router_id=router1.id,
                user_id=uid,
                name=name,
                system_number=num,
                mac_address=mac,
                ip_address=ip,
                ip_assignment_type="DHCP" if uid else "STATIC",
                status=st,
                os_info="Ubuntu 22.04 LTS" if int(ip.split(".")[-1]) % 2 == 1 else "Windows 11 Pro",
                last_seen=datetime.datetime.utcnow(),
                created_at=datetime.datetime.utcnow() - datetime.timedelta(days=1),
            )
            customer_objs.append(cust)
            db.add(cust)
        db.flush()

        print("[SEED] Creating Security Rules & Alerts...")
        blocked1 = BlockedRule(
            router_id=router1.id,
            rule_type="DOMAIN",
            value="restricted-campus-site.org",
            is_active=True,
            created_at=datetime.datetime.utcnow(),
        )
        blocked2 = BlockedRule(
            router_id=router1.id,
            rule_type="PORT",
            value="4444",
            is_active=True,
            created_at=datetime.datetime.utcnow(),
        )
        db.add_all([blocked1, blocked2])

        # Alerts
        alert1 = Alert(
            router_id=router1.id,
            severity="HIGH",
            title="ARP Spoofing / Cache Poisoning Suspicion",
            description="ARP reply received claiming 192.168.10.1 is at 00:DE:AD:BE:EF:99, but legitimate router has MAC 00:1A:2B:3C:4D:01. Potential MITM attack.",
            source_ip="192.168.10.1",
            source_mac="00:DE:AD:BE:EF:99",
            osi_layer="L2",
            rule_name="ARP_SPOOFING",
            status="NEW",
            created_at=datetime.datetime.utcnow() - datetime.timedelta(minutes=15),
        )
        alert2 = Alert(
            router_id=router1.id,
            severity="MEDIUM",
            title="Router Gateway IP Reconfigured",
            description="Router 'Router-Lab-1-Cisco-ISR4331' IP changed from 192.168.10.254 to 192.168.10.1 by Prof. Sarah Jenkins.",
            source_ip="192.168.10.1",
            osi_layer="L3",
            rule_name="ROUTER_IP_CHANGED",
            status="ACKNOWLEDGED",
            acknowledged_by="admin",
            created_at=datetime.datetime.utcnow() - datetime.timedelta(hours=2),
        )
        alert3 = Alert(
            router_id=router1.id,
            severity="LOW",
            title="Lab System Went Offline: Lab1-PC-06",
            description="System LAB1-PC-06 (192.168.10.20 - 00:1A:2B:3C:4D:20) stopped responding to periodic ICMP ping keepalive.",
            source_ip="192.168.10.20",
            source_mac="00:1A:2B:3C:4D:20",
            osi_layer="L1",
            rule_name="DEVICE_OFFLINE",
            status="NEW",
            created_at=datetime.datetime.utcnow() - datetime.timedelta(minutes=45),
        )
        db.add_all([alert1, alert2, alert3])

        print("[SEED] Generating Initial Packet Traces...")
        initial_traces = CaptureEngine.generate_packet_trace(
            router=router1,
            customers=customer_objs,
            scenario="NORMAL",
            count=30,
            start_no=1
        )

        for tr in initial_traces:
            p = PacketLog(
                router_id=router1.id,
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
            db.add(p)

        # Audit logs
        audit1 = AuditLog(
            user_id=admin_user.id,
            username=admin_user.username,
            role=admin_user.role,
            action="SYSTEM_INITIALIZED",
            target_type="SYSTEM",
            details="Campus Lab Network Management System initialized with default configuration.",
            timestamp=datetime.datetime.utcnow() - datetime.timedelta(days=2),
        )
        audit2 = AuditLog(
            user_id=admin_user.id,
            username=admin_user.username,
            role=admin_user.role,
            action="OPERATOR_APPROVED",
            target_type="OPERATOR_REQUEST",
            target_id=str(op1_req.id),
            details=f"Approved operator Prof. Sarah Jenkins for Lab 1.",
            timestamp=datetime.datetime.utcnow() - datetime.timedelta(days=2),
        )
        db.add_all([audit1, audit2])

        db.commit()
        print("[SUCCESS] Seed data completed successfully!")

    except Exception as e:
        db.rollback()
        print(f"[ERROR] Failed to seed database: {e}")
        raise
    finally:
        db.close()

if __name__ == "__main__":
    seed()
