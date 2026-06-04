export type BillingStatus =
  | "none"
  | "trialing"
  | "active"
  | "pending"
  | "past_due"
  | "blocked"
  | "canceled"
  | "expired"
  | "unknown";

export type PaymentStatus =
  | "pending"
  | "paid"
  | "overdue"
  | "failed"
  | "refunded"
  | "canceled"
  | "unknown";

export type BillingStatusResponse = {
  status: BillingStatus;
  payment_status: PaymentStatus;
  plan_name: string;
  amount: number;
  currency: string;
  trial_starts_at: string | null;
  trial_ends_at: string | null;
  days_left_in_trial: number | null;
  current_period_starts_at: string | null;
  current_period_ends_at: string | null;
  next_payment_at: string | null;
  last_payment_at: string | null;
  overdue_since: string | null;
  grace_period_ends_at: string | null;
  days_until_block: number | null;
  blocked_at: string | null;
  block_reason: string | null;
  canceled_at: string | null;
  provider_subscription_id: string | null;
  is_access_allowed: boolean;
  can_cancel: boolean;
  checkout_url: string | null;
  message: string;
};

export type BillingCheckoutResponse = {
  checkout_url: string;
  status: BillingStatus;
  provider: "mercado_pago";
  provider_subscription_id: string | null;
  message: string;
};
