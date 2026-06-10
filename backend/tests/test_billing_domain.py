from datetime import datetime, timedelta, timezone
from uuid import uuid4

import pytest

from app.billing_domain import get_billing_message, subscription_allows_access
from app.billing_schemas import BillingStatus, UserSubscriptionRecord


@pytest.mark.parametrize(
    ("billing_status", "trial_days", "grace_days", "expected_access"),
    [
        ("active", None, None, True),
        ("trialing", 30, None, True),
        ("trialing", -1, None, False),
        ("past_due", None, 1, True),
        ("past_due", None, -1, False),
        ("pending", None, None, False),
        ("blocked", None, None, False),
        ("canceled", None, None, False),
        ("expired", None, None, False),
        ("unknown", None, None, False),
    ],
)
def test_subscription_access_rule_is_centralized(
    billing_status: BillingStatus,
    trial_days: int | None,
    grace_days: int | None,
    expected_access: bool,
) -> None:
    subscription = make_subscription(
        status=billing_status,
        trial_days=trial_days,
        grace_days=grace_days,
    )

    assert subscription_allows_access(subscription) is expected_access


def test_billing_messages_are_domain_specific() -> None:
    pending = make_subscription(status="pending")
    blocked = make_subscription(status="blocked")

    assert pending.status == "pending"
    assert get_billing_message(pending) == (
        "Estamos aguardando a confirmação da sua assinatura."
    )
    assert get_billing_message(blocked) == (
        "Sua assinatura está pausada por pagamento pendente. "
        "Regularize para continuar usando o My Expenses."
    )


def make_subscription(
    status: BillingStatus,
    trial_days: int | None = None,
    grace_days: int | None = None,
) -> UserSubscriptionRecord:
    now = datetime.now(timezone.utc)
    trial_starts_at = now if trial_days is not None else None
    trial_ends_at = (
        now + timedelta(days=trial_days) if trial_days is not None else None
    )
    grace_period_ends_at = (
        now + timedelta(days=grace_days) if grace_days is not None else None
    )

    return UserSubscriptionRecord(
        id=str(uuid4()),
        user_id=str(uuid4()),
        provider="mercado_pago",
        provider_subscription_id=None,
        provider_payment_id=None,
        status=status,
        payment_status="pending",
        plan_name="My Expenses Premium",
        amount=8.99,
        currency="BRL",
        trial_starts_at=trial_starts_at,
        trial_ends_at=trial_ends_at,
        current_period_starts_at=None,
        current_period_ends_at=None,
        next_payment_at=None,
        last_payment_at=None,
        last_payment_status=None,
        overdue_since=None,
        grace_period_ends_at=grace_period_ends_at,
        blocked_at=None,
        block_reason=None,
        canceled_at=None,
        cancel_reason=None,
        checkout_url=None,
        created_at=now,
        updated_at=now,
    )
