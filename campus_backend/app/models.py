import datetime
from sqlalchemy import (
    Column, Integer, String, Boolean, DateTime, ForeignKey, Text, Float
)
from sqlalchemy.orm import relationship
from .database import Base

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    username = Column(String(50), unique=True, index=True, nullable=False)
    hashed_password = Column(String(255), nullable=False)
    role = Column(String(20), nullable=False)  # 'ADMIN', 'OPERATOR', 'CUSTOMER'
    full_name = Column(String(100), nullable=False)
    email = Column(String(100), unique=True, index=True, nullable=False)
    is_active = Column(Boolean, default=True, nullable=False)
    created_at = Column(DateTime, default=datetime.datetime.utcnow, nullable=False)

    # Relationships
    operator_request = relationship("OperatorRequest", back_populates="user", uselist=False, foreign_keys="OperatorRequest.user_id")
    operator_routers = relationship("Router", back_populates="operator", foreign_keys="Router.operator_id")
    customer_system = relationship("CustomerSystem", back_populates="user", uselist=False, foreign_keys="CustomerSystem.user_id")
    audit_logs = relationship("AuditLog", back_populates="user")


class OperatorRequest(Base):
    __tablename__ = "operator_requests"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    department = Column(String(100), nullable=False)
    employee_id = Column(String(50), nullable=False)
    lab_name = Column(String(100), nullable=False)
    status = Column(String(20), default="PENDING", nullable=False)  # 'PENDING', 'APPROVED', 'DECLINED'
    decline_reason = Column(Text, nullable=True)
    reviewed_by_id = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    reviewed_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow, nullable=False)

    user = relationship("User", foreign_keys=[user_id], back_populates="operator_request")
    reviewer = relationship("User", foreign_keys=[reviewed_by_id])


class Lab(Base):
    __tablename__ = "labs"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    name = Column(String(100), unique=True, nullable=False)
    building = Column(String(100), nullable=False)
    floor = Column(String(20), nullable=False)
    room_number = Column(String(50), nullable=False)
    description = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow, nullable=False)

    routers = relationship("Router", back_populates="lab", cascade="all, delete-orphan")


class Router(Base):
    __tablename__ = "routers"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    lab_id = Column(Integer, ForeignKey("labs.id", ondelete="CASCADE"), nullable=False)
    operator_id = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    name = Column(String(100), nullable=False)
    ip_address = Column(String(45), nullable=False)
    subnet_mask = Column(String(45), nullable=False, default="255.255.255.0")
    gateway = Column(String(45), nullable=False)
    dhcp_start = Column(String(45), nullable=False)
    dhcp_end = Column(String(45), nullable=False)
    status = Column(String(20), default="ACTIVE", nullable=False)  # 'ACTIVE', 'INACTIVE'
    link_speed = Column(String(20), default="1 Gbps", nullable=False)
    created_at = Column(DateTime, default=datetime.datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.datetime.utcnow, onupdate=datetime.datetime.utcnow, nullable=False)

    lab = relationship("Lab", back_populates="routers")
    operator = relationship("User", foreign_keys=[operator_id], back_populates="operator_routers")
    customers = relationship("CustomerSystem", back_populates="router", cascade="all, delete-orphan")
    ip_history = relationship("RouterIpHistory", back_populates="router", cascade="all, delete-orphan", order_by="desc(RouterIpHistory.timestamp)")
    packets = relationship("PacketLog", back_populates="router", cascade="all, delete-orphan")
    alerts = relationship("Alert", back_populates="router", cascade="all, delete-orphan")
    osi_stats = relationship("OsiLayerStat", back_populates="router", cascade="all, delete-orphan")
    blocked_rules = relationship("BlockedRule", back_populates="router", cascade="all, delete-orphan")


class RouterIpHistory(Base):
    __tablename__ = "router_ip_history"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    router_id = Column(Integer, ForeignKey("routers.id", ondelete="CASCADE"), nullable=False)
    changed_by_user_id = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    old_ip = Column(String(45), nullable=False)
    new_ip = Column(String(45), nullable=False)
    old_subnet = Column(String(45), nullable=False)
    new_subnet = Column(String(45), nullable=False)
    old_gateway = Column(String(45), nullable=False)
    new_gateway = Column(String(45), nullable=False)
    old_dhcp_range = Column(String(100), nullable=False)
    new_dhcp_range = Column(String(100), nullable=False)
    reason = Column(Text, nullable=True)
    timestamp = Column(DateTime, default=datetime.datetime.utcnow, nullable=False)

    router = relationship("Router", back_populates="ip_history")
    changed_by = relationship("User", foreign_keys=[changed_by_user_id])


class CustomerSystem(Base):
    __tablename__ = "customer_systems"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    router_id = Column(Integer, ForeignKey("routers.id", ondelete="CASCADE"), nullable=False)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    name = Column(String(100), nullable=False)
    system_number = Column(String(50), nullable=False)  # e.g., "LAB1-PC-01"
    mac_address = Column(String(17), nullable=False, index=True)
    ip_address = Column(String(45), nullable=False, index=True)
    ip_assignment_type = Column(String(10), default="DHCP", nullable=False)  # 'DHCP', 'STATIC'
    status = Column(String(20), default="ONLINE", nullable=False)  # 'ONLINE', 'OFFLINE'
    os_info = Column(String(100), default="Ubuntu 22.04 LTS / Windows 11", nullable=False)
    last_seen = Column(DateTime, default=datetime.datetime.utcnow, nullable=False)
    created_at = Column(DateTime, default=datetime.datetime.utcnow, nullable=False)

    router = relationship("Router", back_populates="customers")
    user = relationship("User", foreign_keys=[user_id], back_populates="customer_system")


class PacketLog(Base):
    __tablename__ = "packet_logs"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    router_id = Column(Integer, ForeignKey("routers.id", ondelete="CASCADE"), nullable=False, index=True)
    packet_no = Column(Integer, nullable=False, index=True)
    timestamp = Column(DateTime, default=datetime.datetime.utcnow, nullable=False, index=True)
    time_offset = Column(Float, default=0.0, nullable=False)  # seconds relative to trace start
    src_ip = Column(String(45), nullable=False, index=True)
    dst_ip = Column(String(45), nullable=False, index=True)
    src_mac = Column(String(17), nullable=False)
    dst_mac = Column(String(17), nullable=False)
    protocol = Column(String(20), nullable=False, index=True)  # Ethernet, ARP, IPv4, IPv6, ICMP, TCP, UDP, DNS, HTTP, TLS
    length = Column(Integer, nullable=False)
    info = Column(String(255), nullable=False)
    layer_details = Column(Text, nullable=False)  # JSON-encoded header breakdown for L1-L7
    raw_hex = Column(Text, nullable=False)        # Formatted hex bytes
    raw_ascii = Column(Text, nullable=False)      # Printable ASCII representation

    router = relationship("Router", back_populates="packets")


class Alert(Base):
    __tablename__ = "alerts"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    router_id = Column(Integer, ForeignKey("routers.id", ondelete="CASCADE"), nullable=False, index=True)
    severity = Column(String(20), nullable=False, index=True)  # 'LOW', 'MEDIUM', 'HIGH', 'CRITICAL'
    title = Column(String(150), nullable=False)
    description = Column(Text, nullable=False)
    source_ip = Column(String(45), nullable=True)
    source_mac = Column(String(17), nullable=True)
    osi_layer = Column(String(10), nullable=False, default="L3")  # 'L1', 'L2', 'L3', 'L4', 'L5', 'L6', 'L7'
    rule_name = Column(String(50), nullable=False)  # e.g., 'IP_CONFLICT', 'PORT_SCAN', 'ARP_SPOOFING'
    status = Column(String(20), default="NEW", nullable=False, index=True)  # 'NEW', 'ACKNOWLEDGED', 'RESOLVED'
    acknowledged_by = Column(String(50), nullable=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow, nullable=False, index=True)

    router = relationship("Router", back_populates="alerts")


class AuditLog(Base):
    __tablename__ = "audit_logs"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    username = Column(String(50), nullable=False)
    role = Column(String(20), nullable=False)
    action = Column(String(100), nullable=False)      # e.g., "ROUTER_IP_UPDATE", "CUSTOMER_ADDED", "PACKET_SIMULATION"
    target_type = Column(String(50), nullable=True)  # "ROUTER", "CUSTOMER", "ALERT", "OPERATOR_REQUEST"
    target_id = Column(String(50), nullable=True)
    details = Column(Text, nullable=True)
    ip_address = Column(String(45), nullable=True)
    timestamp = Column(DateTime, default=datetime.datetime.utcnow, nullable=False, index=True)

    user = relationship("User", back_populates="audit_logs")


class BlockedRule(Base):
    __tablename__ = "blocked_rules"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    router_id = Column(Integer, ForeignKey("routers.id", ondelete="CASCADE"), nullable=False)
    rule_type = Column(String(20), nullable=False)  # 'DOMAIN', 'PORT', 'IP'
    value = Column(String(100), nullable=False)     # e.g. "torrent.com", "4444", "192.168.10.50"
    is_active = Column(Boolean, default=True, nullable=False)
    created_at = Column(DateTime, default=datetime.datetime.utcnow, nullable=False)

    router = relationship("Router", back_populates="blocked_rules")


class OsiLayerStat(Base):
    __tablename__ = "osi_layer_stats"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    router_id = Column(Integer, ForeignKey("routers.id", ondelete="CASCADE"), nullable=False)
    layer_number = Column(Integer, nullable=False)  # 1 to 7
    layer_name = Column(String(50), nullable=False) # "Physical", "Data Link", "Network", "Transport", "Session", "Presentation", "Application"
    status = Column(String(20), default="ACTIVE", nullable=False)  # 'ACTIVE', 'INACTIVE', 'ISSUE'
    packet_count = Column(Integer, default=0, nullable=False)
    byte_count = Column(Integer, default=0, nullable=False)
    diagnostic_notes = Column(Text, nullable=True)
    updated_at = Column(DateTime, default=datetime.datetime.utcnow, onupdate=datetime.datetime.utcnow, nullable=False)

    router = relationship("Router", back_populates="osi_stats")
