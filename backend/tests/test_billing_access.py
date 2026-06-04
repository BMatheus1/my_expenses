from datetime import datetime, timedelta, timezone
from uuid import uuid4

import pytest
from fastapi import HTTPException
from fastapi.testclient import TestClient

from app.billing_repository import get_user_subscription, upsert_user_subscription
from app.billing_schemas import UserSubscriptionRecord
from app.billing_service import user_has_paid_access
from app.email_verification_repository import mark_user_email_as_verified
from app.storage import get_user_record_by_email

API_PREFIX = "/api"


@pytest.mark.parametrize(
    ("billing_status", "trial_days", "expected_access"),
    [
        ("pending", None, False),
        ("past_due", None, True),
        ("blocked", None, False),
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


def test_sync_requires_authenticated_user(client: TestClient) -> None:
    response = client.post(f"{API_PREFIX}/billing/sync")

    assert response.status_code in {401, 403}


def test_cancel_without_subscription_returns_friendly_error(
    client: TestClient,
) -> None:
    token, _user_id = register_user(client, "cancel-no-subscription@test.com")

    response = client.post(
        f"{API_PREFIX}/billing/cancel",
        headers=auth_headers(token),
    )

    assert response.status_code == 409
    assert "assinatura Mercado Pago" in response.json()["detail"]


@pytest.mark.parametrize("billing_status", ["active", "trialing", "pending"])
def test_cancel_subscription_calls_mercado_pago_and_blocks_access(
    client: TestClient,
    monkeypatch,
    billing_status: str,
) -> None:
    token, user_id = register_user(
        client,
        f"cancel-{billing_status}@test.com",
    )
    provider_subscription_id = f"preapproval-cancel-{billing_status}"
    save_subscription(
        user_id,
        billing_status,
        trial_days=30 if billing_status == "trialing" else None,
        provider_subscription_id=provider_subscription_id,
    )
    canceled_provider_ids = []

    def fake_cancel_preapproval(provider_id: str) -> dict:
        canceled_provider_ids.append(provider_id)
        return {
            "id": provider_id,
            "external_reference": user_id,
            "status": "canceled",
        }

    monkeypatch.setattr(
        "app.billing_service.cancel_preapproval",
        fake_cancel_preapproval,
    )

    response = client.post(
        f"{API_PREFIX}/billing/cancel",
        headers=auth_headers(token),
    )

    assert response.status_code == 200, response.text
    assert canceled_provider_ids == [provider_subscription_id]
    assert response.json()["status"] == "canceled"
    assert response.json()["is_access_allowed"] is False
    assert response.json()["can_cancel"] is False
    stored_subscription = get_user_subscription(user_id)
    assert stored_subscription is not None
    assert stored_subscription.status == "canceled"
    assert stored_subscription.canceled_at is not None


def test_cancel_already_canceled_is_idempotent(
    client: TestClient,
    monkeypatch,
) -> None:
    token, user_id = register_user(client, "cancel-idempotent@test.com")
    save_subscription(
        user_id,
        "canceled",
        provider_subscription_id="preapproval-already-canceled",
    )
    cancel_calls = []

    def fake_cancel_preapproval(provider_id: str) -> dict:
        cancel_calls.append(provider_id)
        return {"id": provider_id, "status": "canceled"}

    monkeypatch.setattr(
        "app.billing_service.cancel_preapproval",
        fake_cancel_preapproval,
    )

    response = client.post(
        f"{API_PREFIX}/billing/cancel",
        headers=auth_headers(token),
    )

    assert response.status_code == 200, response.text
    assert response.json()["status"] == "canceled"
    assert response.json()["is_access_allowed"] is False
    assert cancel_calls == []


def test_cancel_mercado_pago_error_does_not_mark_local_canceled(
    client: TestClient,
    monkeypatch,
) -> None:
    token, user_id = register_user(client, "cancel-provider-error@test.com")
    save_subscription(
        user_id,
        "active",
        provider_subscription_id="preapproval-provider-error",
    )

    def fake_cancel_preapproval(_provider_id: str) -> dict:
        raise HTTPException(status_code=502, detail="provider failed")

    monkeypatch.setattr(
        "app.billing_service.cancel_preapproval",
        fake_cancel_preapproval,
    )

    response = client.post(
        f"{API_PREFIX}/billing/cancel",
        headers=auth_headers(token),
    )

    assert response.status_code == 502
    assert response.json()["detail"] == (
        "Não foi possível cancelar agora. Tente novamente em alguns instantes."
    )
    stored_subscription = get_user_subscription(user_id)
    assert stored_subscription is not None
    assert stored_subscription.status == "active"
    assert stored_subscription.canceled_at is None


def test_cancel_only_uses_current_user_subscription(
    client: TestClient,
    monkeypatch,
) -> None:
    token_a, user_a_id = register_user(client, "cancel-current-user-a@test.com")
    _token_b, user_b_id = register_user(client, "cancel-current-user-b@test.com")
    save_subscription(
        user_a_id,
        "active",
        provider_subscription_id="preapproval-current-user-a",
    )
    save_subscription(
        user_b_id,
        "active",
        provider_subscription_id="preapproval-current-user-b",
    )
    canceled_provider_ids = []

    def fake_cancel_preapproval(provider_id: str) -> dict:
        canceled_provider_ids.append(provider_id)
        return {"id": provider_id, "status": "canceled"}

    monkeypatch.setattr(
        "app.billing_service.cancel_preapproval",
        fake_cancel_preapproval,
    )

    response = client.post(
        f"{API_PREFIX}/billing/cancel",
        headers=auth_headers(token_a),
    )

    assert response.status_code == 200, response.text
    assert canceled_provider_ids == ["preapproval-current-user-a"]
    subscription_a = get_user_subscription(user_a_id)
    subscription_b = get_user_subscription(user_b_id)
    assert subscription_a is not None
    assert subscription_a.status == "canceled"
    assert subscription_b is not None
    assert subscription_b.status == "active"


def test_checkout_does_not_grant_access_automatically(
    client: TestClient,
    monkeypatch,
) -> None:
    token, user_id = register_user(client, "checkout-pending@test.com")
    captured_payload: dict = {}

    def fake_create_preapproval(payload: dict) -> dict:
        captured_payload.update(payload)
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
    assert captured_payload["external_reference"] == user_id
    assert captured_payload["back_url"].endswith(
        "/pagamento/retorno?provider=mercado_pago",
    )
    assert user_has_paid_access(user_id) is False
    assert billing_response.json()["status"] == "pending"
    assert billing_response.json()["is_access_allowed"] is False


def test_billing_sync_without_subscription_returns_blocked_none(
    client: TestClient,
) -> None:
    token, _user_id = register_user(client, "sync-no-subscription@test.com")

    response = client.post(
        f"{API_PREFIX}/billing/sync",
        headers=auth_headers(token),
    )

    assert response.status_code == 200, response.text
    assert response.json()["status"] == "none"
    assert response.json()["is_access_allowed"] is False


def test_billing_sync_pending_consults_mercado_pago(
    client: TestClient,
    monkeypatch,
) -> None:
    token, user_id = register_user(client, "sync-pending@test.com")
    provider_subscription_id = "preapproval-sync-pending"
    save_subscription(
        user_id,
        "pending",
        provider_subscription_id=provider_subscription_id,
    )
    fetched_provider_ids = []

    def fake_fetch_preapproval(provider_id: str) -> dict:
        fetched_provider_ids.append(provider_id)
        return {
            "id": provider_id,
            "external_reference": user_id,
            "status": "pending",
        }

    monkeypatch.setattr(
        "app.billing_service.fetch_preapproval",
        fake_fetch_preapproval,
    )

    response = client.post(
        f"{API_PREFIX}/billing/sync",
        headers=auth_headers(token),
    )

    assert response.status_code == 200, response.text
    assert fetched_provider_ids == [provider_subscription_id]
    assert response.json()["status"] == "pending"
    assert response.json()["provider_subscription_id"] == provider_subscription_id
    assert response.json()["is_access_allowed"] is False


def test_billing_sync_valid_provider_status_grants_trial_access(
    client: TestClient,
    monkeypatch,
) -> None:
    token, user_id = register_user(client, "sync-valid@test.com")
    provider_subscription_id = "preapproval-sync-valid"
    save_subscription(
        user_id,
        "pending",
        provider_subscription_id=provider_subscription_id,
    )

    def fake_fetch_preapproval(provider_id: str) -> dict:
        return {
            "id": provider_id,
            "external_reference": user_id,
            "status": "authorized",
        }

    monkeypatch.setattr(
        "app.billing_service.fetch_preapproval",
        fake_fetch_preapproval,
    )

    response = client.post(
        f"{API_PREFIX}/billing/sync",
        headers=auth_headers(token),
    )

    assert response.status_code == 200, response.text
    assert response.json()["status"] == "trialing"
    assert response.json()["is_access_allowed"] is True
    assert response.json()["trial_ends_at"] is not None


def test_billing_sync_unknown_provider_status_stays_blocked(
    client: TestClient,
    monkeypatch,
) -> None:
    token, user_id = register_user(client, "sync-unknown@test.com")
    provider_subscription_id = "preapproval-sync-unknown"
    save_subscription(
        user_id,
        "pending",
        provider_subscription_id=provider_subscription_id,
    )

    def fake_fetch_preapproval(provider_id: str) -> dict:
        return {
            "id": provider_id,
            "external_reference": user_id,
            "status": "surprising_status",
        }

    monkeypatch.setattr(
        "app.billing_service.fetch_preapproval",
        fake_fetch_preapproval,
    )

    response = client.post(
        f"{API_PREFIX}/billing/sync",
        headers=auth_headers(token),
    )

    assert response.status_code == 200, response.text
    assert response.json()["status"] == "unknown"
    assert response.json()["is_access_allowed"] is False


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


def test_billing_me_returns_only_current_user_subscription(
    client: TestClient,
) -> None:
    token_a, user_a_id = register_user(client, "billing-owner-a@test.com")
    token_b, user_b_id = register_user(client, "billing-owner-b@test.com")

    save_subscription(
        user_a_id,
        "active",
        provider_subscription_id="preapproval-owner-a",
    )
    save_subscription(
        user_b_id,
        "canceled",
        provider_subscription_id="preapproval-owner-b",
    )

    response_a = client.get(
        f"{API_PREFIX}/billing/me",
        headers=auth_headers(token_a),
    )
    response_b = client.get(
        f"{API_PREFIX}/billing/me",
        headers=auth_headers(token_b),
    )

    assert response_a.status_code == 200, response_a.text
    assert response_b.status_code == 200, response_b.text
    assert response_a.json()["status"] == "active"
    assert response_a.json()["provider_subscription_id"] == "preapproval-owner-a"
    assert response_a.json()["is_access_allowed"] is True
    assert response_b.json()["status"] == "canceled"
    assert response_b.json()["provider_subscription_id"] == "preapproval-owner-b"
    assert response_b.json()["is_access_allowed"] is False


def test_billing_me_calculates_trial_days_left(client: TestClient) -> None:
    token, user_id = register_user(client, "billing-trial-days@test.com")
    save_subscription(user_id, "trialing", trial_days=5)

    response = client.get(
        f"{API_PREFIX}/billing/me",
        headers=auth_headers(token),
    )

    assert response.status_code == 200, response.text
    assert response.json()["status"] == "trialing"
    assert response.json()["is_access_allowed"] is True
    assert response.json()["days_left_in_trial"] in {4, 5}
    assert "teste grátis" in response.json()["message"]


def test_past_due_within_grace_period_allows_access_with_warning(
    client: TestClient,
) -> None:
    token, user_id = register_user(client, "billing-past-due-grace@test.com")
    save_subscription(user_id, "past_due", overdue_days=1)

    response = client.get(
        f"{API_PREFIX}/billing/me",
        headers=auth_headers(token),
    )

    assert response.status_code == 200, response.text
    assert response.json()["status"] == "past_due"
    assert response.json()["payment_status"] == "overdue"
    assert response.json()["is_access_allowed"] is True
    assert response.json()["days_until_block"] in {0, 1}
    assert "regulariza" in response.json()["message"]


def test_past_due_after_grace_period_becomes_blocked(
    client: TestClient,
) -> None:
    token, user_id = register_user(client, "billing-past-due-blocked@test.com")
    save_subscription(user_id, "past_due", overdue_days=3)

    response = client.get(
        f"{API_PREFIX}/billing/me",
        headers=auth_headers(token),
    )
    stored_subscription = get_user_subscription(user_id)

    assert response.status_code == 200, response.text
    assert response.json()["status"] == "blocked"
    assert response.json()["payment_status"] == "overdue"
    assert response.json()["is_access_allowed"] is False
    assert response.json()["blocked_at"] is not None
    assert response.json()["block_reason"] == "payment_overdue"
    assert stored_subscription is not None
    assert stored_subscription.status == "blocked"


def test_billing_sync_blocks_after_grace_period(
    client: TestClient,
) -> None:
    token, user_id = register_user(client, "billing-sync-blocked@test.com")
    save_subscription(user_id, "past_due", overdue_days=3)

    response = client.post(
        f"{API_PREFIX}/billing/sync",
        headers=auth_headers(token),
    )

    assert response.status_code == 200, response.text
    assert response.json()["status"] == "blocked"
    assert response.json()["is_access_allowed"] is False
    assert response.json()["block_reason"] == "payment_overdue"


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


def test_billing_webhook_failed_payment_marks_past_due(
    client: TestClient,
    monkeypatch,
) -> None:
    _token, user_id = register_user(client, "webhook-failed-payment@test.com")
    provider_subscription_id = "preapproval-webhook-failed"
    save_subscription(
        user_id,
        "active",
        provider_subscription_id=provider_subscription_id,
    )

    def fake_fetch_preapproval(provider_id: str) -> dict:
        return {
            "id": provider_id,
            "external_reference": user_id,
            "status": "rejected",
        }

    monkeypatch.setattr(
        "app.billing_service.fetch_preapproval",
        fake_fetch_preapproval,
    )

    response = client.post(
        f"{API_PREFIX}/billing/webhook/mercado-pago",
        json={
            "id": "evt-webhook-failed-payment",
            "type": "preapproval",
            "data": {"id": provider_subscription_id},
        },
    )
    stored_subscription = get_user_subscription(user_id)

    assert response.status_code == 200, response.text
    assert stored_subscription is not None
    assert stored_subscription.status == "past_due"
    assert stored_subscription.payment_status == "overdue"
    assert stored_subscription.overdue_since is not None
    assert stored_subscription.grace_period_ends_at is not None


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
    provider_subscription_id: str | None = None,
    overdue_days: int | None = None,
) -> None:
    now = datetime.now(timezone.utc)
    trial_starts_at = now if trial_days is not None else None
    trial_ends_at = (
        now + timedelta(days=trial_days) if trial_days is not None else None
    )
    overdue_since = (
        now - timedelta(days=overdue_days) if overdue_days is not None else None
    )
    grace_period_ends_at = (
        overdue_since + timedelta(days=2) if overdue_since is not None else None
    )

    upsert_user_subscription(
        UserSubscriptionRecord(
            id=str(uuid4()),
            user_id=user_id,
            provider="mercado_pago",
            provider_subscription_id=provider_subscription_id,
            provider_payment_id=None,
            status=billing_status,
            payment_status=get_payment_status_for_test(billing_status),
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
            overdue_since=overdue_since,
            grace_period_ends_at=grace_period_ends_at,
            blocked_at=None,
            block_reason=None,
            canceled_at=None,
            cancel_reason=None,
            checkout_url=None,
            created_at=now,
            updated_at=now,
        )
    )


def get_payment_status_for_test(billing_status: str) -> str:
    if billing_status in {"active", "trialing"}:
        return "paid"

    if billing_status in {"past_due", "blocked"}:
        return "overdue"

    if billing_status == "canceled":
        return "canceled"

    if billing_status == "unknown":
        return "unknown"

    return "pending"
