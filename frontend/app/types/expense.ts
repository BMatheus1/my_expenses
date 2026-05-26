import type { CreditCard, CreditCardColor } from "./credit-card";

export type PaymentMethod =
  | "cash"
  | "pix"
  | "debit_card"
  | "credit_card"
  | "bank_transfer"
  | "other";

export type ExpenseCreditCardSummary = Pick<
  CreditCard,
  "id" | "name" | "brand" | "last_four_digits" | "due_day"
> & {
  color: CreditCardColor;
};

export type Expense = {
  id: string;
  description: string;
  amount: number;
  category: string;
  date: string;
  created_at: string;
  payment_method: PaymentMethod;
  credit_card_id: string | null;
  credit_card: ExpenseCreditCardSummary | null;
  installments_count: number;
  installment_number: number;
  installment_group_id: string | null;
  invoice_month: string | null;
};

export type CreateExpenseRequest = {
  description: string;
  amount: number;
  category: string;
  date: string;
  payment_method: PaymentMethod;
  credit_card_id: string | null;
  installments_count: number;
};