from fastapi import APIRouter, Response, status

from app.schemas import (
    ExpenseCreate,
    ExpenseResponse,
    ExpenseUpdate,
    HealthResponse,
)
from app.services import (
    create_expense,
    delete_expense,
    get_app_status,
    list_expenses,
    update_expense,
)

router = APIRouter()


@router.get(
    "/health",
    response_model=HealthResponse,
    tags=["Health"],
)
def health_check():
    return get_app_status()


@router.get(
    "/expenses",
    response_model=list[ExpenseResponse],
    tags=["Expenses"],
)
def get_expenses():
    return list_expenses()


@router.post(
    "/expenses",
    response_model=ExpenseResponse,
    status_code=status.HTTP_201_CREATED,
    tags=["Expenses"],
)
def add_expense(expense_data: ExpenseCreate):
    return create_expense(expense_data)


@router.put(
    "/expenses/{expense_id}",
    response_model=ExpenseResponse,
    tags=["Expenses"],
)
def edit_expense(expense_id: str, expense_data: ExpenseUpdate):
    return update_expense(expense_id, expense_data)


@router.delete(
    "/expenses/{expense_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    tags=["Expenses"],
)
def remove_expense(expense_id: str):
    delete_expense(expense_id)
    return Response(status_code=status.HTTP_204_NO_CONTENT)