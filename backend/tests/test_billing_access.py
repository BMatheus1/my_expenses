from datetime import datetime, timedelta, timezone
from uuid import uuid4

from fastapi.testclient import TestClient

from app.billing_repository import upsert_user_subscription
from app.billing_schemas import UserSubscriptionRecord
from app.billing_service import user_has_paid_access
from app.email_verification_repository import mark_user_email_as_verified
from app.storage import get_user_record_by_email

API_PREFIX = "/api"


def test_user_without_billing_cannot_access_app_data(client: TestClient) -> None:
    token, _user_id = register_user(client, "no-billing@test.com")

    response = client.get(
        f"{API_PREFIX}/expenses",
        headers=auth_headers(token),
    )

    assert response.status_code == 402


def test_trialing_user_with_valid_trial_has_access(client: TestClient) -> None:
    _token, user_id = register_user(client, "trialing@test.com")
    save_subscription(user_id, "trialing", trial_days=30)

    assert user_has_paid_access(user_id) is True


def test_expired_trialing_user_loses_access(client: TestClient) -> None:
    _token, user_id = register_user(client, "expired-trial@test.com")
    save_subscription(user_id, "trialing", trial_days=-1)

    assert user_has_paid_access(user_id) is False


def test_active_user_has_access(client: TestClient) -> None:
    _token, user_id = register_user(client, "active-billing@test.com")
    save_subscription(user_id, "active")

    assert user_has_paid_access(user_id) is True


def test_checkout_requires_authenticated_user(client: TestClient) -> None:
    response = client.post(f"{API_PREFIX}/billing/checkout")

    assert response.status_code in {401, 403}


def test_cancel_requires_authenticated_user(client: TestClient) -> None:
    response = client.post(f"{API_PREFIX}/billing/cancel")

    assert response.status_code in {401, 403}


def test_billing_webhook_duplicate_is_idempotent(client: TestClient) -> None:
    payload = {
        "id": "evt-test-duplicate",
        "type": "preapproval",
    }

    first_response = client.post(
        f"{API_PREFIX}/billing/webhook/mercado-pago",
        json=payload,
    )
    second_response = client.post(
        f"{API_PREFIX}/billing/webhook/mercado-pago",
        json=payload,
    )

    assert first_response.status_code == 200
    assert first_response.json()["duplicate"] is False
    assert second_response.status_code == 200
    assert second_response.json()["duplicate"] is True


def register_user(client: TestClient, email: str) -> tuple[str, str]:
    response = client.post(
        f"{API_PREFIX}/auth/register",
        json={
            "name": "Usuário Billing",
            "email": email,
            "password": "Senha12345",
            "confirm_password": "Senha12345",
            "terms_accepted": True,
        },
    )

    assert response.status_code == 201, response.text

    user = get_user_record_by_email(email)
    assert user is not None

    mark_user_email_as_verified(user.id)

    login_response = client.post(
        f"{API_PREFIX}/auth/login",
        json={
            "email": email,
            "password": "Senha12345",
        },
    )

    assert login_response.status_code == 200, login_response.text

    return login_response.json()["access_token"], user.id


def auth_headers(token: str) -> dict[str, str]:
    return {
        "Authorization": f"Bearer {token}",
    }


def save_subscription(
    user_id: str,
    billing_status: str,
    trial_days: int | None = None,
) -> None:
    now = datetime.now(timezone.utc)
    trial_starts_at = now if trial_days is not None else None
    trial_ends_at = (
        now + timedelta(days=trial_days) if trial_days is not None else None
    )

    upsert_user_subscription(
        UserSubscriptionRecord(
            id=str(uuid4()),
            user_id=user_id,
            provider="mercado_pago",
            provider_subscription_id=None,
            provider_payment_id=None,
            status=billing_status,
            plan_name="My Expenses Premium",
            amount=8.99,
            currency="BRL",
            trial_starts_at=trial_starts_at,
            trial_ends_at=trial_ends_at,
            current_period_starts_at=None,
            current_period_ends_at=None,
            canceled_at=None,
            checkout_url=None,
            created_at=now,
            updated_at=now,
        )
    )
