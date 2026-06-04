import json
from collections.abc import Iterator
from contextlib import contextmanager
from pathlib import Path
import psycopg
from psycopg import Connection
from psycopg.rows import dict_row
from psycopg_pool import ConnectionPool

from app.config import settings
from app.schemas import (
    CreditCardRecord,
    ExpenseCategoryRecord,
    ExpenseRecord,
    ExpenseResponse,
    IncomeRecord,
    SubscriptionRecord,
    UserSettingsRecord,
    UserRecord,
)


database_pool: ConnectionPool | None = None


def open_database_pool() -> None:
    global database_pool

    if database_pool is not None:
        return

    database_pool = ConnectionPool(
        conninfo=settings.database_url,
        min_size=settings.database_pool_min_size,
        max_size=settings.database_pool_max_size,
        kwargs={"row_factory": dict_row},
        open=True,
    )


def close_database_pool() -> None:
    global database_pool

    if database_pool is None:
        return

    database_pool.close()
    database_pool = None


@contextmanager
def get_connection() -> Iterator[Connection]:
    pool = database_pool

    if pool is None:
        connection = psycopg.connect(settings.database_url, row_factory=dict_row)
        should_return_to_pool = False
    else:
        connection = pool.getconn()
        should_return_to_pool = True

    try:
        yield connection
        connection.commit()
    except Exception:
        connection.rollback()
        raise
    finally:
        if should_return_to_pool:
            pool.putconn(connection)
        else:
            connection.close()

def initialize_database() -> None:
    with get_connection() as connection:
        create_users_table(connection)
        create_subscriptions_table(connection)
        create_user_settings_table(connection)
        create_expense_categories_table(connection)
        create_credit_cards_table(connection)
        create_expenses_table(connection)
        create_incomes_table(connection)
        create_database_indexes(connection)
        backfill_expense_credit_card_snapshots(connection)

    migrate_legacy_json_to_postgres()


def create_users_table(connection: Connection) -> None:
    connection.execute(
        """
        CREATE TABLE IF NOT EXISTS users (
            id TEXT PRIMARY KEY,
            name TEXT NOT NULL,
            email TEXT NOT NULL UNIQUE,
            password_hash TEXT,
            provider TEXT NOT NULL,
            created_at TIMESTAMPTZ NOT NULL,
            updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            last_login_at TIMESTAMPTZ,
            status TEXT NOT NULL DEFAULT 'active',
            role TEXT NOT NULL DEFAULT 'user'
        )
        """
    )
    connection.execute("ALTER TABLE users ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()")
    connection.execute("ALTER TABLE users ADD COLUMN IF NOT EXISTS last_login_at TIMESTAMPTZ")
    connection.execute("ALTER TABLE users ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'active'")
    connection.execute("ALTER TABLE users ADD COLUMN IF NOT EXISTS role TEXT NOT NULL DEFAULT 'user'")


def create_subscriptions_table(connection: Connection) -> None:
    connection.execute(
        """
        CREATE TABLE IF NOT EXISTS subscriptions (
            id TEXT PRIMARY KEY,
            user_id TEXT NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
            trial_start_at TIMESTAMPTZ,
            trial_end_at TIMESTAMPTZ,
            subscription_status TEXT NOT NULL DEFAULT 'inactive',
            subscription_provider TEXT,
            provider_customer_id TEXT,
            provider_subscription_id TEXT,
            current_period_start TIMESTAMPTZ,
            current_period_end TIMESTAMPTZ,
            cancel_at_period_end BOOLEAN NOT NULL DEFAULT FALSE,
            checkout_url TEXT,
            created_at TIMESTAMPTZ NOT NULL,
            updated_at TIMESTAMPTZ NOT NULL
        )
        """
    )

    connection.execute(
        """
        ALTER TABLE subscriptions
        ADD COLUMN IF NOT EXISTS checkout_url TEXT
        """
    )


def create_user_settings_table(connection: Connection) -> None:
    connection.execute(
        """
        CREATE TABLE IF NOT EXISTS user_settings (
            id TEXT PRIMARY KEY,
            user_id TEXT NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
            app_theme TEXT NOT NULL DEFAULT 'emerald',
            app_mode TEXT NOT NULL DEFAULT 'light',
            daily_review_enabled BOOLEAN NOT NULL DEFAULT TRUE,
            daily_review_time TEXT,
            purpose_onboarding_seen BOOLEAN NOT NULL DEFAULT FALSE,
            notifications_enabled BOOLEAN NOT NULL DEFAULT FALSE,
            created_at TIMESTAMPTZ NOT NULL,
            updated_at TIMESTAMPTZ NOT NULL
        )
        """
    )


def create_expense_categories_table(connection: Connection) -> None:
    connection.execute(
        """
        CREATE TABLE IF NOT EXISTS expense_categories (
            id TEXT PRIMARY KEY,
            user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
            name TEXT NOT NULL,
            name_normalized TEXT NOT NULL,
            created_at TIMESTAMPTZ NOT NULL,
            UNIQUE(user_id, name_normalized)
        )
        """
    )


def create_credit_cards_table(connection: Connection) -> None:
    connection.execute(
        """
        CREATE TABLE IF NOT EXISTS credit_cards (
            id TEXT PRIMARY KEY,
            user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
            name TEXT NOT NULL,
            brand TEXT NOT NULL,
            last_four_digits TEXT NOT NULL,
            closing_day INTEGER NOT NULL,
            due_day INTEGER NOT NULL,
            limit_amount NUMERIC(12, 2),
            color TEXT NOT NULL DEFAULT 'slate',
            created_at TIMESTAMPTZ NOT NULL,
            UNIQUE(user_id, name, last_four_digits)
        )
        """
    )


def create_expenses_table(connection: Connection) -> None:
    connection.execute(
        """
        CREATE TABLE IF NOT EXISTS expenses (
            id TEXT PRIMARY KEY,
            user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
            description TEXT NOT NULL,
            amount NUMERIC(12, 2) NOT NULL,
            category TEXT NOT NULL,
            date DATE NOT NULL,
            created_at TIMESTAMPTZ NOT NULL,
            payment_method TEXT NOT NULL DEFAULT 'cash',
            credit_card_id TEXT REFERENCES credit_cards(id) ON DELETE SET NULL,
            installments_count INTEGER NOT NULL DEFAULT 1,
            installment_number INTEGER NOT NULL DEFAULT 1,
            installment_group_id TEXT,
            invoice_month TEXT
        )
        """
    )

    connection.execute(
        """
        ALTER TABLE expenses
        ADD COLUMN IF NOT EXISTS payment_method TEXT NOT NULL DEFAULT 'cash'
        """
    )
    connection.execute(
        """
        ALTER TABLE expenses
        ADD COLUMN IF NOT EXISTS credit_card_id TEXT REFERENCES credit_cards(id) ON DELETE SET NULL
        """
    )
    connection.execute(
        """
        ALTER TABLE expenses
        ADD COLUMN IF NOT EXISTS installments_count INTEGER NOT NULL DEFAULT 1
        """
    )
    connection.execute(
        """
        ALTER TABLE expenses
        ADD COLUMN IF NOT EXISTS installment_number INTEGER NOT NULL DEFAULT 1
        """
    )
    connection.execute(
        """
        ALTER TABLE expenses
        ADD COLUMN IF NOT EXISTS installment_group_id TEXT
        """
    )
    connection.execute(
        """
        ALTER TABLE expenses
        ADD COLUMN IF NOT EXISTS invoice_month TEXT
        """
    )
    connection.execute(
    """
    ALTER TABLE expenses
    ADD COLUMN IF NOT EXISTS credit_card_name TEXT
    """
)
    connection.execute(
        """
        ALTER TABLE expenses
        ADD COLUMN IF NOT EXISTS credit_card_brand TEXT
        """
    )
    connection.execute(
        """
        ALTER TABLE expenses
        ADD COLUMN IF NOT EXISTS credit_card_last_four_digits TEXT
        """
    )
    connection.execute(
        """
        ALTER TABLE expenses
        ADD COLUMN IF NOT EXISTS credit_card_color TEXT
        """
    )
    connection.execute(
        """
        ALTER TABLE expenses
        ADD COLUMN IF NOT EXISTS credit_card_due_day INTEGER
        """
    )


def create_incomes_table(connection: Connection) -> None:
    connection.execute(
        """
        CREATE TABLE IF NOT EXISTS incomes (
            id TEXT PRIMARY KEY,
            user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
            description TEXT NOT NULL,
            amount NUMERIC(12, 2) NOT NULL,
            source TEXT NOT NULL,
            date DATE NOT NULL,
            created_at TIMESTAMPTZ NOT NULL
        )
        """
    )


def create_database_indexes(connection: Connection) -> None:
    connection.execute(
        """
        CREATE INDEX IF NOT EXISTS idx_expenses_user_date
        ON expenses(user_id, date DESC)
        """
    )
    connection.execute(
        """
        CREATE INDEX IF NOT EXISTS idx_incomes_user_date
        ON incomes(user_id, date DESC)
        """
    )
    connection.execute(
        """
        CREATE INDEX IF NOT EXISTS idx_expense_categories_user
        ON expense_categories(user_id)
        """
    )
    connection.execute(
        """
        CREATE INDEX IF NOT EXISTS idx_credit_cards_user
        ON credit_cards(user_id)
        """
    )
    connection.execute(
        """
        CREATE INDEX IF NOT EXISTS idx_user_settings_user
        ON user_settings(user_id)
        """
    )
    connection.execute(
        """
        CREATE INDEX IF NOT EXISTS idx_subscriptions_user
        ON subscriptions(user_id)
        """
    )
    connection.execute(
        """
        CREATE INDEX IF NOT EXISTS idx_subscriptions_provider_subscription
        ON subscriptions(provider_subscription_id)
        """
    )
    connection.execute(
        """
        CREATE INDEX IF NOT EXISTS idx_expenses_credit_card_invoice
        ON expenses(user_id, credit_card_id, invoice_month)
        """
    )

def backfill_expense_credit_card_snapshots(connection: Connection) -> None:
    connection.execute(
        """
        UPDATE expenses AS expense
        SET
            credit_card_name = COALESCE(expense.credit_card_name, card.name),
            credit_card_brand = COALESCE(expense.credit_card_brand, card.brand),
            credit_card_last_four_digits = COALESCE(
                expense.credit_card_last_four_digits,
                card.last_four_digits
            ),
            credit_card_color = COALESCE(expense.credit_card_color, card.color),
            credit_card_due_day = COALESCE(expense.credit_card_due_day, card.due_day)
        FROM credit_cards AS card
        WHERE
            expense.credit_card_id = card.id
            AND expense.user_id = card.user_id
            AND expense.payment_method = 'credit_card'
        """
    )

def snapshot_expenses_credit_card(
    user_id: str,
    card: CreditCardRecord,
) -> None:
    with get_connection() as connection:
        connection.execute(
            """
            UPDATE expenses
            SET
                credit_card_name = %s,
                credit_card_brand = %s,
                credit_card_last_four_digits = %s,
                credit_card_color = %s,
                credit_card_due_day = %s
            WHERE
                user_id = %s
                AND credit_card_id = %s
                AND payment_method = 'credit_card'
            """,
            (
                card.name,
                card.brand,
                card.last_four_digits,
                card.color,
                card.due_day,
                user_id,
                card.id,
            ),
        )


def delete_expenses_by_credit_card(user_id: str, card_id: str) -> int:
    with get_connection() as connection:
        cursor = connection.execute(
            """
            DELETE FROM expenses
            WHERE user_id = %s AND credit_card_id = %s
            """,
            (user_id, card_id),
        )

        return cursor.rowcount
    
def create_user_record(user: UserRecord) -> UserRecord:
    with get_connection() as connection:
        connection.execute(
            """
            INSERT INTO users (
                id,
                name,
                email,
                password_hash,
                provider,
                created_at
            )
            VALUES (%s, %s, %s, %s, %s, %s)
            """,
            (
                user.id,
                user.name,
                user.email,
                user.password_hash,
                user.provider,
                user.created_at,
            ),
        )

    return user


def get_user_record_by_email(email: str) -> UserRecord | None:
    with get_connection() as connection:
        row = connection.execute(
            """
            SELECT
                id,
                name,
                email,
                password_hash,
                provider,
                created_at
            FROM users
            WHERE email = %s
            """,
            (email.strip().lower(),),
        ).fetchone()

    if row is None:
        return None

    return UserRecord.model_validate(row)


def get_user_record_by_id(user_id: str) -> UserRecord | None:
    with get_connection() as connection:
        row = connection.execute(
            """
            SELECT
                id,
                name,
                email,
                password_hash,
                provider,
                created_at
            FROM users
            WHERE id = %s
            """,
            (user_id,),
        ).fetchone()

    if row is None:
        return None

    return UserRecord.model_validate(row)


def get_user_settings_record(user_id: str) -> UserSettingsRecord | None:
    with get_connection() as connection:
        row = connection.execute(
            """
            SELECT
                id,
                user_id,
                app_theme,
                app_mode,
                daily_review_enabled,
                daily_review_time,
                purpose_onboarding_seen,
                notifications_enabled,
                created_at,
                updated_at
            FROM user_settings
            WHERE user_id = %s
            """,
            (user_id,),
        ).fetchone()

    if row is None:
        return None

    return UserSettingsRecord.model_validate(row)


def get_subscription_record(user_id: str) -> SubscriptionRecord | None:
    with get_connection() as connection:
        row = connection.execute(
            """
            SELECT
                id,
                user_id,
                trial_start_at,
                trial_end_at,
                subscription_status,
                subscription_provider,
                provider_customer_id,
                provider_subscription_id,
                current_period_start,
                current_period_end,
                cancel_at_period_end,
                checkout_url,
                created_at,
                updated_at
            FROM subscriptions
            WHERE user_id = %s
            """,
            (user_id,),
        ).fetchone()

    if row is None:
        return None

    return SubscriptionRecord.model_validate(row)


def get_subscription_record_by_provider_subscription_id(
    provider_subscription_id: str,
) -> SubscriptionRecord | None:
    with get_connection() as connection:
        row = connection.execute(
            """
            SELECT
                id,
                user_id,
                trial_start_at,
                trial_end_at,
                subscription_status,
                subscription_provider,
                provider_customer_id,
                provider_subscription_id,
                current_period_start,
                current_period_end,
                cancel_at_period_end,
                checkout_url,
                created_at,
                updated_at
            FROM subscriptions
            WHERE provider_subscription_id = %s
            """,
            (provider_subscription_id,),
        ).fetchone()

    if row is None:
        return None

    return SubscriptionRecord.model_validate(row)


def upsert_subscription_record(
    subscription: SubscriptionRecord,
) -> SubscriptionRecord:
    with get_connection() as connection:
        row = connection.execute(
            """
            INSERT INTO subscriptions (
                id,
                user_id,
                trial_start_at,
                trial_end_at,
                subscription_status,
                subscription_provider,
                provider_customer_id,
                provider_subscription_id,
                current_period_start,
                current_period_end,
                cancel_at_period_end,
                checkout_url,
                created_at,
                updated_at
            )
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
            ON CONFLICT (user_id)
            DO UPDATE SET
                trial_start_at = EXCLUDED.trial_start_at,
                trial_end_at = EXCLUDED.trial_end_at,
                subscription_status = EXCLUDED.subscription_status,
                subscription_provider = EXCLUDED.subscription_provider,
                provider_customer_id = EXCLUDED.provider_customer_id,
                provider_subscription_id = EXCLUDED.provider_subscription_id,
                current_period_start = EXCLUDED.current_period_start,
                current_period_end = EXCLUDED.current_period_end,
                cancel_at_period_end = EXCLUDED.cancel_at_period_end,
                checkout_url = EXCLUDED.checkout_url,
                updated_at = EXCLUDED.updated_at
            RETURNING
                id,
                user_id,
                trial_start_at,
                trial_end_at,
                subscription_status,
                subscription_provider,
                provider_customer_id,
                provider_subscription_id,
                current_period_start,
                current_period_end,
                cancel_at_period_end,
                checkout_url,
                created_at,
                updated_at
            """,
            (
                subscription.id,
                subscription.user_id,
                subscription.trial_start_at,
                subscription.trial_end_at,
                subscription.subscription_status,
                subscription.subscription_provider,
                subscription.provider_customer_id,
                subscription.provider_subscription_id,
                subscription.current_period_start,
                subscription.current_period_end,
                subscription.cancel_at_period_end,
                subscription.checkout_url,
                subscription.created_at,
                subscription.updated_at,
            ),
        ).fetchone()

    return SubscriptionRecord.model_validate(row)


def upsert_user_settings_record(
    settings_record: UserSettingsRecord,
) -> UserSettingsRecord:
    with get_connection() as connection:
        row = connection.execute(
            """
            INSERT INTO user_settings (
                id,
                user_id,
                app_theme,
                app_mode,
                daily_review_enabled,
                daily_review_time,
                purpose_onboarding_seen,
                notifications_enabled,
                created_at,
                updated_at
            )
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
            ON CONFLICT (user_id)
            DO UPDATE SET
                app_theme = EXCLUDED.app_theme,
                app_mode = EXCLUDED.app_mode,
                daily_review_enabled = EXCLUDED.daily_review_enabled,
                daily_review_time = EXCLUDED.daily_review_time,
                purpose_onboarding_seen = EXCLUDED.purpose_onboarding_seen,
                notifications_enabled = EXCLUDED.notifications_enabled,
                updated_at = EXCLUDED.updated_at
            RETURNING
                id,
                user_id,
                app_theme,
                app_mode,
                daily_review_enabled,
                daily_review_time,
                purpose_onboarding_seen,
                notifications_enabled,
                created_at,
                updated_at
            """,
            (
                settings_record.id,
                settings_record.user_id,
                settings_record.app_theme,
                settings_record.app_mode,
                settings_record.daily_review_enabled,
                settings_record.daily_review_time,
                settings_record.purpose_onboarding_seen,
                settings_record.notifications_enabled,
                settings_record.created_at,
                settings_record.updated_at,
            ),
        ).fetchone()

    return UserSettingsRecord.model_validate(row)


def list_custom_expense_category_records(
    user_id: str,
) -> list[ExpenseCategoryRecord]:
    with get_connection() as connection:
        rows = connection.execute(
            """
            SELECT
                id,
                user_id,
                name,
                name_normalized,
                created_at
            FROM expense_categories
            WHERE user_id = %s
            ORDER BY LOWER(name)
            """,
            (user_id,),
        ).fetchall()

    return [ExpenseCategoryRecord.model_validate(row) for row in rows]


def list_used_expense_category_names(user_id: str) -> list[str]:
    with get_connection() as connection:
        rows = connection.execute(
            """
            SELECT category
            FROM expenses
            WHERE user_id = %s
            GROUP BY category
            ORDER BY LOWER(category)
            """,
            (user_id,),
        ).fetchall()

    return [row["category"] for row in rows]


def count_expenses_by_category(user_id: str, category_name: str) -> int:
    with get_connection() as connection:
        row = connection.execute(
            """
            SELECT COUNT(*) AS total
            FROM expenses
            WHERE user_id = %s AND category = %s
            """,
            (user_id, category_name),
        ).fetchone()

    return int(row["total"])


def get_expense_category_record_by_id(
    category_id: str,
    user_id: str,
) -> ExpenseCategoryRecord | None:
    with get_connection() as connection:
        row = connection.execute(
            """
            SELECT
                id,
                user_id,
                name,
                name_normalized,
                created_at
            FROM expense_categories
            WHERE id = %s AND user_id = %s
            """,
            (category_id, user_id),
        ).fetchone()

    if row is None:
        return None

    return ExpenseCategoryRecord.model_validate(row)


def get_expense_category_record_by_normalized_name(
    user_id: str,
    name_normalized: str,
) -> ExpenseCategoryRecord | None:
    with get_connection() as connection:
        row = connection.execute(
            """
            SELECT
                id,
                user_id,
                name,
                name_normalized,
                created_at
            FROM expense_categories
            WHERE user_id = %s AND name_normalized = %s
            """,
            (user_id, name_normalized),
        ).fetchone()

    if row is None:
        return None

    return ExpenseCategoryRecord.model_validate(row)


def create_expense_category_record(
    category: ExpenseCategoryRecord,
) -> ExpenseCategoryRecord:
    with get_connection() as connection:
        connection.execute(
            """
            INSERT INTO expense_categories (
                id,
                user_id,
                name,
                name_normalized,
                created_at
            )
            VALUES (%s, %s, %s, %s, %s)
            """,
            (
                category.id,
                category.user_id,
                category.name,
                category.name_normalized,
                category.created_at,
            ),
        )

    return category


def update_expense_category_record(
    category_id: str,
    user_id: str,
    name: str,
    name_normalized: str,
) -> ExpenseCategoryRecord | None:
    with get_connection() as connection:
        row = connection.execute(
            """
            UPDATE expense_categories
            SET
                name = %s,
                name_normalized = %s
            WHERE id = %s AND user_id = %s
            RETURNING
                id,
                user_id,
                name,
                name_normalized,
                created_at
            """,
            (
                name,
                name_normalized,
                category_id,
                user_id,
            ),
        ).fetchone()

    if row is None:
        return None

    return ExpenseCategoryRecord.model_validate(row)


def update_expenses_category_name(
    user_id: str,
    old_category_name: str,
    new_category_name: str,
) -> None:
    with get_connection() as connection:
        connection.execute(
            """
            UPDATE expenses
            SET category = %s
            WHERE user_id = %s AND category = %s
            """,
            (
                new_category_name,
                user_id,
                old_category_name,
            ),
        )


def delete_expense_category_record(category_id: str, user_id: str) -> bool:
    with get_connection() as connection:
        cursor = connection.execute(
            """
            DELETE FROM expense_categories
            WHERE id = %s AND user_id = %s
            """,
            (category_id, user_id),
        )

        return cursor.rowcount > 0


def list_credit_card_records(user_id: str) -> list[CreditCardRecord]:
    with get_connection() as connection:
        rows = connection.execute(
            """
            SELECT
                id,
                user_id,
                name,
                brand,
                last_four_digits,
                closing_day,
                due_day,
                limit_amount,
                color,
                created_at
            FROM credit_cards
            WHERE user_id = %s
            ORDER BY LOWER(name), created_at DESC
            """,
            (user_id,),
        ).fetchall()

    return [CreditCardRecord.model_validate(row) for row in rows]


def get_credit_card_record_by_id(
    card_id: str,
    user_id: str,
) -> CreditCardRecord | None:
    with get_connection() as connection:
        row = connection.execute(
            """
            SELECT
                id,
                user_id,
                name,
                brand,
                last_four_digits,
                closing_day,
                due_day,
                limit_amount,
                color,
                created_at
            FROM credit_cards
            WHERE id = %s AND user_id = %s
            """,
            (card_id, user_id),
        ).fetchone()

    if row is None:
        return None

    return CreditCardRecord.model_validate(row)


def create_credit_card_record(card: CreditCardRecord) -> CreditCardRecord:
    with get_connection() as connection:
        connection.execute(
            """
            INSERT INTO credit_cards (
                id,
                user_id,
                name,
                brand,
                last_four_digits,
                closing_day,
                due_day,
                limit_amount,
                color,
                created_at
            )
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
            """,
            (
                card.id,
                card.user_id,
                card.name,
                card.brand,
                card.last_four_digits,
                card.closing_day,
                card.due_day,
                card.limit_amount,
                card.color,
                card.created_at,
            ),
        )

    return card


def update_credit_card_record(card: CreditCardRecord) -> CreditCardRecord:
    with get_connection() as connection:
        connection.execute(
            """
            UPDATE credit_cards
            SET
                name = %s,
                brand = %s,
                last_four_digits = %s,
                closing_day = %s,
                due_day = %s,
                limit_amount = %s,
                color = %s
            WHERE id = %s AND user_id = %s
            """,
            (
                card.name,
                card.brand,
                card.last_four_digits,
                card.closing_day,
                card.due_day,
                card.limit_amount,
                card.color,
                card.id,
                card.user_id,
            ),
        )

    return card


def delete_credit_card_record(card_id: str, user_id: str) -> bool:
    with get_connection() as connection:
        cursor = connection.execute(
            """
            DELETE FROM credit_cards
            WHERE id = %s AND user_id = %s
            """,
            (card_id, user_id),
        )

        return cursor.rowcount > 0


def count_expenses_by_credit_card(user_id: str, card_id: str) -> int:
    with get_connection() as connection:
        row = connection.execute(
            """
            SELECT COUNT(*) AS total
            FROM expenses
            WHERE user_id = %s AND credit_card_id = %s
            """,
            (user_id, card_id),
        ).fetchone()

    return int(row["total"])


def list_expense_records(user_id: str) -> list[ExpenseRecord]:
    with get_connection() as connection:
        rows = connection.execute(
                        """
            SELECT
                expenses.id,
                expenses.user_id,
                expenses.description,
                expenses.amount,
                expenses.category,
                expenses.date,
                expenses.created_at,
                expenses.payment_method,
                expenses.credit_card_id,
                expenses.installments_count,
                expenses.installment_number,
                expenses.installment_group_id,
                expenses.invoice_month,
                COALESCE(credit_cards.name, expenses.credit_card_name) AS credit_card_name,
                COALESCE(credit_cards.brand, expenses.credit_card_brand) AS credit_card_brand,
                COALESCE(
                    credit_cards.last_four_digits,
                    expenses.credit_card_last_four_digits
                ) AS credit_card_last_four_digits,
                COALESCE(credit_cards.color, expenses.credit_card_color) AS credit_card_color,
                COALESCE(credit_cards.due_day, expenses.credit_card_due_day) AS credit_card_due_day,
                CASE
                    WHEN expenses.payment_method = 'credit_card'
                        AND expenses.credit_card_name IS NOT NULL
                        AND credit_cards.id IS NULL
                    THEN TRUE
                    ELSE FALSE
                END AS credit_card_is_deleted
            FROM expenses
            LEFT JOIN credit_cards
                ON credit_cards.id = expenses.credit_card_id
                AND credit_cards.user_id = expenses.user_id
            WHERE expenses.user_id = %s
            ORDER BY expenses.date DESC, expenses.created_at DESC
            """,
            (user_id,),
        ).fetchall()

    return [ExpenseRecord.model_validate(row) for row in rows]


def get_expense_record_by_id(
    expense_id: str,
    user_id: str,
) -> ExpenseRecord | None:
    with get_connection() as connection:
        row = connection.execute(
                        """
            SELECT
                expenses.id,
                expenses.user_id,
                expenses.description,
                expenses.amount,
                expenses.category,
                expenses.date,
                expenses.created_at,
                expenses.payment_method,
                expenses.credit_card_id,
                expenses.installments_count,
                expenses.installment_number,
                expenses.installment_group_id,
                expenses.invoice_month,
                COALESCE(credit_cards.name, expenses.credit_card_name) AS credit_card_name,
                COALESCE(credit_cards.brand, expenses.credit_card_brand) AS credit_card_brand,
                COALESCE(
                    credit_cards.last_four_digits,
                    expenses.credit_card_last_four_digits
                ) AS credit_card_last_four_digits,
                COALESCE(credit_cards.color, expenses.credit_card_color) AS credit_card_color,
                COALESCE(credit_cards.due_day, expenses.credit_card_due_day) AS credit_card_due_day,
                CASE
                    WHEN expenses.payment_method = 'credit_card'
                        AND expenses.credit_card_name IS NOT NULL
                        AND credit_cards.id IS NULL
                    THEN TRUE
                    ELSE FALSE
                END AS credit_card_is_deleted
            FROM expenses
            LEFT JOIN credit_cards
                ON credit_cards.id = expenses.credit_card_id
                AND credit_cards.user_id = expenses.user_id
            WHERE expenses.id = %s AND expenses.user_id = %s
            """,
            (expense_id, user_id),
        ).fetchone()

    if row is None:
        return None

    return ExpenseRecord.model_validate(row)


def create_expense_record(expense: ExpenseRecord) -> ExpenseRecord:
    with get_connection() as connection:
        connection.execute(
            """
            INSERT INTO expenses (
                id,
                user_id,
                description,
                amount,
                category,
                date,
                created_at,
                payment_method,
                credit_card_id,
                installments_count,
                installment_number,
                installment_group_id,
                invoice_month,
                credit_card_name,
                credit_card_brand,
                credit_card_last_four_digits,
                credit_card_color,
                credit_card_due_day
            )
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
            """,
            (
                expense.id,
                expense.user_id,
                expense.description,
                expense.amount,
                expense.category,
                expense.date,
                expense.created_at,
                expense.payment_method,
                expense.credit_card_id,
                expense.installments_count,
                expense.installment_number,
                expense.installment_group_id,
                expense.invoice_month,
                expense.credit_card_name,
                expense.credit_card_brand,
                expense.credit_card_last_four_digits,
                expense.credit_card_color,
                expense.credit_card_due_day,
            ),
        )

    return expense

def update_expense_record(expense: ExpenseRecord) -> ExpenseRecord:
    with get_connection() as connection:
        connection.execute(
            """
            UPDATE expenses
            SET
                description = %s,
                amount = %s,
                category = %s,
                date = %s,
                payment_method = %s,
                credit_card_id = %s,
                installments_count = %s,
                installment_number = %s,
                installment_group_id = %s,
                invoice_month = %s,
                credit_card_name = %s,
                credit_card_brand = %s,
                credit_card_last_four_digits = %s,
                credit_card_color = %s,
                credit_card_due_day = %s
            WHERE id = %s AND user_id = %s
            """,
            (
                expense.description,
                expense.amount,
                expense.category,
                expense.date,
                expense.payment_method,
                expense.credit_card_id,
                expense.installments_count,
                expense.installment_number,
                expense.installment_group_id,
                expense.invoice_month,
                expense.credit_card_name,
                expense.credit_card_brand,
                expense.credit_card_last_four_digits,
                expense.credit_card_color,
                expense.credit_card_due_day,
                expense.id,
                expense.user_id,
            ),
        )

    return expense

def delete_expense_record(expense_id: str, user_id: str) -> bool:
    with get_connection() as connection:
        cursor = connection.execute(
            """
            DELETE FROM expenses
            WHERE id = %s AND user_id = %s
            """,
            (expense_id, user_id),
        )

        return cursor.rowcount > 0


def list_income_records(user_id: str) -> list[IncomeRecord]:
    with get_connection() as connection:
        rows = connection.execute(
            """
            SELECT
                id,
                user_id,
                description,
                amount,
                source,
                date,
                created_at
            FROM incomes
            WHERE user_id = %s
            ORDER BY date DESC, created_at DESC
            """,
            (user_id,),
        ).fetchall()

    return [IncomeRecord.model_validate(row) for row in rows]


def get_income_record_by_id(
    income_id: str,
    user_id: str,
) -> IncomeRecord | None:
    with get_connection() as connection:
        row = connection.execute(
            """
            SELECT
                id,
                user_id,
                description,
                amount,
                source,
                date,
                created_at
            FROM incomes
            WHERE id = %s AND user_id = %s
            """,
            (income_id, user_id),
        ).fetchone()

    if row is None:
        return None

    return IncomeRecord.model_validate(row)


def create_income_record(income: IncomeRecord) -> IncomeRecord:
    with get_connection() as connection:
        connection.execute(
            """
            INSERT INTO incomes (
                id,
                user_id,
                description,
                amount,
                source,
                date,
                created_at
            )
            VALUES (%s, %s, %s, %s, %s, %s, %s)
            """,
            (
                income.id,
                income.user_id,
                income.description,
                income.amount,
                income.source,
                income.date,
                income.created_at,
            ),
        )

    return income


def update_income_record(income: IncomeRecord) -> IncomeRecord:
    with get_connection() as connection:
        connection.execute(
            """
            UPDATE incomes
            SET
                description = %s,
                amount = %s,
                source = %s,
                date = %s
            WHERE id = %s AND user_id = %s
            """,
            (
                income.description,
                income.amount,
                income.source,
                income.date,
                income.id,
                income.user_id,
            ),
        )

    return income


def delete_income_record(income_id: str, user_id: str) -> bool:
    with get_connection() as connection:
        cursor = connection.execute(
            """
            DELETE FROM incomes
            WHERE id = %s AND user_id = %s
            """,
            (income_id, user_id),
        )

        return cursor.rowcount > 0


def migrate_legacy_json_to_postgres() -> None:
    if not settings.legacy_import_email:
        return

    legacy_json_path = settings.legacy_json_file_path

    if not legacy_json_path.exists():
        return

    legacy_user = get_user_record_by_email(settings.legacy_import_email)

    if legacy_user is None:
        return

    legacy_expenses = load_legacy_expenses(legacy_json_path)

    if not legacy_expenses:
        return

    with get_connection() as connection:
        row = connection.execute(
            """
            SELECT COUNT(*) AS total
            FROM expenses
            WHERE user_id = %s
            """,
            (legacy_user.id,),
        ).fetchone()

        if int(row["total"]) > 0:
            return

        for expense in legacy_expenses:
            connection.execute(
                """
                INSERT INTO expenses (
                    id,
                    user_id,
                    description,
                    amount,
                    category,
                    date,
                    created_at
                )
                VALUES (%s, %s, %s, %s, %s, %s, %s)
                ON CONFLICT (id) DO NOTHING
                """,
                (
                    expense.id,
                    legacy_user.id,
                    expense.description,
                    expense.amount,
                    expense.category,
                    expense.date,
                    expense.created_at,
                ),
            )


def load_legacy_expenses(file_path: Path) -> list[ExpenseResponse]:
    raw_content = file_path.read_text(encoding="utf-8").strip()

    if not raw_content:
        return []

    data = json.loads(raw_content)

    return [ExpenseResponse.model_validate(item) for item in data]
