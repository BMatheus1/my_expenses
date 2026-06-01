import type { CreateExpenseRequest, Expense } from "../types/expense";
import { formatCurrency } from "./formatters";

export const MISC_EXPENSE_CATEGORY = "Miudezas";
export const QUICK_EXPENSE_AMOUNTS = [5, 10, 15, 20, 30, 50] as const;
export const QUICK_EXPENSE_CATEGORY_SUGGESTIONS = [
  "Alimentação",
  "Transporte",
  "Mercado",
  "Lazer",
  "Pix",
  MISC_EXPENSE_CATEGORY,
  "Outro",
] as const;

export function calculateTodayExpenseTotal(
  expenses: Expense[],
  today: string,
) {
  return roundCurrency(
    expenses
      .filter((expense) => expense.date === today)
      .reduce((total, expense) => total + expense.amount, 0),
  );
}

export function calculateMissingAmount(
  informedTotal: number,
  registeredTotal: number,
) {
  return Math.max(0, roundCurrency(informedTotal - registeredTotal));
}

export function buildQuickExpensePayload({
  amount,
  category,
  date,
}: {
  amount: number;
  category: string;
  date: string;
}): CreateExpenseRequest {
  const normalizedCategory = category.trim() || MISC_EXPENSE_CATEGORY;

  return {
    description:
      normalizedCategory === MISC_EXPENSE_CATEGORY
        ? "Miudezas do dia"
        : `Gasto rápido - ${normalizedCategory}`,
    amount: roundCurrency(amount),
    category: normalizedCategory,
    date,
    payment_method: "pix",
    credit_card_id: null,
    installments_count: 1,
  };
}

export function buildDailyReviewExpensePayload({
  amount,
  category,
  date,
}: {
  amount: number;
  category: string;
  date: string;
}): CreateExpenseRequest {
  const normalizedCategory = category.trim() || MISC_EXPENSE_CATEGORY;

  return {
    description:
      normalizedCategory === MISC_EXPENSE_CATEGORY
        ? "Miudezas do dia"
        : `Fechamento do dia - ${normalizedCategory}`,
    amount: roundCurrency(amount),
    category: normalizedCategory,
    date,
    payment_method: "pix",
    credit_card_id: null,
    installments_count: 1,
  };
}

export function formatCurrencyBRL(value: number) {
  return formatCurrency(value);
}

export function getTopExpenseCategories(expenses: Expense[], limit = 3) {
  const totals = expenses.reduce<Record<string, number>>((accumulator, expense) => {
    accumulator[expense.category] =
      (accumulator[expense.category] || 0) + expense.amount;

    return accumulator;
  }, {});

  return Object.entries(totals)
    .map(([category, total]) => ({
      category,
      total: roundCurrency(total),
    }))
    .sort((first, second) => second.total - first.total)
    .slice(0, limit);
}

export function getTopExpenseCategory(expenses: Expense[]) {
  return getTopExpenseCategories(expenses, 1)[0] ?? null;
}

export function getMonthlyMiudezasTotal(expenses: Expense[]) {
  return roundCurrency(
    expenses
      .filter(
        (expense) =>
          normalizeCategoryKey(expense.category) ===
          normalizeCategoryKey(MISC_EXPENSE_CATEGORY),
      )
      .reduce((total, expense) => total + expense.amount, 0),
  );
}

export function getMonthlyInsightMessage(expenses: Expense[]) {
  if (expenses.length === 0) {
    return "Seu mês começou. Registre alguns gastos para acompanhar melhor.";
  }

  if (expenses.length < 3) {
    return "Você ainda não registrou gastos suficientes para gerar um resumo.";
  }

  const miudezasTotal = getMonthlyMiudezasTotal(expenses);

  if (miudezasTotal > 0) {
    return `Miudezas somaram ${formatCurrencyBRL(miudezasTotal)} este mês.`;
  }

  const topCategory = getTopExpenseCategory(expenses);

  if (!topCategory) {
    return "Seu mês começou. Registre alguns gastos para acompanhar melhor.";
  }

  return `Seu maior gasto este mês foi com ${topCategory.category}.`;
}

function normalizeCategoryKey(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .replace(/\s+/g, " ")
    .toLocaleLowerCase("pt-BR");
}

function roundCurrency(value: number) {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}
