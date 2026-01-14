from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    # Environment
    ENV: str = "dev"  # dev | prod

    # Database
    DATABASE_URL: str = "postgresql+psycopg2://postgres:postgres@db:5432/higor"

    # Auth
    JWT_SECRET: str = "dev-secret"
    ACCESS_MINUTES: int = 15
    REFRESH_DAYS: int = 30

    COOKIE_SECURE: bool = False

    BOOTSTRAP_ADMIN_ENABLED: bool = True
    BOOTSTRAP_ADMIN_NICKNAME: str | None = None
    BOOTSTRAP_ADMIN_PASSWORD: str | None = None


settings = Settings()
