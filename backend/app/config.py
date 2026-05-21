from functools import lru_cache
from pathlib import Path

from pydantic import field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict

BACKEND_DIR = Path(__file__).resolve().parent.parent
ENV_FILE = BACKEND_DIR / ".env"


class Settings(BaseSettings):
    app_name: str = "My Expenses API"
    app_env: str = "development"
    app_debug: bool = False

    api_prefix: str = "/api"

    database_url: str

    legacy_json_file: str = "data/expenses.json"
    legacy_import_email: str = ""

    secret_key: str
    access_token_expire_minutes: int = 15
    refresh_token_expire_days: int = 30
    refresh_cookie_name: str = "my_expenses_refresh_token"
    refresh_cookie_path: str = "/api/auth"
    refresh_cookie_secure: bool = False
    refresh_cookie_samesite: str = "lax"

    google_client_id: str = ""

    cors_origins: str = "http://localhost:3000,http://127.0.0.1:3000"
    cors_methods: str = "GET,POST,PUT,DELETE,OPTIONS"
    cors_headers: str = "Authorization,Content-Type"

    rate_limit_enabled: bool = True
    auth_rate_limit_requests: int = 8
    auth_rate_limit_window_seconds: int = 60
    write_rate_limit_requests: int = 120
    write_rate_limit_window_seconds: int = 60

    max_request_body_bytes: int = 1_000_000
    security_headers_enabled: bool = True
    hsts_enabled: bool = True
    hsts_max_age_seconds: int = 31_536_000

    model_config = SettingsConfigDict(
        env_file=ENV_FILE,
        env_file_encoding="utf-8",
        extra="ignore",
    )

    @field_validator("app_env")
    @classmethod
    def validate_app_env(cls, value: str) -> str:
        app_env = value.strip().lower()
        allowed_environments = {"development", "test", "staging", "production"}

        if app_env not in allowed_environments:
            raise ValueError(
                "APP_ENV deve ser development, test, staging ou production."
            )

        return app_env

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

        insecure_values = {
            "CHANGE_ME_TO_A_RANDOM_SECRET_WITH_32_CHARS_MINIMUM",
            "your-secret-key",
            "secret",
        }

        if secret_key in insecure_values:
            raise ValueError("SECRET_KEY precisa ser um valor secreto real.")

        return secret_key

    @field_validator("access_token_expire_minutes")
    @classmethod
    def validate_token_expiration(cls, value: int) -> int:
        if value < 5:
            raise ValueError("ACCESS_TOKEN_EXPIRE_MINUTES deve ser no mínimo 5.")

        if value > 60:
            raise ValueError("ACCESS_TOKEN_EXPIRE_MINUTES não deve passar de 60 minutos.")

        return value

    @field_validator("refresh_token_expire_days")
    @classmethod
    def validate_refresh_token_expiration(cls, value: int) -> int:
        if value < 1:
            raise ValueError("REFRESH_TOKEN_EXPIRE_DAYS deve ser no mínimo 1.")

        if value > 60:
            raise ValueError("REFRESH_TOKEN_EXPIRE_DAYS não deve passar de 60 dias.")

        return value

    @field_validator("refresh_cookie_samesite")
    @classmethod
    def validate_refresh_cookie_samesite(cls, value: str) -> str:
        samesite = value.strip().lower()

        if samesite not in {"lax", "strict", "none"}:
            raise ValueError("REFRESH_COOKIE_SAMESITE deve ser lax, strict ou none.")

        return samesite

    @field_validator("max_request_body_bytes")
    @classmethod
    def validate_max_request_body_bytes(cls, value: int) -> int:
        if value < 10_000:
            raise ValueError("MAX_REQUEST_BODY_BYTES está baixo demais.")

        return value

    @property
    def is_production(self) -> bool:
        return self.app_env == "production"

    @property
    def backend_dir(self) -> Path:
        return BACKEND_DIR

    @property
    def legacy_json_file_path(self) -> Path:
        return self.resolve_backend_path(self.legacy_json_file)

    @property
    def cors_origin_list(self) -> list[str]:
        origins = self.parse_csv(self.cors_origins)

        if self.is_production and "*" in origins:
            raise ValueError("CORS_ORIGINS não pode usar * em produção.")

        return origins

    @property
    def cors_method_list(self) -> list[str]:
        return self.parse_csv(self.cors_methods)

    @property
    def cors_header_list(self) -> list[str]:
        return self.parse_csv(self.cors_headers)

    @staticmethod
    def parse_csv(value: str) -> list[str]:
        return [item.strip() for item in value.split(",") if item.strip()]

    def resolve_backend_path(self, file_path: str) -> Path:
        path = Path(file_path)

        if path.is_absolute():
            return path

        return self.backend_dir / path


@lru_cache
def get_settings() -> Settings:
    return Settings()


settings = get_settings()