import json
import sqlite3
from collections.abc import Iterator
from contextlib import contextmanager
from pathlib import Path

from app.config import settings
from app.schemas import (
    ExpenseCategoryRecord,
    ExpenseRecord,
    ExpenseResponse,
    IncomeRecord,
    UserRecord,
)


def get_database_path() -> Path:
    return settings.database_file_path


@contextmanager
def get_connection() -> Iterator[sqlite3.Connection]:
    database_path = get_database_path()
    database_path.parent.mkdir(parents=True, exist_ok=True)

    connection = sqlite3.connect(database_path)
    connection.row_factory = sqlite3.Row
    connection.execute("PRAGMA foreign_keys = ON")

    try:
        yield connection
        connection.commit()
    except Exception:
        connection.rollback()
        raise
    finally:
        connection.close()


def initialize_database() -> None:
    with get_connection() as connection:
        create_users_table(connection)
        create_expense_categories_table(connection)
        create_expenses_table(connection)
        create_incomes_table(connection)
        ensure_expenses_user_id_column(connection)

    migrate_legacy_json_to_sqlite()


def create_users_table(connection: sqlite3.Connection) -> None:
    connection.execute(
        """
        CREATE TABLE IF NOT EXISTS users (
            id TEXT PRIMARY KEY,
            name TEXT NOT NULL,
            email TEXT NOT NULL UNIQUE,
            password_hash TEXT,
            provider TEXT NOT NULL,
            created_at TEXT NOT NULL
        )
        """
    )

def create_expense_categories_table(connection: sqlite3.Connection) -> None:
    connection.execute(
        """
        CREATE TABLE IF NOT EXISTS expense_categories (
            id TEXT PRIMARY KEY,
            user_id TEXT NOT NULL,
            name TEXT NOT NULL,
            name_normalized TEXT NOT NULL,
            created_at TEXT NOT NULL,
            UNIQUE(user_id, name_normalized),
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
        )
        """
    )


def list_expense_category_names(user_id: str) -> list[str]:
    with get_connection() as connection:
        rows = connection.execute(
            """
            SELECT name
            FROM expense_categories
            WHERE user_id = ?
            ORDER BY name COLLATE NOCASE
            """,
            (user_id,),
        ).fetchall()

    return [row["name"] for row in rows]


def list_used_expense_category_names(user_id: str) -> list[str]:
    with get_connection() as connection:
        rows = connection.execute(
            """
            SELECT DISTINCT category
            FROM expenses
            WHERE user_id = ?
            ORDER BY category COLLATE NOCASE
            """,
            (user_id,),
        ).fetchall()

    return [row["category"] for row in rows]


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
            WHERE user_id = ? AND name_normalized = ?
            """,
            (user_id, name_normalized),
        ).fetchone()

    if row is None:
        return None

    return ExpenseCategoryRecord.model_validate(dict(row))


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
            VALUES (?, ?, ?, ?, ?)
            """,
            (
                category.id,
                category.user_id,
                category.name,
                category.name_normalized,
                category.created_at.isoformat(),
            ),
        )

    return category

def create_expenses_table(connection: sqlite3.Connection) -> None:
    connection.execute(
        """
        CREATE TABLE IF NOT EXISTS expenses (
            id TEXT PRIMARY KEY,
            user_id TEXT NOT NULL,
            description TEXT NOT NULL,
            amount REAL NOT NULL,
            category TEXT NOT NULL,
            date TEXT NOT NULL,
            created_at TEXT NOT NULL,
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
        )
        """
    )


def create_incomes_table(connection: sqlite3.Connection) -> None:
    connection.execute(
        """
        CREATE TABLE IF NOT EXISTS incomes (
            id TEXT PRIMARY KEY,
            user_id TEXT NOT NULL,
            description TEXT NOT NULL,
            amount REAL NOT NULL,
            source TEXT NOT NULL,
            date TEXT NOT NULL,
            created_at TEXT NOT NULL,
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
        )
        """
    )


def ensure_expenses_user_id_column(connection: sqlite3.Connection) -> None:
    columns = get_table_columns(connection, "expenses")

    if "user_id" not in columns:
        connection.execute("ALTER TABLE expenses ADD COLUMN user_id TEXT")


def get_table_columns(
    connection: sqlite3.Connection,
    table_name: str,
) -> set[str]:
    rows = connection.execute(f"PRAGMA table_info({table_name})").fetchall()

    return {row["name"] for row in rows}


def migrate_legacy_json_to_sqlite() -> None:
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
        expenses_count = connection.execute(
            "SELECT COUNT(*) FROM expenses WHERE user_id = ?",
            (legacy_user.id,),
        ).fetchone()[0]

        if expenses_count > 0:
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
                VALUES (?, ?, ?, ?, ?, ?, ?)
                """,
                (
                    expense.id,
                    legacy_user.id,
                    expense.description,
                    expense.amount,
                    expense.category,
                    expense.date.isoformat(),
                    expense.created_at.isoformat(),
                ),
            )


def load_legacy_expenses(file_path: Path) -> list[ExpenseResponse]:
    raw_content = file_path.read_text(encoding="utf-8").strip()

    if not raw_content:
        return []

    data = json.loads(raw_content)

    return [ExpenseResponse.model_validate(item) for item in data]


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
            VALUES (?, ?, ?, ?, ?, ?)
            """,
            (
                user.id,
                user.name,
                user.email,
                user.password_hash,
                user.provider,
                user.created_at.isoformat(),
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
            WHERE email = ?
            """,
            (email.strip().lower(),),
        ).fetchone()

    if row is None:
        return None

    return UserRecord.model_validate(dict(row))


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
            WHERE id = ?
            """,
            (user_id,),
        ).fetchone()

    if row is None:
        return None

    return UserRecord.model_validate(dict(row))


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
            WHERE user_id = ?
            ORDER BY date DESC, created_at DESC
            """,
            (user_id,),
        ).fetchall()

    return [ExpenseRecord.model_validate(dict(row)) for row in rows]


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
            WHERE id = ? AND user_id = ?
            """,
            (expense_id, user_id),
        ).fetchone()

    if row is None:
        return None

    return ExpenseRecord.model_validate(dict(row))


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
            VALUES (?, ?, ?, ?, ?, ?, ?)
            """,
            (
                expense.id,
                expense.user_id,
                expense.description,
                expense.amount,
                expense.category,
                expense.date.isoformat(),
                expense.created_at.isoformat(),
            ),
        )

    return expense


def update_expense_record(expense: ExpenseRecord) -> ExpenseRecord:
    with get_connection() as connection:
        connection.execute(
            """
            UPDATE expenses
            SET
                description = ?,
                amount = ?,
                category = ?,
                date = ?
            WHERE id = ? AND user_id = ?
            """,
            (
                expense.description,
                expense.amount,
                expense.category,
                expense.date.isoformat(),
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
            WHERE id = ? AND user_id = ?
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
            WHERE user_id = ?
            ORDER BY date DESC, created_at DESC
            """,
            (user_id,),
        ).fetchall()

    return [IncomeRecord.model_validate(dict(row)) for row in rows]


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
            WHERE id = ? AND user_id = ?
            """,
            (income_id, user_id),
        ).fetchone()

    if row is None:
        return None

    return IncomeRecord.model_validate(dict(row))


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
            VALUES (?, ?, ?, ?, ?, ?, ?)
            """,
            (
                income.id,
                income.user_id,
                income.description,
                income.amount,
                income.source,
                income.date.isoformat(),
                income.created_at.isoformat(),
            ),
        )

    return income


def update_income_record(income: IncomeRecord) -> IncomeRecord:
    with get_connection() as connection:
        connection.execute(
            """
            UPDATE incomes
            SET
                description = ?,
                amount = ?,
                source = ?,
                date = ?
            WHERE id = ? AND user_id = ?
            """,
            (
                income.description,
                income.amount,
                income.source,
                income.date.isoformat(),
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
            WHERE id = ? AND user_id = ?
            """,
            (income_id, user_id),
        )

        return cursor.rowcount > 0