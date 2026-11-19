import datetime
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from ..database import get_db
from ..models import (
    User, Router, RouterIpHistory, CustomerSystem, AuditLog
)
from ..schemas import (
    RouterResponse, RouterUpdate, RouterIpHistoryResponse,
    CustomerSystemCreate, CustomerSystemUpdate, CustomerSystemResponse
)
from ..security import require_role
from ..services.subnet_validator import (
    validate_and_parse_subnet, check_subnet_overlap, allocate_next_dhcp_ip, SubnetValidationError
)
from ..services.alert_engine import AlertEngine

router = APIRouter(prefix="/operator", tags=["Operator Portal"])

def get_operator_router(user: User, db: Session) -> Router:
    """
    Retrieves the router assigned to this operator. If Admin accesses, can fall back to the first router.
    """
    if user.role == "ADMIN":
        r = db.query(Router).first()
        if not r:
            raise HTTPException(status_code=404, detail="No routers exist in the system.")
        return r

    r = db.query(Router).filter(Router.operator_id == user.id).first()
    if not r:
        # Fallback: check if any unassigned router is available or assign one
        r = db.query(Router).first()
        if not r:
            raise HTTPException(status_code=404, detail="No router assigned to your operator account.")
    return r


@router.get("/router", response_model=RouterResponse)
def get_my_router(
    current_user: User = Depends(require_role(["OPERATOR", "ADMIN"])),
    db: Session = Depends(get_db)
):
    r = get_operator_router(current_user, db)
    res = RouterResponse.model_validate(r)
    res.lab_name = r.lab.name if r.lab else "Main Lab"
    return res


@router.put("/router", response_model=RouterResponse)
def update_my_router(
    payload: RouterUpdate,
    current_user: User = Depends(require_role(["OPERATOR", "ADMIN"])),
    db: Session = Depends(get_db)
):
    r = get_operator_router(current_user, db)

    # 1. Validate IPv4 subnet rules (gateway in subnet, DHCP in subnet, no syntax error)
    try:
        new_network = validate_and_parse_subnet(
            ip=payload.ip_address,
            subnet_mask=payload.subnet_mask,
            gateway=payload.gateway,
            dhcp_start=payload.dhcp_start,
            dhcp_end=payload.dhcp_end,
        )
    except SubnetValidationError as e:
        raise HTTPException(status_code=400, detail=f"Subnet Configuration Error: {str(e)}")

    # 2. Check overlap against other campus routers
    try:
        check_subnet_overlap(
            db=db,
            ip=payload.ip_address,
            subnet_mask=payload.subnet_mask,
            exclude_router_id=r.id
        )
    except SubnetValidationError as e:
        raise HTTPException(status_code=409, detail=f"Subnet Conflict: {str(e)}")

    # 3. Record change in RouterIpHistory if any network parameter changed
    changed = (
        r.ip_address != payload.ip_address or
        r.subnet_mask != payload.subnet_mask or
        r.gateway != payload.gateway or
        r.dhcp_start != payload.dhcp_start or
        r.dhcp_end != payload.dhcp_end
    )

    old_ip = r.ip_address

    if changed:
        history_entry = RouterIpHistory(
            router_id=r.id,
            changed_by_user_id=current_user.id,
            old_ip=r.ip_address,
            new_ip=payload.ip_address,
            old_subnet=r.subnet_mask,
            new_subnet=payload.subnet_mask,
            old_gateway=r.gateway,
            new_gateway=payload.gateway,
            old_dhcp_range=f"{r.dhcp_start} - {r.dhcp_end}",
            new_dhcp_range=f"{payload.dhcp_start} - {payload.dhcp_end}",
            reason=payload.change_reason or "Operator network reconfiguration",
            timestamp=datetime.datetime.utcnow(),
        )
        db.add(history_entry)

        # Trigger Router IP Changed Alert
        AlertEngine.check_router_ip_changed(
            db=db,
            router=r,
            old_ip=old_ip,
            new_ip=payload.ip_address,
            changed_by=current_user.username
        )

    # Update router fields
    if payload.name:
        r.name = payload.name
    r.ip_address = payload.ip_address
    r.subnet_mask = payload.subnet_mask
    r.gateway = payload.gateway
    r.dhcp_start = payload.dhcp_start
    r.dhcp_end = payload.dhcp_end
    if payload.link_speed:
        r.link_speed = payload.link_speed
    r.updated_at = datetime.datetime.utcnow()

    # Log audit
    audit = AuditLog(
        user_id=current_user.id,
        username=current_user.username,
        role=current_user.role,
        action="ROUTER_CONFIG_UPDATED",
        target_type="ROUTER",
        target_id=str(r.id),
        details=f"Updated router network to {new_network} (IP: {r.ip_address}, GW: {r.gateway}, DHCP: {r.dhcp_start}-{r.dhcp_end})",
        timestamp=datetime.datetime.utcnow(),
    )
    db.add(audit)
    db.commit()
    db.refresh(r)

    res = RouterResponse.model_validate(r)
    res.lab_name = r.lab.name if r.lab else "Main Lab"
    return res


@router.get("/router/history", response_model=List[RouterIpHistoryResponse])
def get_router_history(
    current_user: User = Depends(require_role(["OPERATOR", "ADMIN"])),
    db: Session = Depends(get_db)
):
    r = get_operator_router(current_user, db)
    history = db.query(RouterIpHistory).filter(RouterIpHistory.router_id == r.id).order_by(RouterIpHistory.timestamp.desc()).all()

    results = []
    for h in history:
        u = db.query(User).filter(User.id == h.changed_by_user_id).first()
        results.append(RouterIpHistoryResponse(
            id=h.id,
            router_id=h.router_id,
            changed_by_username=u.username if u else "System",
            old_ip=h.old_ip,
            new_ip=h.new_ip,
            old_subnet=h.old_subnet,
            new_subnet=h.new_subnet,
            old_gateway=h.old_gateway,
            new_gateway=h.new_gateway,
            old_dhcp_range=h.old_dhcp_range,
            new_dhcp_range=h.new_dhcp_range,
            reason=h.reason,
            timestamp=h.timestamp,
        ))
    return results


@router.get("/customers", response_model=List[CustomerSystemResponse])
def get_customers(
    status_filter: Optional[str] = None,
    current_user: User = Depends(require_role(["OPERATOR", "ADMIN"])),
    db: Session = Depends(get_db)
):
    r = get_operator_router(current_user, db)
    query = db.query(CustomerSystem).filter(CustomerSystem.router_id == r.id)
    if status_filter:
        query = query.filter(CustomerSystem.status == status_filter.upper())
    return query.order_by(CustomerSystem.id.asc()).all()


@router.post("/customers", response_model=CustomerSystemResponse)
def add_customer(
    payload: CustomerSystemCreate,
    current_user: User = Depends(require_role(["OPERATOR", "ADMIN"])),
    db: Session = Depends(get_db)
):
    r = get_operator_router(current_user, db)

    # 1. Check duplicate MAC address under this router
    mac_clean = payload.mac_address.upper()
    existing_mac = db.query(CustomerSystem).filter(
        CustomerSystem.router_id == r.id,
        CustomerSystem.mac_address == mac_clean
    ).first()
    if existing_mac:
        raise HTTPException(status_code=400, detail=f"System with MAC address {mac_clean} already registered in this lab.")

    # 2. Determine IP address (Auto DHCP or Manual Static)
    if payload.ip_assignment_type == "DHCP" or not payload.ip_address:
        try:
            assigned_ip = allocate_next_dhcp_ip(db, r)
        except SubnetValidationError as e:
            raise HTTPException(status_code=400, detail=f"IP Allocation Failed: {str(e)}")
        assignment_mode = "DHCP"
    else:
        assigned_ip = payload.ip_address
        assignment_mode = "STATIC"

        # Check for IP conflict
        existing_ip = db.query(CustomerSystem).filter(
            CustomerSystem.router_id == r.id,
            CustomerSystem.ip_address == assigned_ip
        ).first()
        if existing_ip:
            # Trigger real-time IP conflict alert
            AlertEngine.create_alert(
                db=db,
                router_id=r.id,
                severity="CRITICAL",
                title=f"Manual IP Collision Attempt on {assigned_ip}",
                description=f"Attempted manual static IP {assigned_ip} for '{payload.name}' conflicts with existing system '{existing_ip.name}'.",
                osi_layer="L3",
                rule_name="IP_CONFLICT",
                source_ip=assigned_ip,
                source_mac=mac_clean,
            )
            raise HTTPException(status_code=409, detail=f"IP Address {assigned_ip} is already assigned to {existing_ip.name} ({existing_ip.mac_address}).")

    customer = CustomerSystem(
        router_id=r.id,
        name=payload.name,
        system_number=payload.system_number,
        mac_address=mac_clean,
        ip_address=assigned_ip,
        ip_assignment_type=assignment_mode,
        status=payload.status or "ONLINE",
        os_info=payload.os_info or "Ubuntu 22.04 LTS",
        last_seen=datetime.datetime.utcnow(),
        created_at=datetime.datetime.utcnow(),
    )
    db.add(customer)

    # Audit log
    audit = AuditLog(
        user_id=current_user.id,
        username=current_user.username,
        role=current_user.role,
        action="CUSTOMER_SYSTEM_ADDED",
        target_type="CUSTOMER",
        details=f"Added system '{customer.name}' ({customer.system_number}) with IP {customer.ip_address} and MAC {customer.mac_address}",
        timestamp=datetime.datetime.utcnow(),
    )
    db.add(audit)
    db.commit()
    db.refresh(customer)

    return customer


@router.put("/customers/{customer_id}", response_model=CustomerSystemResponse)
def update_customer(
    customer_id: int,
    payload: CustomerSystemUpdate,
    current_user: User = Depends(require_role(["OPERATOR", "ADMIN"])),
    db: Session = Depends(get_db)
):
    r = get_operator_router(current_user, db)
    cust = db.query(CustomerSystem).filter(CustomerSystem.id == customer_id, CustomerSystem.router_id == r.id).first()
    if not cust:
        raise HTTPException(status_code=404, detail="Customer system not found in your lab.")

    if payload.name:
        cust.name = payload.name
    if payload.system_number:
        cust.system_number = payload.system_number
    if payload.mac_address:
        cust.mac_address = payload.mac_address.upper()
    if payload.ip_address:
        cust.ip_address = payload.ip_address
    if payload.ip_assignment_type:
        cust.ip_assignment_type = payload.ip_assignment_type
    if payload.status:
        cust.status = payload.status
    if payload.os_info:
        cust.os_info = payload.os_info

    audit = AuditLog(
        user_id=current_user.id,
        username=current_user.username,
        role=current_user.role,
        action="CUSTOMER_SYSTEM_UPDATED",
        target_type="CUSTOMER",
        target_id=str(cust.id),
        details=f"Modified settings for system '{cust.name}' ({cust.system_number})",
        timestamp=datetime.datetime.utcnow(),
    )
    db.add(audit)
    db.commit()
    db.refresh(cust)
    return cust


@router.delete("/customers/{customer_id}")
def delete_customer(
    customer_id: int,
    current_user: User = Depends(require_role(["OPERATOR", "ADMIN"])),
    db: Session = Depends(get_db)
):
    r = get_operator_router(current_user, db)
    cust = db.query(CustomerSystem).filter(CustomerSystem.id == customer_id, CustomerSystem.router_id == r.id).first()
    if not cust:
        raise HTTPException(status_code=404, detail="Customer system not found.")

    name = cust.name
    sys_num = cust.system_number
    db.delete(cust)

    audit = AuditLog(
        user_id=current_user.id,
        username=current_user.username,
        role=current_user.role,
        action="CUSTOMER_SYSTEM_DELETED",
        target_type="CUSTOMER",
        target_id=str(customer_id),
        details=f"Removed lab system '{name}' ({sys_num}) from router.",
        timestamp=datetime.datetime.utcnow(),
    )
    db.add(audit)
    db.commit()
    return {"message": f"Lab system '{name}' deleted successfully"}


@router.post("/customers/{customer_id}/toggle-status", response_model=CustomerSystemResponse)
def toggle_customer_status(
    customer_id: int,
    current_user: User = Depends(require_role(["OPERATOR", "ADMIN"])),
    db: Session = Depends(get_db)
):
    r = get_operator_router(current_user, db)
    cust = db.query(CustomerSystem).filter(CustomerSystem.id == customer_id, CustomerSystem.router_id == r.id).first()
    if not cust:
        raise HTTPException(status_code=404, detail="Customer system not found.")

    cust.status = "OFFLINE" if cust.status == "ONLINE" else "ONLINE"
    cust.last_seen = datetime.datetime.utcnow()

    if cust.status == "OFFLINE":
        AlertEngine.trigger_device_offline_alert(db, r, cust)

    db.commit()
    db.refresh(cust)
    return cust
