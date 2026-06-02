"use client";

import { useEffect, type ReactNode } from "react";

import type { User } from "../types/auth";
import {
  scrollElementIntoSafeView,
  scrollToPageTop,
} from "../utils/smartScroll";
import { MobileBottomNav } from "./MobileBottomNav";
import { SmartNotificationsBridge } from "./SmartNotificationsBridge";
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
  useEffect(() => {
    function handleFocusIn(event: FocusEvent) {
      const target = event.target;

      if (!isScrollableFormField(target)) {
        return;
      }

      window.setTimeout(() => {
        scrollElementIntoSafeView(target, {
          block: "center",
        });
      }, 120);
    }

    document.addEventListener("focusin", handleFocusIn);

    return () => {
      document.removeEventListener("focusin", handleFocusIn);
    };
  }, []);

  function handleActiveViewChange(view: AppView) {
    onActiveViewChange(view);
    scrollToPageTop(80);
  }

  return (
    <main className="app-shell min-h-screen">
      <SmartNotificationsBridge
        currentUser={currentUser}
        onActiveViewChange={handleActiveViewChange}
      />
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

function isScrollableFormField(target: EventTarget | null): target is HTMLElement {
  if (!(target instanceof HTMLElement)) {
    return false;
  }

  return (
    target instanceof HTMLInputElement ||
    target instanceof HTMLTextAreaElement ||
    target instanceof HTMLSelectElement ||
    target.getAttribute("contenteditable") === "true"
  );
}
