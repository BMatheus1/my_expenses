import type {
  BillingCheckoutResponse,
  BillingStatusResponse,
} from "../types/billing";
import { apiRequest } from "./api";

export function getBillingStatus(): Promise<BillingStatusResponse> {
  return apiRequest<BillingStatusResponse>("/billing/me");
}

export function createCheckout(): Promise<BillingCheckoutResponse> {
  return apiRequest<BillingCheckoutResponse>("/billing/checkout", {
    method: "POST",
  });
}

export function cancelSubscription(): Promise<BillingStatusResponse> {
  return apiRequest<BillingStatusResponse>("/billing/cancel", {
    method: "POST",
  });
}
