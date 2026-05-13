from datetime import datetime, timezone
from uuid import uuid4

from fastapi import HTTPException, status

from app.schemas import ExpenseCreate, ExpenseResponse, ExpenseUpdate
from app.storage import read_expenses, write_expenses


def get_app_status() -> dict:
    return {
        "status": "ok",
        "message": "API funcionando",
    }


def list_expenses() -> list[ExpenseResponse]:
    return read_expenses()


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


def update_expense(
    expense_id: str,
    expense_data: ExpenseUpdate,
) -> ExpenseResponse:
    expenses = read_expenses()

    for index, expense in enumerate(expenses):
        if expense.id == expense_id:
            updated_expense = ExpenseResponse(
                id=expense.id,
                description=expense_data.description,
                amount=round(float(expense_data.amount), 2),
                category=expense_data.category,
                date=expense_data.date,
                created_at=expense.created_at,
            )

            expenses[index] = updated_expense
            write_expenses(expenses)

            return updated_expense

    raise HTTPException(
        status_code=status.HTTP_404_NOT_FOUND,
        detail="Gasto não encontrado.",
    )


def delete_expense(expense_id: str) -> None:
    expenses = read_expenses()
    updated_expenses = [
        expense for expense in expenses if expense.id != expense_id
    ]

    if len(updated_expenses) == len(expenses):
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Gasto não encontrado.",
        )

    write_expenses(updated_expenses)