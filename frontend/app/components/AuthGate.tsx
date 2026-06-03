"use client";

import { useCallback, useEffect, useState } from "react";
import {
  applyDefaultAppAppearance,
  initializeUserAppTheme,
} from "../lib/theme";
import {
  ApiError,
  getCurrentUser,
  logoutCurrentSession,
  setUnauthorizedHandler,
} from "../lib/api";
import {
  clearCachedAuthenticatedUser,
  saveCachedAuthenticatedUser,
} from "../lib/auth-session-cache";
import { requestInstallNotificationPermissionOnce } from "../lib/notification-service";
import { resolvePostAuthDestination } from "../lib/post-auth";
import {
  getAutoLogoutEnabled,
  getAutoLogoutMilliseconds,
  SECURITY_SETTINGS_CHANGED_EVENT,
} from "../lib/security";
import type { User } from "../types/auth";
import type { BillingStatusResponse } from "../types/billing";
import { AuthPage } from "./AuthPage";
import { PageLoading } from "./AppFeedback";
import { ExpensesDashboard } from "./ExpensesDashboard";
import { Paywall } from "./Paywall";
import { trackEvent } from "../lib/tracking";

const USER_ACTIVITY_EVENTS = [
  "click",
  "keydown",
  "mousemove",
  "scroll",
  "touchstart",
] as const;

function hasAuthActionToken() {
  if (typeof window === "undefined") {
    return false;
  }

  const searchParams = new URLSearchParams(window.location.search);

  return (
    searchParams.has("verify_email_token") || searchParams.has("reset_token")
  );
}

function isBrowserOffline() {
  return typeof navigator !== "undefined" && navigator.onLine === false;
}

function hasExplicitAuthMode() {
  if (typeof window === "undefined") {
    return false;
  }

  const searchParams = new URLSearchParams(window.location.search);
  const authMode = searchParams.get("auth");

  return authMode === "login" || authMode === "register";
}

export function AuthGate() {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isCheckingSession, setIsCheckingSession] = useState(true);
  const [sessionError, setSessionError] = useState(false);
  const [sessionErrorMessage, setSessionErrorMessage] = useState("");
  const [billing, setBilling] = useState<BillingStatusResponse | null>(null);
  const [isCheckingBilling, setIsCheckingBilling] = useState(false);
  const [securitySettingsVersion, setSecuritySettingsVersion] = useState(0);

  const currentUserId = currentUser?.id ?? null;

  const handleLogout = useCallback(() => {
    void logoutCurrentSession();
    clearCachedAuthenticatedUser();
    applyDefaultAppAppearance();
    setCurrentUser(null);
    setBilling(null);
  }, []);

  const checkSession = useCallback(async () => {
    setIsCheckingSession(true);
    setSessionError(false);
    setSessionErrorMessage("");

    if (hasAuthActionToken() || hasExplicitAuthMode()) {
      setCurrentUser(null);
      setIsCheckingSession(false);
      return;
    }

    if (isBrowserOffline()) {
      setCurrentUser(null);
      setBilling(null);
      setSessionError(true);
      setSessionErrorMessage(
        "Conecte-se à internet para validar sua assinatura antes de entrar no app.",
      );
      setIsCheckingSession(false);
      return;
    }

    try {
      const user = await getCurrentUser({
        timeoutMs: 45000,
      });

      saveCachedAuthenticatedUser(user);
      setCurrentUser(user);
      setSessionError(false);
      setSessionErrorMessage("");
    } catch (error) {
      if (error instanceof ApiError && error.statusCode === 0) {
        setSessionError(true);
        setSessionErrorMessage(
          "Não conseguimos conectar agora. Verifique sua internet ou tente novamente em alguns segundos.",
        );
        return;
      }

      clearCachedAuthenticatedUser();
      setCurrentUser(null);
      setSessionError(false);
      setSessionErrorMessage("");
    } finally {
      setIsCheckingSession(false);
    }
  }, []);

  useEffect(() => {
    setUnauthorizedHandler(handleLogout);

    return () => {
      setUnauthorizedHandler(null);
    };
  }, [handleLogout]);

  useEffect(() => {
    if (isCheckingSession) {
      return;
    }

    if (currentUserId) {
      initializeUserAppTheme(currentUserId);
      return;
    }

    applyDefaultAppAppearance();
  }, [currentUserId, isCheckingSession]);

  useEffect(() => {
    if (!currentUser) {
      return;
    }

    if (isBrowserOffline()) {
      setBilling(null);
      setSessionError(true);
      setSessionErrorMessage(
        "Conecte-se à internet para validar sua assinatura antes de entrar no app.",
      );
      setIsCheckingBilling(false);
      return;
    }

    let isMounted = true;

    async function loadBillingStatus() {
      setIsCheckingBilling(true);

      try {
        const searchParams = new URLSearchParams(window.location.search);
        const shouldRefreshCheckout =
          searchParams.get("checkout") === "billing_return"
          || searchParams.get("checkout") === "subscription_return";
        const postAuth = await resolvePostAuthDestination();

        if (!isMounted) {
          return;
        }

        setBilling(postAuth.billing);
        trackEvent("subscription_status_loaded", {
          status: postAuth.billing.status,
          can_access_app: postAuth.billing.is_access_allowed,
          destination: postAuth.destination,
        });

        if (shouldRefreshCheckout) {
          trackEvent("checkout_returned", {
            status: postAuth.billing.status,
          });
          window.history.replaceState({}, document.title, window.location.pathname);
        }
      } catch (error) {
        if (!isMounted) {
          return;
        }

        setSessionError(true);
        setSessionErrorMessage(
          error instanceof Error
            ? error.message
            : "Não conseguimos carregar sua assinatura agora.",
        );
      } finally {
        if (isMounted) {
          setIsCheckingBilling(false);
        }
      }
    }

    void loadBillingStatus();

    return () => {
      isMounted = false;
    };
  }, [currentUser]);

  useEffect(() => {
    void checkSession();
  }, [checkSession]);

  useEffect(() => {
    void requestInstallNotificationPermissionOnce();
  }, []);

  useEffect(() => {
    function handleSecuritySettingsChange() {
      setSecuritySettingsVersion((currentValue) => currentValue + 1);
    }

    window.addEventListener(
      SECURITY_SETTINGS_CHANGED_EVENT,
      handleSecuritySettingsChange,
    );

    return () => {
      window.removeEventListener(
        SECURITY_SETTINGS_CHANGED_EVENT,
        handleSecuritySettingsChange,
      );
    };
  }, []);

  useEffect(() => {
    if (!currentUser || !getAutoLogoutEnabled()) {
      return;
    }

    let timeoutId: number | undefined;

    function resetInactivityTimer() {
      if (timeoutId) {
        window.clearTimeout(timeoutId);
      }

      timeoutId = window.setTimeout(() => {
        handleLogout();
      }, getAutoLogoutMilliseconds());
    }

    resetInactivityTimer();

    for (const eventName of USER_ACTIVITY_EVENTS) {
      window.addEventListener(eventName, resetInactivityTimer, {
        passive: true,
      });
    }

    return () => {
      if (timeoutId) {
        window.clearTimeout(timeoutId);
      }

      for (const eventName of USER_ACTIVITY_EVENTS) {
        window.removeEventListener(eventName, resetInactivityTimer);
      }
    };
  }, [currentUser, handleLogout, securitySettingsVersion]);

  if (
    isCheckingSession ||
    (currentUser && isCheckingBilling) ||
    (currentUser && !billing)
  ) {
    return (
      <PageLoading
        title={currentUser ? "Conferindo assinatura" : "Conectando sua conta"}
        description={
          currentUser
            ? "Estamos validando seu acesso com segurança."
            : "Estamos preparando seu ambiente. Na primeira abertura, isso pode levar alguns segundos."
        }
      />
    );
  }

  if (sessionError) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-stone-50 px-4">
        <section className="w-full max-w-xl rounded-3xl border border-stone-200 bg-white p-6 text-center shadow-sm">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-3xl bg-amber-50 text-lg font-black text-amber-700">
            !
          </div>

          <h1 className="mt-4 text-2xl font-black tracking-tight text-stone-950">
            Não foi possível entrar agora
          </h1>

          <p className="mt-3 text-sm font-medium leading-6 text-stone-600">
            {sessionErrorMessage ||
              "Verifique sua conexão e tente novamente em alguns segundos."}
          </p>

          <button
            type="button"
            onClick={() => void checkSession()}
            className="touch-button mt-5 w-full rounded-2xl bg-stone-950 px-5 py-3 text-sm font-black text-white shadow-sm transition hover:bg-stone-800 sm:w-auto"
          >
            Tentar novamente
          </button>
        </section>
      </main>
    );
  }

  if (!currentUser) {
    return <AuthPage onAuthenticated={setCurrentUser} />;
  }

  if (billing && !billing.is_access_allowed) {
    return (
      <Paywall
        currentUser={currentUser}
        billing={billing}
        onBillingChange={setBilling}
        onLogout={handleLogout}
      />
    );
  }

  return <ExpensesDashboard currentUser={currentUser} onLogout={handleLogout} />;
}
