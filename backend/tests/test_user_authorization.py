from fastapi.testclient import TestClient
from datetime import datetime, timedelta, timezone
from uuid import uuid4

from app.billing_repository import upsert_user_subscription
from app.billing_schemas import UserSubscriptionRecord
from app.email_verification_repository import mark_user_email_as_verified
from app.storage import get_user_record_by_email

API_PREFIX = "/api"

USER_A = {
    "name": "Usuário A",
    "email": "usuario.a@test.com",
    "password": "Senha12345",
}

USER_B = {
    "name": "Usuário B",
    "email": "usuario.b@test.com",
    "password": "Senha12345",
}


def test_user_cannot_list_another_user_expenses_or_incomes(
    client: TestClient,
) -> None:
    user_a_token = register_user(client, USER_A)
    user_b_token = register_user(client, USER_B)

    create_expense(client, user_a_token)
    create_income(client, user_a_token)

    expenses_response = client.get(
        f"{API_PREFIX}/expenses",
        headers=auth_headers(user_b_token),
    )

    incomes_response = client.get(
        f"{API_PREFIX}/incomes",
        headers=auth_headers(user_b_token),
    )

    assert expenses_response.status_code == 200
    assert incomes_response.status_code == 200

    assert expenses_response.json() == []
    assert incomes_response.json() == []


def test_user_cannot_update_or_delete_another_user_expense(
    client: TestClient,
) -> None:
    user_a_token = register_user(client, USER_A)
    user_b_token = register_user(client, USER_B)

    expense = create_expense(client, user_a_token)

    update_response = client.put(
        f"{API_PREFIX}/expenses/{expense['id']}",
        headers=auth_headers(user_b_token),
        json={
            "description": "Tentativa de alterar gasto de outro usuário",
            "amount": 999.99,
            "category": "Alimentação",
            "date": "2026-05-21",
        },
    )

    delete_response = client.delete(
        f"{API_PREFIX}/expenses/{expense['id']}",
        headers=auth_headers(user_b_token),
    )

    user_a_expenses_response = client.get(
        f"{API_PREFIX}/expenses",
        headers=auth_headers(user_a_token),
    )

    assert update_response.status_code in {403, 404}
    assert delete_response.status_code in {403, 404}
    assert user_a_expenses_response.status_code == 200

    user_a_expenses = user_a_expenses_response.json()

    assert len(user_a_expenses) == 1
    assert user_a_expenses[0]["id"] == expense["id"]
    assert user_a_expenses[0]["description"] == expense["description"]


def test_user_cannot_update_or_delete_another_user_income(
    client: TestClient,
) -> None:
    user_a_token = register_user(client, USER_A)
    user_b_token = register_user(client, USER_B)

    income = create_income(client, user_a_token)

    update_response = client.put(
        f"{API_PREFIX}/incomes/{income['id']}",
        headers=auth_headers(user_b_token),
        json={
            "description": "Tentativa de alterar ganho de outro usuário",
            "amount": 777.77,
            "source": "Freelance",
            "date": "2026-05-21",
        },
    )

    delete_response = client.delete(
        f"{API_PREFIX}/incomes/{income['id']}",
        headers=auth_headers(user_b_token),
    )

    user_a_incomes_response = client.get(
        f"{API_PREFIX}/incomes",
        headers=auth_headers(user_a_token),
    )

    assert update_response.status_code in {403, 404}
    assert delete_response.status_code in {403, 404}
    assert user_a_incomes_response.status_code == 200

    user_a_incomes = user_a_incomes_response.json()

    assert len(user_a_incomes) == 1
    assert user_a_incomes[0]["id"] == income["id"]
    assert user_a_incomes[0]["description"] == income["description"]


def test_user_cannot_update_or_delete_another_user_expense_category(
    client: TestClient,
) -> None:
    user_a_token = register_user(client, USER_A)
    user_b_token = register_user(client, USER_B)

    category = create_expense_category(client, user_a_token)

    update_response = client.put(
        f"{API_PREFIX}/expense-categories/{category['id']}",
        headers=auth_headers(user_b_token),
        json={
            "name": "Categoria invadida",
        },
    )

    delete_response = client.delete(
        f"{API_PREFIX}/expense-categories/{category['id']}",
        headers=auth_headers(user_b_token),
    )

    user_a_categories_response = client.get(
        f"{API_PREFIX}/expense-categories",
        headers=auth_headers(user_a_token),
    )

    assert update_response.status_code in {403, 404}
    assert delete_response.status_code in {403, 404}
    assert user_a_categories_response.status_code == 200

    user_a_category_names = [
        category_item["name"] for category_item in user_a_categories_response.json()
    ]

    assert category["name"] in user_a_category_names
    assert "Categoria invadida" not in user_a_category_names


def test_user_cannot_access_or_update_another_user_business(
    client: TestClient,
) -> None:
    user_a_token = register_user(client, USER_A)
    user_b_token = register_user(client, USER_B)

    business = create_business(client, user_a_token)

    dashboard_response = client.get(
        f"{API_PREFIX}/businesses/{business['id']}/dashboard",
        headers=auth_headers(user_b_token),
    )

    update_response = client.put(
        f"{API_PREFIX}/businesses/{business['id']}",
        headers=auth_headers(user_b_token),
        json={
            "name": "Negócio invadido",
            "type": "Serviços",
            "description": "Tentativa de alteração indevida.",
        },
    )

    user_b_businesses_response = client.get(
        f"{API_PREFIX}/businesses",
        headers=auth_headers(user_b_token),
    )

    user_a_businesses_response = client.get(
        f"{API_PREFIX}/businesses",
        headers=auth_headers(user_a_token),
    )

    assert dashboard_response.status_code in {403, 404}
    assert update_response.status_code in {403, 404}

    assert user_b_businesses_response.status_code == 200
    assert user_b_businesses_response.json() == []

    assert user_a_businesses_response.status_code == 200

    user_a_businesses = user_a_businesses_response.json()

    assert len(user_a_businesses) == 1
    assert user_a_businesses[0]["id"] == business["id"]
    assert user_a_businesses[0]["name"] == business["name"]


def test_user_cannot_access_another_user_business_children(
    client: TestClient,
) -> None:
    user_a_token = register_user(client, USER_A)
    user_b_token = register_user(client, USER_B)

    business = create_business(client, user_a_token)
    material = create_business_material(client, user_a_token, business["id"])
    service = create_business_service(client, user_a_token, business["id"])

    add_material_to_service(
        client,
        user_a_token,
        business["id"],
        service["id"],
        material["id"],
    )
    sale = create_business_sale(client, user_a_token, business["id"], service["id"])

    protected_requests = [
        client.get(
            f"{API_PREFIX}/businesses/{business['id']}/materials",
            headers=auth_headers(user_b_token),
        ),
        client.put(
            f"{API_PREFIX}/businesses/{business['id']}/materials/{material['id']}",
            headers=auth_headers(user_b_token),
            json=business_material_payload(name="Material invadido"),
        ),
        client.delete(
            f"{API_PREFIX}/businesses/{business['id']}/materials/{material['id']}",
            headers=auth_headers(user_b_token),
        ),
        client.get(
            f"{API_PREFIX}/businesses/{business['id']}/services",
            headers=auth_headers(user_b_token),
        ),
        client.put(
            f"{API_PREFIX}/businesses/{business['id']}/services/{service['id']}",
            headers=auth_headers(user_b_token),
            json=business_service_payload(name="Serviço invadido"),
        ),
        client.delete(
            f"{API_PREFIX}/businesses/{business['id']}/services/{service['id']}",
            headers=auth_headers(user_b_token),
        ),
        client.get(
            f"{API_PREFIX}/businesses/{business['id']}/sales",
            headers=auth_headers(user_b_token),
        ),
    ]

    assert sale["business_id"] == business["id"]

    for response in protected_requests:
        assert response.status_code in {403, 404}

    user_a_materials = client.get(
        f"{API_PREFIX}/businesses/{business['id']}/materials",
        headers=auth_headers(user_a_token),
    )
    user_a_services = client.get(
        f"{API_PREFIX}/businesses/{business['id']}/services",
        headers=auth_headers(user_a_token),
    )
    user_a_sales = client.get(
        f"{API_PREFIX}/businesses/{business['id']}/sales",
        headers=auth_headers(user_a_token),
    )

    assert user_a_materials.status_code == 200
    assert user_a_services.status_code == 200
    assert user_a_sales.status_code == 200
    assert [item["id"] for item in user_a_materials.json()] == [material["id"]]
    assert [item["id"] for item in user_a_services.json()] == [service["id"]]
    assert [item["id"] for item in user_a_sales.json()] == [sale["id"]]


def test_user_settings_are_persisted_and_isolated(
    client: TestClient,
) -> None:
    user_a_token = register_user(client, USER_A)
    user_b_token = register_user(client, USER_B)

    user_a_update = client.put(
        f"{API_PREFIX}/user-settings",
        headers=auth_headers(user_a_token),
        json={
            "app_theme": "rose",
            "app_mode": "dark",
            "daily_review_enabled": False,
            "purpose_onboarding_seen": True,
            "notifications_enabled": True,
        },
    )

    user_b_settings = client.get(
        f"{API_PREFIX}/user-settings",
        headers=auth_headers(user_b_token),
    )

    user_a_settings = client.get(
        f"{API_PREFIX}/user-settings",
        headers=auth_headers(user_a_token),
    )

    assert user_a_update.status_code == 200, user_a_update.text
    assert user_b_settings.status_code == 200, user_b_settings.text
    assert user_a_settings.status_code == 200, user_a_settings.text

    assert user_a_settings.json()["app_theme"] == "rose"
    assert user_a_settings.json()["app_mode"] == "dark"
    assert user_a_settings.json()["daily_review_enabled"] is False
    assert user_a_settings.json()["purpose_onboarding_seen"] is True
    assert user_a_settings.json()["notifications_enabled"] is True

    assert user_b_settings.json()["app_theme"] == "emerald"
    assert user_b_settings.json()["app_mode"] == "light"
    assert user_b_settings.json()["daily_review_enabled"] is True
    assert user_b_settings.json()["purpose_onboarding_seen"] is False
    assert user_b_settings.json()["notifications_enabled"] is False
    assert user_b_settings.json()["user_id"] != user_a_settings.json()["user_id"]


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

    access_token = login_response.json()["access_token"]

    grant_billing_trial_access(user.id)

    return access_token


def auth_headers(token: str) -> dict[str, str]:
    return {
        "Authorization": f"Bearer {token}",
    }


def grant_billing_trial_access(user_id: str) -> None:
    now = datetime.now(timezone.utc)

    upsert_user_subscription(
        UserSubscriptionRecord(
            id=str(uuid4()),
            user_id=user_id,
            provider="mercado_pago",
            provider_subscription_id=None,
            provider_payment_id=None,
            status="trialing",
            plan_name="My Expenses Premium",
            amount=8.99,
            currency="BRL",
            trial_starts_at=now,
            trial_ends_at=now + timedelta(days=30),
            current_period_starts_at=None,
            current_period_ends_at=None,
            canceled_at=None,
            checkout_url=None,
            created_at=now,
            updated_at=now,
        )
    )


def create_expense(client: TestClient, token: str) -> dict:
    response = client.post(
        f"{API_PREFIX}/expenses",
        headers=auth_headers(token),
        json={
            "description": "Mercado",
            "amount": 150.75,
            "category": "Alimentação",
            "date": "2026-05-21",
        },
    )

    assert response.status_code == 201, response.text

    return response.json()


def create_income(client: TestClient, token: str) -> dict:
    response = client.post(
        f"{API_PREFIX}/incomes",
        headers=auth_headers(token),
        json={
            "description": "Salário",
            "amount": 3500,
            "source": "Empresa",
            "date": "2026-05-21",
        },
    )

    assert response.status_code == 201, response.text

    return response.json()


def create_expense_category(client: TestClient, token: str) -> dict:
    response = client.post(
        f"{API_PREFIX}/expense-categories",
        headers=auth_headers(token),
        json={
            "name": "Pet Shop",
        },
    )

    assert response.status_code == 201, response.text

    return response.json()


def create_business(client: TestClient, token: str) -> dict:
    response = client.post(
        f"{API_PREFIX}/businesses",
        headers=auth_headers(token),
        json={
            "name": "Barbearia Teste",
            "type": "Serviços",
            "description": "Negócio usado apenas nos testes.",
        },
    )

    assert response.status_code == 201, response.text

    return response.json()


def create_business_material(
    client: TestClient,
    token: str,
    business_id: str,
) -> dict:
    response = client.post(
        f"{API_PREFIX}/businesses/{business_id}/materials",
        headers=auth_headers(token),
        json=business_material_payload(),
    )

    assert response.status_code == 201, response.text

    return response.json()


def create_business_service(
    client: TestClient,
    token: str,
    business_id: str,
) -> dict:
    response = client.post(
        f"{API_PREFIX}/businesses/{business_id}/services",
        headers=auth_headers(token),
        json=business_service_payload(),
    )

    assert response.status_code == 201, response.text

    return response.json()


def add_material_to_service(
    client: TestClient,
    token: str,
    business_id: str,
    service_id: str,
    material_id: str,
) -> dict:
    response = client.post(
        f"{API_PREFIX}/businesses/{business_id}/services/{service_id}/materials",
        headers=auth_headers(token),
        json={
            "material_id": material_id,
            "quantity_used": 2,
        },
    )

    assert response.status_code == 201, response.text

    return response.json()


def create_business_sale(
    client: TestClient,
    token: str,
    business_id: str,
    service_id: str,
) -> dict:
    response = client.post(
        f"{API_PREFIX}/businesses/{business_id}/sales",
        headers=auth_headers(token),
        json={
            "service_id": service_id,
            "quantity": 1,
            "sale_date": "2026-05-21",
            "payment_method": "Pix",
        },
    )

    assert response.status_code == 201, response.text

    return response.json()


def business_material_payload(name: str = "Shampoo profissional") -> dict:
    return {
        "name": name,
        "category": "Produtos",
        "stock_quantity": 10,
        "unit": "ml",
        "total_cost": 100,
        "supplier": "Fornecedor Teste",
        "purchase_date": "2026-05-21",
        "notes": "Material usado em teste.",
    }


def business_service_payload(name: str = "Corte masculino") -> dict:
    return {
        "name": name,
        "category": "Serviço",
        "price": 50,
        "estimated_minutes": 30,
        "notes": "Serviço usado em teste.",
    }
