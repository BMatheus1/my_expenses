import type { User } from "../types/auth";

const AUTH_USER_CACHE_KEY = "my-expenses:auth-user-cache:v1";

export function saveCachedAuthenticatedUser(user: User) {
  if (typeof window === "undefined") {
    return;
  }

  try {
    window.localStorage.setItem(AUTH_USER_CACHE_KEY, JSON.stringify(user));
  } catch {
    // Cache local é apenas melhoria de experiência.
    // Se falhar, o app continua funcionando normalmente.
  }
}

export function readCachedAuthenticatedUser(): User | null {
  if (typeof window === "undefined") {
    return null;
  }

  try {
    const rawUser = window.localStorage.getItem(AUTH_USER_CACHE_KEY);

    if (!rawUser) {
      return null;
    }

    const parsedUser = JSON.parse(rawUser) as User;

    if (!isValidCachedUser(parsedUser)) {
      clearCachedAuthenticatedUser();
      return null;
    }

    return parsedUser;
  } catch {
    clearCachedAuthenticatedUser();
    return null;
  }
}

export function clearCachedAuthenticatedUser() {
  if (typeof window === "undefined") {
    return;
  }

  try {
    window.localStorage.removeItem(AUTH_USER_CACHE_KEY);
  } catch {
    // Falha silenciosa para não impactar logout/login.
  }
}

function isValidCachedUser(user: User) {
  return (
    typeof user === "object" &&
    user !== null &&
    typeof user.id === "string" &&
    typeof user.name === "string" &&
    typeof user.email === "string"
  );
}