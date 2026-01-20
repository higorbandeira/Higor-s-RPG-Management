from datetime import datetime
from pydantic import BaseModel, Field


class AssetOut(BaseModel):
    id: str
    type: str
    name: str
    file_url: str = Field(alias="fileUrl")
    uploaded_by_user_id: str | None = Field(alias="uploadedByUserId")
    created_at: datetime | None = Field(default=None, alias="createdAt")

    class Config:
        populate_by_name = True


class AssetsListOut(BaseModel):
    items: list[AssetOut]
