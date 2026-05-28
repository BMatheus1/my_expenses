"use client";

import type { ReactNode } from "react";

import type { User } from "../types/auth";
import { scrollToPageTop } from "../utils/smartScroll";
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
  function handleActiveViewChange(view: AppView) {
    onActiveViewChange(view);
    scrollToPageTop(80);
  }

  return (
    <main className="app-shell min-h-screen">
      <div className="flex min-h-screen">
        <Sidebar
          activeView={activeView}
          currentUser={currentUser}
          onActiveViewChange={handleActiveViewChange}
          onLogout={onLogout}
        />

        <section className="mobile-shell-content min-w-0 flex-1 px-4 pb-8 sm:px-6 lg:px-8 lg:pb-5 lg:pt-5">
          <div className="mx-auto max-w-6xl">{children}</div>
        </section>
      </div>

      <MobileBottomNav
        activeView={activeView}
        currentUser={currentUser}
        onActiveViewChange={handleActiveViewChange}
        onLogout={onLogout}
      />
    </main>
  );
}
