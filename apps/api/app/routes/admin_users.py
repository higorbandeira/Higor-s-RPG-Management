from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.deps import require_role
from app.db.session import get_db
from app.db.models.user import User
from app.schemas.user import UserOut, UserCreateIn, UserPatchIn, UsersListOut
from app.core.security import hash_password, normalize_nickname

from app.core.security import normalize_nickname, validate_nickname

router = APIRouter(prefix="/admin/users", tags=["admin-users"])

@router.get("", response_model=UsersListOut, dependencies=[Depends(require_role("ADMIN"))])
def list_users(db: Session = Depends(get_db)):
    items = db.query(User).order_by(User.created_at.desc()).all()
    return {"items": items}

@router.post("", response_model=UserOut, status_code=status.HTTP_201_CREATED, dependencies=[Depends(require_role("ADMIN"))])
def create_user(data: UserCreateIn, db: Session = Depends(get_db)):
    validate_nickname(data.nickname)
    nickname_norm = normalize_nickname(data.nickname)
    exists = db.query(User).filter(User.nickname_norm == nickname_norm).first()
    if exists:
        raise HTTPException(status_code=409, detail="Nickname already exists")

    user = User(
        nickname=data.nickname,
        nickname_norm=nickname_norm,
        password_hash=hash_password(data.password),
        role="USER",          # ADMIN só cria USER
        is_active=True,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user

@router.patch("/{user_id}", response_model=UserOut, dependencies=[Depends(require_role("ADMIN"))])
def patch_user(user_id: str, data: UserPatchIn, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    if data.nickname is not None:
        validate_nickname(data.nickname)
        nickname_norm = normalize_nickname(data.nickname)
        exists = db.query(User).filter(User.nickname_norm == nickname_norm, User.id != user.id).first()
        if exists:
            raise HTTPException(status_code=409, detail="Nickname already exists")
        user.nickname = data.nickname
        user.nickname_norm = nickname_norm

    if data.password is not None:
        user.password_hash = hash_password(data.password)

    if data.isActive is not None:
        user.is_active = data.isActive

    db.commit()
    db.refresh(user)
    return user
