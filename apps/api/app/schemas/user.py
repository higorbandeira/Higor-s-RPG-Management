from pydantic import BaseModel, Field


class UserOut(BaseModel):
    id: str
    nickname: str
    role: str
    is_active: bool = Field(alias="isActive")
    created_at: str | None = Field(default=None, alias="createdAt")
    updated_at: str | None = Field(default=None, alias="updatedAt")

    class Config:
        populate_by_name = True


class UsersListOut(BaseModel):
    items: list[UserOut]


class UserCreateIn(BaseModel):
    nickname: str
    password: str


class UserPatchIn(BaseModel):
    nickname: str | None = None
    password: str | None = None
    isActive: bool | None = None
