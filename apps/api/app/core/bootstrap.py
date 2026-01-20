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

    existing_named_admin = (
        db.query(User)
        .filter(User.role == "ADMIN", User.nickname_norm == nickname_norm)
        .first()
    )
    if existing_named_admin:
        if settings.ENV == "dev":
            existing_named_admin.password_hash = hash_password(password)
            existing_named_admin.is_active = True
            db.commit()
            log.info("Bootstrap admin reset in dev.")
        return

    exists_admin = db.query(User).filter(User.role == "ADMIN").first()
    if exists_admin and settings.ENV == "prod":
        return

    # avoid conflicts with existing non-admin users in prod
    exists_any = db.query(User).filter(User.nickname_norm == nickname_norm).first()
    if exists_any and settings.ENV == "prod":
        msg = "Bootstrap admin nickname conflicts with existing user nickname_norm."
        raise BootstrapError(msg)
    if exists_any:
        log.warning("Bootstrap admin nickname conflicts with existing user nickname_norm.")
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
