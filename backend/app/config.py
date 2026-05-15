from functools import lru_cache
from pathlib import Path

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    app_name: str = "My Expenses API"
    app_env: str = "development"
    app_debug: bool = True

    api_prefix: str = "/api"
    database_file: str = "data/expenses.db"
    legacy_json_file: str = "data/expenses.json"

    secret_key: str = "troque-essa-chave"
    access_token_expire_minutes: int = 60 * 24 * 7

    google_client_id: str = ""

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )

    @property
    def backend_dir(self) -> Path:
        return Path(__file__).resolve().parent.parent

    @property
    def database_file_path(self) -> Path:
        file_path = Path(self.database_file)

        if file_path.is_absolute():
            return file_path

        return self.backend_dir / file_path

    @property
    def legacy_json_file_path(self) -> Path:
        file_path = Path(self.legacy_json_file)

        if file_path.is_absolute():
            return file_path

        return self.backend_dir / file_path


@lru_cache
def get_settings() -> Settings:
    return Settings()


settings = get_settings()