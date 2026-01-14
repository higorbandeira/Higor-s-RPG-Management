from __future__ import annotations

from datetime import datetime, timedelta, timezone
from typing import Any
import secrets
import hashlib

from jose import jwt
from passlib.context import CryptContext


pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
ALGORITHM = "HS256"


def hash_password(password: str) -> str:
    return pwd_context.hash(password)


def verify_password(password: str, password_hash: str) -> bool:
    return pwd_context.verify(password, password_hash)


def create_access_token(subject: str, role: str, secret: str, minutes: int) -> str:
    now = datetime.now(timezone.utc)
    payload: dict[str, Any] = {
        "sub": subject,
        "role": role,
        "iat": int(now.timestamp()),
        "exp": int((now + timedelta(minutes=minutes)).timestamp()),
    }
    return jwt.encode(payload, secret, algorithm=ALGORITHM)


def create_refresh_token_raw() -> str:
    # URL-safe random token
    return secrets.token_urlsafe(48)


def hash_refresh_token(token_raw: str) -> str:
    return hashlib.sha256(token_raw.encode("utf-8")).hexdigest()


def normalize_nickname(nickname: str) -> str:
    # trim + collapse multiple spaces + lowercase
    collapsed = " ".join(nickname.strip().split())
    return collapsed.lower()


def validate_nickname(nickname: str) -> None:
    collapsed = " ".join(nickname.strip().split())
    if not collapsed:
        raise ValueError("Nickname cannot be empty")
