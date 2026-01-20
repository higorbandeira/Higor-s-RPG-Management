from __future__ import annotations

from datetime import datetime, timedelta, timezone
from fastapi import APIRouter, Depends, HTTPException, Response, status, Request
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.security import (
    verify_password,
    create_access_token,
    create_refresh_token_raw,
    hash_refresh_token,
    normalize_nickname,
    validate_nickname,
)
from app.db.session import get_db
from app.db.models.user import User
from app.db.models.refresh_token import RefreshToken
from app.schemas.auth import LoginIn, LoginOut, RefreshOut, MeOut, LoginUserOut
from app.core.deps import get_current_user

router = APIRouter(prefix="/auth", tags=["auth"])

COOKIE_NAME = "refresh_token"


@router.post("/login", response_model=LoginOut)
def login(data: LoginIn, response: Response, db: Session = Depends(get_db)):
    try:
        validate_nickname(data.nickname)
    except ValueError:
        raise HTTPException(status_code=401, detail="Invalid credentials")

    nickname_norm = normalize_nickname(data.nickname)
    user = db.query(User).filter(User.nickname_norm == nickname_norm).first()
    if not user or not user.is_active:
        raise HTTPException(status_code=401, detail="Invalid credentials")
    if not verify_password(data.password, user.password_hash):
        raise HTTPException(status_code=401, detail="Invalid credentials")

    access = create_access_token(
        subject=str(user.id),
        role=user.role,
        secret=settings.JWT_SECRET,
        minutes=settings.ACCESS_MINUTES,
    )

    refresh_raw = create_refresh_token_raw()
    rt = RefreshToken(
        user_id=user.id,
        token_hash=hash_refresh_token(refresh_raw),
        expires_at=datetime.now(timezone.utc) + timedelta(days=settings.REFRESH_DAYS),
    )
    db.add(rt)
    db.commit()

    response.set_cookie(
        key=COOKIE_NAME,
        value=refresh_raw,
        httponly=True,
        secure=settings.COOKIE_SECURE,
        samesite="lax",
        path="/",
        max_age=int(settings.REFRESH_DAYS * 24 * 3600),
    )

    return LoginOut(
        accessToken=access,
        user=LoginUserOut(id=user.id, nickname=user.nickname, role=user.role),
    )


@router.post("/refresh", response_model=RefreshOut)
def refresh(request: Request, db: Session = Depends(get_db)):
    raw = request.cookies.get(COOKIE_NAME)
    if not raw:
        raise HTTPException(status_code=401, detail="No refresh token")

    token_hash = hash_refresh_token(raw)
    rt = (
        db.query(RefreshToken)
        .filter(RefreshToken.token_hash == token_hash, RefreshToken.revoked_at.is_(None))
        .first()
    )
    if not rt or rt.expires_at < datetime.now(timezone.utc):
        raise HTTPException(status_code=401, detail="Refresh expired")

    user = db.query(User).filter(User.id == rt.user_id).first()
    if not user or not user.is_active:
        raise HTTPException(status_code=401, detail="User inactive")

    access = create_access_token(
        subject=str(user.id),
        role=user.role,
        secret=settings.JWT_SECRET,
        minutes=settings.ACCESS_MINUTES,
    )
    return RefreshOut(accessToken=access)


@router.get("/me", response_model=MeOut)
def me(user: User = Depends(get_current_user)):
    return MeOut(id=user.id, nickname=user.nickname, role=user.role)


@router.post("/logout", status_code=status.HTTP_204_NO_CONTENT)
def logout(response: Response, request: Request, db: Session = Depends(get_db)):
    raw = request.cookies.get(COOKIE_NAME)
    if raw:
        token_hash = hash_refresh_token(raw)
        rt = (
            db.query(RefreshToken)
            .filter(RefreshToken.token_hash == token_hash, RefreshToken.revoked_at.is_(None))
            .first()
        )
        if rt:
            rt.revoked_at = datetime.now(timezone.utc)
            db.commit()

    response.delete_cookie(key=COOKIE_NAME, path="/")
    return Response(status_code=204)
