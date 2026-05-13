from datetime import datetime, timezone
from uuid import uuid4

from app.schemas import ExpenseCreate, ExpenseResponse


_expenses: list[ExpenseResponse] = []


def get_app_status() -> dict:
    return {
        "status": "ok",
        "message": "API funcionando",
    }


def create_expense(expense_data: ExpenseCreate) -> ExpenseResponse:
    expense = ExpenseResponse(
        id=str(uuid4()),
        description=expense_data.description,
        amount=expense_data.amount,
        category=expense_data.category,
        date=expense_data.date,
        created_at=datetime.now(timezone.utc),
    )

    _expenses.append(expense)

    return expense


def list_expenses() -> list[ExpenseResponse]:
    return sorted(
        _expenses,
        key=lambda expense: expense.date,
        reverse=True,
    )