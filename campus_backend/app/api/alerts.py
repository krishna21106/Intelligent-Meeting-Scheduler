import datetime
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from ..database import get_db
from ..models import User, Alert, Router, CustomerSystem, BlockedRule, AuditLog
from ..schemas import AlertResponse, BlockedRuleCreate, BlockedRuleResponse
from ..security import get_current_user, require_role

router = APIRouter(prefix="/alerts", tags=["Alerts System"])

@router.get("", response_model=List[AlertResponse])
def get_alerts(
    severity: Optional[str] = None,
    status_filter: Optional[str] = None,
    limit: int = Query(50, ge=1, le=200),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    query = db.query(Alert)

    # Role Scoping
    if current_user.role == "OPERATOR":
        op_router = db.query(Router).filter(Router.operator_id == current_user.id).first()
        if op_router:
            query = query.filter(Alert.router_id == op_router.id)
    elif current_user.role == "CUSTOMER":
        cust = db.query(CustomerSystem).filter(CustomerSystem.user_id == current_user.id).first()
        if cust:
            query = query.filter(Alert.router_id == cust.router_id)

    if severity:
        query = query.filter(Alert.severity == severity.upper())

    if status_filter:
        query = query.filter(Alert.status == status_filter.upper())

    return query.order_by(Alert.created_at.desc()).limit(limit).all()


@router.post("/{alert_id}/acknowledge", response_model=AlertResponse)
def acknowledge_alert(
    alert_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    alert = db.query(Alert).filter(Alert.id == alert_id).first()
    if not alert:
        raise HTTPException(status_code=404, detail="Alert not found")

    alert.status = "ACKNOWLEDGED"
    alert.acknowledged_by = current_user.username

    audit = AuditLog(
        user_id=current_user.id,
        username=current_user.username,
        role=current_user.role,
        action="ALERT_ACKNOWLEDGED",
        target_type="ALERT",
        target_id=str(alert.id),
        details=f"Alert #{alert.id} ({alert.title}) acknowledged by {current_user.username}.",
        timestamp=datetime.datetime.utcnow(),
    )
    db.add(audit)
    db.commit()
    db.refresh(alert)
    return alert


@router.post("/{alert_id}/resolve", response_model=AlertResponse)
def resolve_alert(
    alert_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    alert = db.query(Alert).filter(Alert.id == alert_id).first()
    if not alert:
        raise HTTPException(status_code=404, detail="Alert not found")

    alert.status = "RESOLVED"
    alert.acknowledged_by = current_user.username

    audit = AuditLog(
        user_id=current_user.id,
        username=current_user.username,
        role=current_user.role,
        action="ALERT_RESOLVED",
        target_type="ALERT",
        target_id=str(alert.id),
        details=f"Alert #{alert.id} ({alert.title}) marked as RESOLVED by {current_user.username}.",
        timestamp=datetime.datetime.utcnow(),
    )
    db.add(audit)
    db.commit()
    db.refresh(alert)
    return alert


@router.get("/blocked-rules", response_model=List[BlockedRuleResponse])
def get_blocked_rules(
    current_user: User = Depends(require_role(["ADMIN", "OPERATOR"])),
    db: Session = Depends(get_db)
):
    return db.query(BlockedRule).all()


@router.post("/blocked-rules", response_model=BlockedRuleResponse)
def create_blocked_rule(
    payload: BlockedRuleCreate,
    current_user: User = Depends(require_role(["ADMIN", "OPERATOR"])),
    db: Session = Depends(get_db)
):
    rule = BlockedRule(
        router_id=payload.router_id,
        rule_type=payload.rule_type.upper(),
        value=payload.value.strip(),
        is_active=True,
        created_at=datetime.datetime.utcnow(),
    )
    db.add(rule)

    audit = AuditLog(
        user_id=current_user.id,
        username=current_user.username,
        role=current_user.role,
        action="BLOCKED_RULE_CREATED",
        target_type="SECURITY_RULE",
        details=f"Blocked rule created for {rule.rule_type}: '{rule.value}' on router #{rule.router_id}",
        timestamp=datetime.datetime.utcnow(),
    )
    db.add(audit)
    db.commit()
    db.refresh(rule)
    return rule


@router.delete("/blocked-rules/{rule_id}")
def delete_blocked_rule(
    rule_id: int,
    current_user: User = Depends(require_role(["ADMIN", "OPERATOR"])),
    db: Session = Depends(get_db)
):
    rule = db.query(BlockedRule).filter(BlockedRule.id == rule_id).first()
    if not rule:
        raise HTTPException(status_code=404, detail="Rule not found")

    db.delete(rule)
    db.commit()
    return {"message": "Blocked rule removed."}
