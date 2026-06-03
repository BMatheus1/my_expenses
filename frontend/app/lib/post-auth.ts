import { getBillingStatus } from "./billing-api";
import type { BillingStatusResponse } from "../types/billing";

export type PostAuthDestination = "app" | "paywall";

export type PostAuthResolution = {
  destination: PostAuthDestination;
  billing: BillingStatusResponse;
};

export async function resolvePostAuthDestination(): Promise<PostAuthResolution> {
  const billing = await getBillingStatus();

  return {
    destination: billing.is_access_allowed ? "app" : "paywall",
    billing,
  };
}
