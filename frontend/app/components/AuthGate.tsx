"use client";

import { useCallback, useEffect, useState } from "react";

import {
  ApiError,
  getAuthToken,
  getCurrentUser,
  logoutCurrentSession,
  setUnauthorizedHandler,
} from "../lib/api";
import {
  getAutoLogoutEnabled,
  getAutoLogoutMilliseconds,
  SECURITY_SETTINGS_CHANGED_EVENT,
} from "../lib/security";
import type { User } from "../types/auth";
import { AuthPage } from "./AuthPage";
import { PageLoading, ConnectionErrorState } from "./AppFeedback";
import { ExpensesDashboard } from "./ExpensesDashboard";

const USER_ACTIVITY_EVENTS = [
  "click",
  "keydown",
  "mousemove",
  "scroll",
  "touchstart",
] as const;

export function AuthGate() {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isCheckingSession, setIsCheckingSession] = useState(true);
  const [sessionError, setSessionError] = useState(false);
  const [securitySettingsVersion, setSecuritySettingsVersion] = useState(0);

  const handleLogout = useCallback(() => {
    void logoutCurrentSession();
    setCurrentUser(null);
  }, []);

  const checkSession = useCallback(async () => {
    const searchParams = new URLSearchParams(window.location.search);
    const hasAuthActionToken =
      searchParams.has("verify_email_token") || searchParams.has("reset_token");

    setIsCheckingSession(true);
    setSessionError(false);

    if (hasAuthActionToken) {
      setCurrentUser(null);
      setIsCheckingSession(false);
      return;
    }

    const token = getAuthToken();

    if (!token) {
      setCurrentUser(null);
      setIsCheckingSession(false);
      return;
    }

    try {
      const user = await getCurrentUser();

      setCurrentUser(user);
      setSessionError(false);
    } catch (error) {
      if (error instanceof ApiError && error.statusCode === 0) {
        setSessionError(true);
        return;
      }

      setCurrentUser(null);
      setSessionError(false);
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
    void checkSession();
  }, [checkSession]);

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

  if (isCheckingSession) {
    return (
      <PageLoading
        title="Verificando sua sessão"
        description="Estamos preparando seu ambiente financeiro."
      />
    );
  }

  if (sessionError) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-stone-50 px-4">
        <div className="w-full max-w-xl">
          <ConnectionErrorState onRetry={checkSession} />
        </div>
      </main>
    );
  }

  if (!currentUser) {
    return <AuthPage onAuthenticated={setCurrentUser} />;
  }

  return <ExpensesDashboard currentUser={currentUser} onLogout={handleLogout} />;
}