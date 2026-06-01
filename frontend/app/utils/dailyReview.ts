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

function roundCurrency(value: number) {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}
