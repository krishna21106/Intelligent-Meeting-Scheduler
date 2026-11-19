import datetime
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from ..database import get_db
from ..models import User, OperatorRequest, CustomerSystem, Router, AuditLog
from ..schemas import (
    UserCreate, UserResponse, LoginRequest, TokenResponse,
    OperatorRegisterRequest, OperatorRequestResponse
)
from ..security import (
    hash_password, verify_password, create_access_token, get_current_user
)

router = APIRouter(prefix="/auth", tags=["Authentication"])

@router.post("/register-operator", response_model=OperatorRequestResponse)
def register_operator(payload: OperatorRegisterRequest, db: Session = Depends(get_db)):
    # Check if username or email already exists
    existing = db.query(User).filter(
        (User.username == payload.username) | (User.email == payload.email)
    ).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Username or Email already registered in the system."
        )

    # Operator is created with is_active = False until Admin approves
    new_user = User(
        username=payload.username,
        hashed_password=hash_password(payload.password),
        role="OPERATOR",
        full_name=payload.full_name,
        email=payload.email,
        is_active=False,
        created_at=datetime.datetime.utcnow(),
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)

    # Create Operator Request record
    op_req = OperatorRequest(
        user_id=new_user.id,
        department=payload.department,
        employee_id=payload.employee_id,
        lab_name=payload.lab_name,
        status="PENDING",
        created_at=datetime.datetime.utcnow(),
    )
    db.add(op_req)

    # Audit log
    audit = AuditLog(
        user_id=new_user.id,
        username=new_user.username,
        role="OPERATOR",
        action="OPERATOR_REGISTRATION_SUBMITTED",
        target_type="OPERATOR_REQUEST",
        target_id=str(op_req.id),
        details=f"Registration submitted for lab '{payload.lab_name}', Dept: {payload.department}",
        timestamp=datetime.datetime.utcnow(),
    )
    db.add(audit)
    db.commit()
    db.refresh(op_req)

    return OperatorRequestResponse(
        id=op_req.id,
        user_id=new_user.id,
        username=new_user.username,
        full_name=new_user.full_name,
        email=new_user.email,
        department=op_req.department,
        employee_id=op_req.employee_id,
        lab_name=op_req.lab_name,
        status=op_req.status,
        decline_reason=op_req.decline_reason,
        reviewed_at=op_req.reviewed_at,
        created_at=op_req.created_at,
    )


@router.post("/login", response_model=TokenResponse)
def login(payload: LoginRequest, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.username == payload.username).first()
    if not user or not verify_password(payload.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid username or password"
        )

    # If user is an operator, ensure their request was approved
    if user.role == "OPERATOR":
        op_req = db.query(OperatorRequest).filter(OperatorRequest.user_id == user.id).first()
        if not op_req or op_req.status == "PENDING":
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Your Operator registration request is pending Admin approval. Please contact your lab administrator."
            )
        elif op_req.status == "DECLINED":
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Your Operator registration was declined. Reason: {op_req.decline_reason or 'Not specified'}"
            )
        if not user.is_active:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Operator account is inactive."
            )

    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Account is inactive."
        )

    # Issue JWT token
    token = create_access_token(data={"sub": user.username, "role": user.role, "uid": user.id})

    # Log successful login
    audit = AuditLog(
        user_id=user.id,
        username=user.username,
        role=user.role,
        action="USER_LOGIN_SUCCESS",
        target_type="AUTH",
        details=f"User {user.username} ({user.role}) authenticated successfully.",
        timestamp=datetime.datetime.utcnow(),
    )
    db.add(audit)
    db.commit()

    return TokenResponse(
        access_token=token,
        token=token,
        token_type="bearer",
        tokenType="Bearer",
        expiresIn=86400,
        user=UserResponse.model_validate(user)
    )


@router.get("/me")
def get_me(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    data = {
        "id": current_user.id,
        "username": current_user.username,
        "email": current_user.email,
        "full_name": current_user.full_name,
        "role": current_user.role,
        "is_active": current_user.is_active,
        "created_at": current_user.created_at,
    }

    if current_user.role == "OPERATOR":
        router_obj = db.query(Router).filter(Router.operator_id == current_user.id).first()
        if router_obj:
            data["assigned_router"] = {
                "id": router_obj.id,
                "name": router_obj.name,
                "ip_address": router_obj.ip_address,
                "lab_id": router_obj.lab_id,
            }
    elif current_user.role == "CUSTOMER":
        cust_sys = db.query(CustomerSystem).filter(CustomerSystem.user_id == current_user.id).first()
        if cust_sys:
            data["customer_system"] = {
                "id": cust_sys.id,
                "name": cust_sys.name,
                "system_number": cust_sys.system_number,
                "ip_address": cust_sys.ip_address,
                "mac_address": cust_sys.mac_address,
                "router_id": cust_sys.router_id,
                "status": cust_sys.status,
            }

    return data
