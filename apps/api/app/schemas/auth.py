from pydantic import BaseModel


class LoginIn(BaseModel):
    nickname: str
    password: str


class LoginUserOut(BaseModel):
    id: str
    nickname: str
    role: str


class LoginOut(BaseModel):
    accessToken: str
    user: LoginUserOut


class RefreshOut(BaseModel):
    accessToken: str


class MeOut(BaseModel):
    id: str
    nickname: str
    role: str
