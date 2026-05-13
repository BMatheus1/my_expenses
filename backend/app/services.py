from datetime import datetime, timezone
from uuid import uuid4

from app.schemas import ExpenseCreate, ExpenseResponse
from app.storage import read_expenses, write_expenses


def get_app_status() -> dict:
    return {
        "status": "ok",
        "message": "API funcionando",
    }


def create_expense(expense_data: ExpenseCreate) -> ExpenseResponse:
    new_expense = ExpenseResponse(
        id=str(uuid4()),
        description=expense_data.description,
        amount=round(float(expense_data.amount), 2),
        category=expense_data.category,
        date=expense_data.date,
        created_at=datetime.now(timezone.utc),
    )

    expenses = read_expenses()
    expenses.insert(0, new_expense)

    write_expenses(expenses)

    return new_expense


def list_expenses() -> list[ExpenseResponse]:
    return read_expenses()