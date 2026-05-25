"use client";

import type { ReactNode } from "react";

import type { User } from "../types/auth";
import { MobileBottomNav } from "./MobileBottomNav";
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

        <section className="min-w-0 flex-1 px-4 pb-28 pt-5 sm:px-6 lg:px-8 lg:pb-5">
          <div className="mx-auto max-w-6xl">{children}</div>
        </section>
      </div>

      <MobileBottomNav
        activeView={activeView}
        currentUser={currentUser}
        onActiveViewChange={onActiveViewChange}
        onLogout={onLogout}
      />
    </main>
  );
}