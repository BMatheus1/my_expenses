from datetime import datetime

from app.schemas import EmailVerificationTokenRecord
from app.storage import get_connection


def initialize_email_verification_database() -> None:
    with get_connection() as connection:
        connection.execute(
            """
            ALTER TABLE users
            ADD COLUMN IF NOT EXISTS email_verified BOOLEAN NOT NULL DEFAULT FALSE
            """
        )
        connection.execute(
            """
            UPDATE users
            SET email_verified = TRUE
            WHERE provider = 'google'
            """
        )
        connection.execute(
            """
            CREATE TABLE IF NOT EXISTS email_verification_tokens (
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
            CREATE INDEX IF NOT EXISTS idx_email_verification_tokens_user_id
            ON email_verification_tokens(user_id)
            """
        )
        connection.execute(
            """
            CREATE INDEX IF NOT EXISTS idx_email_verification_tokens_token_hash
            ON email_verification_tokens(token_hash)
            """
        )


def create_email_verification_token_record(
    record: EmailVerificationTokenRecord,
) -> EmailVerificationTokenRecord:
    with get_connection() as connection:
        connection.execute(
            """
            INSERT INTO email_verification_tokens (
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


def get_active_email_verification_token_record(
    token_hash: str,
    now: datetime,
) -> EmailVerificationTokenRecord | None:
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
            FROM email_verification_tokens
            WHERE token_hash = %s
              AND expires_at > %s
              AND used_at IS NULL
            """,
            (token_hash, now),
        ).fetchone()

    if row is None:
        return None

    return EmailVerificationTokenRecord.model_validate(row)


def mark_email_verification_token_as_used(token_id: str, used_at: datetime) -> None:
    with get_connection() as connection:
        connection.execute(
            """
            UPDATE email_verification_tokens
            SET used_at = %s
            WHERE id = %s
              AND used_at IS NULL
            """,
            (used_at, token_id),
        )


def revoke_user_email_verification_tokens(user_id: str, used_at: datetime) -> None:
    with get_connection() as connection:
        connection.execute(
            """
            UPDATE email_verification_tokens
            SET used_at = %s
            WHERE user_id = %s
              AND used_at IS NULL
            """,
            (used_at, user_id),
        )


def mark_user_email_as_verified(user_id: str) -> None:
    with get_connection() as connection:
        connection.execute(
            """
            UPDATE users
            SET email_verified = TRUE
            WHERE id = %s
            """,
            (user_id,),
        )


def get_user_email_verified(user_id: str) -> bool:
    with get_connection() as connection:
        row = connection.execute(
            """
            SELECT email_verified
            FROM users
            WHERE id = %s
            """,
            (user_id,),
        ).fetchone()

    if row is None:
        return False

    return bool(row["email_verified"])


def delete_expired_email_verification_tokens(now: datetime) -> None:
    with get_connection() as connection:
        connection.execute(
            """
            DELETE FROM email_verification_tokens
            WHERE expires_at <= %s
            """,
            (now,),
        )