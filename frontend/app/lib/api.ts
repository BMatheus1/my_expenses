import type {
  CreateExpenseCategoryRequest,
  ExpenseCategory,
  UpdateExpenseCategoryRequest,
} from "../types/category";

import type {
  AuthResponse,
  GoogleLoginRequest,
  LoginRequest,
  RegisterRequest,
  User,
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

let unauthorizedHandler: UnauthorizedHandler | null = null;

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

function handleUnauthorizedResponse() {
  clearAuthToken();

  if (unauthorizedHandler) {
    unauthorizedHandler();
  }
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

async function handleApiResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    const message = await getErrorMessage(response);

    if (response.status === 401 || response.status === 403) {
      handleUnauthorizedResponse();
    }

    throw new ApiError(message, response.status);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return response.json() as Promise<T>;
}

async function apiRequest<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const headers = new Headers(options.headers);
  const token = getAuthToken();

  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  if (options.body && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  const requestUrl = `${API_URL}${path}`;
  let response: Response;

  try {
    response = await fetch(requestUrl, {
      ...options,
      headers,
      cache: "no-store",
    });
  } catch {
    throw new ApiError(
      `Não foi possível conectar ao backend. Verifique se a API está online e se a URL está correta: ${requestUrl}`,
      0,
    );
  }

  return handleApiResponse<T>(response);
}

export async function registerWithEmail(
  userData: RegisterRequest,
): Promise<AuthResponse> {
  return apiRequest<AuthResponse>("/auth/register", {
    method: "POST",
    body: JSON.stringify(userData),
  });
}

export async function loginWithEmail(
  loginData: LoginRequest,
): Promise<AuthResponse> {
  return apiRequest<AuthResponse>("/auth/login", {
    method: "POST",
    body: JSON.stringify(loginData),
  });
}

export async function loginWithGoogle(
  loginData: GoogleLoginRequest,
): Promise<AuthResponse> {
  return apiRequest<AuthResponse>("/auth/google", {
    method: "POST",
    body: JSON.stringify(loginData),
  });
}

export async function getCurrentUser(): Promise<User> {
  const token = getAuthToken();

  if (!token) {
    throw new ApiError("Usuário não autenticado.", 401);
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