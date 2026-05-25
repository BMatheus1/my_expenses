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
    ExpenseCategoryRecord,
    ExpenseRecord,
    ExpenseResponse,
    IncomeRecord,
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
        create_expense_categories_table(connection)
        create_expenses_table(connection)
        create_incomes_table(connection)
        create_database_indexes(connection)

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
            created_at TIMESTAMPTZ NOT NULL
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
            created_at TIMESTAMPTZ NOT NULL
        )
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


def list_expense_records(user_id: str) -> list[ExpenseRecord]:
    with get_connection() as connection:
        rows = connection.execute(
            """
            SELECT
                id,
                user_id,
                description,
                amount,
                category,
                date,
                created_at
            FROM expenses
            WHERE user_id = %s
            ORDER BY date DESC, created_at DESC
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
                id,
                user_id,
                description,
                amount,
                category,
                date,
                created_at
            FROM expenses
            WHERE id = %s AND user_id = %s
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
                created_at
            )
            VALUES (%s, %s, %s, %s, %s, %s, %s)
            """,
            (
                expense.id,
                expense.user_id,
                expense.description,
                expense.amount,
                expense.category,
                expense.date,
                expense.created_at,
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
                date = %s
            WHERE id = %s AND user_id = %s
            """,
            (
                expense.description,
                expense.amount,
                expense.category,
                expense.date,
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

def get_user_record_by_id(user_id: str) -> UserRecord | None:
    with get_connection() as connection:
        row = connection.execute(
            """
            SELECT id, name, email, password_hash, provider, created_at
            FROM users
            WHERE id = %s
            """,
            (user_id,),
        ).fetchone()

    if row is None:
        return None

    return UserRecord.model_validate(row)