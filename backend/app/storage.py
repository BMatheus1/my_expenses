import json
import sqlite3
from pathlib import Path

from app.config import settings
from app.schemas import ExpenseResponse


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
        connection.execute(
            """
            CREATE TABLE IF NOT EXISTS expenses (
                id TEXT PRIMARY KEY,
                description TEXT NOT NULL,
                amount REAL NOT NULL,
                category TEXT NOT NULL,
                date TEXT NOT NULL,
                created_at TEXT NOT NULL
            )
            """
        )

    migrate_legacy_json_to_sqlite()


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
            insert_expense(connection, expense)


def insert_expense(
    connection: sqlite3.Connection,
    expense: ExpenseResponse,
) -> None:
    connection.execute(
        """
        INSERT INTO expenses (
            id,
            description,
            amount,
            category,
            date,
            created_at
        )
        VALUES (?, ?, ?, ?, ?, ?)
        """,
        (
            expense.id,
            expense.description,
            expense.amount,
            expense.category,
            expense.date.isoformat(),
            expense.created_at.isoformat(),
        ),
    )


def list_expense_records() -> list[ExpenseResponse]:
    with get_connection() as connection:
        rows = connection.execute(
            """
            SELECT
                id,
                description,
                amount,
                category,
                date,
                created_at
            FROM expenses
            ORDER BY date DESC, created_at DESC
            """
        ).fetchall()

    return [ExpenseResponse.model_validate(dict(row)) for row in rows]


def get_expense_record_by_id(expense_id: str) -> ExpenseResponse | None:
    with get_connection() as connection:
        row = connection.execute(
            """
            SELECT
                id,
                description,
                amount,
                category,
                date,
                created_at
            FROM expenses
            WHERE id = ?
            """,
            (expense_id,),
        ).fetchone()

    if row is None:
        return None

    return ExpenseResponse.model_validate(dict(row))


def create_expense_record(expense: ExpenseResponse) -> ExpenseResponse:
    with get_connection() as connection:
        insert_expense(connection, expense)

    return expense


def update_expense_record(expense: ExpenseResponse) -> ExpenseResponse:
    with get_connection() as connection:
        connection.execute(
            """
            UPDATE expenses
            SET
                description = ?,
                amount = ?,
                category = ?,
                date = ?
            WHERE id = ?
            """,
            (
                expense.description,
                expense.amount,
                expense.category,
                expense.date.isoformat(),
                expense.id,
            ),
        )

    return expense


def delete_expense_record(expense_id: str) -> bool:
    with get_connection() as connection:
        cursor = connection.execute(
            "DELETE FROM expenses WHERE id = ?",
            (expense_id,),
        )

        return cursor.rowcount > 0