from fastapi import APIRouter, status

from app.schemas import ExpenseCreate, ExpenseResponse, HealthResponse
from app.services import create_expense, get_app_status, list_expenses

router = APIRouter()


@router.get(
    "/health",
    response_model=HealthResponse,
    tags=["Health"],
)
def health_check():
    return get_app_status()


@router.post(
    "/expenses",
    response_model=ExpenseResponse,
    status_code=status.HTTP_201_CREATED,
    tags=["Expenses"],
)
def add_expense(expense_data: ExpenseCreate):
    return create_expense(expense_data)


@router.get(
    "/expenses",
    response_model=list[ExpenseResponse],
    tags=["Expenses"],
)
def get_expenses():
    return list_expenses()