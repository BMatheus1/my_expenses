from fastapi import APIRouter, Depends, Request

from app.auth import get_current_user
from app.billing_schemas import (
    BillingCheckoutResponse,
    BillingStatusResponse,
    BillingWebhookResponse,
)
from app.billing_service import (
    cancel_subscription,
    create_checkout,
    get_billing_status,
    handle_mercado_pago_webhook,
)
from app.schemas import UserResponse
from app.security import write_rate_limit

router = APIRouter(prefix="/billing", tags=["Billing"])


@router.get("/me", response_model=BillingStatusResponse)
def read_billing_status(
    current_user: UserResponse = Depends(get_current_user),
):
    return get_billing_status(current_user)


@router.post(
    "/checkout",
    response_model=BillingCheckoutResponse,
    dependencies=[Depends(write_rate_limit)],
)
def create_billing_checkout(
    current_user: UserResponse = Depends(get_current_user),
):
    return create_checkout(current_user)


@router.post(
    "/cancel",
    response_model=BillingStatusResponse,
    dependencies=[Depends(write_rate_limit)],
)
def cancel_billing_subscription(
    current_user: UserResponse = Depends(get_current_user),
):
    return cancel_subscription(current_user)


@router.post(
    "/webhook/mercado-pago",
    response_model=BillingWebhookResponse,
)
async def mercado_pago_billing_webhook(request: Request):
    try:
        payload = await request.json()
    except ValueError:
        payload = {}

    query = {key: value for key, value in request.query_params.items()}
    headers = {key.lower(): value for key, value in request.headers.items()}

    return handle_mercado_pago_webhook(payload, query, headers)
