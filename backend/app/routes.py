from fastapi import APIRouter, Depends, Response, status
from app.auth import get_current_user
from app.auth_service import login_user, login_with_google, register_user
from app.business_routes import router as business_router

from app.schemas import (
    AuthLoginRequest,
    AuthRegisterRequest,
    AuthResponse,
    ExpenseCategoryCreate,
    ExpenseCategoryResponse,
    ExpenseCategoryUpdate,
    ExpenseCreate,
    ExpenseResponse,
    ExpenseUpdate,
    GoogleLoginRequest,
    HealthResponse,
    IncomeCreate,
    IncomeResponse,
    IncomeUpdate,
    UserResponse,
)
from app.services import (
    create_expense,
    create_expense_category,
    create_income,
    delete_expense,
    delete_expense_category,
    delete_income,
    get_app_status,
    list_expense_categories,
    list_expenses,
    list_incomes,
    update_expense,
    update_expense_category,
    update_income,
)

router = APIRouter()
router.include_router(business_router)

@router.get(
    "/health",
    response_model=HealthResponse,
    tags=["Health"],
)
def health_check():
    return get_app_status()


@router.post(
    "/auth/register",
    response_model=AuthResponse,
    status_code=status.HTTP_201_CREATED,
    tags=["Auth"],
)
def register(user_data: AuthRegisterRequest):
    return register_user(user_data)


@router.post(
    "/auth/login",
    response_model=AuthResponse,
    tags=["Auth"],
)
def login(login_data: AuthLoginRequest):
    return login_user(login_data)


@router.post(
    "/auth/google",
    response_model=AuthResponse,
    tags=["Auth"],
)
def google_login(login_data: GoogleLoginRequest):
    return login_with_google(login_data)


@router.get(
    "/auth/me",
    response_model=UserResponse,
    tags=["Auth"],
)
def get_me(current_user: UserResponse = Depends(get_current_user)):
    return current_user


@router.get(
    "/expense-categories",
    response_model=list[ExpenseCategoryResponse],
    tags=["Expense Categories"],
)
def get_expense_categories(
    current_user: UserResponse = Depends(get_current_user),
):
    return list_expense_categories(current_user.id)


@router.post(
    "/expense-categories",
    response_model=ExpenseCategoryResponse,
    status_code=status.HTTP_201_CREATED,
    tags=["Expense Categories"],
)
def add_expense_category(
    category_data: ExpenseCategoryCreate,
    current_user: UserResponse = Depends(get_current_user),
):
    return create_expense_category(category_data, current_user.id)


@router.put(
    "/expense-categories/{category_id}",
    response_model=ExpenseCategoryResponse,
    tags=["Expense Categories"],
)
def edit_expense_category(
    category_id: str,
    category_data: ExpenseCategoryUpdate,
    current_user: UserResponse = Depends(get_current_user),
):
    return update_expense_category(
        category_id=category_id,
        category_data=category_data,
        user_id=current_user.id,
    )


@router.delete(
    "/expense-categories/{category_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    tags=["Expense Categories"],
)
def remove_expense_category(
    category_id: str,
    current_user: UserResponse = Depends(get_current_user),
):
    delete_expense_category(category_id, current_user.id)

    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.get(
    "/expenses",
    response_model=list[ExpenseResponse],
    tags=["Expenses"],
)
def get_expenses(current_user: UserResponse = Depends(get_current_user)):
    return list_expenses(current_user.id)


@router.post(
    "/expenses",
    response_model=ExpenseResponse,
    status_code=status.HTTP_201_CREATED,
    tags=["Expenses"],
)
def add_expense(
    expense_data: ExpenseCreate,
    current_user: UserResponse = Depends(get_current_user),
):
    return create_expense(expense_data, current_user.id)


@router.put(
    "/expenses/{expense_id}",
    response_model=ExpenseResponse,
    tags=["Expenses"],
)
def edit_expense(
    expense_id: str,
    expense_data: ExpenseUpdate,
    current_user: UserResponse = Depends(get_current_user),
):
    return update_expense(expense_id, expense_data, current_user.id)


@router.delete(
    "/expenses/{expense_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    tags=["Expenses"],
)
def remove_expense(
    expense_id: str,
    current_user: UserResponse = Depends(get_current_user),
):
    delete_expense(expense_id, current_user.id)

    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.get(
    "/incomes",
    response_model=list[IncomeResponse],
    tags=["Incomes"],
)
def get_incomes(current_user: UserResponse = Depends(get_current_user)):
    return list_incomes(current_user.id)


@router.post(
    "/incomes",
    response_model=IncomeResponse,
    status_code=status.HTTP_201_CREATED,
    tags=["Incomes"],
)
def add_income(
    income_data: IncomeCreate,
    current_user: UserResponse = Depends(get_current_user),
):
    return create_income(income_data, current_user.id)


@router.put(
    "/incomes/{income_id}",
    response_model=IncomeResponse,
    tags=["Incomes"],
)
def edit_income(
    income_id: str,
    income_data: IncomeUpdate,
    current_user: UserResponse = Depends(get_current_user),
):
    return update_income(income_id, income_data, current_user.id)


@router.delete(
    "/incomes/{income_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    tags=["Incomes"],
)
def remove_income(
    income_id: str,
    current_user: UserResponse = Depends(get_current_user),
):
    delete_income(income_id, current_user.id)

    return Response(status_code=status.HTTP_204_NO_CONTENT)