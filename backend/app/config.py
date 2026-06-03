from functools import lru_cache
from pathlib import Path

from pydantic import EmailStr, field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict

BACKEND_DIR = Path(__file__).resolve().parent.parent
ENV_FILE = BACKEND_DIR / ".env"


class Settings(BaseSettings):
    app_name: str = "My Expenses API"
    app_env: str = "development"
    app_debug: bool = False

    api_prefix: str = "/api"
    frontend_url: str = "http://127.0.0.1:3000"

    database_url: str
    database_pool_min_size: int = 1
    database_pool_max_size: int = 5

    legacy_json_file: str = "data/expenses.json"
    legacy_import_email: str = ""

    secret_key: str
    access_token_expire_minutes: int = 15
    refresh_token_expire_days: int = 30
    refresh_cookie_name: str = "my_expenses_refresh_token"
    refresh_cookie_path: str = "/api/auth"
    refresh_cookie_secure: bool = False
    refresh_cookie_samesite: str = "lax"

    password_reset_token_expire_minutes: int = 30
    email_verification_token_expire_minutes: int = 1440

    resend_api_key: str = ""

    smtp_enabled: bool = False
    smtp_host: str = ""
    smtp_port: int = 587
    smtp_username: str = ""
    smtp_password: str = ""
    smtp_from_email: EmailStr | str = "no-reply@myexpensesfinance.com"
    smtp_from_name: str = "My Expenses"
    smtp_use_tls: bool = True

    google_client_id: str = ""
    google_allowed_client_ids: str = ""

    mercado_pago_access_token: str = ""
    mercado_pago_webhook_secret: str = ""
    mercado_pago_api_base_url: str = "https://api.mercadopago.com"
    mercado_pago_base_url: str = "https://api.mercadopago.com"
    app_public_url: str = "https://myexpensesfinance.com"
    app_price_brl: float = 8.99
    app_trial_days: int = 30
    subscription_monthly_price: float = 8.99
    subscription_trial_days: int = 30
    subscription_currency_id: str = "BRL"

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

    @field_validator("frontend_url")
    @classmethod
    def validate_frontend_url(cls, value: str) -> str:
        frontend_url = value.strip().rstrip("/")

        if not frontend_url.startswith(("http://", "https://")):
            raise ValueError("FRONTEND_URL deve começar com http:// ou https://.")

        return frontend_url

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
            raise ValueError(
                "ACCESS_TOKEN_EXPIRE_MINUTES não deve passar de 60 minutos."
            )

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

    @field_validator("password_reset_token_expire_minutes")
    @classmethod
    def validate_password_reset_token_expiration(cls, value: int) -> int:
        if value < 5:
            raise ValueError("PASSWORD_RESET_TOKEN_EXPIRE_MINUTES deve ser no mínimo 5.")

        if value > 120:
            raise ValueError(
                "PASSWORD_RESET_TOKEN_EXPIRE_MINUTES não deve passar de 120."
            )

        return value

    @field_validator("email_verification_token_expire_minutes")
    @classmethod
    def validate_email_verification_token_expiration(cls, value: int) -> int:
        if value < 15:
            raise ValueError(
                "EMAIL_VERIFICATION_TOKEN_EXPIRE_MINUTES deve ser no mínimo 15."
            )

        if value > 60 * 24 * 7:
            raise ValueError(
                "EMAIL_VERIFICATION_TOKEN_EXPIRE_MINUTES não deve passar de 7 dias."
            )

        return value

    @field_validator("max_request_body_bytes")
    @classmethod
    def validate_max_request_body_bytes(cls, value: int) -> int:
        if value < 10_000:
            raise ValueError("MAX_REQUEST_BODY_BYTES está baixo demais.")

        return value

    @field_validator("subscription_monthly_price")
    @classmethod
    def validate_subscription_monthly_price(cls, value: float) -> float:
        if value <= 0:
            raise ValueError("SUBSCRIPTION_MONTHLY_PRICE precisa ser maior que zero.")

        return round(value, 2)

    @field_validator("app_price_brl")
    @classmethod
    def validate_app_price_brl(cls, value: float) -> float:
        if value <= 0:
            raise ValueError("APP_PRICE_BRL precisa ser maior que zero.")

        return round(value, 2)

    @field_validator("subscription_trial_days")
    @classmethod
    def validate_subscription_trial_days(cls, value: int) -> int:
        if value < 0 or value > 90:
            raise ValueError("SUBSCRIPTION_TRIAL_DAYS deve ficar entre 0 e 90.")

        return value

    @field_validator("app_trial_days")
    @classmethod
    def validate_app_trial_days(cls, value: int) -> int:
        if value < 0 or value > 90:
            raise ValueError("APP_TRIAL_DAYS deve ficar entre 0 e 90.")

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

    @property
    def google_client_id_list(self) -> list[str]:
        client_ids = self.parse_csv(self.google_allowed_client_ids)

        if self.google_client_id and self.google_client_id not in client_ids:
            client_ids.insert(0, self.google_client_id)

        return client_ids    
    
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
