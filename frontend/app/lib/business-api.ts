import { apiRequest } from "@/app/lib/api";
import type {
  Business,
  BusinessCreatePayload,
  BusinessDashboard,
  BusinessDeletePayload,
  BusinessMaterial,
  BusinessMaterialCreatePayload,
  BusinessRecipeItemCreatePayload,
  BusinessRecipeItemUpdatePayload,
  BusinessSale,
  BusinessSaleCreatePayload,
  BusinessService,
  BusinessServiceCreatePayload,
  BusinessServiceUpdatePayload,
  BusinessUpdatePayload,
} from "@/app/types/business";

type RequestOptions = {
  method?: "GET" | "POST" | "PUT" | "DELETE";
  body?: unknown;
};

function businessRequest<T>(
  path: string,
  options: RequestOptions = {},
): Promise<T> {
  return apiRequest<T>(path, {
    method: options.method ?? "GET",
    body: options.body ? JSON.stringify(options.body) : undefined,
  });
}

export function listBusinesses() {
  return businessRequest<Business[]>("/businesses");
}

export function createBusiness(payload: BusinessCreatePayload) {
  return businessRequest<Business>("/businesses", {
    method: "POST",
    body: payload,
  });
}

export function updateBusiness(
  businessId: string,
  payload: BusinessUpdatePayload,
) {
  return businessRequest<Business>(`/businesses/${businessId}`, {
    method: "PUT",
    body: payload,
  });
}

export function deleteBusiness(
  businessId: string,
  payload: BusinessDeletePayload,
) {
  return businessRequest<void>(`/businesses/${businessId}/delete`, {
    method: "POST",
    body: payload,
  });
}

export function getBusinessDashboard(businessId: string) {
  return businessRequest<BusinessDashboard>(
    `/businesses/${businessId}/dashboard`,
  );
}

export function listBusinessMaterials(businessId: string) {
  return businessRequest<BusinessMaterial[]>(
    `/businesses/${businessId}/materials`,
  );
}

export function createBusinessMaterial(
  businessId: string,
  payload: BusinessMaterialCreatePayload,
) {
  return businessRequest<BusinessMaterial>(
    `/businesses/${businessId}/materials`,
    {
      method: "POST",
      body: payload,
    },
  );
}

export function updateBusinessMaterial(
  businessId: string,
  materialId: string,
  payload: BusinessMaterialCreatePayload,
) {
  return businessRequest<BusinessMaterial>(
    `/businesses/${businessId}/materials/${materialId}`,
    {
      method: "PUT",
      body: payload,
    },
  );
}

export function deleteBusinessMaterial(
  businessId: string,
  materialId: string,
) {
  return businessRequest<void>(
    `/businesses/${businessId}/materials/${materialId}`,
    {
      method: "DELETE",
    },
  );
}

export function listBusinessServices(businessId: string) {
  return businessRequest<BusinessService[]>(
    `/businesses/${businessId}/services`,
  );
}

export function createBusinessService(
  businessId: string,
  payload: BusinessServiceCreatePayload,
) {
  return businessRequest<BusinessService>(
    `/businesses/${businessId}/services`,
    {
      method: "POST",
      body: payload,
    },
  );
}

export function updateBusinessService(
  businessId: string,
  serviceId: string,
  payload: BusinessServiceUpdatePayload,
) {
  return businessRequest<BusinessService>(
    `/businesses/${businessId}/services/${serviceId}`,
    {
      method: "PUT",
      body: payload,
    },
  );
}

export function deleteBusinessService(
  businessId: string,
  serviceId: string,
) {
  return businessRequest<void>(
    `/businesses/${businessId}/services/${serviceId}`,
    {
      method: "DELETE",
    },
  );
}

export function addMaterialToService(
  businessId: string,
  serviceId: string,
  payload: BusinessRecipeItemCreatePayload,
) {
  return businessRequest<BusinessService>(
    `/businesses/${businessId}/services/${serviceId}/materials`,
    {
      method: "POST",
      body: payload,
    },
  );
}

export function updateServiceMaterial(
  businessId: string,
  serviceId: string,
  recipeItemId: string,
  payload: BusinessRecipeItemUpdatePayload,
) {
  return businessRequest<BusinessService>(
    `/businesses/${businessId}/services/${serviceId}/materials/${recipeItemId}`,
    {
      method: "PUT",
      body: payload,
    },
  );
}

export function deleteServiceMaterial(
  businessId: string,
  serviceId: string,
  recipeItemId: string,
) {
  return businessRequest<BusinessService>(
    `/businesses/${businessId}/services/${serviceId}/materials/${recipeItemId}`,
    {
      method: "DELETE",
    },
  );
}

export function listBusinessSales(businessId: string) {
  return businessRequest<BusinessSale[]>(`/businesses/${businessId}/sales`);
}

export function createBusinessSale(
  businessId: string,
  payload: BusinessSaleCreatePayload,
) {
  return businessRequest<BusinessSale>(`/businesses/${businessId}/sales`, {
    method: "POST",
    body: payload,
  });
}