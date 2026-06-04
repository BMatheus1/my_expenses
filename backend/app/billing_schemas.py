from datetime import datetime
from typing import Any, Literal

from pydantic import BaseModel, ConfigDict


BillingStatus = Literal[
    "none",
    "trialing",
    "active",
    "pending",
    "past_due",
    "blocked",
    "canceled",
    "expired",
    "unknown",
]

PaymentStatus = Literal[
    "pending",
    "paid",
    "overdue",
    "failed",
    "refunded",
    "canceled",
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
    payment_status: PaymentStatus = "pending"
    plan_name: str = "My Expenses Premium"
    amount: float = 8.99
    currency: str = "BRL"
    trial_starts_at: datetime | None = None
    trial_ends_at: datetime | None = None
    current_period_starts_at: datetime | None = None
    current_period_ends_at: datetime | None = None
    next_payment_at: datetime | None = None
    last_payment_at: datetime | None = None
    last_payment_status: str | None = None
    overdue_since: datetime | None = None
    grace_period_ends_at: datetime | None = None
    blocked_at: datetime | None = None
    block_reason: str | None = None
    canceled_at: datetime | None = None
    cancel_reason: str | None = None
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
    payment_status: PaymentStatus = "pending"
    plan_name: str = "My Expenses Premium"
    amount: float = 8.99
    currency: str = "BRL"
    trial_starts_at: datetime | None = None
    trial_ends_at: datetime | None = None
    days_left_in_trial: int | None = None
    current_period_starts_at: datetime | None = None
    current_period_ends_at: datetime | None = None
    next_payment_at: datetime | None = None
    last_payment_at: datetime | None = None
    overdue_since: datetime | None = None
    grace_period_ends_at: datetime | None = None
    days_until_block: int | None = None
    blocked_at: datetime | None = None
    block_reason: str | None = None
    canceled_at: datetime | None = None
    provider_subscription_id: str | None = None
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
