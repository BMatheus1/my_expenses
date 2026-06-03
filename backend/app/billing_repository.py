from datetime import datetime
from uuid import uuid4

from psycopg import Connection
from psycopg.types.json import Jsonb

from app.billing_schemas import PaymentEventRecord, UserSubscriptionRecord
from app.storage import get_connection


def initialize_billing_database() -> None:
    with get_connection() as connection:
        create_user_subscriptions_table(connection)
        create_payment_events_table(connection)


def create_user_subscriptions_table(connection: Connection) -> None:
    connection.execute(
        """
        CREATE TABLE IF NOT EXISTS user_subscriptions (
            id TEXT PRIMARY KEY,
            user_id TEXT NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
            provider TEXT NOT NULL DEFAULT 'mercado_pago',
            provider_subscription_id TEXT,
            provider_payment_id TEXT,
            status TEXT NOT NULL DEFAULT 'pending',
            plan_name TEXT NOT NULL DEFAULT 'My Expenses Premium',
            amount NUMERIC(12, 2) NOT NULL DEFAULT 8.99,
            currency TEXT NOT NULL DEFAULT 'BRL',
            trial_starts_at TIMESTAMPTZ,
            trial_ends_at TIMESTAMPTZ,
            current_period_starts_at TIMESTAMPTZ,
            current_period_ends_at TIMESTAMPTZ,
            canceled_at TIMESTAMPTZ,
            checkout_url TEXT,
            created_at TIMESTAMPTZ NOT NULL,
            updated_at TIMESTAMPTZ NOT NULL
        )
        """
    )

    connection.execute(
        """
        CREATE INDEX IF NOT EXISTS idx_user_subscriptions_user
        ON user_subscriptions(user_id)
        """
    )
    connection.execute(
        """
        CREATE INDEX IF NOT EXISTS idx_user_subscriptions_provider_subscription
        ON user_subscriptions(provider_subscription_id)
        """
    )


def create_payment_events_table(connection: Connection) -> None:
    connection.execute(
        """
        CREATE TABLE IF NOT EXISTS payment_events (
            id TEXT PRIMARY KEY,
            provider TEXT NOT NULL,
            provider_event_id TEXT NOT NULL UNIQUE,
            event_type TEXT NOT NULL,
            payload JSONB NOT NULL,
            received_at TIMESTAMPTZ NOT NULL
        )
        """
    )

    connection.execute(
        """
        CREATE INDEX IF NOT EXISTS idx_payment_events_provider_event
        ON payment_events(provider, provider_event_id)
        """
    )


def get_user_subscription(user_id: str) -> UserSubscriptionRecord | None:
    with get_connection() as connection:
        row = connection.execute(
            """
            SELECT
                id,
                user_id,
                provider,
                provider_subscription_id,
                provider_payment_id,
                status,
                plan_name,
                amount,
                currency,
                trial_starts_at,
                trial_ends_at,
                current_period_starts_at,
                current_period_ends_at,
                canceled_at,
                checkout_url,
                created_at,
                updated_at
            FROM user_subscriptions
            WHERE user_id = %s
            """,
            (user_id,),
        ).fetchone()

    if row is None:
        return None

    return UserSubscriptionRecord.model_validate(row)


def get_user_subscription_by_provider_subscription_id(
    provider_subscription_id: str,
) -> UserSubscriptionRecord | None:
    with get_connection() as connection:
        row = connection.execute(
            """
            SELECT
                id,
                user_id,
                provider,
                provider_subscription_id,
                provider_payment_id,
                status,
                plan_name,
                amount,
                currency,
                trial_starts_at,
                trial_ends_at,
                current_period_starts_at,
                current_period_ends_at,
                canceled_at,
                checkout_url,
                created_at,
                updated_at
            FROM user_subscriptions
            WHERE provider_subscription_id = %s
            """,
            (provider_subscription_id,),
        ).fetchone()

    if row is None:
        return None

    return UserSubscriptionRecord.model_validate(row)


def upsert_user_subscription(
    subscription: UserSubscriptionRecord,
) -> UserSubscriptionRecord:
    with get_connection() as connection:
        row = connection.execute(
            """
            INSERT INTO user_subscriptions (
                id,
                user_id,
                provider,
                provider_subscription_id,
                provider_payment_id,
                status,
                plan_name,
                amount,
                currency,
                trial_starts_at,
                trial_ends_at,
                current_period_starts_at,
                current_period_ends_at,
                canceled_at,
                checkout_url,
                created_at,
                updated_at
            )
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
            ON CONFLICT (user_id)
            DO UPDATE SET
                provider = EXCLUDED.provider,
                provider_subscription_id = EXCLUDED.provider_subscription_id,
                provider_payment_id = EXCLUDED.provider_payment_id,
                status = EXCLUDED.status,
                plan_name = EXCLUDED.plan_name,
                amount = EXCLUDED.amount,
                currency = EXCLUDED.currency,
                trial_starts_at = EXCLUDED.trial_starts_at,
                trial_ends_at = EXCLUDED.trial_ends_at,
                current_period_starts_at = EXCLUDED.current_period_starts_at,
                current_period_ends_at = EXCLUDED.current_period_ends_at,
                canceled_at = EXCLUDED.canceled_at,
                checkout_url = EXCLUDED.checkout_url,
                updated_at = EXCLUDED.updated_at
            RETURNING
                id,
                user_id,
                provider,
                provider_subscription_id,
                provider_payment_id,
                status,
                plan_name,
                amount,
                currency,
                trial_starts_at,
                trial_ends_at,
                current_period_starts_at,
                current_period_ends_at,
                canceled_at,
                checkout_url,
                created_at,
                updated_at
            """,
            (
                subscription.id,
                subscription.user_id,
                subscription.provider,
                subscription.provider_subscription_id,
                subscription.provider_payment_id,
                subscription.status,
                subscription.plan_name,
                subscription.amount,
                subscription.currency,
                subscription.trial_starts_at,
                subscription.trial_ends_at,
                subscription.current_period_starts_at,
                subscription.current_period_ends_at,
                subscription.canceled_at,
                subscription.checkout_url,
                subscription.created_at,
                subscription.updated_at,
            ),
        ).fetchone()

    return UserSubscriptionRecord.model_validate(row)


def insert_payment_event_once(
    provider_event_id: str,
    event_type: str,
    payload: dict,
    provider: str = "mercado_pago",
) -> PaymentEventRecord | None:
    now = datetime.now().astimezone()

    with get_connection() as connection:
        row = connection.execute(
            """
            INSERT INTO payment_events (
                id,
                provider,
                provider_event_id,
                event_type,
                payload,
                received_at
            )
            VALUES (%s, %s, %s, %s, %s, %s)
            ON CONFLICT (provider_event_id) DO NOTHING
            RETURNING
                id,
                provider,
                provider_event_id,
                event_type,
                payload,
                received_at
            """,
            (
                str(uuid4()),
                provider,
                provider_event_id,
                event_type,
                Jsonb(payload),
                now,
            ),
        ).fetchone()

    if row is None:
        return None

    return PaymentEventRecord.model_validate(row)
