export type SubscriptionStatus =
  | "trial_active"
  | "active"
  | "trial_expired"
  | "past_due"
  | "canceled"
  | "inactive";

export type SubscriptionStatusResponse = {
  id: string;
  user_id: string;
  status: SubscriptionStatus;
  can_access_app: boolean;
  can_start_trial: boolean;
  trial_start_at: string | null;
  trial_end_at: string | null;
  trial_days_remaining: number;
  monthly_price: number;
  currency_id: string;
  provider: string | null;
  current_period_start: string | null;
  current_period_end: string | null;
  cancel_at_period_end: boolean;
  checkout_url: string | null;
  message: string;
};

export type SubscriptionCheckoutResponse = {
  checkout_url: string;
  provider: string;
  provider_subscription_id: string | null;
  status: SubscriptionStatus;
  message: string;
};
