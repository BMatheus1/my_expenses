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

const API_URL = process.env.NEXT_PUBLIC_API_URL;

type RequestOptions = {
  method?: "GET" | "POST" | "PUT" | "DELETE";
  body?: unknown;
};

class ApiError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

async function businessRequest<T>(
  path: string,
  options: RequestOptions = {},
): Promise<T> {
  if (!API_URL) {
    throw new Error("NEXT_PUBLIC_API_URL não está configurada.");
  }

  const token = getTokenFromStorage();

  let response: Response;

  try {
    response = await fetch(`${API_URL}${path}`, {
      method: options.method ?? "GET",
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: options.body ? JSON.stringify(options.body) : undefined,
    });
  } catch {
    throw new ApiError(
      "Não foi possível conectar ao backend. Verifique se a API está rodando e se a URL em NEXT_PUBLIC_API_URL está correta.",
      0,
    );
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

function getTokenFromStorage(): string | null {
  if (typeof window === "undefined") {
    return null;
  }

  const knownKeys = [
    "auth_token",
    "access_token",
    "my_expenses_token",
    "my_expenses_auth_token",
    "my-expenses-token",
  ];

  for (const key of knownKeys) {
    const value = window.localStorage.getItem(key);

    if (isJwt(value)) {
      return value;
    }

    const tokenFromJson = findTokenInJson(value);

    if (tokenFromJson) {
      return tokenFromJson;
    }
  }

  return findTokenScanningStorage();
}

function findTokenScanningStorage(): string | null {
  for (let index = 0; index < window.localStorage.length; index += 1) {
    const key = window.localStorage.key(index);

    if (!key) {
      continue;
    }

    const value = window.localStorage.getItem(key);

    if (isJwt(value)) {
      return value;
    }

    const tokenFromJson = findTokenInJson(value);

    if (tokenFromJson) {
      return tokenFromJson;
    }
  }

  return null;
}

function findTokenInJson(value: string | null): string | null {
  if (!value) {
    return null;
  }

  try {
    const parsedValue = JSON.parse(value);

    return findTokenInObject(parsedValue);
  } catch {
    return null;
  }
}

function findTokenInObject(value: unknown): string | null {
  if (!value || typeof value !== "object") {
    return null;
  }

  if (Array.isArray(value)) {
    for (const item of value) {
      const token = findTokenInObject(item);

      if (token) {
        return token;
      }
    }

    return null;
  }

  const objectValue = value as Record<string, unknown>;

  for (const key of ["access_token", "token", "authToken"]) {
    const possibleToken = objectValue[key];

    if (typeof possibleToken === "string" && isJwt(possibleToken)) {
      return possibleToken;
    }
  }

  for (const nestedValue of Object.values(objectValue)) {
    const token = findTokenInObject(nestedValue);

    if (token) {
      return token;
    }
  }

  return null;
}

function isJwt(value: string | null): value is string {
  if (!value) {
    return false;
  }

  return /^[A-Za-z0-9-_]+\.[A-Za-z0-9-_]+\.[A-Za-z0-9-_]+$/.test(value);
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