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
  | "subscription_screen_viewed";

export function trackEvent(
  eventName: TrackingEventName,
  payload: TrackingPayload = {},
) {
  if (process.env.NODE_ENV !== "development") {
    return;
  }

  console.info("[tracking]", eventName, payload);
}
