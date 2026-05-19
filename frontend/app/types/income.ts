export type Income = {
  id: string;
  description: string;
  amount: number;
  source: string;
  date: string;
  created_at: string;
};

export type CreateIncomeRequest = {
  description: string;
  amount: number;
  source: string;
  date: string;
};