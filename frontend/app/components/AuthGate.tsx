"use client";

import { useCallback, useEffect, useState } from "react";
import {
  applyDefaultAppAppearance,
  initializeUserAppTheme,
} from "../lib/theme";
import {
  ApiError,
  getCurrentUser,
  getSubscriptionStatus,
  logoutCurrentSession,
  refreshSubscriptionStatus,
  setUnauthorizedHandler,
} from "../lib/api";
import {
  clearCachedAuthenticatedUser,
  readCachedAuthenticatedUser,
  saveCachedAuthenticatedUser,
} from "../lib/auth-session-cache";
import { readDashboardCache } from "../lib/dashboard-cache";
import { requestInstallNotificationPermissionOnce } from "../lib/notification-service";
import {
  getAutoLogoutEnabled,
  getAutoLogoutMilliseconds,
  SECURITY_SETTINGS_CHANGED_EVENT,
} from "../lib/security";
import type { User } from "../types/auth";
import type { SubscriptionStatusResponse } from "../types/subscription";
import { AuthPage } from "./AuthPage";
import { PageLoading } from "./AppFeedback";
import { ExpensesDashboard } from "./ExpensesDashboard";
import { SubscriptionScreen } from "./SubscriptionScreen";
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

function canOpenOfflineDashboard() {
  const cachedUser = readCachedAuthenticatedUser();
  const cachedDashboard = readDashboardCache();

  if (!cachedUser || !cachedDashboard) {
    return null;
  }

  return cachedUser;
}

export function AuthGate() {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isCheckingSession, setIsCheckingSession] = useState(true);
  const [sessionError, setSessionError] = useState(false);
  const [sessionErrorMessage, setSessionErrorMessage] = useState("");
  const [subscription, setSubscription] =
    useState<SubscriptionStatusResponse | null>(null);
  const [isCheckingSubscription, setIsCheckingSubscription] = useState(false);
  const [securitySettingsVersion, setSecuritySettingsVersion] = useState(0);
  
  const currentUserId = currentUser?.id ?? null;
  
  
  const handleLogout = useCallback(() => {
    void logoutCurrentSession();
    clearCachedAuthenticatedUser();
    applyDefaultAppAppearance();
    setCurrentUser(null);
    setSubscription(null);
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
      const cachedUser = canOpenOfflineDashboard();

      if (cachedUser) {
        setCurrentUser(cachedUser);
        setSessionError(false);
        setSessionErrorMessage("");
      } else {
        setCurrentUser(null);
        setSessionError(true);
        setSessionErrorMessage(
          "Você está offline e ainda não há dados salvos neste aparelho. Conecte-se à internet para entrar no app.",
        );
      }

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
        const cachedUser = isBrowserOffline()
          ? canOpenOfflineDashboard()
          : null;

        if (cachedUser) {
          setCurrentUser(cachedUser);
          setSessionError(false);
          setSessionErrorMessage("");
          return;
        }

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
    if (!currentUser || isBrowserOffline()) {
      return;
    }

    let isMounted = true;

    async function loadSubscriptionStatus() {
      setIsCheckingSubscription(true);

      try {
        const searchParams = new URLSearchParams(window.location.search);
        const shouldRefreshCheckout =
          searchParams.get("checkout") === "subscription_return";
        const loadedSubscription = shouldRefreshCheckout
          ? await refreshSubscriptionStatus()
          : await getSubscriptionStatus();

        if (!isMounted) {
          return;
        }

        setSubscription(loadedSubscription);
        trackEvent("subscription_status_loaded", {
          status: loadedSubscription.status,
          can_access_app: loadedSubscription.can_access_app,
        });

        if (shouldRefreshCheckout) {
          trackEvent("checkout_returned", {
            status: loadedSubscription.status,
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
          setIsCheckingSubscription(false);
        }
      }
    }

    void loadSubscriptionStatus();

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
    (currentUser && isCheckingSubscription) ||
    (currentUser && !subscription && !isBrowserOffline())
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

  if (subscription && !subscription.can_access_app) {
    return (
      <SubscriptionScreen
        currentUser={currentUser}
        subscription={subscription}
        onSubscriptionChange={setSubscription}
        onLogout={handleLogout}
      />
    );
  }

  return <ExpensesDashboard currentUser={currentUser} onLogout={handleLogout} />;
}
