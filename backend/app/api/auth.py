from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from app.database.session import get_db
from app.core.security import hash_password, verify_password, create_access_token
from app.core.rate_limiter import rate_limit_auth
from app.models.all_models import User, AuditLog
from app.schemas.all_schemas import UserCreate, UserLogin, UserResponse, Token, PasswordResetRequest
from app.api.deps import get_current_user

router = APIRouter(prefix="/auth", tags=["Authentication"])

@router.post("/register", response_model=Token, dependencies=[Depends(rate_limit_auth)])
def register(user_in: UserCreate, db: Session = Depends(get_db)):
    existing = db.query(User).filter(User.email == user_in.email.lower()).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="User with this email already exists"
        )
    
    # First registered user can be made admin
    is_first_user = db.query(User).count() == 0
    
    user = User(
        email=user_in.email.lower(),
        hashed_password=hash_password(user_in.password),
        full_name=user_in.full_name.strip(),
        user_type=user_in.user_type,
        is_admin=is_first_user,
        is_active=True
    )
    db.add(user)
    db.commit()
    db.refresh(user)

    # Audit log
    audit = AuditLog(user_id=user.id, action="USER_REGISTERED", details=f"User {user.email} registered as {user.user_type}")
    db.add(audit)
    db.commit()

    token = create_access_token(subject=user.id)
    return Token(access_token=token, token_type="bearer", user=UserResponse.model_validate(user))

@router.post("/login", response_model=Token, dependencies=[Depends(rate_limit_auth)])
def login(login_data: UserLogin, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == login_data.email.lower()).first()
    if not user or not verify_password(login_data.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password"
        )
    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Account is inactive"
        )
    
    token = create_access_token(subject=user.id)
    return Token(access_token=token, token_type="bearer", user=UserResponse.model_validate(user))

@router.get("/me", response_model=UserResponse)
def get_me(current_user: User = Depends(get_current_user)):
    return current_user

@router.post("/reset-password", dependencies=[Depends(rate_limit_auth)])
def reset_password(req: PasswordResetRequest, db: Session = Depends(get_db)):
    email = req.email.lower().strip()
    user = db.query(User).filter(User.email == email).first()
    if not user:
        # Avoid user enumeration in production
        return {"message": "If the account exists, password reset instructions have been dispatched."}
    
    # Secure architecture simulation
    audit = AuditLog(user_id=user.id, action="PASSWORD_RESET_REQUESTED", details=f"Reset link requested for {email}")
    db.add(audit)
    db.commit()
    return {"message": "Password reset instructions dispatched to registered email address."}
