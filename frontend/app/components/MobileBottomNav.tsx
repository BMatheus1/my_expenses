"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";

import type { User } from "../types/auth";
import {
  BusinessIcon,
  ExpenseIcon,
  IncomeIcon,
  LogoutIcon,
  PaletteIcon,
  ReportsIcon,
  SettingsIcon,
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
  icon: AppIcon;
};

const MAIN_NAV_ITEMS: MobileNavItem[] = [
  {
    view: "expenses",
    label: "Gastos",
    icon: ExpenseIcon,
  },
  {
    view: "incomes",
    label: "Ganhos",
    icon: IncomeIcon,
  },
  {
    view: "reports",
    label: "Relat.",
    icon: ReportsIcon,
  },
  {
    view: "businesses",
    label: "Negócios",
    icon: BusinessIcon,
  },
];

const ACCOUNT_VIEWS: AppView[] = ["appearance-settings", "security-settings"];

export function MobileBottomNav({
  activeView,
  currentUser,
  onActiveViewChange,
  onLogout,
}: MobileBottomNavProps) {
  const [isAccountMenuOpen, setIsAccountMenuOpen] = useState(false);

  const isAccountView = useMemo(() => {
    return ACCOUNT_VIEWS.includes(activeView);
  }, [activeView]);

  useEffect(() => {
    if (!isAccountMenuOpen) {
      return;
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setIsAccountMenuOpen(false);
      }
    }

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isAccountMenuOpen]);

  function handleViewChange(view: AppView) {
    onActiveViewChange(view);
    setIsAccountMenuOpen(false);
  }

  function handleLogoutClick() {
    setIsAccountMenuOpen(false);
    onLogout();
  }

  return (
    <>
      {isAccountMenuOpen ? (
        <div className="fixed inset-0 z-40 bg-black/35 backdrop-blur-[3px] lg:hidden">
          <button
            type="button"
            className="absolute inset-0 h-full w-full cursor-default"
            aria-label="Fechar menu da conta"
            onClick={() => setIsAccountMenuOpen(false)}
          />

          <section
            className="absolute inset-x-3 bottom-24 rounded-3xl border p-4 shadow-2xl"            style={{
              backgroundColor: "var(--app-surface)",
              borderColor: "var(--app-border)",
              color: "var(--app-text)",
            }}
          >
            <div className="app-card-soft rounded-3xl p-4">
              <p className="app-title truncate text-sm font-black">
                {currentUser.name}
              </p>

              <p className="app-muted mt-1 truncate text-xs font-semibold">
                {currentUser.email}
              </p>
            </div>

            <div className="mt-3 grid gap-2">
              <AccountMenuButton
                icon={PaletteIcon}
                title="Aparência e tema"
                description="Cores, modo claro e modo escuro"
                isActive={activeView === "appearance-settings"}
                onClick={() => handleViewChange("appearance-settings")}
              />

              <AccountMenuButton
                icon={ShieldIcon}
                title="Segurança"
                description="Sessão, proteção e exclusão da conta"
                isActive={activeView === "security-settings"}
                onClick={() => handleViewChange("security-settings")}
              />

              <button
                type="button"
                onClick={handleLogoutClick}
                className="app-btn app-btn-soft min-h-12 w-full rounded-2xl px-4 text-sm"
              >
                <LogoutIcon className="h-4 w-4" />
                <span>Sair da conta</span>
              </button>
            </div>
          </section>
        </div>
      ) : null}

      <nav
        className="fixed inset-x-0 bottom-0 z-50 border-t px-3 pt-2 shadow-2xl lg:hidden"
        style={{
          backgroundColor:
            "color-mix(in srgb, var(--app-surface) 96%, transparent)",
          borderColor: "var(--app-border)",
          paddingBottom: "max(0.75rem, env(safe-area-inset-bottom))",
          backdropFilter: "blur(18px)",
        }}
        aria-label="Navegação principal mobile"
      >
        <div className="mx-auto grid max-w-xl grid-cols-5 gap-1.5">
          {MAIN_NAV_ITEMS.map((item) => (
            <MobileNavButton
              key={item.view}
              item={item}
              isActive={activeView === item.view}
              onClick={() => handleViewChange(item.view)}
            />
          ))}

          <MobileAccountButton
            isActive={isAccountView || isAccountMenuOpen}
            isOpen={isAccountMenuOpen}
            onClick={() => setIsAccountMenuOpen((currentValue) => !currentValue)}
          />
        </div>
      </nav>
    </>
  );
}

function MobileNavButton({
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
      className={`group flex min-h-16 flex-col items-center justify-center gap-1 rounded-3xl px-1.5 text-[0.7rem] font-black transition ${
        isActive ? "app-sidebar-item-active" : "app-sidebar-item"
      }`}
      aria-current={isActive ? "page" : undefined}
    >
      <MobileIconFrame isActive={isActive}>
        <Icon className="h-5 w-5" />
      </MobileIconFrame>

      <span className="max-w-full truncate leading-none">{item.label}</span>
    </button>
  );
}

function MobileAccountButton({
  isActive,
  isOpen,
  onClick,
}: {
  isActive: boolean;
  isOpen: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`group flex min-h-16 flex-col items-center justify-center gap-1 rounded-3xl px-1.5 text-[0.7rem] font-black transition ${
        isActive ? "app-sidebar-item-active" : "app-sidebar-item"
      }`}
      aria-label="Abrir menu da conta"
      aria-expanded={isOpen}
    >
      <MobileIconFrame isActive={isActive}>
        <SettingsIcon className="h-5 w-5" />
      </MobileIconFrame>

      <span className="max-w-full truncate leading-none">Conta</span>
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
      className={`flex h-8 w-8 items-center justify-center rounded-2xl border transition ${
        isActive ? "bg-white shadow-sm" : "app-brand-soft"
      }`}
      style={{
        color: isActive ? "var(--brand-primary)" : undefined,
        borderColor: isActive
          ? "color-mix(in srgb, var(--brand-primary) 18%, transparent)"
          : "transparent",
      }}
    >
      {children}
    </span>
  );
}

function AccountMenuButton({
  icon,
  title,
  description,
  isActive,
  onClick,
}: {
  icon: AppIcon;
  title: string;
  description: string;
  isActive: boolean;
  onClick: () => void;
}) {
  const Icon = icon;

  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex w-full items-center gap-3 rounded-2xl px-4 py-3 text-left transition ${
        isActive ? "app-sidebar-item-active" : "app-sidebar-item"
      }`}
    >
      <MobileIconFrame isActive={isActive}>
        <Icon className="h-5 w-5" />
      </MobileIconFrame>

      <span className="min-w-0">
        <span className="block truncate text-sm font-black">{title}</span>
        <span className="mt-0.5 block truncate text-xs opacity-75">
          {description}
        </span>
      </span>
    </button>
  );
}