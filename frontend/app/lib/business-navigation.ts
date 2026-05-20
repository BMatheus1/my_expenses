export const BUSINESS_NAVIGATION_EVENT = "my-expenses:business-navigation";
export const BUSINESS_REFRESH_EVENT = "my-expenses:business-refresh";

export type BusinessNavigationMode = "create" | "select";

export type BusinessNavigationPayload = {
  mode: BusinessNavigationMode;
  businessId?: string;
};

const BUSINESS_NAVIGATION_STORAGE_KEY = "my-expenses-business-navigation";

export function navigateToCreateBusiness() {
  const payload: BusinessNavigationPayload = {
    mode: "create",
  };

  saveBusinessNavigationPayload(payload);
  dispatchBusinessNavigationEvent(payload);
}

export function navigateToBusiness(businessId: string) {
  const payload: BusinessNavigationPayload = {
    mode: "select",
    businessId,
  };

  saveBusinessNavigationPayload(payload);
  dispatchBusinessNavigationEvent(payload);
}

export function dispatchBusinessCreated(businessId: string) {
  navigateToBusiness(businessId);
  window.dispatchEvent(new Event(BUSINESS_REFRESH_EVENT));
}

export function consumeBusinessNavigationPayload(): BusinessNavigationPayload | null {
  if (typeof window === "undefined") {
    return null;
  }

  const rawPayload = window.localStorage.getItem(BUSINESS_NAVIGATION_STORAGE_KEY);

  if (!rawPayload) {
    return null;
  }

  window.localStorage.removeItem(BUSINESS_NAVIGATION_STORAGE_KEY);

  try {
    return JSON.parse(rawPayload) as BusinessNavigationPayload;
  } catch {
    return null;
  }
}

function saveBusinessNavigationPayload(payload: BusinessNavigationPayload) {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(
    BUSINESS_NAVIGATION_STORAGE_KEY,
    JSON.stringify(payload),
  );
}

function dispatchBusinessNavigationEvent(payload: BusinessNavigationPayload) {
  if (typeof window === "undefined") {
    return;
  }

  window.dispatchEvent(
    new CustomEvent<BusinessNavigationPayload>(BUSINESS_NAVIGATION_EVENT, {
      detail: payload,
    }),
  );
}