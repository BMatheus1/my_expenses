export type CreditCardColor =
  | "slate"
  | "purple"
  | "blue"
  | "emerald"
  | "rose"
  | "amber"
  | "black";

export type CreditCard = {
  id: string;
  name: string;
  brand: string;
  last_four_digits: string;
  closing_day: number;
  due_day: number;
  limit_amount: number | null;
  color: CreditCardColor;
  created_at: string;
};

export type CreateCreditCardRequest = {
  name: string;
  brand: string;
  last_four_digits: string;
  closing_day: number;
  due_day: number;
  limit_amount: number | null;
  color: CreditCardColor;
};