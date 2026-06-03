from fastapi import APIRouter, Depends, Query, Request, Response, status

from app.auth import (
    clear_refresh_token_cookie,
    create_refresh_token_session,
    get_current_user,
    get_optional_refresh_token_from_cookie,
    get_refresh_token_from_cookie,
    set_refresh_token_cookie,
)
from app.auth_service import (
    delete_current_user_account,
    login_user,
    login_with_google,
    logout_refresh_session,
    refresh_user_session,
    register_user,
    request_password_reset,
    resend_verification_email,
    reset_user_password,
    verify_user_email,
)
from app.business_routes import router as business_router
from app.billing_routes import router as billing_router
from app.schemas import (
    AuthLoginRequest,
    AuthRegisterRequest,
    AuthResponse,
    CreditCardCreate,
    CreditCardResponse,
    CreditCardUpdate,
    DeleteAccountRequest,
    ExpenseCategoryCreate,
    ExpenseCategoryResponse,
    ExpenseCategoryUpdate,
    ExpenseCreate,
    ExpenseResponse,
    ExpenseUpdate,
    ForgotPasswordRequest,
    GoogleLoginRequest,
    HealthResponse,
    IncomeCreate,
    IncomeResponse,
    IncomeUpdate,
    MessageResponse,
    ResendVerificationEmailRequest,
    ResetPasswordRequest,
    SubscriptionCheckoutResponse,
    SubscriptionStatusResponse,
    SubscriptionWebhookResponse,
    UserSettingsResponse,
    UserSettingsUpdate,
    UserResponse,
    VerifyEmailRequest,
)
from app.security import auth_rate_limit, write_rate_limit
from app.services import (
    create_credit_card,
    create_expense,
    create_expense_category,
    create_income,
    delete_credit_card,
    delete_expense,
    delete_expense_category,
    delete_income,
    get_app_status,
    get_user_settings,
    list_credit_cards,
    list_expense_categories,
    list_expenses,
    list_incomes,
    update_credit_card,
    update_expense,
    update_expense_category,
    update_income,
    update_user_settings,
)
from app.subscription_service import (
    create_subscription_checkout,
    get_subscription_status,
    handle_mercado_pago_webhook,
    refresh_subscription_from_provider,
    start_trial,
)
from app.subscription_dependencies import require_active_subscription

router = APIRouter()
router.include_router(billing_router)
router.include_router(business_router)


def attach_refresh_cookie(response: Response, user_id: str) -> None:
    refresh_token = create_refresh_token_session(user_id)
    set_refresh_token_cookie(response, refresh_token)


@router.get(
    "/health",
    response_model=HealthResponse,
    tags=["Health"],
)
def health_check():
    return get_app_status()


@router.post(
    "/auth/register",
    response_model=MessageResponse,
    status_code=status.HTTP_201_CREATED,
    tags=["Auth"],
    dependencies=[Depends(auth_rate_limit)],
)
def register(user_data: AuthRegisterRequest):
    message = register_user(user_data)

    return MessageResponse(message=message)


@router.post(
    "/auth/login",
    response_model=AuthResponse,
    tags=["Auth"],
    dependencies=[Depends(auth_rate_limit)],
)
def login(login_data: AuthLoginRequest, response: Response):
    auth_response = login_user(login_data)
    attach_refresh_cookie(response, auth_response.user.id)

    return auth_response


@router.post(
    "/auth/google",
    response_model=AuthResponse,
    tags=["Auth"],
    dependencies=[Depends(auth_rate_limit)],
)
def google_login(login_data: GoogleLoginRequest, response: Response):
    auth_response = login_with_google(login_data)
    attach_refresh_cookie(response, auth_response.user.id)

    return auth_response


@router.post(
    "/auth/verify-email",
    response_model=AuthResponse,
    tags=["Auth"],
    dependencies=[Depends(auth_rate_limit)],
)
def verify_email(verification_data: VerifyEmailRequest, response: Response):
    auth_response = verify_user_email(verification_data)
    attach_refresh_cookie(response, auth_response.user.id)

    return auth_response


@router.post(
    "/auth/resend-verification-email",
    response_model=MessageResponse,
    tags=["Auth"],
    dependencies=[Depends(auth_rate_limit)],
)
def resend_email_verification(data: ResendVerificationEmailRequest):
    message = resend_verification_email(data)

    return MessageResponse(message=message)


@router.post(
    "/auth/refresh",
    response_model=AuthResponse,
    tags=["Auth"],
    dependencies=[Depends(auth_rate_limit)],
)
def refresh_session(request: Request, response: Response):
    current_refresh_token = get_refresh_token_from_cookie(request)
    auth_response = refresh_user_session(current_refresh_token)
    attach_refresh_cookie(response, auth_response.user.id)

    return auth_response


@router.post(
    "/auth/logout",
    status_code=status.HTTP_204_NO_CONTENT,
    tags=["Auth"],
)
def logout(request: Request, response: Response):
    refresh_token = get_optional_refresh_token_from_cookie(request)
    logout_refresh_session(refresh_token)
    clear_refresh_token_cookie(response)

    return None


@router.post(
    "/auth/forgot-password",
    response_model=MessageResponse,
    tags=["Auth"],
    dependencies=[Depends(auth_rate_limit)],
)
def forgot_password(reset_data: ForgotPasswordRequest):
    message = request_password_reset(reset_data)

    return MessageResponse(message=message)


@router.post(
    "/auth/reset-password",
    response_model=MessageResponse,
    tags=["Auth"],
    dependencies=[Depends(auth_rate_limit)],
)
def reset_password(reset_data: ResetPasswordRequest):
    reset_user_password(reset_data)

    return MessageResponse(message="Senha alterada com sucesso. Faça login novamente.")


@router.get(
    "/auth/me",
    response_model=UserResponse,
    tags=["Auth"],
)
def get_me(current_user: UserResponse = Depends(get_current_user)):
    return current_user


@router.get(
    "/subscription/status",
    response_model=SubscriptionStatusResponse,
    tags=["Subscription"],
)
def read_subscription_status(
    current_user: UserResponse = Depends(get_current_user),
):
    return get_subscription_status(current_user)


@router.post(
    "/subscription/start-trial",
    response_model=SubscriptionStatusResponse,
    tags=["Subscription"],
    dependencies=[Depends(write_rate_limit)],
)
def start_subscription_trial(
    current_user: UserResponse = Depends(get_current_user),
):
    return start_trial(current_user)


@router.post(
    "/subscription/checkout",
    response_model=SubscriptionCheckoutResponse,
    tags=["Subscription"],
    dependencies=[Depends(write_rate_limit)],
)
def create_checkout(
    current_user: UserResponse = Depends(get_current_user),
):
    return create_subscription_checkout(current_user)


@router.post(
    "/subscription/refresh",
    response_model=SubscriptionStatusResponse,
    tags=["Subscription"],
    dependencies=[Depends(write_rate_limit)],
)
def refresh_subscription(
    current_user: UserResponse = Depends(get_current_user),
):
    return refresh_subscription_from_provider(current_user)


@router.post(
    "/webhooks/mercado-pago",
    response_model=SubscriptionWebhookResponse,
    tags=["Subscription"],
)
async def mercado_pago_webhook(request: Request):
    try:
        payload = await request.json()
    except ValueError:
        payload = {}

    query = {key: value for key, value in request.query_params.items()}
    headers = {key.lower(): value for key, value in request.headers.items()}
    handle_mercado_pago_webhook(payload, query, headers)

    return SubscriptionWebhookResponse()


@router.get(
    "/user-settings",
    response_model=UserSettingsResponse,
    tags=["User Settings"],
)
def read_user_settings(
    current_user: UserResponse = Depends(get_current_user),
):
    return get_user_settings(current_user.id)


@router.put(
    "/user-settings",
    response_model=UserSettingsResponse,
    tags=["User Settings"],
    dependencies=[Depends(write_rate_limit)],
)
def save_user_settings(
    settings_data: UserSettingsUpdate,
    current_user: UserResponse = Depends(get_current_user),
):
    return update_user_settings(settings_data, current_user.id)


@router.delete(
    "/auth/account",
    response_model=MessageResponse,
    tags=["Auth"],
    dependencies=[Depends(write_rate_limit)],
)
def delete_account(
    delete_data: DeleteAccountRequest,
    request: Request,
    response: Response,
    current_user: UserResponse = Depends(get_current_user),
):
    message = delete_current_user_account(current_user.id, delete_data)

    refresh_token = get_optional_refresh_token_from_cookie(request)
    logout_refresh_session(refresh_token)
    clear_refresh_token_cookie(response)

    return MessageResponse(message=message)


@router.get(
    "/expense-categories",
    response_model=list[ExpenseCategoryResponse],
    tags=["Expense Categories"],
)
def get_expense_categories(
    current_user: UserResponse = Depends(require_active_subscription),
):
    return list_expense_categories(current_user.id)


@router.post(
    "/expense-categories",
    response_model=ExpenseCategoryResponse,
    status_code=status.HTTP_201_CREATED,
    tags=["Expense Categories"],
    dependencies=[Depends(write_rate_limit)],
)
def add_expense_category(
    category_data: ExpenseCategoryCreate,
    current_user: UserResponse = Depends(require_active_subscription),
):
    return create_expense_category(category_data, current_user.id)


@router.put(
    "/expense-categories/{category_id}",
    response_model=ExpenseCategoryResponse,
    tags=["Expense Categories"],
    dependencies=[Depends(write_rate_limit)],
)
def edit_expense_category(
    category_id: str,
    category_data: ExpenseCategoryUpdate,
    current_user: UserResponse = Depends(require_active_subscription),
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
    dependencies=[Depends(write_rate_limit)],
)
def remove_expense_category(
    category_id: str,
    current_user: UserResponse = Depends(require_active_subscription),
):
    delete_expense_category(category_id, current_user.id)

    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.get(
    "/credit-cards",
    response_model=list[CreditCardResponse],
    tags=["Credit Cards"],
)
def get_credit_cards(
    current_user: UserResponse = Depends(require_active_subscription),
):
    return list_credit_cards(current_user.id)


@router.post(
    "/credit-cards",
    response_model=CreditCardResponse,
    status_code=status.HTTP_201_CREATED,
    tags=["Credit Cards"],
    dependencies=[Depends(write_rate_limit)],
)
def add_credit_card(
    card_data: CreditCardCreate,
    current_user: UserResponse = Depends(require_active_subscription),
):
    return create_credit_card(card_data, current_user.id)


@router.put(
    "/credit-cards/{card_id}",
    response_model=CreditCardResponse,
    tags=["Credit Cards"],
    dependencies=[Depends(write_rate_limit)],
)
def edit_credit_card(
    card_id: str,
    card_data: CreditCardUpdate,
    current_user: UserResponse = Depends(require_active_subscription),
):
    return update_credit_card(card_id, card_data, current_user.id)


@router.delete(
    "/credit-cards/{card_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    tags=["Credit Cards"],
    dependencies=[Depends(write_rate_limit)],
)
def remove_credit_card(
    card_id: str,
    delete_linked_expenses: bool = Query(default=False),
    current_user: UserResponse = Depends(require_active_subscription),
):
    delete_credit_card(
        card_id=card_id,
        user_id=current_user.id,
        delete_linked_expenses=delete_linked_expenses,
    )

    return Response(status_code=status.HTTP_204_NO_CONTENT)

@router.get(
    "/expenses",
    response_model=list[ExpenseResponse],
    tags=["Expenses"],
)
def get_expenses(
    current_user: UserResponse = Depends(require_active_subscription),
):
    return list_expenses(current_user.id)


@router.post(
    "/expenses",
    response_model=ExpenseResponse,
    status_code=status.HTTP_201_CREATED,
    tags=["Expenses"],
    dependencies=[Depends(write_rate_limit)],
)
def add_expense(
    expense_data: ExpenseCreate,
    current_user: UserResponse = Depends(require_active_subscription),
):
    return create_expense(expense_data, current_user.id)


@router.put(
    "/expenses/{expense_id}",
    response_model=ExpenseResponse,
    tags=["Expenses"],
    dependencies=[Depends(write_rate_limit)],
)
def edit_expense(
    expense_id: str,
    expense_data: ExpenseUpdate,
    current_user: UserResponse = Depends(require_active_subscription),
):
    return update_expense(expense_id, expense_data, current_user.id)


@router.delete(
    "/expenses/{expense_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    tags=["Expenses"],
    dependencies=[Depends(write_rate_limit)],
)
def remove_expense(
    expense_id: str,
    current_user: UserResponse = Depends(require_active_subscription),
):
    delete_expense(expense_id, current_user.id)

    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.get(
    "/incomes",
    response_model=list[IncomeResponse],
    tags=["Incomes"],
)
def get_incomes(
    current_user: UserResponse = Depends(require_active_subscription),
):
    return list_incomes(current_user.id)


@router.post(
    "/incomes",
    response_model=IncomeResponse,
    status_code=status.HTTP_201_CREATED,
    tags=["Incomes"],
    dependencies=[Depends(write_rate_limit)],
)
def add_income(
    income_data: IncomeCreate,
    current_user: UserResponse = Depends(require_active_subscription),
):
    return create_income(income_data, current_user.id)


@router.put(
    "/incomes/{income_id}",
    response_model=IncomeResponse,
    tags=["Incomes"],
    dependencies=[Depends(write_rate_limit)],
)
def edit_income(
    income_id: str,
    income_data: IncomeUpdate,
    current_user: UserResponse = Depends(require_active_subscription),
):
    return update_income(income_id, income_data, current_user.id)


@router.delete(
    "/incomes/{income_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    tags=["Incomes"],
    dependencies=[Depends(write_rate_limit)],
)
def remove_income(
    income_id: str,
    current_user: UserResponse = Depends(require_active_subscription),
):
    delete_income(income_id, current_user.id)

    return Response(status_code=status.HTTP_204_NO_CONTENT)
