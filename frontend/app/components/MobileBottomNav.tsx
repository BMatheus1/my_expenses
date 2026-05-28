"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";

import type { User } from "../types/auth";
import {
  BusinessIcon,
  CreditCardIcon,
  ExpenseIcon,
  IncomeIcon,
  LogoutIcon,
  PaletteIcon,
  ReportsIcon,
  ShieldIcon,
  type AppIcon,
} from "./AppIcons";
import type { AppView } from "./Sidebar";

type MobileBottomNavProps = {
  activeView: AppView;
  currentUser: User;
  onActiveViewChange: (view: AppView) => void;
  onLogout: () => void;
};

type MobileNavItem = {
  view: AppView;
  label: string;
  description: string;
  icon: AppIcon;
};

const NAV_ITEMS: MobileNavItem[] = [
  {
    view: "expenses",
    label: "Gastos",
    description: "Cadastrar, filtrar e acompanhar despesas",
    icon: ExpenseIcon,
  },
  {
    view: "incomes",
    label: "Ganhos",
    description: "Entradas, salário e outras receitas",
    icon: IncomeIcon,
  },
  {
    view: "credit-cards",
    label: "Cartões",
    description: "Limites, faturas e vencimentos",
    icon: CreditCardIcon,
  },
  {
    view: "reports",
    label: "Relatórios",
    description: "Resumo mensal e leitura visual",
    icon: ReportsIcon,
  },
  {
    view: "businesses",
    label: "Negócios",
    description: "Controle separado para business",
    icon: BusinessIcon,
  },
  {
    view: "appearance-settings",
    label: "Aparência",
    description: "Tema claro, escuro e cores",
    icon: PaletteIcon,
  },
  {
    view: "security-settings",
    label: "Segurança",
    description: "Sessão, proteção e conta",
    icon: ShieldIcon,
  },
];

const VIEW_TITLES: Record<AppView, string> = {
  expenses: "Gastos",
  incomes: "Ganhos",
  reports: "Relatórios",
  "credit-cards": "Cartões",
  businesses: "Negócios",
  "appearance-settings": "Aparência",
  "security-settings": "Segurança",
};

export function MobileBottomNav({
  activeView,
  currentUser,
  onActiveViewChange,
  onLogout,
}: MobileBottomNavProps) {
  const shouldShowMobileNav = useMobileNavigationVisibility();
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const activeTitle = VIEW_TITLES[activeView];

  const userInitials = useMemo(() => {
    const normalizedName = currentUser.name.trim();

    if (!normalizedName) {
      return "ME";
    }

    return normalizedName
      .split(/\s+/)
      .slice(0, 2)
      .map((namePart) => namePart[0]?.toUpperCase())
      .join("");
  }, [currentUser.name]);

  useEffect(() => {
    if (shouldShowMobileNav) {
      return;
    }

    setIsMenuOpen(false);
  }, [shouldShowMobileNav]);

  useEffect(() => {
    if (!isMenuOpen) {
      return;
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setIsMenuOpen(false);
      }
    }

    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isMenuOpen]);

  function handleViewChange(view: AppView) {
    onActiveViewChange(view);
    setIsMenuOpen(false);
  }

  function handleLogoutClick() {
    setIsMenuOpen(false);
    onLogout();
  }

  if (!shouldShowMobileNav) {
    return null;
  }

  return (
    <>
      <header className="mobile-appbar fixed inset-x-0 top-0 lg:hidden">
        <div className="grid min-h-16 grid-cols-[3.25rem_1fr_3.25rem] items-center gap-2 px-3 pb-2">
          <button
            type="button"
            onClick={() => setIsMenuOpen(true)}
            className="mobile-menu-button touch-button flex h-12 w-12 items-center justify-center rounded-2xl border shadow-sm"
            aria-label="Abrir menu"
            aria-expanded={isMenuOpen}
          >
            <span className="flex flex-col gap-1.5" aria-hidden="true">
              <span className="mobile-menu-line" />
              <span className="mobile-menu-line" />
              <span className="mobile-menu-line" />
            </span>
          </button>

          <div className="min-w-0 text-center">
            <p className="app-muted text-[0.68rem] font-black uppercase tracking-[0.22em]">
              My Expenses
            </p>

            <h1 className="app-title mt-0.5 truncate text-base font-black tracking-tight">
              {activeTitle}
            </h1>
          </div>

          <div className="ml-auto flex h-12 w-12 items-center justify-center rounded-2xl border text-xs font-black shadow-sm mobile-user-chip">
            {userInitials}
          </div>
        </div>
      </header>

      {isMenuOpen ? (
        <div className="fixed inset-0 lg:hidden" style={{ zIndex: 95 }}>
          <button
            type="button"
            className="absolute inset-0 h-full w-full bg-black/45 backdrop-blur-[3px]"
            aria-label="Fechar menu"
            onClick={() => setIsMenuOpen(false)}
          />

          <aside className="mobile-drawer absolute bottom-0 left-0 top-0 flex w-[86vw] max-w-sm flex-col border-r shadow-2xl">
            <div className="border-b p-4 pt-[max(1rem,env(safe-area-inset-top))] mobile-drawer-border">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="app-kicker">Menu</p>
                  <h2 className="app-title mt-1 text-2xl font-black tracking-tight">
                    My Expenses
                  </h2>
                  <p className="app-muted mt-1 truncate text-sm font-semibold">
                    {currentUser.email}
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => setIsMenuOpen(false)}
                  className="app-button-secondary touch-button h-11 w-11 rounded-2xl p-0"
                  aria-label="Fechar menu"
                >
                  ×
                </button>
              </div>
            </div>

            <nav className="min-h-0 flex-1 space-y-2 overflow-y-auto p-4">
              {NAV_ITEMS.map((item) => (
                <MobileDrawerItem
                  key={item.view}
                  item={item}
                  isActive={activeView === item.view}
                  onClick={() => handleViewChange(item.view)}
                />
              ))}
            </nav>

            <div className="border-t p-4 mobile-drawer-border">
              <button
                type="button"
                onClick={handleLogoutClick}
                className="app-button-secondary touch-button w-full justify-center rounded-2xl text-sm"
              >
                <LogoutIcon className="h-4 w-4" />
                <span>Sair da conta</span>
              </button>
            </div>
          </aside>
        </div>
      ) : null}
    </>
  );
}

function MobileDrawerItem({
  item,
  isActive,
  onClick,
}: {
  item: MobileNavItem;
  isActive: boolean;
  onClick: () => void;
}) {
  const Icon = item.icon;

  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex w-full items-center gap-3 rounded-3xl px-3 py-3 text-left transition ${
        isActive ? "app-sidebar-item-active" : "app-sidebar-item"
      }`}
      aria-current={isActive ? "page" : undefined}
    >
      <MobileIconFrame isActive={isActive}>
        <Icon className="h-5 w-5" />
      </MobileIconFrame>

      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-black">{item.label}</span>
        <span
          className={`mt-0.5 block truncate text-xs font-semibold ${
            isActive ? "text-white/80" : "app-muted"
          }`}
        >
          {item.description}
        </span>
      </span>
    </button>
  );
}

function MobileIconFrame({
  isActive,
  children,
}: {
  isActive: boolean;
  children: ReactNode;
}) {
  return (
    <span
      className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border transition ${
        isActive ? "bg-white text-[var(--brand-primary)]" : "app-brand-soft"
      }`}
      style={{
        borderColor: isActive
          ? "color-mix(in srgb, var(--brand-primary) 18%, transparent)"
          : "var(--brand-border)",
      }}
    >
      {children}
    </span>
  );
}

function useMobileNavigationVisibility() {
  const [shouldShow, setShouldShow] = useState(false);

  useEffect(() => {
    const mediaQuery = window.matchMedia("(max-width: 1023px)");

    function syncVisibility() {
      setShouldShow(mediaQuery.matches);
    }

    syncVisibility();
    mediaQuery.addEventListener("change", syncVisibility);

    return () => {
      mediaQuery.removeEventListener("change", syncVisibility);
    };
  }, []);

  return shouldShow;
}
