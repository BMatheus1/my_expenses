from functools import lru_cache
from pathlib import Path

from pydantic import field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict

BACKEND_DIR = Path(__file__).resolve().parent.parent
ENV_FILE = BACKEND_DIR / ".env"


class Settings(BaseSettings):
    app_name: str = "My Expenses API"
    app_env: str = "development"
    app_debug: bool = True

    api_prefix: str = "/api"

    database_url: str

    legacy_json_file: str = "data/expenses.json"
    legacy_import_email: str = ""

    secret_key: str
    access_token_expire_minutes: int = 60 * 24 * 7

    google_client_id: str = ""

    cors_origins: str = "http://localhost:3000,http://127.0.0.1:3000"

    model_config = SettingsConfigDict(
        env_file=ENV_FILE,
        env_file_encoding="utf-8",
        extra="ignore",
    )

    @field_validator("database_url")
    @classmethod
    def validate_database_url(cls, value: str) -> str:
        database_url = value.strip()

        if database_url.startswith("postgres://"):
            database_url = database_url.replace("postgres://", "postgresql://", 1)

        if not database_url.startswith("postgresql://"):
            raise ValueError("DATABASE_URL deve apontar para um banco PostgreSQL.")

        return database_url

    @field_validator("secret_key")
    @classmethod
    def validate_secret_key(cls, value: str) -> str:
        secret_key = value.strip()

        if len(secret_key) < 32:
            raise ValueError("SECRET_KEY deve ter pelo menos 32 caracteres.")

        return secret_key

    @property
    def backend_dir(self) -> Path:
        return BACKEND_DIR

    @property
    def legacy_json_file_path(self) -> Path:
        return self.resolve_backend_path(self.legacy_json_file)

    @property
    def cors_origin_list(self) -> list[str]:
        return [
            origin.strip()
            for origin in self.cors_origins.split(",")
            if origin.strip()
        ]

    def resolve_backend_path(self, file_path: str) -> Path:
        path = Path(file_path)

        if path.is_absolute():
            return path

        return self.backend_dir / path


@lru_cache
def get_settings() -> Settings:
    return Settings()


settings = get_settings()