export const AUTH_TOKEN_KEY = "my_expenses_auth_token";
export const SECURITY_SETTINGS_CHANGED_EVENT = "my-expenses-security-settings-changed";

const REMEMBER_SESSION_KEY = "my-expenses-remember-session";
const AUTO_LOGOUT_ENABLED_KEY = "my-expenses-auto-logout-enabled";
const AUTO_LOGOUT_MINUTES_KEY = "my-expenses-auto-logout-minutes";

const LEGACY_AUTH_KEYS = [
  "auth_token",
  "access_token",
  "my_expenses_token",
  "my-expenses-token",
  AUTH_TOKEN_KEY,
];

const DEFAULT_REMEMBER_SESSION = true;
const DEFAULT_AUTO_LOGOUT_ENABLED = true;
const DEFAULT_AUTO_LOGOUT_MINUTES = 15;
const ALLOWED_AUTO_LOGOUT_MINUTES = [15, 30, 60] as const;

let inMemoryAccessToken: string | null = null;

type TokenStorage = "memory" | "localStorage" | "sessionStorage";

type JwtPayload = {
  exp?: number;
  iat?: number;
  sub?: string;
};

export type SessionSecurityInfo = {
  hasToken: boolean;
  storageType: TokenStorage | null;
  issuedAt: Date | null;
  expiresAt: Date | null;
  isExpired: boolean;
};

export function getStoredAuthToken(): string | null {
  return inMemoryAccessToken;
}

export function storeAuthToken(token: string): void {
  inMemoryAccessToken = token;
  clearLegacyBrowserTokens();
  dispatchSecuritySettingsChangedEvent();
}

export function clearStoredAuthToken(): void {
  inMemoryAccessToken = null;
  clearLegacyBrowserTokens();
  dispatchSecuritySettingsChangedEvent();
}

export function clearSensitiveBrowserData(): void {
  inMemoryAccessToken = null;
  clearLegacyBrowserTokens();
  dispatchSecuritySettingsChangedEvent();
}

export function getRememberSession(): boolean {
  if (!canUseBrowserStorage()) {
    return DEFAULT_REMEMBER_SESSION;
  }

  const savedValue = window.localStorage.getItem(REMEMBER_SESSION_KEY);

  if (savedValue === null) {
    return DEFAULT_REMEMBER_SESSION;
  }

  return savedValue === "true";
}

export function saveRememberSession(value: boolean): void {
  if (!canUseBrowserStorage()) {
    return;
  }

  window.localStorage.setItem(REMEMBER_SESSION_KEY, String(value));
  dispatchSecuritySettingsChangedEvent();
}

export function getAutoLogoutEnabled(): boolean {
  if (!canUseBrowserStorage()) {
    return DEFAULT_AUTO_LOGOUT_ENABLED;
  }

  const savedValue = window.localStorage.getItem(AUTO_LOGOUT_ENABLED_KEY);

  if (savedValue === null) {
    return DEFAULT_AUTO_LOGOUT_ENABLED;
  }

  return savedValue === "true";
}

export function saveAutoLogoutEnabled(value: boolean): void {
  if (!canUseBrowserStorage()) {
    return;
  }

  window.localStorage.setItem(AUTO_LOGOUT_ENABLED_KEY, String(value));
  dispatchSecuritySettingsChangedEvent();
}

export function getAutoLogoutMinutes(): number {
  if (!canUseBrowserStorage()) {
    return DEFAULT_AUTO_LOGOUT_MINUTES;
  }

  const savedValue = Number(window.localStorage.getItem(AUTO_LOGOUT_MINUTES_KEY));

  return isAllowedAutoLogoutMinutes(savedValue)
    ? savedValue
    : DEFAULT_AUTO_LOGOUT_MINUTES;
}

export function saveAutoLogoutMinutes(value: number): void {
  if (!canUseBrowserStorage() || !isAllowedAutoLogoutMinutes(value)) {
    return;
  }

  window.localStorage.setItem(AUTO_LOGOUT_MINUTES_KEY, String(value));
  dispatchSecuritySettingsChangedEvent();
}

export function getAutoLogoutMilliseconds(): number {
  return getAutoLogoutMinutes() * 60 * 1000;
}

export function getSessionSecurityInfo(): SessionSecurityInfo {
  if (!inMemoryAccessToken) {
    return {
      hasToken: false,
      storageType: null,
      issuedAt: null,
      expiresAt: null,
      isExpired: false,
    };
  }

  const payload = decodeJwtPayload(inMemoryAccessToken);
  const expiresAt = payload?.exp ? new Date(payload.exp * 1000) : null;
  const issuedAt = payload?.iat ? new Date(payload.iat * 1000) : null;

  return {
    hasToken: true,
    storageType: "memory",
    issuedAt,
    expiresAt,
    isExpired: expiresAt ? expiresAt.getTime() <= Date.now() : false,
  };
}

function clearLegacyBrowserTokens(): void {
  if (!canUseBrowserStorage()) {
    return;
  }

  for (const key of LEGACY_AUTH_KEYS) {
    window.localStorage.removeItem(key);
    window.sessionStorage.removeItem(key);
  }
}

function decodeJwtPayload(token: string): JwtPayload | null {
  const [, payload] = token.split(".");

  if (!payload) {
    return null;
  }

  try {
    const normalizedPayload = payload.replace(/-/g, "+").replace(/_/g, "/");
    const paddedPayload = normalizedPayload.padEnd(
      normalizedPayload.length + ((4 - (normalizedPayload.length % 4)) % 4),
      "=",
    );

    return JSON.parse(window.atob(paddedPayload)) as JwtPayload;
  } catch {
    return null;
  }
}

function isAllowedAutoLogoutMinutes(
  value: number,
): value is (typeof ALLOWED_AUTO_LOGOUT_MINUTES)[number] {
  return ALLOWED_AUTO_LOGOUT_MINUTES.includes(
    value as (typeof ALLOWED_AUTO_LOGOUT_MINUTES)[number],
  );
}

function dispatchSecuritySettingsChangedEvent(): void {
  if (typeof window === "undefined") {
    return;
  }

  window.dispatchEvent(new Event(SECURITY_SETTINGS_CHANGED_EVENT));
}

function canUseBrowserStorage(): boolean {
  return typeof window !== "undefined";
}