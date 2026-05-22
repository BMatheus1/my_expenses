from fastapi.testclient import TestClient

API_PREFIX = "/api"


def test_credentials_account_cannot_login_with_google(
    client: TestClient,
    monkeypatch,
) -> None:
    register_credentials_user(
        client,
        email="normal@test.com",
        password="Senha12345",
    )

    mock_google_credential(
        monkeypatch,
        email="normal@test.com",
        name="Usuário Normal",
    )

    response = client.post(
        f"{API_PREFIX}/auth/google",
        json={"credential": "fake-google-token"},
    )

    assert response.status_code == 403
    assert response.json()["detail"] == (
        "Esta conta foi criada com e-mail e senha. Use o login normal."
    )


def test_google_account_cannot_login_with_password(
    client: TestClient,
    monkeypatch,
) -> None:
    mock_google_credential(
        monkeypatch,
        email="google@test.com",
        name="Usuário Google",
    )

    google_response = client.post(
        f"{API_PREFIX}/auth/google",
        json={"credential": "fake-google-token"},
    )

    assert google_response.status_code == 200

    login_response = client.post(
        f"{API_PREFIX}/auth/login",
        json={
            "email": "google@test.com",
            "password": "Senha12345",
        },
    )

    assert login_response.status_code == 403
    assert login_response.json()["detail"] == (
        "Esta conta foi criada com Google. Use Entrar com Google."
    )


def test_google_account_cannot_create_credentials_account_with_same_email(
    client: TestClient,
    monkeypatch,
) -> None:
    mock_google_credential(
        monkeypatch,
        email="google@test.com",
        name="Usuário Google",
    )

    google_response = client.post(
        f"{API_PREFIX}/auth/google",
        json={"credential": "fake-google-token"},
    )

    assert google_response.status_code == 200

    register_response = client.post(
        f"{API_PREFIX}/auth/register",
        json={
            "name": "Usuário Google",
            "email": "google@test.com",
            "password": "Senha12345",
            "confirm_password": "Senha12345",
            "terms_accepted": True,
        },
    )

    assert register_response.status_code == 409
    assert register_response.json()["detail"] == (
        "Este e-mail já possui uma conta criada com Google. Use Entrar com Google."
    )


def test_google_account_password_reset_keeps_generic_response(
    client: TestClient,
    monkeypatch,
) -> None:
    mock_google_credential(
        monkeypatch,
        email="google@test.com",
        name="Usuário Google",
    )

    google_response = client.post(
        f"{API_PREFIX}/auth/google",
        json={"credential": "fake-google-token"},
    )

    assert google_response.status_code == 200

    reset_response = client.post(
        f"{API_PREFIX}/auth/forgot-password",
        json={"email": "google@test.com"},
    )

    assert reset_response.status_code == 200
    assert reset_response.json()["message"] == (
        "Se existir uma conta com este e-mail, enviaremos as instruções de recuperação."
    )


def register_credentials_user(
    client: TestClient,
    email: str,
    password: str,
) -> str:
    response = client.post(
        f"{API_PREFIX}/auth/register",
        json={
            "name": "Usuário Normal",
            "email": email,
            "password": password,
            "confirm_password": password,
            "terms_accepted": True,
        },
    )

    assert response.status_code == 201, response.text

    return response.json()["access_token"]


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