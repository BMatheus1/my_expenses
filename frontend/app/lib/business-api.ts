import { clearAuthToken, getAuthToken } from "@/app/lib/api";
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

const DEFAULT_API_URL = "http://127.0.0.1:8000/api";

const API_URL = (
  process.env.NEXT_PUBLIC_API_URL?.trim() || DEFAULT_API_URL
).replace(/\/$/, "");

type RequestOptions = {
  method?: "GET" | "POST" | "PUT" | "DELETE";
  body?: unknown;
};

class ApiError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

async function businessRequest<T>(
  path: string,
  options: RequestOptions = {},
): Promise<T> {
  const token = getAuthToken();
  const headers = new Headers();

  headers.set("Content-Type", "application/json");

  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  const requestUrl = `${API_URL}${path}`;
  let response: Response;

  try {
    response = await fetch(requestUrl, {
      method: options.method ?? "GET",
      headers,
      body: options.body ? JSON.stringify(options.body) : undefined,
      cache: "no-store",
    });
  } catch {
    throw new ApiError(
      `Não foi possível conectar ao backend. Verifique se a API está online e se a URL está correta: ${requestUrl}`,
      0,
    );
  }

  if (response.status === 401 || response.status === 403) {
    clearAuthToken();
  }

  if (response.status === 204) {
    return undefined as T;
  }

  const rawText = await response.text();
  const data = parseJsonSafely(rawText);

  if (!response.ok) {
    throw new ApiError(getErrorMessage(data, rawText), response.status);
  }

  return data as T;
}

function parseJsonSafely(text: string): unknown {
  if (!text) {
    return null;
  }

  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

function getErrorMessage(data: unknown, fallbackText = ""): string {
  if (
    data &&
    typeof data === "object" &&
    "detail" in data &&
    typeof data.detail === "string"
  ) {
    return data.detail;
  }

  if (fallbackText) {
    return fallbackText;
  }

  return "Não foi possível concluir a operação.";
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