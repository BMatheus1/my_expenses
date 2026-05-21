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
];

const DEFAULT_REMEMBER_SESSION = true;
const DEFAULT_AUTO_LOGOUT_ENABLED = true;
const DEFAULT_AUTO_LOGOUT_MINUTES = 15;
const ALLOWED_AUTO_LOGOUT_MINUTES = [15, 30, 60] as const;

type BrowserStorage = "localStorage" | "sessionStorage";

type StoredToken = {
  token: string;
  storageType: BrowserStorage;
};

type JwtPayload = {
  exp?: number;
  iat?: number;
  sub?: string;
};

export type SessionSecurityInfo = {
  hasToken: boolean;
  storageType: BrowserStorage | null;
  issuedAt: Date | null;
  expiresAt: Date | null;
  isExpired: boolean;
};

export function getStoredAuthToken(): string | null {
  return getStoredAuthTokenWithStorage()?.token ?? null;
}

export function storeAuthToken(token: string): void {
  if (!canUseBrowserStorage()) {
    return;
  }

  clearStoredAuthToken();

  const storage = getRememberSession() ? window.localStorage : window.sessionStorage;
  storage.setItem(AUTH_TOKEN_KEY, token);
}

export function clearStoredAuthToken(): void {
  if (!canUseBrowserStorage()) {
    return;
  }

  window.localStorage.removeItem(AUTH_TOKEN_KEY);
  window.sessionStorage.removeItem(AUTH_TOKEN_KEY);
}

export function clearSensitiveBrowserData(): void {
  if (!canUseBrowserStorage()) {
    return;
  }

  clearStoredAuthToken();

  for (const key of LEGACY_AUTH_KEYS) {
    window.localStorage.removeItem(key);
    window.sessionStorage.removeItem(key);
  }
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
  migrateAuthTokenStorage(value);
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
  const storedToken = getStoredAuthTokenWithStorage();

  if (!storedToken) {
    return {
      hasToken: false,
      storageType: null,
      issuedAt: null,
      expiresAt: null,
      isExpired: false,
    };
  }

  const payload = decodeJwtPayload(storedToken.token);
  const expiresAt = payload?.exp ? new Date(payload.exp * 1000) : null;
  const issuedAt = payload?.iat ? new Date(payload.iat * 1000) : null;

  return {
    hasToken: true,
    storageType: storedToken.storageType,
    issuedAt,
    expiresAt,
    isExpired: expiresAt ? expiresAt.getTime() <= Date.now() : false,
  };
}

function getStoredAuthTokenWithStorage(): StoredToken | null {
  if (!canUseBrowserStorage()) {
    return null;
  }

  const sessionToken = window.sessionStorage.getItem(AUTH_TOKEN_KEY);

  if (sessionToken) {
    return {
      token: sessionToken,
      storageType: "sessionStorage",
    };
  }

  const localToken = window.localStorage.getItem(AUTH_TOKEN_KEY);

  if (localToken) {
    return {
      token: localToken,
      storageType: "localStorage",
    };
  }

  return null;
}

function migrateAuthTokenStorage(rememberSession: boolean): void {
  const currentToken = getStoredAuthToken();

  if (!currentToken || !canUseBrowserStorage()) {
    return;
  }

  clearStoredAuthToken();

  const targetStorage = rememberSession
    ? window.localStorage
    : window.sessionStorage;

  targetStorage.setItem(AUTH_TOKEN_KEY, currentToken);
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