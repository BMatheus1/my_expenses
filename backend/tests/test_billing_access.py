from datetime import datetime, timedelta, timezone
from uuid import uuid4

import pytest
from fastapi.testclient import TestClient

from app.billing_repository import upsert_user_subscription
from app.billing_schemas import UserSubscriptionRecord
from app.billing_service import user_has_paid_access
from app.email_verification_repository import mark_user_email_as_verified
from app.storage import get_user_record_by_email

API_PREFIX = "/api"


@pytest.mark.parametrize(
    ("billing_status", "trial_days", "expected_access"),
    [
        ("pending", None, False),
        ("past_due", None, False),
        ("canceled", None, False),
        ("expired", None, False),
        ("unknown", None, False),
        ("trialing", None, False),
        ("trialing", -1, False),
        ("trialing", 30, True),
        ("active", None, True),
    ],
)
def test_user_has_paid_access_for_billing_statuses(
    client: TestClient,
    billing_status: str,
    trial_days: int | None,
    expected_access: bool,
) -> None:
    _token, user_id = register_user(
        client,
        f"{billing_status}-{trial_days or 'none'}@test.com",
    )
    save_subscription(user_id, billing_status, trial_days=trial_days)

    assert user_has_paid_access(user_id) is expected_access


def test_user_without_subscription_has_no_paid_access(client: TestClient) -> None:
    _token, user_id = register_user(client, "no-subscription@test.com")

    assert user_has_paid_access(user_id) is False


@pytest.mark.parametrize(
    "path",
    [
        "/expenses",
        "/incomes",
        "/credit-cards",
        "/businesses",
    ],
)
def test_user_without_billing_cannot_access_main_routes(
    client: TestClient,
    path: str,
) -> None:
    token, _user_id = register_user(client, f"blocked-{path.strip('/')}@test.com")

    response = client.get(
        f"{API_PREFIX}{path}",
        headers=auth_headers(token),
    )

    assert response.status_code == 402


def test_trialing_user_with_valid_trial_can_access_main_route(
    client: TestClient,
) -> None:
    token, user_id = register_user(client, "trial-main-route@test.com")
    save_subscription(user_id, "trialing", trial_days=30)

    response = client.get(
        f"{API_PREFIX}/expenses",
        headers=auth_headers(token),
    )

    assert response.status_code == 200


def test_active_user_can_access_main_route(client: TestClient) -> None:
    token, user_id = register_user(client, "active-main-route@test.com")
    save_subscription(user_id, "active")

    response = client.get(
        f"{API_PREFIX}/expenses",
        headers=auth_headers(token),
    )

    assert response.status_code == 200


def test_checkout_requires_authenticated_user(client: TestClient) -> None:
    response = client.post(f"{API_PREFIX}/billing/checkout")

    assert response.status_code in {401, 403}


def test_cancel_requires_authenticated_user(client: TestClient) -> None:
    response = client.post(f"{API_PREFIX}/billing/cancel")

    assert response.status_code in {401, 403}


def test_checkout_does_not_grant_access_automatically(
    client: TestClient,
    monkeypatch,
) -> None:
    token, user_id = register_user(client, "checkout-pending@test.com")

    def fake_create_preapproval(payload: dict) -> dict:
        return {
            "id": "preapproval-pending",
            "init_point": "https://www.mercadopago.com.br/checkout",
            "status": "pending",
        }

    monkeypatch.setattr(
        "app.billing_service.create_preapproval",
        fake_create_preapproval,
    )

    checkout_response = client.post(
        f"{API_PREFIX}/billing/checkout",
        headers=auth_headers(token),
    )
    billing_response = client.get(
        f"{API_PREFIX}/billing/me",
        headers=auth_headers(token),
    )

    assert checkout_response.status_code == 200, checkout_response.text
    assert checkout_response.json()["status"] == "pending"
    assert user_has_paid_access(user_id) is False
    assert billing_response.json()["status"] == "pending"
    assert billing_response.json()["is_access_allowed"] is False


def test_billing_me_statuses(client: TestClient) -> None:
    token, user_id = register_user(client, "billing-me-none@test.com")

    empty_response = client.get(
        f"{API_PREFIX}/billing/me",
        headers=auth_headers(token),
    )
    assert empty_response.status_code == 200
    assert empty_response.json()["status"] == "none"
    assert empty_response.json()["is_access_allowed"] is False

    save_subscription(user_id, "trialing", trial_days=30)
    trial_response = client.get(
        f"{API_PREFIX}/billing/me",
        headers=auth_headers(token),
    )
    assert trial_response.json()["status"] == "trialing"
    assert trial_response.json()["is_access_allowed"] is True

    save_subscription(user_id, "active")
    active_response = client.get(
        f"{API_PREFIX}/billing/me",
        headers=auth_headers(token),
    )
    assert active_response.json()["status"] == "active"
    assert active_response.json()["is_access_allowed"] is True

    save_subscription(user_id, "trialing", trial_days=-1)
    expired_response = client.get(
        f"{API_PREFIX}/billing/me",
        headers=auth_headers(token),
    )
    assert expired_response.json()["status"] == "expired"
    assert expired_response.json()["is_access_allowed"] is False


def test_google_login_without_subscription_is_blocked(
    client: TestClient,
    monkeypatch,
) -> None:
    token, _user_id = login_google_user(
        client,
        monkeypatch,
        "google-no-subscription@test.com",
    )

    billing_response = client.get(
        f"{API_PREFIX}/billing/me",
        headers=auth_headers(token),
    )
    expenses_response = client.get(
        f"{API_PREFIX}/expenses",
        headers=auth_headers(token),
    )

    assert billing_response.json()["is_access_allowed"] is False
    assert expenses_response.status_code == 402


@pytest.mark.parametrize(
    ("billing_status", "trial_days", "expected_access"),
    [
        ("trialing", 30, True),
        ("active", None, True),
        ("canceled", None, False),
        ("trialing", -1, False),
    ],
)
def test_google_login_uses_same_billing_access_rule(
    client: TestClient,
    monkeypatch,
    billing_status: str,
    trial_days: int | None,
    expected_access: bool,
) -> None:
    token, user_id = login_google_user(
        client,
        monkeypatch,
        f"google-{billing_status}-{trial_days or 'none'}@test.com",
    )
    save_subscription(user_id, billing_status, trial_days=trial_days)

    billing_response = client.get(
        f"{API_PREFIX}/billing/me",
        headers=auth_headers(token),
    )
    expenses_response = client.get(
        f"{API_PREFIX}/expenses",
        headers=auth_headers(token),
    )

    assert billing_response.json()["is_access_allowed"] is expected_access
    assert expenses_response.status_code == (200 if expected_access else 402)


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
            "name": "Usuario Billing",
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


def login_google_user(
    client: TestClient,
    monkeypatch,
    email: str,
) -> tuple[str, str]:
    mock_google_credential(monkeypatch, email=email)

    response = client.post(
        f"{API_PREFIX}/auth/google",
        json={"credential": "fake-google-login-token"},
    )

    assert response.status_code == 200, response.text

    user = get_user_record_by_email(email)
    assert user is not None

    return response.json()["access_token"], user.id


def mock_google_credential(monkeypatch, email: str) -> None:
    def fake_verify_google_credential(credential: str) -> dict:
        return {
            "email": email,
            "name": "Usuario Google",
            "email_verified": True,
            "iss": "accounts.google.com",
        }

    monkeypatch.setattr(
        "app.auth_service.verify_google_credential",
        fake_verify_google_credential,
    )


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
