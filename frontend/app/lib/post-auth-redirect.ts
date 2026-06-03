const POST_AUTH_REDIRECT_KEY = "post_auth_redirect";

export function getCurrentPathWithSearch() {
  if (typeof window === "undefined") {
    return "/app";
  }

  return `${window.location.pathname}${window.location.search}`;
}

export function savePostAuthRedirect(redirectTo: string) {
  if (typeof window === "undefined") {
    return;
  }

  const safeRedirect = normalizeLocalRedirect(redirectTo);

  if (!safeRedirect) {
    return;
  }

  window.sessionStorage.setItem(POST_AUTH_REDIRECT_KEY, safeRedirect);
}

export function consumePostAuthRedirect() {
  if (typeof window === "undefined") {
    return "";
  }

  const redirectTo = window.sessionStorage.getItem(POST_AUTH_REDIRECT_KEY);
  window.sessionStorage.removeItem(POST_AUTH_REDIRECT_KEY);

  return normalizeLocalRedirect(redirectTo || "");
}

function normalizeLocalRedirect(redirectTo: string) {
  if (!redirectTo.startsWith("/") || redirectTo.startsWith("//")) {
    return "";
  }

  return redirectTo;
}
