from datetime import datetime

from app.schemas import RefreshTokenRecord
from app.storage import get_connection


def initialize_refresh_token_database() -> None:
    with get_connection() as connection:
        connection.execute(
            """
            CREATE TABLE IF NOT EXISTS refresh_tokens (
                id TEXT PRIMARY KEY,
                user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                token_hash TEXT NOT NULL UNIQUE,
                expires_at TIMESTAMPTZ NOT NULL,
                created_at TIMESTAMPTZ NOT NULL,
                revoked_at TIMESTAMPTZ
            )
            """
        )
        connection.execute(
            """
            CREATE INDEX IF NOT EXISTS idx_refresh_tokens_user_id
            ON refresh_tokens(user_id)
            """
        )
        connection.execute(
            """
            CREATE INDEX IF NOT EXISTS idx_refresh_tokens_token_hash
            ON refresh_tokens(token_hash)
            """
        )


def create_refresh_token_record(record: RefreshTokenRecord) -> RefreshTokenRecord:
    with get_connection() as connection:
        connection.execute(
            """
            INSERT INTO refresh_tokens (
                id,
                user_id,
                token_hash,
                expires_at,
                created_at,
                revoked_at
            )
            VALUES (%s, %s, %s, %s, %s, %s)
            """,
            (
                record.id,
                record.user_id,
                record.token_hash,
                record.expires_at,
                record.created_at,
                record.revoked_at,
            ),
        )

    return record


def get_active_refresh_token_record(
    token_hash: str,
    now: datetime,
) -> RefreshTokenRecord | None:
    with get_connection() as connection:
        row = connection.execute(
            """
            SELECT
                id,
                user_id,
                token_hash,
                expires_at,
                created_at,
                revoked_at
            FROM refresh_tokens
            WHERE token_hash = %s
              AND expires_at > %s
              AND revoked_at IS NULL
            """,
            (token_hash, now),
        ).fetchone()

    if row is None:
        return None

    return RefreshTokenRecord.model_validate(row)


def revoke_refresh_token_record(token_id: str, revoked_at: datetime) -> None:
    with get_connection() as connection:
        connection.execute(
            """
            UPDATE refresh_tokens
            SET revoked_at = %s
            WHERE id = %s
              AND revoked_at IS NULL
            """,
            (revoked_at, token_id),
        )


def revoke_refresh_token_by_hash(token_hash: str, revoked_at: datetime) -> None:
    with get_connection() as connection:
        connection.execute(
            """
            UPDATE refresh_tokens
            SET revoked_at = %s
            WHERE token_hash = %s
              AND revoked_at IS NULL
            """,
            (revoked_at, token_hash),
        )


def revoke_all_user_refresh_tokens(user_id: str, revoked_at: datetime) -> None:
    with get_connection() as connection:
        connection.execute(
            """
            UPDATE refresh_tokens
            SET revoked_at = %s
            WHERE user_id = %s
              AND revoked_at IS NULL
            """,
            (revoked_at, user_id),
        )


def delete_expired_refresh_tokens(now: datetime) -> None:
    with get_connection() as connection:
        connection.execute(
            """
            DELETE FROM refresh_tokens
            WHERE expires_at <= %s
            """,
            (now,),
        )