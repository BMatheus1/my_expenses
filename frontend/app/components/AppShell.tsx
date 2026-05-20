"use client";

import type { ReactNode } from "react";

import type { User } from "../types/auth";
import type { AppView } from "./Sidebar";
import { Sidebar } from "./Sidebar";

type AppShellProps = {
  activeView: AppView;
  currentUser: User;
  onActiveViewChange: (view: AppView) => void;
  onLogout: () => void;
  children: ReactNode;
};

export function AppShell({
  activeView,
  currentUser,
  onActiveViewChange,
  onLogout,
  children,
}: AppShellProps) {
  return (
    <main className="app-shell">
      <div className="flex min-h-screen">
        <Sidebar
          activeView={activeView}
          currentUser={currentUser}
          onActiveViewChange={onActiveViewChange}
          onLogout={onLogout}
        />

        <section className="min-w-0 flex-1 px-4 py-5 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-6xl">{children}</div>
        </section>
      </div>
    </main>
  );
}