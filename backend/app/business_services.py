from fastapi import HTTPException, status
import bcrypt
from google.auth.transport import requests as google_requests
from google.oauth2 import id_token
from app.config import settings
from app.storage import get_user_record_by_id
from app.business_repository import (
    calculate_margin,
    create_business,
    create_material,
    create_sale_with_stock_update,
    create_service,
    delete_business,
    delete_material,
    delete_recipe_item,
    delete_service,
    get_business_by_id,
    get_material_by_id,
    get_recipe_item_by_id,
    get_service_by_id,
    list_businesses,
    list_materials,
    list_recipe_items,
    list_sales,
    list_services,
    to_float,
    update_business,
    update_material,
    update_recipe_item,
    update_service,
    upsert_recipe_item,
)
from app.business_schemas import (
    BusinessCreate,
    BusinessDashboardResponse,
    BusinessDashboardSummary,
    BusinessDeleteConfirmation,
    BusinessMaterialCreate,
    BusinessMaterialResponse,
    BusinessMaterialUpdate,
    BusinessRecipeItemCreate,
    BusinessRecipeItemResponse,
    BusinessRecipeItemUpdate,
    BusinessResponse,
    BusinessSaleCreate,
    BusinessSaleResponse,
    BusinessServiceCreate,
    BusinessServiceResponse,
    BusinessServiceUpdate,
    BusinessUpdate,
)


def get_user_businesses(user_id: str) -> list[BusinessResponse]:
    return [BusinessResponse.model_validate(row) for row in list_businesses(user_id)]


def create_user_business(
    business_data: BusinessCreate,
    user_id: str,
) -> BusinessResponse:
    business = create_business(business_data.model_dump(), user_id)

    return BusinessResponse.model_validate(business)


def update_user_business(
    business_id: str,
    business_data: BusinessUpdate,
    user_id: str,
) -> BusinessResponse:
    ensure_business_exists(business_id, user_id)

    business = update_business(
        business_id=business_id,
        data=business_data.model_dump(),
        user_id=user_id,
    )

    if business is None:
        raise_not_found("Negócio não encontrado.")

    return BusinessResponse.model_validate(business)


def delete_user_business(
    business_id: str,
    confirmation_data: BusinessDeleteConfirmation,
    user_id: str,
) -> None:
    ensure_business_exists(business_id, user_id)
    ensure_sensitive_action_confirmed(confirmation_data, user_id)

    deleted = delete_business(business_id, user_id)

    if not deleted:
        raise_not_found("Negócio não encontrado.")


def get_user_business_dashboard(
    business_id: str,
    user_id: str,
) -> BusinessDashboardResponse:
    business = ensure_business_exists(business_id, user_id)
    services = get_user_business_services(business_id, user_id)
    sales = get_user_business_sales(business_id, user_id)
    materials = get_user_business_materials(business_id, user_id)

    total_sales = round(sum(sale.total_amount for sale in sales), 2)
    total_material_cost = round(sum(sale.total_material_cost for sale in sales), 2)
    gross_profit = round(total_sales - total_material_cost, 2)

    low_stock_services_count = sum(
        1
        for service in services
        if service.current_capacity is not None and service.current_capacity <= 3
    )

    summary = BusinessDashboardSummary(
        total_sales=total_sales,
        total_material_cost=total_material_cost,
        gross_profit=gross_profit,
        gross_margin_percent=calculate_margin(gross_profit, total_sales),
        materials_count=len(materials),
        services_count=len(services),
        low_stock_services_count=low_stock_services_count,
    )

    return BusinessDashboardResponse(
        business=BusinessResponse.model_validate(business),
        summary=summary,
        services=services,
        recent_sales=sales[:6],
    )


def get_user_business_materials(
    business_id: str,
    user_id: str,
) -> list[BusinessMaterialResponse]:
    ensure_business_exists(business_id, user_id)

    return [
        BusinessMaterialResponse.model_validate(row)
        for row in list_materials(business_id, user_id)
    ]


def create_user_business_material(
    business_id: str,
    material_data: BusinessMaterialCreate,
    user_id: str,
) -> BusinessMaterialResponse:
    ensure_business_exists(business_id, user_id)

    material = create_material(
        business_id=business_id,
        data=material_data.model_dump(),
        user_id=user_id,
    )

    return BusinessMaterialResponse.model_validate(material)


def update_user_business_material(
    business_id: str,
    material_id: str,
    material_data: BusinessMaterialUpdate,
    user_id: str,
) -> BusinessMaterialResponse:
    ensure_material_exists(business_id, material_id, user_id)

    material = update_material(
        business_id=business_id,
        material_id=material_id,
        data=material_data.model_dump(),
        user_id=user_id,
    )

    if material is None:
        raise_not_found("Material não encontrado.")

    return BusinessMaterialResponse.model_validate(material)


def delete_user_business_material(
    business_id: str,
    material_id: str,
    user_id: str,
) -> None:
    deleted = delete_material(business_id, material_id, user_id)

    if not deleted:
        raise_not_found("Material não encontrado.")


def get_user_business_services(
    business_id: str,
    user_id: str,
) -> list[BusinessServiceResponse]:
    ensure_business_exists(business_id, user_id)

    return [
        build_service_response(service, user_id)
        for service in list_services(business_id, user_id)
    ]


def create_user_business_service(
    business_id: str,
    service_data: BusinessServiceCreate,
    user_id: str,
) -> BusinessServiceResponse:
    ensure_business_exists(business_id, user_id)

    service = create_service(
        business_id=business_id,
        data=service_data.model_dump(),
        user_id=user_id,
    )

    return build_service_response(service, user_id)


def update_user_business_service(
    business_id: str,
    service_id: str,
    service_data: BusinessServiceUpdate,
    user_id: str,
) -> BusinessServiceResponse:
    ensure_service_exists(business_id, service_id, user_id)

    service = update_service(
        business_id=business_id,
        service_id=service_id,
        data=service_data.model_dump(),
        user_id=user_id,
    )

    if service is None:
        raise_not_found("Serviço ou produto não encontrado.")

    return build_service_response(service, user_id)


def delete_user_business_service(
    business_id: str,
    service_id: str,
    user_id: str,
) -> None:
    deleted = delete_service(business_id, service_id, user_id)

    if not deleted:
        raise_not_found("Serviço ou produto não encontrado.")


def add_material_to_user_service(
    business_id: str,
    service_id: str,
    recipe_data: BusinessRecipeItemCreate,
    user_id: str,
) -> BusinessServiceResponse:
    ensure_service_exists(business_id, service_id, user_id)
    ensure_material_exists(business_id, recipe_data.material_id, user_id)

    upsert_recipe_item(
        business_id=business_id,
        service_id=service_id,
        material_id=recipe_data.material_id,
        quantity_used=recipe_data.quantity_used,
        user_id=user_id,
    )

    service = ensure_service_exists(business_id, service_id, user_id)

    return build_service_response(service, user_id)


def update_user_service_material(
    business_id: str,
    service_id: str,
    recipe_item_id: str,
    recipe_data: BusinessRecipeItemUpdate,
    user_id: str,
) -> BusinessServiceResponse:
    ensure_service_exists(business_id, service_id, user_id)
    recipe_item = get_recipe_item_by_id(recipe_item_id, service_id, user_id)

    if recipe_item is None:
        raise_not_found("Material da ficha não encontrado.")

    updated = update_recipe_item(
        recipe_item_id=recipe_item_id,
        service_id=service_id,
        quantity_used=recipe_data.quantity_used,
        user_id=user_id,
    )

    if not updated:
        raise_not_found("Material da ficha não encontrado.")

    service = ensure_service_exists(business_id, service_id, user_id)

    return build_service_response(service, user_id)


def delete_user_service_material(
    business_id: str,
    service_id: str,
    recipe_item_id: str,
    user_id: str,
) -> BusinessServiceResponse:
    ensure_service_exists(business_id, service_id, user_id)

    deleted = delete_recipe_item(
        recipe_item_id=recipe_item_id,
        service_id=service_id,
        user_id=user_id,
    )

    if not deleted:
        raise_not_found("Material da ficha não encontrado.")

    service = ensure_service_exists(business_id, service_id, user_id)

    return build_service_response(service, user_id)


def get_user_business_sales(
    business_id: str,
    user_id: str,
) -> list[BusinessSaleResponse]:
    ensure_business_exists(business_id, user_id)

    return [
        BusinessSaleResponse.model_validate(row)
        for row in list_sales(business_id, user_id)
    ]


def create_user_business_sale(
    business_id: str,
    sale_data: BusinessSaleCreate,
    user_id: str,
) -> BusinessSaleResponse:
    ensure_business_exists(business_id, user_id)
    service = ensure_service_exists(business_id, sale_data.service_id, user_id)
    recipe_items = list_recipe_items(service["id"], user_id)

    if not recipe_items:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Monte a ficha de custo antes de registrar uma venda.",
        )

    try:
        sale = create_sale_with_stock_update(
            business_id=business_id,
            service=service,
            recipe_items=recipe_items,
            data=sale_data.model_dump(),
            user_id=user_id,
        )
    except ValueError as error:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(error),
        ) from error

    return BusinessSaleResponse.model_validate(sale)


def build_service_response(service: dict, user_id: str) -> BusinessServiceResponse:
    recipe_items = [
        BusinessRecipeItemResponse.model_validate(item)
        for item in list_recipe_items(service["id"], user_id)
    ]

    material_cost = round(sum(item.total_cost for item in recipe_items), 2)
    price = to_float(service["price"])
    gross_profit = round(price - material_cost, 2)

    return BusinessServiceResponse(
        id=service["id"],
        business_id=service["business_id"],
        name=service["name"],
        category=service["category"],
        price=price,
        estimated_minutes=service.get("estimated_minutes"),
        notes=service.get("notes"),
        created_at=service["created_at"],
        materials=recipe_items,
        material_cost=material_cost,
        gross_profit=gross_profit,
        gross_margin_percent=calculate_margin(gross_profit, price),
        current_capacity=calculate_current_capacity(recipe_items),
    )


def calculate_current_capacity(
    recipe_items: list[BusinessRecipeItemResponse],
) -> int | None:
    if not recipe_items:
        return None

    capacities = []

    for item in recipe_items:
        if item.quantity_used <= 0:
            continue

        capacities.append(int(item.stock_quantity // item.quantity_used))

    if not capacities:
        return None

    return min(capacities)


def ensure_business_exists(business_id: str, user_id: str) -> dict:
    business = get_business_by_id(business_id, user_id)

    if business is None:
        raise_not_found("Negócio não encontrado.")

    return business


def ensure_material_exists(
    business_id: str,
    material_id: str,
    user_id: str,
) -> dict:
    material = get_material_by_id(business_id, material_id, user_id)

    if material is None:
        raise_not_found("Material não encontrado.")

    return material


def ensure_service_exists(
    business_id: str,
    service_id: str,
    user_id: str,
) -> dict:
    service = get_service_by_id(business_id, service_id, user_id)

    if service is None:
        raise_not_found("Serviço ou produto não encontrado.")

    return service


def raise_not_found(message: str) -> None:
    raise HTTPException(
        status_code=status.HTTP_404_NOT_FOUND,
        detail=message,
    )

def ensure_sensitive_action_confirmed(
    confirmation_data: BusinessDeleteConfirmation,
    user_id: str,
) -> None:
    user = get_user_record_by_id(user_id)

    if user is None:
        raise_not_found("Usuário não encontrado.")

    if confirmation_data.password:
        if validate_user_password(confirmation_data.password, user.password_hash):
            return

        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Senha incorreta.",
        )

    if confirmation_data.google_credential:
        validate_google_confirmation(
            google_credential=confirmation_data.google_credential,
            expected_email=user.email,
        )
        return

    raise HTTPException(
        status_code=status.HTTP_400_BAD_REQUEST,
        detail="Confirme a exclusão com senha ou conta Google.",
    )


def validate_user_password(
    password: str,
    password_hash: str | None,
) -> bool:
    if not password_hash:
        return False

    return bcrypt.checkpw(
        password.encode("utf-8"),
        password_hash.encode("utf-8"),
    )


def validate_google_confirmation(
    google_credential: str,
    expected_email: str,
) -> None:
    if not settings.google_client_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Login com Google não configurado no backend.",
        )

    try:
        token_info = id_token.verify_oauth2_token(
            google_credential,
            google_requests.Request(),
            settings.google_client_id,
        )
    except ValueError as error:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Não foi possível confirmar sua conta Google.",
        ) from error

    token_email = str(token_info.get("email", "")).strip().lower()

    if token_email != expected_email.strip().lower():
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="A conta Google confirmada não pertence ao usuário atual.",
        )