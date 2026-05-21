"use client";

import { useCallback, useEffect, useState } from "react";

import {
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
  const [securitySettingsVersion, setSecuritySettingsVersion] = useState(0);

  const handleLogout = useCallback(() => {
    void logoutCurrentSession();
    setCurrentUser(null);
  }, []);

  useEffect(() => {
    setUnauthorizedHandler(handleLogout);

    return () => {
      setUnauthorizedHandler(null);
    };
  }, [handleLogout]);

  useEffect(() => {
    async function checkSession() {
      try {
        const user = await getCurrentUser();
        setCurrentUser(user);
      } catch {
        setCurrentUser(null);
      } finally {
        setIsCheckingSession(false);
      }
    }

    void checkSession();
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

  if (isCheckingSession) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-stone-50 px-4">
        <div className="rounded-3xl border border-stone-200 bg-white p-6 text-center shadow-sm">
          <p className="text-sm font-bold text-stone-950">Carregando...</p>
          <p className="mt-1 text-sm text-stone-500">Verificando sessão.</p>
        </div>
      </main>
    );
  }

  if (!currentUser) {
    return <AuthPage onAuthenticated={setCurrentUser} />;
  }

  return <ExpensesDashboard currentUser={currentUser} onLogout={handleLogout} />;
}