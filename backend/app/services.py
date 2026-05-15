from datetime import datetime, timezone
from uuid import uuid4

from fastapi import HTTPException, status

from app.schemas import (
    ExpenseCreate,
    ExpenseRecord,
    ExpenseResponse,
    ExpenseUpdate,
    IncomeCreate,
    IncomeRecord,
    IncomeResponse,
    IncomeUpdate,
)
from app.storage import (
    create_expense_record,
    create_income_record,
    delete_expense_record,
    delete_income_record,
    get_expense_record_by_id,
    get_income_record_by_id,
    list_expense_records,
    list_income_records,
    update_expense_record,
    update_income_record,
)


def get_app_status() -> dict:
    return {
        "status": "ok",
        "message": "API funcionando",
    }


def list_expenses(user_id: str) -> list[ExpenseResponse]:
    records = list_expense_records(user_id)

    return [to_expense_response(record) for record in records]


def create_expense(
    expense_data: ExpenseCreate,
    user_id: str,
) -> ExpenseResponse:
    new_expense = ExpenseRecord(
        id=str(uuid4()),
        user_id=user_id,
        description=expense_data.description,
        amount=round(float(expense_data.amount), 2),
        category=expense_data.category,
        date=expense_data.date,
        created_at=datetime.now(timezone.utc),
    )

    created_expense = create_expense_record(new_expense)

    return to_expense_response(created_expense)


def update_expense(
    expense_id: str,
    expense_data: ExpenseUpdate,
    user_id: str,
) -> ExpenseResponse:
    current_expense = get_expense_record_by_id(expense_id, user_id)

    if current_expense is None:
        raise_not_found_error("Gasto não encontrado.")

    updated_expense = ExpenseRecord(
        id=current_expense.id,
        user_id=current_expense.user_id,
        description=expense_data.description,
        amount=round(float(expense_data.amount), 2),
        category=expense_data.category,
        date=expense_data.date,
        created_at=current_expense.created_at,
    )

    saved_expense = update_expense_record(updated_expense)

    return to_expense_response(saved_expense)


def delete_expense(expense_id: str, user_id: str) -> None:
    deleted = delete_expense_record(expense_id, user_id)

    if not deleted:
        raise_not_found_error("Gasto não encontrado.")


def list_incomes(user_id: str) -> list[IncomeResponse]:
    records = list_income_records(user_id)

    return [to_income_response(record) for record in records]


def create_income(
    income_data: IncomeCreate,
    user_id: str,
) -> IncomeResponse:
    new_income = IncomeRecord(
        id=str(uuid4()),
        user_id=user_id,
        description=income_data.description,
        amount=round(float(income_data.amount), 2),
        source=income_data.source,
        date=income_data.date,
        created_at=datetime.now(timezone.utc),
    )

    created_income = create_income_record(new_income)

    return to_income_response(created_income)


def update_income(
    income_id: str,
    income_data: IncomeUpdate,
    user_id: str,
) -> IncomeResponse:
    current_income = get_income_record_by_id(income_id, user_id)

    if current_income is None:
        raise_not_found_error("Ganho não encontrado.")

    updated_income = IncomeRecord(
        id=current_income.id,
        user_id=current_income.user_id,
        description=income_data.description,
        amount=round(float(income_data.amount), 2),
        source=income_data.source,
        date=income_data.date,
        created_at=current_income.created_at,
    )

    saved_income = update_income_record(updated_income)

    return to_income_response(saved_income)


def delete_income(income_id: str, user_id: str) -> None:
    deleted = delete_income_record(income_id, user_id)

    if not deleted:
        raise_not_found_error("Ganho não encontrado.")


def to_expense_response(expense: ExpenseRecord) -> ExpenseResponse:
    return ExpenseResponse.model_validate(expense.model_dump())


def to_income_response(income: IncomeRecord) -> IncomeResponse:
    return IncomeResponse.model_validate(income.model_dump())


def raise_not_found_error(message: str) -> None:
    raise HTTPException(
        status_code=status.HTTP_404_NOT_FOUND,
        detail=message,
    )