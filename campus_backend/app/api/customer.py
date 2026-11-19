from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from ..database import get_db
from ..models import User, CustomerSystem, Router, PacketLog
from ..schemas import NetworkTopologyResponse, TopologyNode, TopologyEdge
from ..security import get_current_user

router = APIRouter(prefix="/customer", tags=["Customer Portal"])

@router.get("/network-topology", response_model=NetworkTopologyResponse)
def get_network_topology(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    # Find router for the current customer or default router
    router = None
    if current_user.role == "CUSTOMER":
        cust = db.query(CustomerSystem).filter(CustomerSystem.user_id == current_user.id).first()
        if cust:
            router = cust.router
    elif current_user.role == "OPERATOR":
        router = db.query(Router).filter(Router.operator_id == current_user.id).first()

    if not router:
        router = db.query(Router).first()

    if not router:
        raise HTTPException(status_code=404, detail="No network topology available.")

    systems = db.query(CustomerSystem).filter(CustomerSystem.router_id == router.id).all()
    packet_count = db.query(PacketLog).filter(PacketLog.router_id == router.id).count()

    nodes = []
    edges = []

    # 1. Router Node
    router_node_id = f"router-{router.id}"
    nodes.append(TopologyNode(
        id=router_node_id,
        type="router",
        label=router.name,
        ip=router.ip_address,
        mac="00:1A:2B:3C:4D:01",
        status="ACTIVE",
        details={
            "role": "Default Gateway & DHCP Server",
            "subnet": f"{router.ip_address}/{router.subnet_mask}",
            "gateway": router.gateway,
            "dhcp_range": f"{router.dhcp_start} - {router.dhcp_end}",
            "speed": router.link_speed,
            "lab": router.lab.name if router.lab else "Networking Lab",
            "packets_forwarded": packet_count
        }
    ))

    # 2. Lab Switch Node (L2 Distribution)
    switch_node_id = f"switch-{router.id}"
    nodes.append(TopologyNode(
        id=switch_node_id,
        type="switch",
        label=f"{router.lab.name if router.lab else 'Lab'} Switch (24-Port GbE)",
        ip="192.168.10.2",
        mac="00:1A:2B:EE:FF:10",
        status="ACTIVE",
        details={
            "role": "Layer 2 Managed Gigabit Switch",
            "ports_active": len([s for s in systems if s.status == "ONLINE"]) + 1,
            "total_ports": 24,
            "vlan": "VLAN 10 (Student Lab)"
        }
    ))

    # Edge from Router to Switch
    edges.append(TopologyEdge(
        id=f"edge-{router_node_id}-{switch_node_id}",
        source=router_node_id,
        target=switch_node_id,
        label=f"Trunk Link ({router.link_speed})",
        animated=True
    ))

    # 3. Customer Systems connected to Switch
    for sys_item in systems:
        sys_node_id = f"cust-{sys_item.id}"
        nodes.append(TopologyNode(
            id=sys_node_id,
            type="customer",
            label=f"{sys_item.name} ({sys_item.system_number})",
            ip=sys_item.ip_address,
            mac=sys_item.mac_address,
            status=sys_item.status,
            details={
                "system_number": sys_item.system_number,
                "ip_assignment": sys_item.ip_assignment_type,
                "os": sys_item.os_info,
                "status": sys_item.status,
                "last_seen": sys_item.last_seen.strftime("%H:%M:%S")
            }
        ))

        edges.append(TopologyEdge(
            id=f"edge-{switch_node_id}-{sys_node_id}",
            source=switch_node_id,
            target=sys_node_id,
            label=f"Port {sys_item.id:02d} (1000 Mbps)" if sys_item.status == "ONLINE" else "Port Link Down",
            animated=(sys_item.status == "ONLINE")
        ))

    return NetworkTopologyResponse(
        router_id=router.id,
        router_name=router.name,
        nodes=nodes,
        edges=edges
    )
