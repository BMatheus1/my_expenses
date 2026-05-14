from datetime import datetime, timezone
from uuid import uuid4

from fastapi import HTTPException, status

from app.schemas import ExpenseCreate, ExpenseResponse, ExpenseUpdate
from app.storage import (
    create_expense_record,
    delete_expense_record,
    get_expense_record_by_id,
    list_expense_records,
    update_expense_record,
)


def get_app_status() -> dict:
    return {
        "status": "ok",
        "message": "API funcionando",
    }


def list_expenses() -> list[ExpenseResponse]:
    return list_expense_records()


def create_expense(expense_data: ExpenseCreate) -> ExpenseResponse:
    new_expense = ExpenseResponse(
        id=str(uuid4()),
        description=expense_data.description,
        amount=round(float(expense_data.amount), 2),
        category=expense_data.category,
        date=expense_data.date,
        created_at=datetime.now(timezone.utc),
    )

    return create_expense_record(new_expense)


def update_expense(
    expense_id: str,
    expense_data: ExpenseUpdate,
) -> ExpenseResponse:
    current_expense = get_expense_record_by_id(expense_id)

    if current_expense is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Gasto não encontrado.",
        )

    updated_expense = ExpenseResponse(
        id=current_expense.id,
        description=expense_data.description,
        amount=round(float(expense_data.amount), 2),
        category=expense_data.category,
        date=expense_data.date,
        created_at=current_expense.created_at,
    )

    return update_expense_record(updated_expense)


def delete_expense(expense_id: str) -> None:
    deleted = delete_expense_record(expense_id)

    if not deleted:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Gasto não encontrado.",
        )