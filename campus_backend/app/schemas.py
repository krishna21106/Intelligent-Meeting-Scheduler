from pydantic import BaseModel, Field, field_validator
from typing import Optional, List, Dict, Any
from datetime import datetime
import ipaddress

# User & Auth
class UserBase(BaseModel):
    username: str
    email: str
    full_name: str
    role: str

class UserCreate(UserBase):
    password: str

class UserResponse(UserBase):
    id: int
    is_active: bool
    created_at: datetime

    class Config:
        from_attributes = True

class LoginRequest(BaseModel):
    username: str
    password: str

class TokenResponse(BaseModel):
    access_token: str
    token: str = ""
    token_type: str = "bearer"
    tokenType: str = "Bearer"
    expiresIn: int = 86400
    user: UserResponse

# Operator Registration Request
class OperatorRegisterRequest(BaseModel):
    username: str
    password: str
    full_name: str
    email: str
    department: str
    employee_id: str
    lab_name: str

class OperatorRequestResponse(BaseModel):
    id: int
    user_id: int
    username: str
    full_name: str
    email: str
    department: str
    employee_id: str
    lab_name: str
    status: str
    decline_reason: Optional[str] = None
    reviewed_at: Optional[datetime] = None
    created_at: datetime

    class Config:
        from_attributes = True

class OperatorReviewRequest(BaseModel):
    action: str  # "APPROVE" or "DECLINE"
    decline_reason: Optional[str] = None

# Lab
class LabCreate(BaseModel):
    name: str
    building: str
    floor: str
    room_number: str
    description: Optional[str] = None

class LabResponse(BaseModel):
    id: int
    name: str
    building: str
    floor: str
    room_number: str
    description: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True

# Router Configuration & Subnet Validation
class RouterBase(BaseModel):
    name: str
    ip_address: str
    subnet_mask: str = "255.255.255.0"
    gateway: str
    dhcp_start: str
    dhcp_end: str
    link_speed: str = "1 Gbps"

    @field_validator("ip_address", "gateway", "dhcp_start", "dhcp_end")
    @classmethod
    def validate_ipv4(cls, v: str) -> str:
        try:
            ipaddress.IPv4Address(v)
            return v
        except Exception:
            raise ValueError(f"'{v}' is not a valid IPv4 address")

class RouterCreate(RouterBase):
    lab_id: int
    operator_id: Optional[int] = None

class RouterUpdate(BaseModel):
    name: Optional[str] = None
    ip_address: str
    subnet_mask: str = "255.255.255.0"
    gateway: str
    dhcp_start: str
    dhcp_end: str
    link_speed: Optional[str] = "1 Gbps"
    change_reason: Optional[str] = "Routine IP pool realignment"

    @field_validator("ip_address", "gateway", "dhcp_start", "dhcp_end")
    @classmethod
    def validate_ipv4(cls, v: str) -> str:
        try:
            ipaddress.IPv4Address(v)
            return v
        except Exception:
            raise ValueError(f"'{v}' is not a valid IPv4 address")

class RouterResponse(RouterBase):
    id: int
    lab_id: int
    operator_id: Optional[int] = None
    status: str
    created_at: datetime
    updated_at: datetime
    lab_name: Optional[str] = None

    class Config:
        from_attributes = True

class RouterIpHistoryResponse(BaseModel):
    id: int
    router_id: int
    changed_by_username: Optional[str] = None
    old_ip: str
    new_ip: str
    old_subnet: str
    new_subnet: str
    old_gateway: str
    new_gateway: str
    old_dhcp_range: str
    new_dhcp_range: str
    reason: Optional[str] = None
    timestamp: datetime

    class Config:
        from_attributes = True

# Customer Systems
class CustomerSystemCreate(BaseModel):
    name: str
    system_number: str
    mac_address: str
    ip_address: Optional[str] = None
    ip_assignment_type: str = "DHCP"  # "DHCP" or "STATIC"
    router_id: Optional[int] = None
    status: str = "ONLINE"
    os_info: Optional[str] = "Ubuntu 22.04 LTS"

    @field_validator("mac_address")
    @classmethod
    def validate_mac(cls, v: str) -> str:
        v_clean = v.replace("-", ":").upper()
        parts = v_clean.split(":")
        if len(parts) != 6 or any(len(p) != 2 for p in parts):
            raise ValueError(f"'{v}' is not a valid MAC address (format XX:XX:XX:XX:XX:XX)")
        return v_clean

class CustomerSystemUpdate(BaseModel):
    name: Optional[str] = None
    system_number: Optional[str] = None
    mac_address: Optional[str] = None
    ip_address: Optional[str] = None
    ip_assignment_type: Optional[str] = None
    status: Optional[str] = None
    os_info: Optional[str] = None

class CustomerSystemResponse(BaseModel):
    id: int
    router_id: int
    user_id: Optional[int] = None
    name: str
    system_number: str
    mac_address: str
    ip_address: str
    ip_assignment_type: str
    status: str
    os_info: str
    last_seen: datetime
    created_at: datetime

    class Config:
        from_attributes = True

# Packet Analyzer
class PacketLogResponse(BaseModel):
    id: int
    router_id: int
    packet_no: int
    timestamp: datetime
    time_offset: float
    src_ip: str
    dst_ip: str
    src_mac: str
    dst_mac: str
    protocol: str
    length: int
    info: str
    layer_details: str
    raw_hex: str
    raw_ascii: str

    class Config:
        from_attributes = True

class PacketStatsResponse(BaseModel):
    total_packets: int
    packets_per_sec: float
    protocol_distribution: Dict[str, int]
    top_talkers: List[Dict[str, Any]]
    bandwidth_mbps: float

class SimulateTrafficRequest(BaseModel):
    scenario: str = "NORMAL"  # "NORMAL", "PORT_SCAN", "SYN_FLOOD", "ARP_SPOOF", "BLOCKED_DOMAIN"
    packet_count: int = 15
    target_ip: Optional[str] = None

# Alerts
class AlertResponse(BaseModel):
    id: int
    router_id: int
    severity: str
    title: str
    description: str
    source_ip: Optional[str] = None
    source_mac: Optional[str] = None
    osi_layer: str
    rule_name: str
    status: str
    acknowledged_by: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True

class BlockedRuleCreate(BaseModel):
    router_id: int
    rule_type: str  # 'DOMAIN', 'PORT', 'IP'
    value: str

class BlockedRuleResponse(BaseModel):
    id: int
    router_id: int
    rule_type: str
    value: str
    is_active: bool
    created_at: datetime

    class Config:
        from_attributes = True

# Audit Log
class AuditLogResponse(BaseModel):
    id: int
    user_id: Optional[int] = None
    username: str
    role: str
    action: str
    target_type: Optional[str] = None
    target_id: Optional[str] = None
    details: Optional[str] = None
    ip_address: Optional[str] = None
    timestamp: datetime

    class Config:
        from_attributes = True

# OSI Model Compliance
class OsiLayerItem(BaseModel):
    layer_number: int
    layer_name: str
    description: str
    protocols: List[str]
    implementation_details: str
    status: str  # 'ACTIVE', 'INACTIVE', 'ISSUE'
    live_packet_count: int
    bytes_transferred: int
    diagnostic_issue: Optional[str] = None

class OsiComplianceResponse(BaseModel):
    router_id: int
    router_name: str
    lab_name: str
    ip_address: str
    layers: List[OsiLayerItem]

# Topology
class TopologyNode(BaseModel):
    id: str
    type: str  # 'router', 'switch', 'customer'
    label: str
    ip: str
    mac: Optional[str] = None
    status: str  # 'ONLINE', 'OFFLINE', 'ACTIVE'
    details: Dict[str, Any]

class TopologyEdge(BaseModel):
    id: str
    source: str
    target: str
    label: Optional[str] = None
    animated: bool = True

class NetworkTopologyResponse(BaseModel):
    router_id: int
    router_name: str
    nodes: List[TopologyNode]
    edges: List[TopologyEdge]
