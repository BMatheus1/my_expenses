from fastapi.testclient import TestClient

from app.email_verification_repository import mark_user_email_as_verified
from app.storage import get_user_record_by_email

API_PREFIX = "/api"


def test_credentials_user_cannot_login_before_email_verification(
    client: TestClient,
) -> None:
    register_response = register_credentials_user_without_verification(
        client,
        email="pending@test.com",
        password="Senha12345",
    )

    assert register_response.status_code == 201

    login_response = client.post(
        f"{API_PREFIX}/auth/login",
        json={
            "email": "pending@test.com",
            "password": "Senha12345",
        },
    )

    assert login_response.status_code == 403
    assert "Confirme seu e-mail" in login_response.json()["detail"]


def test_credentials_user_can_login_after_email_verification(
    client: TestClient,
) -> None:
    access_token = register_verified_credentials_user(
        client,
        email="verified@test.com",
        password="Senha12345",
    )

    assert access_token


def test_protected_endpoints_require_authentication(
    client: TestClient,
) -> None:
    endpoints = [
        ("GET", "/expenses"),
        ("POST", "/expenses"),
        ("GET", "/incomes"),
        ("POST", "/incomes"),
        ("GET", "/expense-categories"),
        ("GET", "/auth/me"),
    ]

    for method, path in endpoints:
        response = client.request(method, f"{API_PREFIX}{path}")

        assert response.status_code in {401, 403}, (
            method,
            path,
            response.status_code,
            response.text,
        )


def test_user_cannot_see_other_user_expenses(
    client: TestClient,
) -> None:
    user_a_token = register_verified_credentials_user(
        client,
        email="user-a@test.com",
        password="Senha12345",
    )
    user_b_token = register_verified_credentials_user(
        client,
        email="user-b@test.com",
        password="Senha12345",
    )

    create_expense_response = client.post(
        f"{API_PREFIX}/expenses",
        headers=auth_headers(user_a_token),
        json={
            "description": "Gasto secreto usuário A",
            "amount": 99.9,
            "category": "Mercado",
            "date": "2026-05-24",
        },
    )

    assert create_expense_response.status_code == 201, create_expense_response.text

    user_b_expenses_response = client.get(
        f"{API_PREFIX}/expenses",
        headers=auth_headers(user_b_token),
    )

    assert user_b_expenses_response.status_code == 200

    user_b_expenses = user_b_expenses_response.json()

    assert all(
        expense["description"] != "Gasto secreto usuário A"
        for expense in user_b_expenses
    )


def test_user_cannot_update_or_delete_other_user_expense(
    client: TestClient,
) -> None:
    user_a_token = register_verified_credentials_user(
        client,
        email="owner@test.com",
        password="Senha12345",
    )
    user_b_token = register_verified_credentials_user(
        client,
        email="attacker@test.com",
        password="Senha12345",
    )

    create_response = client.post(
        f"{API_PREFIX}/expenses",
        headers=auth_headers(user_a_token),
        json={
            "description": "Despesa protegida",
            "amount": 150.0,
            "category": "Casa",
            "date": "2026-05-24",
        },
    )

    assert create_response.status_code == 201, create_response.text

    expense_id = create_response.json()["id"]

    update_response = client.put(
        f"{API_PREFIX}/expenses/{expense_id}",
        headers=auth_headers(user_b_token),
        json={
            "description": "Tentativa invasão",
            "amount": 1.0,
            "category": "Fraude",
            "date": "2026-05-24",
        },
    )

    assert update_response.status_code in {403, 404}

    delete_response = client.delete(
        f"{API_PREFIX}/expenses/{expense_id}",
        headers=auth_headers(user_b_token),
    )

    assert delete_response.status_code in {403, 404}

    owner_expenses_response = client.get(
        f"{API_PREFIX}/expenses",
        headers=auth_headers(user_a_token),
    )

    assert owner_expenses_response.status_code == 200

    owner_expenses = owner_expenses_response.json()

    assert any(expense["id"] == expense_id for expense in owner_expenses)


def test_user_cannot_see_other_user_incomes(
    client: TestClient,
) -> None:
    user_a_token = register_verified_credentials_user(
        client,
        email="income-owner@test.com",
        password="Senha12345",
    )
    user_b_token = register_verified_credentials_user(
        client,
        email="income-other@test.com",
        password="Senha12345",
    )

    create_income_response = client.post(
        f"{API_PREFIX}/incomes",
        headers=auth_headers(user_a_token),
        json={
            "description": "Salário secreto",
            "amount": 3000.0,
            "source": "Trabalho",
            "date": "2026-05-24",
        },
    )

    assert create_income_response.status_code == 201, create_income_response.text

    user_b_incomes_response = client.get(
        f"{API_PREFIX}/incomes",
        headers=auth_headers(user_b_token),
    )

    assert user_b_incomes_response.status_code == 200

    user_b_incomes = user_b_incomes_response.json()

    assert all(income["description"] != "Salário secreto" for income in user_b_incomes)


def test_credentials_account_delete_requires_password(
    client: TestClient,
) -> None:
    token = register_verified_credentials_user(
        client,
        email="delete-requires-password@test.com",
        password="Senha12345",
    )

    response = client.request(
        "DELETE",
        f"{API_PREFIX}/auth/account",
        headers=auth_headers(token),
        json={
            "confirmation": "EXCLUIR",
        },
    )

    assert response.status_code == 400
    assert "senha" in response.json()["detail"].lower()


def test_credentials_account_delete_rejects_wrong_password(
    client: TestClient,
) -> None:
    token = register_verified_credentials_user(
        client,
        email="delete-wrong-password@test.com",
        password="Senha12345",
    )

    response = client.request(
        "DELETE",
        f"{API_PREFIX}/auth/account",
        headers=auth_headers(token),
        json={
            "confirmation": "EXCLUIR",
            "password": "SenhaErrada123",
        },
    )

    assert response.status_code == 400
    assert "Senha incorreta" in response.json()["detail"]

    me_response = client.get(
        f"{API_PREFIX}/auth/me",
        headers=auth_headers(token),
    )

    assert me_response.status_code == 200
    
def test_credentials_account_delete_removes_user(
    client: TestClient,
) -> None:
    email = "delete-ok@test.com"
    password = "Senha12345"

    token = register_verified_credentials_user(
        client,
        email=email,
        password=password,
    )

    delete_response = client.request(
        "DELETE",
        f"{API_PREFIX}/auth/account",
        headers=auth_headers(token),
        json={
            "confirmation": "EXCLUIR",
            "password": password,
        },
    )

    assert delete_response.status_code == 200
    assert delete_response.json()["message"] == "Conta excluída com sucesso."

    login_response = client.post(
        f"{API_PREFIX}/auth/login",
        json={
            "email": email,
            "password": password,
        },
    )

    assert login_response.status_code == 401


def test_google_account_delete_requires_google_confirmation(
    client: TestClient,
    monkeypatch,
) -> None:
    mock_google_credential(
        monkeypatch,
        email="google-delete@test.com",
        name="Usuário Google",
    )

    google_response = client.post(
        f"{API_PREFIX}/auth/google",
        json={"credential": "fake-google-login-token"},
    )

    assert google_response.status_code == 200, google_response.text

    token = google_response.json()["access_token"]

    delete_response = client.request(
        "DELETE",
        f"{API_PREFIX}/auth/account",
        headers=auth_headers(token),
        json={
            "confirmation": "EXCLUIR",
        },
    )

    assert delete_response.status_code == 400
    assert "Google" in delete_response.json()["detail"]


def test_google_account_delete_rejects_different_google_email(
    client: TestClient,
    monkeypatch,
) -> None:
    mock_google_credential(
        monkeypatch,
        email="google-owner@test.com",
        name="Usuário Google",
    )

    google_response = client.post(
        f"{API_PREFIX}/auth/google",
        json={"credential": "fake-google-login-token"},
    )

    assert google_response.status_code == 200, google_response.text

    token = google_response.json()["access_token"]

    mock_google_credential(
        monkeypatch,
        email="another-google@test.com",
        name="Outro Google",
    )

    delete_response = client.request(
        "DELETE",
        f"{API_PREFIX}/auth/account",
        headers=auth_headers(token),
        json={
            "confirmation": "EXCLUIR",
            "google_credential": "fake-google-delete-token",
        },
    )

    assert delete_response.status_code == 403
    assert "não corresponde" in delete_response.json()["detail"]


def test_google_account_delete_accepts_same_google_email(
    client: TestClient,
    monkeypatch,
) -> None:
    email = "google-delete-ok@test.com"

    mock_google_credential(
        monkeypatch,
        email=email,
        name="Usuário Google",
    )

    google_response = client.post(
        f"{API_PREFIX}/auth/google",
        json={"credential": "fake-google-login-token"},
    )

    assert google_response.status_code == 200, google_response.text

    token = google_response.json()["access_token"]

    delete_response = client.request(
        "DELETE",
        f"{API_PREFIX}/auth/account",
        headers=auth_headers(token),
        json={
            "confirmation": "EXCLUIR",
            "google_credential": "fake-google-delete-token",
        },
    )

    assert delete_response.status_code == 200
    assert delete_response.json()["message"] == "Conta excluída com sucesso."


def test_invalid_delete_confirmation_is_rejected(
    client: TestClient,
) -> None:
    token = register_verified_credentials_user(
        client,
        email="wrong-confirmation@test.com",
        password="Senha12345",
    )

    response = client.request(
        "DELETE",
        f"{API_PREFIX}/auth/account",
        headers=auth_headers(token),
        json={
            "confirmation": "DELETAR",
            "password": "Senha12345",
        },
    )

    assert response.status_code in {400, 422}


def register_credentials_user_without_verification(
    client: TestClient,
    email: str,
    password: str,
):
    return client.post(
        f"{API_PREFIX}/auth/register",
        json={
            "name": "Usuário Teste",
            "email": email,
            "password": password,
            "confirm_password": password,
            "terms_accepted": True,
        },
    )


def register_verified_credentials_user(
    client: TestClient,
    email: str,
    password: str,
) -> str:
    register_response = register_credentials_user_without_verification(
        client,
        email=email,
        password=password,
    )

    assert register_response.status_code == 201, register_response.text

    user = get_user_record_by_email(email)
    assert user is not None

    mark_user_email_as_verified(user.id)

    login_response = client.post(
        f"{API_PREFIX}/auth/login",
        json={
            "email": email,
            "password": password,
        },
    )

    assert login_response.status_code == 200, login_response.text

    access_token = login_response.json()["access_token"]

    trial_response = client.post(
        f"{API_PREFIX}/subscription/start-trial",
        headers=auth_headers(access_token),
    )

    assert trial_response.status_code == 200, trial_response.text

    return access_token


def auth_headers(access_token: str) -> dict[str, str]:
    return {
        "Authorization": f"Bearer {access_token}",
    }


def mock_google_credential(monkeypatch, email: str, name: str) -> None:
    def fake_verify_google_credential(credential: str) -> dict:
        return {
            "email": email,
            "name": name,
            "email_verified": True,
            "iss": "accounts.google.com",
        }

    monkeypatch.setattr(
        "app.auth_service.verify_google_credential",
        fake_verify_google_credential,
    )
