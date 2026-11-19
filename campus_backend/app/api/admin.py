import datetime
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from sqlalchemy import func
from ..database import get_db
from ..models import (
    User, OperatorRequest, Lab, Router, CustomerSystem,
    Alert, AuditLog, PacketLog
)
from ..schemas import (
    OperatorRequestResponse, OperatorReviewRequest, LabCreate, LabResponse,
    RouterResponse, CustomerSystemResponse, AuditLogResponse, OsiComplianceResponse
)
from ..security import require_role
from ..services.osi_inspector import OsiInspector

router = APIRouter(prefix="/admin", tags=["Admin Portal"])

@router.get("/dashboard")
def get_admin_dashboard(
    current_user: User = Depends(require_role(["ADMIN"])),
    db: Session = Depends(get_db)
):
    total_labs = db.query(Lab).count()
    total_routers = db.query(Router).count()
    total_operators = db.query(User).filter(User.role == "OPERATOR").count()
    total_pending_requests = db.query(OperatorRequest).filter(OperatorRequest.status == "PENDING").count()

    total_customers = db.query(CustomerSystem).count()
    active_devices = db.query(CustomerSystem).filter(CustomerSystem.status == "ONLINE").count()
    inactive_devices = db.query(CustomerSystem).filter(CustomerSystem.status == "OFFLINE").count()

    # Alerts summary
    total_alerts = db.query(Alert).count()
    critical_alerts = db.query(Alert).filter(Alert.severity == "CRITICAL", Alert.status != "RESOLVED").count()
    high_alerts = db.query(Alert).filter(Alert.severity == "HIGH", Alert.status != "RESOLVED").count()
    medium_alerts = db.query(Alert).filter(Alert.severity == "MEDIUM", Alert.status != "RESOLVED").count()
    low_alerts = db.query(Alert).filter(Alert.severity == "LOW", Alert.status != "RESOLVED").count()

    # Traffic stats
    total_packets = db.query(PacketLog).count()
    sum_bytes = db.query(func.sum(PacketLog.length)).scalar() or 0

    return {
        "overview": {
            "total_labs": total_labs,
            "total_routers": total_routers,
            "total_operators": total_operators,
            "pending_operator_requests": total_pending_requests,
            "total_customers": total_customers,
            "active_devices": active_devices,
            "inactive_devices": inactive_devices,
        },
        "alerts": {
            "total": total_alerts,
            "active_critical": critical_alerts,
            "active_high": high_alerts,
            "active_medium": medium_alerts,
            "active_low": low_alerts,
        },
        "traffic_stats": {
            "total_packets_captured": total_packets,
            "total_bytes_transferred": sum_bytes,
            "bandwidth_mbps": round((sum_bytes * 8) / (1024 * 1024 * 30), 2) if total_packets > 0 else 0.0,
            "packets_per_sec": round(min(total_packets / 20.0, 18.5), 1) if total_packets > 0 else 0.0
        }
    }


@router.get("/operator-requests", response_model=List[OperatorRequestResponse])
def get_operator_requests(
    status_filter: Optional[str] = None,
    current_user: User = Depends(require_role(["ADMIN"])),
    db: Session = Depends(get_db)
):
    query = db.query(OperatorRequest)
    if status_filter:
        query = query.filter(OperatorRequest.status == status_filter.upper())
    requests = query.order_by(OperatorRequest.created_at.desc()).all()

    results = []
    for r in requests:
        user = db.query(User).filter(User.id == r.user_id).first()
        results.append(OperatorRequestResponse(
            id=r.id,
            user_id=r.user_id,
            username=user.username if user else "Unknown",
            full_name=user.full_name if user else "Unknown",
            email=user.email if user else "Unknown",
            department=r.department,
            employee_id=r.employee_id,
            lab_name=r.lab_name,
            status=r.status,
            decline_reason=r.decline_reason,
            reviewed_at=r.reviewed_at,
            created_at=r.created_at,
        ))
    return results


@router.post("/operator-requests/{request_id}/review", response_model=OperatorRequestResponse)
def review_operator_request(
    request_id: int,
    payload: OperatorReviewRequest,
    current_user: User = Depends(require_role(["ADMIN"])),
    db: Session = Depends(get_db)
):
    op_req = db.query(OperatorRequest).filter(OperatorRequest.id == request_id).first()
    if not op_req:
        raise HTTPException(status_code=404, detail="Operator request not found")

    user = db.query(User).filter(User.id == op_req.user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="Associated user not found")

    action = payload.action.upper()
    if action == "APPROVE":
        op_req.status = "APPROVED"
        op_req.decline_reason = None
        user.is_active = True
        audit_action = "OPERATOR_APPROVED"
        audit_details = f"Operator request for '{user.username}' ({op_req.lab_name}) was APPROVED by Admin {current_user.username}."

        # Assign router if any lab router without operator matches lab name
        lab = db.query(Lab).filter(Lab.name.ilike(f"%{op_req.lab_name}%")).first()
        if lab:
            router_obj = db.query(Router).filter(Router.lab_id == lab.id, Router.operator_id == None).first()
            if router_obj:
                router_obj.operator_id = user.id

    elif action == "DECLINE":
        op_req.status = "DECLINED"
        op_req.decline_reason = payload.decline_reason or "Registration criteria not met."
        user.is_active = False
        audit_action = "OPERATOR_DECLINED"
        audit_details = f"Operator request for '{user.username}' was DECLINED by Admin. Reason: {op_req.decline_reason}"
    else:
        raise HTTPException(status_code=400, detail="Invalid review action. Must be 'APPROVE' or 'DECLINE'.")

    op_req.reviewed_by_id = current_user.id
    op_req.reviewed_at = datetime.datetime.utcnow()

    # Create audit log
    audit = AuditLog(
        user_id=current_user.id,
        username=current_user.username,
        role=current_user.role,
        action=audit_action,
        target_type="OPERATOR_REQUEST",
        target_id=str(op_req.id),
        details=audit_details,
        timestamp=datetime.datetime.utcnow(),
    )
    db.add(audit)
    db.commit()
    db.refresh(op_req)

    return OperatorRequestResponse(
        id=op_req.id,
        user_id=user.id,
        username=user.username,
        full_name=user.full_name,
        email=user.email,
        department=op_req.department,
        employee_id=op_req.employee_id,
        lab_name=op_req.lab_name,
        status=op_req.status,
        decline_reason=op_req.decline_reason,
        reviewed_at=op_req.reviewed_at,
        created_at=op_req.created_at,
    )


@router.get("/labs", response_model=List[LabResponse])
def get_all_labs(
    current_user: User = Depends(require_role(["ADMIN"])),
    db: Session = Depends(get_db)
):
    return db.query(Lab).all()


@router.post("/labs", response_model=LabResponse)
def create_lab(
    payload: LabCreate,
    current_user: User = Depends(require_role(["ADMIN"])),
    db: Session = Depends(get_db)
):
    existing = db.query(Lab).filter(Lab.name == payload.name).first()
    if existing:
        raise HTTPException(status_code=400, detail=f"Lab with name '{payload.name}' already exists.")

    lab = Lab(
        name=payload.name,
        building=payload.building,
        floor=payload.floor,
        room_number=payload.room_number,
        description=payload.description,
        created_at=datetime.datetime.utcnow(),
    )
    db.add(lab)
    db.commit()
    db.refresh(lab)

    audit = AuditLog(
        user_id=current_user.id,
        username=current_user.username,
        role=current_user.role,
        action="LAB_CREATED",
        target_type="LAB",
        target_id=str(lab.id),
        details=f"Created lab '{lab.name}' in {lab.building} Rm {lab.room_number}.",
        timestamp=datetime.datetime.utcnow(),
    )
    db.add(audit)
    db.commit()

    return lab


@router.get("/routers", response_model=List[RouterResponse])
def get_all_routers(
    current_user: User = Depends(require_role(["ADMIN"])),
    db: Session = Depends(get_db)
):
    routers = db.query(Router).all()
    results = []
    for r in routers:
        res = RouterResponse.model_validate(r)
        res.lab_name = r.lab.name if r.lab else None
        results.append(res)
    return results


@router.get("/osi-compliance", response_model=List[OsiComplianceResponse])
def get_osi_compliance_all(
    current_user: User = Depends(require_role(["ADMIN"])),
    db: Session = Depends(get_db)
):
    """
    Returns live OSI Model Compliance layer breakdown for all routers in all labs.
    """
    routers = db.query(Router).all()
    compliance_list = []
    for r in routers:
        comp = OsiInspector.get_router_compliance(db, r)
        compliance_list.append(comp)
    return compliance_list


@router.get("/audit-logs", response_model=List[AuditLogResponse])
def get_audit_logs(
    limit: int = Query(50, ge=1, le=200),
    action: Optional[str] = None,
    current_user: User = Depends(require_role(["ADMIN"])),
    db: Session = Depends(get_db)
):
    query = db.query(AuditLog)
    if action:
        query = query.filter(AuditLog.action.ilike(f"%{action}%"))
    logs = query.order_by(AuditLog.timestamp.desc()).limit(limit).all()
    return logs
