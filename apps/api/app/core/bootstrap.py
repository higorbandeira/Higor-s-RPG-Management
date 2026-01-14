from __future__ import annotations

import logging
from sqlalchemy.orm import Session

from app.core.config import settings
from app.db.models.user import User
from app.core.security import hash_password, normalize_nickname, validate_nickname

log = logging.getLogger(__name__)


class BootstrapError(RuntimeError):
    pass


def bootstrap_admin(db: Session) -> None:
    if not settings.BOOTSTRAP_ADMIN_ENABLED:
        return

    # If ADMIN already exists, do nothing (idempotent)
    exists_admin = db.query(User).filter(User.role == "ADMIN").first()
    if exists_admin:
        return

    nickname = settings.BOOTSTRAP_ADMIN_NICKNAME
    password = settings.BOOTSTRAP_ADMIN_PASSWORD

    if not nickname or not password:
        msg = "BOOTSTRAP_ADMIN_ENABLED=true but BOOTSTRAP_ADMIN_NICKNAME/PASSWORD not set."
        if settings.ENV == "prod":
            raise BootstrapError(msg)
        log.warning(msg + " Skipping bootstrap in dev.")
        return

    try:
        validate_nickname(nickname)
    except ValueError as e:
        msg = f"Invalid admin nickname: {e}"
        if settings.ENV == "prod":
            raise BootstrapError(msg)
        log.warning(msg + " Skipping bootstrap in dev.")
        return

    nickname_norm = normalize_nickname(nickname)

    # avoid conflicts
    exists_any = db.query(User).filter(User.nickname_norm == nickname_norm).first()
    if exists_any:
        msg = "Bootstrap admin nickname conflicts with existing user nickname_norm."
        if settings.ENV == "prod":
            raise BootstrapError(msg)
        log.warning(msg + " Skipping bootstrap in dev.")
        return

    admin = User(
        nickname=nickname,
        nickname_norm=nickname_norm,
        password_hash=hash_password(password),
        role="ADMIN",
        is_active=True,
    )
    db.add(admin)
    db.commit()
    log.info("Bootstrap admin created.")
