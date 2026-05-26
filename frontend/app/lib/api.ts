import type {
  CreateExpenseCategoryRequest,
  ExpenseCategory,
  UpdateExpenseCategoryRequest,
} from "../types/category";

import type {
  AuthResponse,
  DeleteAccountRequest,
  ForgotPasswordRequest,
  GoogleLoginRequest,
  LoginRequest,
  MessageResponse,
  RegisterRequest,
  ResendVerificationEmailRequest,
  ResetPasswordRequest,
  User,
  VerifyEmailRequest,
} from "../types/auth";
import type {
  CreateCreditCardRequest,
  CreditCard,
} from "../types/credit-card";
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

const DEFAULT_REQUEST_TIMEOUT_MS = 15000;

function isBrowserOffline() {
  return typeof navigator !== "undefined" && navigator.onLine === false;
}

function getNetworkErrorMessage(error?: unknown) {
  if (isBrowserOffline()) {
    return "Você está sem internet. Conecte-se para sincronizar suas informações.";
  }

  if (error instanceof Error && error.name === "AbortError") {
    return "A conexão demorou mais que o esperado. Verifique sua internet e tente novamente.";
  }

  return "Não foi possível conectar ao servidor agora. Tente novamente em alguns segundos.";
}

type ApiValidationError = {
  msg?: string;
};

type UnauthorizedHandler = () => void;

type ApiRequestConfig = {
  skipAuthHeader?: boolean;
  skipAuthRefresh?: boolean;
  timeoutMs?: number;
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

async function refreshAccessTokenRequest(): Promise<boolean> {
  if (isBrowserOffline()) {
    throw new ApiError(getNetworkErrorMessage(), 0);
  }

  let response: Response;
  const requestUrl = `${API_URL}/auth/refresh`;
  const controller = new AbortController();
  const timeoutId = setTimeout(() => {
    controller.abort();
  }, DEFAULT_REQUEST_TIMEOUT_MS);

  try {
    response = await fetch(requestUrl, {
      method: "POST",
      credentials: "include",
      cache: "no-store",
      signal: controller.signal,
    });
  } catch (error) {
    throw new ApiError(getNetworkErrorMessage(error), 0);
  } finally {
    clearTimeout(timeoutId);
  }

  if (!response.ok) {
    clearAuthToken();
    return false;
  }

  const authResponse = (await response.json()) as AuthResponse;
  setAuthToken(authResponse.access_token);

  return true;
}

async function requestWithAuth(
  path: string,
  options: RequestInit,
  config: ApiRequestConfig,
): Promise<Response> {
  if (isBrowserOffline()) {
    throw new ApiError(getNetworkErrorMessage(), 0);
  }

  const headers = new Headers(options.headers);
  const token = getAuthToken();

  if (token && !config.skipAuthHeader) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  if (options.body && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  const requestUrl = `${API_URL}${path}`;
  const controller = new AbortController();
  const timeoutId = setTimeout(() => {
    controller.abort();
  }, config.timeoutMs ?? DEFAULT_REQUEST_TIMEOUT_MS);

  try {
    return await fetch(requestUrl, {
      ...options,
      headers,
      credentials: "include",
      cache: "no-store",
      signal: controller.signal,
    });
  } catch (error) {
    throw new ApiError(getNetworkErrorMessage(error), 0);
  } finally {
    clearTimeout(timeoutId);
  }
}

async function handleResponse<T>(
  response: Response,
  path: string,
  options: RequestInit,
  config: ApiRequestConfig,
): Promise<T> {
  if (response.status === 401 && !config.skipAuthRefresh) {
    const refreshed = await refreshAccessToken();

    if (refreshed) {
      const retryResponse = await requestWithAuth(path, options, {
        ...config,
        skipAuthRefresh: true,
      });

      return handleResponse<T>(retryResponse, path, options, {
        ...config,
        skipAuthRefresh: true,
      });
    }

    unauthorizedHandler?.();
  }

  if (!response.ok) {
    const errorMessage = await extractApiErrorMessage(response);

    throw new ApiError(errorMessage, response.status);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return response.json() as Promise<T>;
}

async function apiFetch<T>(
  path: string,
  options: RequestInit = {},
  config: ApiRequestConfig = {},
): Promise<T> {
  const response = await requestWithAuth(path, options, config);

  return handleResponse<T>(response, path, options, config);
}

async function extractApiErrorMessage(response: Response): Promise<string> {
  try {
    const data = await response.json();

    if (typeof data.detail === "string") {
      return data.detail;
    }

    if (Array.isArray(data.detail)) {
      const firstError = data.detail[0] as ApiValidationError | undefined;

      if (firstError?.msg) {
        return firstError.msg;
      }
    }

    if (typeof data.message === "string") {
      return data.message;
    }
  } catch {
    return "Não foi possível concluir a operação.";
  }

  return "Não foi possível concluir a operação.";
}

export async function registerUser(data: RegisterRequest): Promise<AuthResponse> {
  const response = await apiFetch<AuthResponse>(
    "/auth/register",
    {
      method: "POST",
      body: JSON.stringify(data),
    },
    {
      skipAuthHeader: true,
      skipAuthRefresh: true,
    },
  );

  setAuthToken(response.access_token);

  return response;
}

export async function loginUser(data: LoginRequest): Promise<AuthResponse> {
  const response = await apiFetch<AuthResponse>(
    "/auth/login",
    {
      method: "POST",
      body: JSON.stringify(data),
    },
    {
      skipAuthHeader: true,
      skipAuthRefresh: true,
    },
  );

  setAuthToken(response.access_token);

  return response;
}

export async function loginWithGoogle(
  data: GoogleLoginRequest,
): Promise<AuthResponse> {
  const response = await apiFetch<AuthResponse>(
    "/auth/google",
    {
      method: "POST",
      body: JSON.stringify(data),
    },
    {
      skipAuthHeader: true,
      skipAuthRefresh: true,
    },
  );

  setAuthToken(response.access_token);

  return response;
}

export async function getCurrentUser(): Promise<User> {
  return apiFetch<User>("/auth/me");
}

export async function verifyEmail(
  data: VerifyEmailRequest,
): Promise<MessageResponse> {
  return apiFetch<MessageResponse>(
    "/auth/verify-email",
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

export async function resendVerificationEmail(
  data: ResendVerificationEmailRequest,
): Promise<MessageResponse> {
  return apiFetch<MessageResponse>(
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

export async function forgotPassword(
  data: ForgotPasswordRequest,
): Promise<MessageResponse> {
  return apiFetch<MessageResponse>(
    "/auth/forgot-password",
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

export async function resetPassword(
  data: ResetPasswordRequest,
): Promise<MessageResponse> {
  return apiFetch<MessageResponse>(
    "/auth/reset-password",
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

export async function deleteCurrentAccount(
  data: DeleteAccountRequest,
): Promise<MessageResponse> {
  const response = await apiFetch<MessageResponse>("/auth/delete-account", {
    method: "DELETE",
    body: JSON.stringify(data),
  });

  clearAuthToken();

  return response;
}

export async function getExpenses(): Promise<Expense[]> {
  return apiFetch<Expense[]>("/expenses");
}

export async function createExpense(
  data: CreateExpenseRequest,
): Promise<Expense> {
  return apiFetch<Expense>("/expenses", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export async function updateExpense(
  expenseId: string,
  data: CreateExpenseRequest,
): Promise<Expense> {
  return apiFetch<Expense>(`/expenses/${expenseId}`, {
    method: "PUT",
    body: JSON.stringify(data),
  });
}

export async function deleteExpense(expenseId: string): Promise<void> {
  return apiFetch<void>(`/expenses/${expenseId}`, {
    method: "DELETE",
  });
}

export async function getIncomes(): Promise<Income[]> {
  return apiFetch<Income[]>("/incomes");
}

export async function createIncome(data: CreateIncomeRequest): Promise<Income> {
  return apiFetch<Income>("/incomes", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export async function updateIncome(
  incomeId: string,
  data: CreateIncomeRequest,
): Promise<Income> {
  return apiFetch<Income>(`/incomes/${incomeId}`, {
    method: "PUT",
    body: JSON.stringify(data),
  });
}

export async function deleteIncome(incomeId: string): Promise<void> {
  return apiFetch<void>(`/incomes/${incomeId}`, {
    method: "DELETE",
  });
}

export async function getExpenseCategories(): Promise<ExpenseCategory[]> {
  return apiFetch<ExpenseCategory[]>("/expense-categories");
}

export async function createExpenseCategory(
  data: CreateExpenseCategoryRequest,
): Promise<ExpenseCategory> {
  return apiFetch<ExpenseCategory>("/expense-categories", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export async function updateExpenseCategory(
  categoryId: string,
  data: UpdateExpenseCategoryRequest,
): Promise<ExpenseCategory> {
  return apiFetch<ExpenseCategory>(`/expense-categories/${categoryId}`, {
    method: "PUT",
    body: JSON.stringify(data),
  });
}

export async function deleteExpenseCategory(categoryId: string): Promise<void> {
  return apiFetch<void>(`/expense-categories/${categoryId}`, {
    method: "DELETE",
  });
}

export async function getCreditCards(): Promise<CreditCard[]> {
  return apiFetch<CreditCard[]>("/credit-cards");
}

export async function createCreditCard(
  data: CreateCreditCardRequest,
): Promise<CreditCard> {
  return apiFetch<CreditCard>("/credit-cards", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export async function updateCreditCard(
  creditCardId: string,
  data: CreateCreditCardRequest,
): Promise<CreditCard> {
  return apiFetch<CreditCard>(`/credit-cards/${creditCardId}`, {
    method: "PUT",
    body: JSON.stringify(data),
  });
}

export async function deleteCreditCard(creditCardId: string): Promise<void> {
  return apiFetch<void>(`/credit-cards/${creditCardId}`, {
    method: "DELETE",
  });
}