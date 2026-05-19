export type Expense = {
  id: string;
  description: string;
  amount: number;
  category: string;
  date: string;
  created_at: string;
};

export type CreateExpenseRequest = {
  description: string;
  amount: number;
  category: string;
  date: string;
};