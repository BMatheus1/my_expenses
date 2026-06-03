import os
from collections.abc import Iterator
from urllib.parse import urlparse

import psycopg
from fastapi.testclient import TestClient
from psycopg import sql
from pytest import fixture

TEST_DATABASE_URL = os.getenv(
    "DATABASE_URL_TEST",
    "postgresql://postgres:postgres@localhost:5432/my_expenses_test",
)

os.environ["APP_ENV"] = "test"
os.environ["APP_DEBUG"] = "false"
os.environ["DATABASE_URL"] = TEST_DATABASE_URL
os.environ["SECRET_KEY"] = "test_secret_key_with_more_than_32_characters_123456"
os.environ["LEGACY_IMPORT_EMAIL"] = ""
os.environ["RATE_LIMIT_ENABLED"] = "false"
os.environ["SECURITY_HEADERS_ENABLED"] = "false"
os.environ["ACCESS_TOKEN_EXPIRE_MINUTES"] = "15"
os.environ["REFRESH_TOKEN_EXPIRE_DAYS"] = "30"
os.environ["REFRESH_COOKIE_NAME"] = "my_expenses_refresh_token"
os.environ["REFRESH_COOKIE_PATH"] = "/api/auth"
os.environ["REFRESH_COOKIE_SECURE"] = "false"
os.environ["REFRESH_COOKIE_SAMESITE"] = "lax"
os.environ["FRONTEND_URL"] = "http://127.0.0.1:3000"
os.environ["PASSWORD_RESET_TOKEN_EXPIRE_MINUTES"] = "30"
os.environ["EMAIL_VERIFICATION_TOKEN_EXPIRE_MINUTES"] = "1440"
os.environ["SMTP_ENABLED"] = "false"

from app.business_repository import initialize_business_database
from app.billing_repository import initialize_billing_database
from app.email_verification_repository import initialize_email_verification_database
from app.main import app
from app.password_reset_repository import initialize_password_reset_database
from app.session_repository import initialize_refresh_token_database
from app.storage import initialize_database


TABLES_TO_TRUNCATE = [
    "email_verification_tokens",
    "password_reset_tokens",
    "refresh_tokens",
    "payment_events",
    "business_sale_materials",
    "business_sales",
    "business_recipe_items",
    "business_services",
    "business_materials",
    "businesses",
    "expenses",
    "incomes",
    "expense_categories",
    "user_settings",
    "user_subscriptions",
    "subscriptions",
    "users",
]


@fixture()
def client() -> Iterator[TestClient]:
    create_test_database_if_needed()
    initialize_database()
    initialize_billing_database()
    initialize_business_database()
    initialize_refresh_token_database()
    initialize_password_reset_database()
    initialize_email_verification_database()
    clear_database()

    with TestClient(app) as test_client:
        yield test_client

    clear_database()


def create_test_database_if_needed() -> None:
    parsed_url = urlparse(TEST_DATABASE_URL)
    database_name = parsed_url.path.lstrip("/")

    if not database_name:
        raise RuntimeError("DATABASE_URL_TEST precisa informar o nome do banco.")

    admin_database_url = parsed_url._replace(path="/postgres").geturl()

    with psycopg.connect(admin_database_url, autocommit=True) as connection:
        database_exists = connection.execute(
            "SELECT 1 FROM pg_database WHERE datname = %s",
            (database_name,),
        ).fetchone()

        if database_exists:
            return

        connection.execute(
            sql.SQL("CREATE DATABASE {}").format(sql.Identifier(database_name))
        )


def clear_database() -> None:
    table_names = sql.SQL(", ").join(
        sql.Identifier(table_name) for table_name in TABLES_TO_TRUNCATE
    )

    query = sql.SQL("TRUNCATE TABLE {} RESTART IDENTITY CASCADE").format(
        table_names
    )

    with psycopg.connect(TEST_DATABASE_URL) as connection:
        connection.execute(query)
        connection.commit()
