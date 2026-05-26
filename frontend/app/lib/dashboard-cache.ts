import type { ExpenseCategory } from "../types/category";
import type { CreditCard } from "../types/credit-card";
import type { Expense } from "../types/expense";
import type { Income } from "../types/income";

const DASHBOARD_CACHE_KEY = "my-expenses:dashboard-cache:v1";

export type DashboardCache = {
  expenses: Expense[];
  incomes: Income[];
  creditCards: CreditCard[];
  categoryRecords: ExpenseCategory[];
  savedAt: string;
};

type SaveDashboardCacheParams = {
  expenses: Expense[];
  incomes: Income[];
  creditCards: CreditCard[];
  categoryRecords: ExpenseCategory[];
};

export function readDashboardCache(): DashboardCache | null {
  if (typeof window === "undefined") {
    return null;
  }

  try {
    const rawCache = window.localStorage.getItem(DASHBOARD_CACHE_KEY);

    if (!rawCache) {
      return null;
    }

    const parsedCache = JSON.parse(rawCache) as DashboardCache;

    if (!isValidDashboardCache(parsedCache)) {
      clearDashboardCache();
      return null;
    }

    return parsedCache;
  } catch {
    clearDashboardCache();
    return null;
  }
}

export function saveDashboardCache({
  expenses,
  incomes,
  creditCards,
  categoryRecords,
}: SaveDashboardCacheParams) {
  if (typeof window === "undefined") {
    return;
  }

  const hasUsefulData =
    expenses.length > 0 ||
    incomes.length > 0 ||
    creditCards.length > 0 ||
    categoryRecords.some((category) => category.id !== null);

  if (!hasUsefulData) {
    return;
  }

  const cache: DashboardCache = {
    expenses,
    incomes,
    creditCards,
    categoryRecords,
    savedAt: new Date().toISOString(),
  };

  try {
    window.localStorage.setItem(DASHBOARD_CACHE_KEY, JSON.stringify(cache));
  } catch {
    // Se o navegador bloquear ou o armazenamento estiver cheio,
    // o app continua funcionando normalmente sem cache local.
  }
}

export function clearDashboardCache() {
  if (typeof window === "undefined") {
    return;
  }

  try {
    window.localStorage.removeItem(DASHBOARD_CACHE_KEY);
  } catch {
    // Falha silenciosa para não impactar a experiência do usuário.
  }
}

export function formatDashboardCacheDate(savedAt: string) {
  try {
    return new Intl.DateTimeFormat("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    }).format(new Date(savedAt));
  } catch {
    return "";
  }
}

function isValidDashboardCache(cache: DashboardCache) {
  return (
    Array.isArray(cache.expenses) &&
    Array.isArray(cache.incomes) &&
    Array.isArray(cache.creditCards) &&
    Array.isArray(cache.categoryRecords) &&
    typeof cache.savedAt === "string"
  );
}