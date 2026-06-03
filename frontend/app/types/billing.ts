export type BillingStatus =
  | "none"
  | "trialing"
  | "active"
  | "pending"
  | "past_due"
  | "canceled"
  | "expired"
  | "unknown";

export type BillingStatusResponse = {
  status: BillingStatus;
  plan_name: string;
  amount: number;
  currency: string;
  trial_ends_at: string | null;
  current_period_ends_at: string | null;
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
