import type {
  CreateExpenseCategoryRequest,
  ExpenseCategory,
  UpdateExpenseCategoryRequest,
} from "../types/category";

import type {
  AuthResponse,
  ForgotPasswordRequest,
  GoogleLoginRequest,
  LoginRequest,
  MessageResponse,
  RegisterRequest,
  ResendVerificationEmailRequest,
  ResetPasswordRequest,
  User,
  VerifyEmailRequest,
  DeleteAccountRequest,
} from "../types/auth";
import type { CreateExpenseRequest, Expense } from "../types/expense";
import type { CreateIncomeRequest, Income } from "../types/income";
import {
  clearStoredAuthToken,
  getStoredAuthToken,
  storeAuthToken,
} from "./security";

const DEFAULT_API_URL = "http://127.0.0.1:8000/api";

const API_URL = (
  process.env.NEXT_PUBLIC_API_URL?.trim() || DEFAULT_API_URL
).replace(/\/$/, "");

type ApiValidationError = {
  msg?: string;
};

type UnauthorizedHandler = () => void;

type ApiRequestConfig = {
  skipAuthHeader?: boolean;
  skipAuthRefresh?: boolean;
};

let unauthorizedHandler: UnauthorizedHandler | null = null;
let refreshPromise: Promise<boolean> | null = null;

export class ApiError extends Error {
  statusCode: number;

  constructor(message: string, statusCode: number) {
    super(message);
    this.name = "ApiError";
    this.statusCode = statusCode;
  }
}

export function setUnauthorizedHandler(handler: UnauthorizedHandler | null) {
  unauthorizedHandler = handler;
}

export function getAuthToken() {
  return getStoredAuthToken();
}

export function setAuthToken(token: string) {
  storeAuthToken(token);
}

export function clearAuthToken() {
  clearStoredAuthToken();
}

export async function logoutCurrentSession(): Promise<void> {
  try {
    await fetch(`${API_URL}/auth/logout`, {
      method: "POST",
      credentials: "include",
      cache: "no-store",
    });
  } finally {
    clearAuthToken();
  }
}

export async function refreshAccessToken(): Promise<boolean> {
  if (refreshPromise) {
    return refreshPromise;
  }

  refreshPromise = refreshAccessTokenRequest().finally(() => {
    refreshPromise = null;
  });

  return refreshPromise;
}

function handleUnauthorizedResponse() {
  clearAuthToken();

  if (unauthorizedHandler) {
    unauthorizedHandler();
  }
}

async function refreshAccessTokenRequest(): Promise<boolean> {
  let response: Response;

  try {
    response = await fetch(`${API_URL}/auth/refresh`, {
      method: "POST",
      credentials: "include",
      cache: "no-store",
    });
  } catch {
    clearAuthToken();
    return false;
  }

  if (!response.ok) {
    clearAuthToken();
    return false;
  }

  const authResponse = (await response.json()) as AuthResponse;
  setAuthToken(authResponse.access_token);

  return true;
}

async function getErrorMessage(response: Response) {
  const fallbackMessage = "Erro na comunicação com a API.";

  try {
    const data = await response.json();

    if (typeof data.detail === "string") {
      return data.detail;
    }

    if (Array.isArray(data.detail)) {
      const validationMessage = data.detail
        .map((item: ApiValidationError) => item.msg)
        .filter(Boolean)
        .join(" ");

      return validationMessage || fallbackMessage;
    }

    return fallbackMessage;
  } catch {
    return fallbackMessage;
  }
}

async function parseApiResponse<T>(response: Response): Promise<T> {
  if (response.status === 204) {
    return undefined as T;
  }

  return response.json() as Promise<T>;
}

async function requestWithAuth(
  path: string,
  options: RequestInit,
  config: ApiRequestConfig,
): Promise<Response> {
  const headers = new Headers(options.headers);
  const token = getAuthToken();

  if (token && !config.skipAuthHeader) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  if (options.body && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  const requestUrl = `${API_URL}${path}`;

  try {
    return await fetch(requestUrl, {
      ...options,
      headers,
      credentials: "include",
      cache: "no-store",
    });
  } catch {
    throw new ApiError(
      `Não foi possível conectar ao backend. Verifique se a API está online e se a URL está correta: ${requestUrl}`,
      0,
    );
  }
}

export async function apiRequest<T>(
  path: string,
  options: RequestInit = {},
  config: ApiRequestConfig = {},
): Promise<T> {
  let response = await requestWithAuth(path, options, config);

  if (response.status === 401 && !config.skipAuthRefresh) {
    const refreshed = await refreshAccessToken();

    if (refreshed) {
      response = await requestWithAuth(path, options, config);
    }
  }

  if (!response.ok) {
    const message = await getErrorMessage(response);

    if (response.status === 401 || response.status === 403) {
      handleUnauthorizedResponse();
    }

    throw new ApiError(message, response.status);
  }

  return parseApiResponse<T>(response);
}

export async function registerWithEmail(
  userData: RegisterRequest,
): Promise<MessageResponse> {
  return apiRequest<MessageResponse>(
    "/auth/register",
    {
      method: "POST",
      body: JSON.stringify(userData),
    },
    {
      skipAuthHeader: true,
      skipAuthRefresh: true,
    },
  );
}

export async function loginWithEmail(
  loginData: LoginRequest,
): Promise<AuthResponse> {
  return apiRequest<AuthResponse>(
    "/auth/login",
    {
      method: "POST",
      body: JSON.stringify(loginData),
    },
    {
      skipAuthHeader: true,
      skipAuthRefresh: true,
    },
  );
}

export async function loginWithGoogle(
  loginData: GoogleLoginRequest,
): Promise<AuthResponse> {
  return apiRequest<AuthResponse>(
    "/auth/google",
    {
      method: "POST",
      body: JSON.stringify(loginData),
    },
    {
      skipAuthHeader: true,
      skipAuthRefresh: true,
    },
  );
}

export async function verifyEmail(
  verificationData: VerifyEmailRequest,
): Promise<AuthResponse> {
  return apiRequest<AuthResponse>(
    "/auth/verify-email",
    {
      method: "POST",
      body: JSON.stringify(verificationData),
    },
    {
      skipAuthHeader: true,
      skipAuthRefresh: true,
    },
  );
}

export async function resendVerificationEmail(
  data: ResendVerificationEmailRequest,
): Promise<MessageResponse> {
  return apiRequest<MessageResponse>(
    "/auth/resend-verification-email",
    {
      method: "POST",
      body: JSON.stringify(data),
    },
    {
      skipAuthHeader: true,
      skipAuthRefresh: true,
    },
  );
}

export async function requestPasswordReset(
  resetData: ForgotPasswordRequest,
): Promise<MessageResponse> {
  return apiRequest<MessageResponse>(
    "/auth/forgot-password",
    {
      method: "POST",
      body: JSON.stringify(resetData),
    },
    {
      skipAuthHeader: true,
      skipAuthRefresh: true,
    },
  );
}

export async function resetPassword(
  resetData: ResetPasswordRequest,
): Promise<MessageResponse> {
  return apiRequest<MessageResponse>(
    "/auth/reset-password",
    {
      method: "POST",
      body: JSON.stringify(resetData),
    },
    {
      skipAuthHeader: true,
      skipAuthRefresh: true,
    },
  );
}

export async function getCurrentUser(): Promise<User> {
  if (!getAuthToken()) {
    const refreshed = await refreshAccessToken();

    if (!refreshed) {
      throw new ApiError("Usuário não autenticado.", 401);
    }
  }

  return apiRequest<User>("/auth/me");
}

export async function getExpenseCategories(): Promise<ExpenseCategory[]> {
  return apiRequest<ExpenseCategory[]>("/expense-categories");
}

export async function createExpenseCategory(
  category: CreateExpenseCategoryRequest,
): Promise<ExpenseCategory> {
  return apiRequest<ExpenseCategory>("/expense-categories", {
    method: "POST",
    body: JSON.stringify(category),
  });
}

export async function updateExpenseCategory(
  categoryId: string,
  category: UpdateExpenseCategoryRequest,
): Promise<ExpenseCategory> {
  return apiRequest<ExpenseCategory>(`/expense-categories/${categoryId}`, {
    method: "PUT",
    body: JSON.stringify(category),
  });
}

export async function deleteExpenseCategory(categoryId: string): Promise<void> {
  await apiRequest<void>(`/expense-categories/${categoryId}`, {
    method: "DELETE",
  });
}

export async function getExpenses(): Promise<Expense[]> {
  return apiRequest<Expense[]>("/expenses");
}

export async function createExpense(
  expense: CreateExpenseRequest,
): Promise<Expense> {
  return apiRequest<Expense>("/expenses", {
    method: "POST",
    body: JSON.stringify(expense),
  });
}

export async function updateExpense(
  expenseId: string,
  expense: CreateExpenseRequest,
): Promise<Expense> {
  return apiRequest<Expense>(`/expenses/${expenseId}`, {
    method: "PUT",
    body: JSON.stringify(expense),
  });
}

export async function deleteExpense(expenseId: string): Promise<void> {
  await apiRequest<void>(`/expenses/${expenseId}`, {
    method: "DELETE",
  });
}

export async function getIncomes(): Promise<Income[]> {
  return apiRequest<Income[]>("/incomes");
}

export async function createIncome(
  income: CreateIncomeRequest,
): Promise<Income> {
  return apiRequest<Income>("/incomes", {
    method: "POST",
    body: JSON.stringify(income),
  });
}

export async function updateIncome(
  incomeId: string,
  income: CreateIncomeRequest,
): Promise<Income> {
  return apiRequest<Income>(`/incomes/${incomeId}`, {
    method: "PUT",
    body: JSON.stringify(income),
  });
}

export async function deleteIncome(incomeId: string): Promise<void> {
  await apiRequest<void>(`/incomes/${incomeId}`, {
    method: "DELETE",
  });
}

export async function deleteAccount(
  data: DeleteAccountRequest,
): Promise<MessageResponse> {
  return apiRequest<MessageResponse>("/auth/account", {
    method: "DELETE",
    body: JSON.stringify(data),
  });
}