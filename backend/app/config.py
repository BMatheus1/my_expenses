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

    database_file: str = "data/expenses.db"
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

    @field_validator("secret_key")
    @classmethod
    def validate_secret_key(cls, value: str) -> str:
        if len(value.strip()) < 32:
            raise ValueError("SECRET_KEY deve ter pelo menos 32 caracteres.")

        return value.strip()

    @property
    def backend_dir(self) -> Path:
        return BACKEND_DIR

    @property
    def database_file_path(self) -> Path:
        return self.resolve_backend_path(self.database_file)

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