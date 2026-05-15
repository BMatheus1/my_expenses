import json
import sqlite3
from pathlib import Path

from app.config import settings
from app.schemas import ExpenseRecord, ExpenseResponse, IncomeRecord, UserRecord


def get_database_path() -> Path:
    return settings.database_file_path


def get_connection() -> sqlite3.Connection:
    database_path = get_database_path()
    database_path.parent.mkdir(parents=True, exist_ok=True)

    connection = sqlite3.connect(database_path)
    connection.row_factory = sqlite3.Row

    return connection


def initialize_database() -> None:
    with get_connection() as connection:
        create_users_table(connection)
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


def create_expenses_table(connection: sqlite3.Connection) -> None:
    connection.execute(
        """
        CREATE TABLE IF NOT EXISTS expenses (
            id TEXT PRIMARY KEY,
            user_id TEXT,
            description TEXT NOT NULL,
            amount REAL NOT NULL,
            category TEXT NOT NULL,
            date TEXT NOT NULL,
            created_at TEXT NOT NULL
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
            created_at TEXT NOT NULL
        )
        """
    )


def ensure_expenses_user_id_column(connection: sqlite3.Connection) -> None:
    columns = get_table_columns(connection, "expenses")

    if "user_id" not in columns:
        connection.execute("ALTER TABLE expenses ADD COLUMN user_id TEXT")


def get_table_columns(connection: sqlite3.Connection, table_name: str) -> set[str]:
    rows = connection.execute(f"PRAGMA table_info({table_name})").fetchall()
    return {row["name"] for row in rows}


def migrate_legacy_json_to_sqlite() -> None:
    legacy_json_path = settings.legacy_json_file_path

    if not legacy_json_path.exists():
        return

    with get_connection() as connection:
        expenses_count = connection.execute(
            "SELECT COUNT(*) FROM expenses"
        ).fetchone()[0]

        if expenses_count > 0:
            return

        raw_content = legacy_json_path.read_text(encoding="utf-8").strip()

        if not raw_content:
            return

        legacy_expenses = json.loads(raw_content)

        for item in legacy_expenses:
            expense = ExpenseResponse.model_validate(item)

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
                    None,
                    expense.description,
                    expense.amount,
                    expense.category,
                    expense.date.isoformat(),
                    expense.created_at.isoformat(),
                ),
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
            (email,),
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
            "DELETE FROM expenses WHERE id = ? AND user_id = ?",
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
            "DELETE FROM incomes WHERE id = ? AND user_id = ?",
            (income_id, user_id),
        )

        return cursor.rowcount > 0