"use client";

import { useCallback, useEffect, useState } from "react";

import {
  clearAuthToken,
  getCurrentUser,
  setUnauthorizedHandler,
} from "../lib/api";
import type { User } from "../types/auth";
import { AuthPage } from "./AuthPage";
import { ExpensesDashboard } from "./ExpensesDashboard";

export function AuthGate() {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isCheckingSession, setIsCheckingSession] = useState(true);

  const handleLogout = useCallback(() => {
    clearAuthToken();
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
        handleLogout();
      } finally {
        setIsCheckingSession(false);
      }
    }

    void checkSession();
  }, [handleLogout]);

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