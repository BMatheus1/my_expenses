from fastapi import APIRouter, Depends, Response, status

from app.auth import get_current_user
from app.business_schemas import (
    BusinessCreate,
    BusinessDashboardResponse,
    BusinessMaterialCreate,
    BusinessMaterialResponse,
    BusinessMaterialUpdate,
    BusinessRecipeItemCreate,
    BusinessRecipeItemUpdate,
    BusinessResponse,
    BusinessSaleCreate,
    BusinessSaleResponse,
    BusinessServiceCreate,
    BusinessServiceResponse,
    BusinessServiceUpdate,
    BusinessUpdate,
)
from app.business_services import (
    add_material_to_user_service,
    create_user_business,
    create_user_business_material,
    create_user_business_sale,
    create_user_business_service,
    delete_user_business,
    delete_user_business_material,
    delete_user_business_service,
    delete_user_service_material,
    get_user_business_dashboard,
    get_user_business_materials,
    get_user_business_sales,
    get_user_business_services,
    get_user_businesses,
    update_user_business,
    update_user_business_material,
    update_user_business_service,
    update_user_service_material,
)
from app.schemas import UserResponse

router = APIRouter(prefix="/businesses", tags=["Businesses"])


@router.get("", response_model=list[BusinessResponse])
def get_businesses(current_user: UserResponse = Depends(get_current_user)):
    return get_user_businesses(current_user.id)


@router.post(
    "",
    response_model=BusinessResponse,
    status_code=status.HTTP_201_CREATED,
)
def add_business(
    business_data: BusinessCreate,
    current_user: UserResponse = Depends(get_current_user),
):
    return create_user_business(business_data, current_user.id)


@router.put("/{business_id}", response_model=BusinessResponse)
def edit_business(
    business_id: str,
    business_data: BusinessUpdate,
    current_user: UserResponse = Depends(get_current_user),
):
    return update_user_business(business_id, business_data, current_user.id)


@router.delete("/{business_id}", status_code=status.HTTP_204_NO_CONTENT)
def remove_business(
    business_id: str,
    current_user: UserResponse = Depends(get_current_user),
):
    delete_user_business(business_id, current_user.id)

    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.get(
    "/{business_id}/dashboard",
    response_model=BusinessDashboardResponse,
)
def get_business_dashboard(
    business_id: str,
    current_user: UserResponse = Depends(get_current_user),
):
    return get_user_business_dashboard(business_id, current_user.id)


@router.get(
    "/{business_id}/materials",
    response_model=list[BusinessMaterialResponse],
)
def get_business_materials(
    business_id: str,
    current_user: UserResponse = Depends(get_current_user),
):
    return get_user_business_materials(business_id, current_user.id)


@router.post(
    "/{business_id}/materials",
    response_model=BusinessMaterialResponse,
    status_code=status.HTTP_201_CREATED,
)
def add_business_material(
    business_id: str,
    material_data: BusinessMaterialCreate,
    current_user: UserResponse = Depends(get_current_user),
):
    return create_user_business_material(
        business_id=business_id,
        material_data=material_data,
        user_id=current_user.id,
    )


@router.put(
    "/{business_id}/materials/{material_id}",
    response_model=BusinessMaterialResponse,
)
def edit_business_material(
    business_id: str,
    material_id: str,
    material_data: BusinessMaterialUpdate,
    current_user: UserResponse = Depends(get_current_user),
):
    return update_user_business_material(
        business_id=business_id,
        material_id=material_id,
        material_data=material_data,
        user_id=current_user.id,
    )


@router.delete(
    "/{business_id}/materials/{material_id}",
    status_code=status.HTTP_204_NO_CONTENT,
)
def remove_business_material(
    business_id: str,
    material_id: str,
    current_user: UserResponse = Depends(get_current_user),
):
    delete_user_business_material(business_id, material_id, current_user.id)

    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.get(
    "/{business_id}/services",
    response_model=list[BusinessServiceResponse],
)
def get_business_services(
    business_id: str,
    current_user: UserResponse = Depends(get_current_user),
):
    return get_user_business_services(business_id, current_user.id)


@router.post(
    "/{business_id}/services",
    response_model=BusinessServiceResponse,
    status_code=status.HTTP_201_CREATED,
)
def add_business_service(
    business_id: str,
    service_data: BusinessServiceCreate,
    current_user: UserResponse = Depends(get_current_user),
):
    return create_user_business_service(
        business_id=business_id,
        service_data=service_data,
        user_id=current_user.id,
    )


@router.put(
    "/{business_id}/services/{service_id}",
    response_model=BusinessServiceResponse,
)
def edit_business_service(
    business_id: str,
    service_id: str,
    service_data: BusinessServiceUpdate,
    current_user: UserResponse = Depends(get_current_user),
):
    return update_user_business_service(
        business_id=business_id,
        service_id=service_id,
        service_data=service_data,
        user_id=current_user.id,
    )


@router.delete(
    "/{business_id}/services/{service_id}",
    status_code=status.HTTP_204_NO_CONTENT,
)
def remove_business_service(
    business_id: str,
    service_id: str,
    current_user: UserResponse = Depends(get_current_user),
):
    delete_user_business_service(business_id, service_id, current_user.id)

    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.post(
    "/{business_id}/services/{service_id}/materials",
    response_model=BusinessServiceResponse,
    status_code=status.HTTP_201_CREATED,
)
def add_material_to_service(
    business_id: str,
    service_id: str,
    recipe_data: BusinessRecipeItemCreate,
    current_user: UserResponse = Depends(get_current_user),
):
    return add_material_to_user_service(
        business_id=business_id,
        service_id=service_id,
        recipe_data=recipe_data,
        user_id=current_user.id,
    )


@router.put(
    "/{business_id}/services/{service_id}/materials/{recipe_item_id}",
    response_model=BusinessServiceResponse,
)
def edit_service_material(
    business_id: str,
    service_id: str,
    recipe_item_id: str,
    recipe_data: BusinessRecipeItemUpdate,
    current_user: UserResponse = Depends(get_current_user),
):
    return update_user_service_material(
        business_id=business_id,
        service_id=service_id,
        recipe_item_id=recipe_item_id,
        recipe_data=recipe_data,
        user_id=current_user.id,
    )


@router.delete(
    "/{business_id}/services/{service_id}/materials/{recipe_item_id}",
    response_model=BusinessServiceResponse,
)
def remove_service_material(
    business_id: str,
    service_id: str,
    recipe_item_id: str,
    current_user: UserResponse = Depends(get_current_user),
):
    return delete_user_service_material(
        business_id=business_id,
        service_id=service_id,
        recipe_item_id=recipe_item_id,
        user_id=current_user.id,
    )


@router.get(
    "/{business_id}/sales",
    response_model=list[BusinessSaleResponse],
)
def get_business_sales(
    business_id: str,
    current_user: UserResponse = Depends(get_current_user),
):
    return get_user_business_sales(business_id, current_user.id)


@router.post(
    "/{business_id}/sales",
    response_model=BusinessSaleResponse,
    status_code=status.HTTP_201_CREATED,
)
def add_business_sale(
    business_id: str,
    sale_data: BusinessSaleCreate,
    current_user: UserResponse = Depends(get_current_user),
):
    return create_user_business_sale(
        business_id=business_id,
        sale_data=sale_data,
        user_id=current_user.id,
    )