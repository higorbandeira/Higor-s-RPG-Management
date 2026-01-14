from pydantic import BaseModel
import os

class Settings(BaseModel):
    ENV: str = os.getenv("ENV", "dev")  # dev | prod

    JWT_SECRET: str = os.getenv("JWT_SECRET", "dev-secret")

    ACCESS_MINUTES: int = int(os.getenv("ACCESS_MINUTES", "15"))
    REFRESH_DAYS: int = int(os.getenv("REFRESH_DAYS", "30"))
    COOKIE_SECURE: bool = os.getenv("COOKIE_SECURE", "false").lower() == "true"

    BOOTSTRAP_ADMIN_ENABLED: bool = os.getenv("BOOTSTRAP_ADMIN_ENABLED", "true").lower() == "true"
    BOOTSTRAP_ADMIN_NICKNAME: str | None = os.getenv("BOOTSTRAP_ADMIN_NICKNAME")
    BOOTSTRAP_ADMIN_PASSWORD: str | None = os.getenv("BOOTSTRAP_ADMIN_PASSWORD")

settings = Settings()