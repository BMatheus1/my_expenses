from datetime import datetime
from typing import Any, Literal

from pydantic import BaseModel, ConfigDict


BillingStatus = Literal[
    "trialing",
    "active",
    "pending",
    "past_due",
    "canceled",
    "expired",
    "unknown",
]


class UserSubscriptionRecord(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    user_id: str
    provider: str = "mercado_pago"
    provider_subscription_id: str | None = None
    provider_payment_id: str | None = None
    status: BillingStatus = "pending"
    plan_name: str = "My Expenses Premium"
    amount: float = 8.99
    currency: str = "BRL"
    trial_starts_at: datetime | None = None
    trial_ends_at: datetime | None = None
    current_period_starts_at: datetime | None = None
    current_period_ends_at: datetime | None = None
    canceled_at: datetime | None = None
    checkout_url: str | None = None
    created_at: datetime
    updated_at: datetime


class PaymentEventRecord(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    provider: str
    provider_event_id: str
    event_type: str
    payload: dict[str, Any]
    received_at: datetime


class BillingStatusResponse(BaseModel):
    status: BillingStatus
    plan_name: str = "My Expenses Premium"
    amount: float = 8.99
    currency: str = "BRL"
    trial_ends_at: datetime | None = None
    current_period_ends_at: datetime | None = None
    is_access_allowed: bool
    can_cancel: bool = False
    checkout_url: str | None = None
    message: str


class BillingCheckoutResponse(BaseModel):
    checkout_url: str
    status: BillingStatus
    provider: str = "mercado_pago"
    provider_subscription_id: str | None = None
    message: str


class BillingWebhookResponse(BaseModel):
    received: bool = True
    duplicate: bool = False
    message: str = "Evento recebido."
