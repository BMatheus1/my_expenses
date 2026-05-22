from datetime import datetime

from app.schemas import PasswordResetTokenRecord
from app.storage import get_connection


def initialize_password_reset_database() -> None:
    with get_connection() as connection:
        connection.execute(
            """
            CREATE TABLE IF NOT EXISTS password_reset_tokens (
                id TEXT PRIMARY KEY,
                user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                token_hash TEXT NOT NULL UNIQUE,
                expires_at TIMESTAMPTZ NOT NULL,
                created_at TIMESTAMPTZ NOT NULL,
                used_at TIMESTAMPTZ
            )
            """
        )
        connection.execute(
            """
            CREATE INDEX IF NOT EXISTS idx_password_reset_tokens_user_id
            ON password_reset_tokens(user_id)
            """
        )
        connection.execute(
            """
            CREATE INDEX IF NOT EXISTS idx_password_reset_tokens_token_hash
            ON password_reset_tokens(token_hash)
            """
        )


def create_password_reset_token_record(
    record: PasswordResetTokenRecord,
) -> PasswordResetTokenRecord:
    with get_connection() as connection:
        connection.execute(
            """
            INSERT INTO password_reset_tokens (
                id,
                user_id,
                token_hash,
                expires_at,
                created_at,
                used_at
            )
            VALUES (%s, %s, %s, %s, %s, %s)
            """,
            (
                record.id,
                record.user_id,
                record.token_hash,
                record.expires_at,
                record.created_at,
                record.used_at,
            ),
        )

    return record


def get_active_password_reset_token_record(
    token_hash: str,
    now: datetime,
) -> PasswordResetTokenRecord | None:
    with get_connection() as connection:
        row = connection.execute(
            """
            SELECT
                id,
                user_id,
                token_hash,
                expires_at,
                created_at,
                used_at
            FROM password_reset_tokens
            WHERE token_hash = %s
              AND expires_at > %s
              AND used_at IS NULL
            """,
            (token_hash, now),
        ).fetchone()

    if row is None:
        return None

    return PasswordResetTokenRecord.model_validate(row)


def mark_password_reset_token_as_used(token_id: str, used_at: datetime) -> None:
    with get_connection() as connection:
        connection.execute(
            """
            UPDATE password_reset_tokens
            SET used_at = %s
            WHERE id = %s
              AND used_at IS NULL
            """,
            (used_at, token_id),
        )


def revoke_user_password_reset_tokens(user_id: str, used_at: datetime) -> None:
    with get_connection() as connection:
        connection.execute(
            """
            UPDATE password_reset_tokens
            SET used_at = %s
            WHERE user_id = %s
              AND used_at IS NULL
            """,
            (used_at, user_id),
        )


def update_user_password_hash(user_id: str, password_hash: str) -> None:
    with get_connection() as connection:
        connection.execute(
            """
            UPDATE users
            SET password_hash = %s,
                provider = CASE
                    WHEN provider = 'google' THEN provider
                    ELSE 'credentials'
                END
            WHERE id = %s
            """,
            (password_hash, user_id),
        )


def delete_expired_password_reset_tokens(now: datetime) -> None:
    with get_connection() as connection:
        connection.execute(
            """
            DELETE FROM password_reset_tokens
            WHERE expires_at <= %s
            """,
            (now,),
        )