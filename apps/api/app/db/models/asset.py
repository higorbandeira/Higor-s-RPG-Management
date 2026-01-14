import uuid
from sqlalchemy import Column, String, DateTime, ForeignKey, Integer, func

from app.db.base import Base


class Asset(Base):
    __tablename__ = "assets"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))

    type = Column(String, nullable=False, index=True)  # MAP|AVATAR
    name = Column(String, nullable=False)
    file_url = Column(String, nullable=False)

    uploaded_by_user_id = Column(String, ForeignKey("users.id", ondelete="SET NULL"), nullable=True, index=True)

    width_cells = Column(Integer, nullable=True)
    height_cells = Column(Integer, nullable=True)

    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
