import uuid
from sqlalchemy import Column, String, Boolean, DateTime, func
from app.db.base import Base

class User(Base):
    __tablename__ = "users"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    nickname = Column(String, nullable=False)
    nickname_norm = Column(String, nullable=False, unique=True, index=True)

    password_hash = Column(String, nullable=False)

    # "USER" | "ADMIN"
    role = Column(String, nullable=False)

    is_active = Column(Boolean, nullable=False, default=True)

    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)
