from fastapi.testclient import TestClient

from app.email_verification_repository import mark_user_email_as_verified
from app.config import settings
from app.storage import get_user_record_by_email

API_PREFIX = "/api"

USER_A = {
    "name": "Usuário Assinatura",
    "email": "assinatura@test.com",
    "password": "Senha12345",
}


def test_start_trial_endpoint_does_not_grant_access_directly(
    client: TestClient,
) -> None:
    token = register_user(client, USER_A)

    initial_response = client.get(
        f"{API_PREFIX}/subscription/status",
        headers=auth_headers(token),
    )
    trial_response = client.post(
        f"{API_PREFIX}/subscription/start-trial",
        headers=auth_headers(token),
    )
    second_trial_response = client.post(
        f"{API_PREFIX}/subscription/start-trial",
        headers=auth_headers(token),
    )
    final_response = client.get(
        f"{API_PREFIX}/subscription/status",
        headers=auth_headers(token),
    )

    assert initial_response.status_code == 200, initial_response.text
    assert initial_response.json()["status"] == "inactive"
    assert initial_response.json()["can_access_app"] is False
    assert initial_response.json()["can_start_trial"] is True

    assert trial_response.status_code == 409
    assert second_trial_response.status_code == 409
    assert final_response.json()["status"] == "inactive"
    assert final_response.json()["can_access_app"] is False


def test_checkout_requires_mercado_pago_credentials(client: TestClient) -> None:
    token = register_user(client, USER_A)

    response = client.post(
        f"{API_PREFIX}/subscription/checkout",
        headers=auth_headers(token),
    )

    assert response.status_code == 503
    assert "Mercado Pago" in response.json()["detail"]


def test_app_data_requires_active_subscription(client: TestClient) -> None:
    token = register_user(client, USER_A)

    response = client.get(
        f"{API_PREFIX}/expenses",
        headers=auth_headers(token),
    )

    assert response.status_code == 402
    assert "assinatura" in response.json()["detail"]


def test_mercado_pago_webhook_rejects_invalid_signature(
    client: TestClient,
    monkeypatch,
) -> None:
    monkeypatch.setattr(settings, "mercado_pago_webhook_secret", "webhook-secret")

    response = client.post(
        f"{API_PREFIX}/webhooks/mercado-pago?data.id=preapproval-123",
        headers={
            "x-request-id": "request-123",
            "x-signature": "ts=1742505638683,v1=invalid",
        },
        json={
            "data": {
                "id": "preapproval-123",
            },
        },
    )

    assert response.status_code == 401


def register_user(client: TestClient, user_data: dict[str, str]) -> str:
    response = client.post(
        f"{API_PREFIX}/auth/register",
        json={
            "name": user_data["name"],
            "email": user_data["email"],
            "password": user_data["password"],
            "confirm_password": user_data["password"],
            "terms_accepted": True,
        },
    )

    assert response.status_code == 201, response.text

    user = get_user_record_by_email(user_data["email"])
    assert user is not None

    mark_user_email_as_verified(user.id)

    login_response = client.post(
        f"{API_PREFIX}/auth/login",
        json={
            "email": user_data["email"],
            "password": user_data["password"],
        },
    )

    assert login_response.status_code == 200, login_response.text

    return login_response.json()["access_token"]


def auth_headers(token: str) -> dict[str, str]:
    return {
        "Authorization": f"Bearer {token}",
    }
