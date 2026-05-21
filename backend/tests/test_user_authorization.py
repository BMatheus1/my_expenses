from fastapi.testclient import TestClient

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


def register_user(client: TestClient, user_data: dict[str, str]) -> str:
    response = client.post(
        f"{API_PREFIX}/auth/register",
        json=user_data,
    )

    assert response.status_code == 201, response.text

    data = response.json()

    assert "access_token" in data

    return data["access_token"]


def auth_headers(token: str) -> dict[str, str]:
    return {
        "Authorization": f"Bearer {token}",
    }


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