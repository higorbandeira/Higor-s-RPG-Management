from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.deps import require_role
from app.core.security import hash_password, normalize_nickname, validate_nickname
from app.db.session import get_db
from app.db.models.user import User
from app.schemas.user import UsersListOut, UserOut, UserCreateIn, UserPatchIn

router = APIRouter(prefix="/admin/users", tags=["admin-users"])


@router.get("", response_model=UsersListOut)
def list_users(
    db: Session = Depends(get_db),
    _: User = Depends(require_role("ADMIN")),
):
    items = db.query(User).order_by(User.created_at.desc()).all()
    return {"items": items}


@router.get("/{user_id}", response_model=UserOut)
def get_user(
    user_id: str,
    db: Session = Depends(get_db),
    _: User = Depends(require_role("ADMIN")),
):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return user


@router.post("", response_model=UserOut, status_code=status.HTTP_201_CREATED)
def create_user(
    data: UserCreateIn,
    db: Session = Depends(get_db),
    _: User = Depends(require_role("ADMIN")),
):
    try:
        validate_nickname(data.nickname)
    except ValueError:
        raise HTTPException(status_code=422, detail="Nickname cannot be empty")

    nickname_norm = normalize_nickname(data.nickname)
    exists = db.query(User).filter(User.nickname_norm == nickname_norm).first()
    if exists:
        raise HTTPException(status_code=409, detail="Nickname already exists")

    user = User(
        nickname=data.nickname,
        nickname_norm=nickname_norm,
        password_hash=hash_password(data.password),
        role="USER",  # ADMIN só cria USER
        is_active=True,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


@router.patch("/{user_id}", response_model=UserOut)
def patch_user(
    user_id: str,
    data: UserPatchIn,
    db: Session = Depends(get_db),
    _: User = Depends(require_role("ADMIN")),
):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    if data.nickname is not None:
        try:
            validate_nickname(data.nickname)
        except ValueError:
            raise HTTPException(status_code=422, detail="Nickname cannot be empty")

        nickname_norm = normalize_nickname(data.nickname)
        exists = (
            db.query(User)
            .filter(User.nickname_norm == nickname_norm, User.id != user.id)
            .first()
        )
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
