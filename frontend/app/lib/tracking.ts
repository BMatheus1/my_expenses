type TrackingPayload = Record<string, string | number | boolean | null | undefined>;

export type TrackingEventName =
  | "landing_cta_clicked"
  | "trial_start_clicked"
  | "checkout_started"
  | "checkout_returned"
  | "signup_completed"
  | "first_expense_created"
  | "quick_expense_created"
  | "daily_review_completed"
  | "subscription_status_loaded"
  | "trial_expired_viewed"
  | "subscription_screen_viewed"
  | "payment_return_accessed"
  | "payment_return_sync_called"
  | "payment_return_sync_result"
  | "payment_return_auth_required"
  | "post_auth_redirect_applied";

export function trackEvent(
  eventName: TrackingEventName,
  payload: TrackingPayload = {},
) {
  if (process.env.NODE_ENV !== "development") {
    return;
  }

  console.info("[tracking]", eventName, payload);
}
