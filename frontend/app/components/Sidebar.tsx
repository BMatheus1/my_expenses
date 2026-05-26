"use client";

import { useCallback, useEffect, useState, type ReactNode } from "react";

import { listBusinesses } from "../lib/business-api";
import {
  BUSINESS_REFRESH_EVENT,
  navigateToBusiness,
  navigateToCreateBusiness,
} from "../lib/business-navigation";
import type { User } from "../types/auth";
import type { Business } from "../types/business";
import {
  BusinessIcon,
  ChevronDownIcon,
  ChevronLeftIcon,
  CreditCardIcon,
  ExpenseIcon,
  IncomeIcon,
  LogoutIcon,
  PaletteIcon,
  PlusIcon,
  ReportsIcon,
  SettingsIcon,
  ShieldIcon,
  WalletIcon,
  type AppIcon,
} from "./AppIcons";

export type AppView =
  | "expenses"
  | "incomes"
  | "reports"
  | "credit-cards"
  | "businesses"
  | "appearance-settings"
  | "security-settings";

type SidebarProps = {
  activeView: AppView;
  currentUser: User;
  onActiveViewChange: (view: AppView) => void;
  onLogout: () => void;
};

type MenuItem = {
  view: AppView;
  label: string;
  description: string;
  icon: AppIcon;
};

const PERSONAL_FINANCE_ITEMS: MenuItem[] = [
  {
    view: "incomes",
    label: "Ganhos",
    description: "Entradas de dinheiro",
    icon: IncomeIcon,
  },
  {
    view: "expenses",
    label: "Gastos",
    description: "Despesas pessoais",
    icon: ExpenseIcon,
  },
  {
    view: "credit-cards",
    label: "Cartões",
    description: "Faturas e vencimentos",
    icon: CreditCardIcon,
  },
  {
    view: "reports",
    label: "Relatórios",
    description: "Resumo e gráficos",
    icon: ReportsIcon,
  },
];

const SETTINGS_ITEMS: MenuItem[] = [
  {
    view: "appearance-settings",
    label: "Aparência e tema",
    description: "Cores e modo escuro",
    icon: PaletteIcon,
  },
  {
    view: "security-settings",
    label: "Segurança",
    description: "Sessão e proteção",
    icon: ShieldIcon,
  },
];

export function Sidebar({
  activeView,
  currentUser,
  onActiveViewChange,
  onLogout,
}: SidebarProps) {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isWalletMenuOpen, setIsWalletMenuOpen] = useState(true);
  const [isBusinessMenuOpen, setIsBusinessMenuOpen] = useState(true);
  const [isSettingsMenuOpen, setIsSettingsMenuOpen] = useState(false);
  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [selectedBusinessId, setSelectedBusinessId] = useState<string | null>(
    null,
  );

  const isWalletActive =
    activeView === "incomes" ||
    activeView === "expenses" ||
    activeView === "credit-cards" ||
    activeView === "reports";

  const isBusinessActive = activeView === "businesses";

  const isSettingsActive =
    activeView === "appearance-settings" || activeView === "security-settings";

  const loadBusinesses = useCallback(async () => {
    try {
      const loadedBusinesses = await listBusinesses();

      setBusinesses(loadedBusinesses);
    } catch {
      setBusinesses([]);
    }
  }, []);

  useEffect(() => {
    void loadBusinesses();

    function handleRefresh() {
      void loadBusinesses();
    }

    window.addEventListener(BUSINESS_REFRESH_EVENT, handleRefresh);

    return () => {
      window.removeEventListener(BUSINESS_REFRESH_EVENT, handleRefresh);
    };
  }, [loadBusinesses]);

  function handleToggleSidebar() {
    setIsCollapsed((currentValue) => !currentValue);
  }

  function handleWalletGroupClick() {
    if (isCollapsed) {
      onActiveViewChange("expenses");
      setSelectedBusinessId(null);
      return;
    }

    setIsWalletMenuOpen((currentValue) => !currentValue);
  }

  function handleWalletItemClick(view: AppView) {
    onActiveViewChange(view);
    setSelectedBusinessId(null);
  }

  function openBusinessArea() {
    onActiveViewChange("businesses");
    setIsBusinessMenuOpen(true);
    setSelectedBusinessId(null);
  }

  function handleBusinessGroupClick() {
    if (isCollapsed) {
      openBusinessArea();
      return;
    }

    setIsBusinessMenuOpen((currentValue) => !currentValue);
  }

  function handleCreateBusiness() {
    openBusinessArea();
    navigateToCreateBusiness();
  }

  function handleSelectBusiness(businessId: string) {
    onActiveViewChange("businesses");
    setIsBusinessMenuOpen(true);
    setSelectedBusinessId(businessId);
    navigateToBusiness(businessId);
  }

  function handleSettingsGroupClick() {
    if (isCollapsed) {
      setIsCollapsed(false);
      setIsSettingsMenuOpen(true);
      return;
    }

    setIsSettingsMenuOpen((currentValue) => !currentValue);
  }

  function handleSettingsItemClick(view: AppView) {
    onActiveViewChange(view);
    setSelectedBusinessId(null);
  }

  return (
    <aside
      className={`sticky top-0 hidden h-screen shrink-0 border-r p-4 shadow-sm transition-all lg:flex ${
        isCollapsed ? "w-24" : "w-72"
      }`}
      style={{
        backgroundColor: "var(--app-surface)",
        borderColor: "var(--app-border)",
      }}
    >
      <div className="flex min-h-0 w-full flex-col">
        <div className="flex shrink-0 items-center justify-between gap-3">
          {!isCollapsed ? (
            <div>
              <h1 className="app-title text-xl font-black tracking-tight">
                My Expenses
              </h1>

              <p className="app-muted mt-1 text-sm">Controle financeiro</p>
            </div>
          ) : null}

          <button
            type="button"
            onClick={handleToggleSidebar}
            className="app-btn app-btn-soft group h-11 w-11 rounded-2xl text-sm shadow-sm"
            aria-label={isCollapsed ? "Expandir menu" : "Recolher menu"}
            title={isCollapsed ? "Expandir menu" : "Recolher menu"}
          >
            <ChevronLeftIcon
              className={`h-5 w-5 transition-transform duration-200 group-hover:scale-110 ${
                isCollapsed ? "rotate-180" : ""
              }`}
            />
          </button>
        </div>

        <nav className="mt-8 min-h-0 flex-1 space-y-3 overflow-y-auto pb-4 pr-1">
          <SidebarGroupButton
            title="Minha Carteira"
            description="Ganhos, gastos e cartões"
            icon={WalletIcon}
            isActive={isWalletActive}
            isCollapsed={isCollapsed}
            isOpen={isWalletMenuOpen}
            onClick={handleWalletGroupClick}
          />

          {!isCollapsed && isWalletMenuOpen ? (
            <div
              className="space-y-2 border-l pl-5"
              style={{ borderColor: "var(--app-border)" }}
            >
              {PERSONAL_FINANCE_ITEMS.map((item) => (
                <SidebarSubItem
                  key={item.view}
                  item={item}
                  isActive={activeView === item.view}
                  onClick={() => handleWalletItemClick(item.view)}
                />
              ))}
            </div>
          ) : null}

          <SidebarGroupButton
            title="Meus Negócios"
            description="Estoque e fichas"
            icon={BusinessIcon}
            isActive={isBusinessActive}
            isCollapsed={isCollapsed}
            isOpen={isBusinessMenuOpen}
            onClick={handleBusinessGroupClick}
          />

          {!isCollapsed && isBusinessMenuOpen ? (
            <div
              className="space-y-2 border-l pl-5"
              style={{ borderColor: "var(--app-border)" }}
            >
              <button
                type="button"
                onClick={handleCreateBusiness}
                className="app-brand-soft flex w-full items-center gap-3 rounded-2xl border border-dashed px-4 py-3 text-left text-sm font-black transition hover:shadow-sm"
              >
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-white/70">
                  <PlusIcon className="h-4 w-4" />
                </span>

                <span>Criar novo negócio</span>
              </button>

              {businesses.length === 0 ? (
                <p className="app-card-soft rounded-2xl px-4 py-3 text-xs font-semibold">
                  Nenhum negócio criado
                </p>
              ) : null}

              {businesses.map((business) => {
                const isSelected =
                  isBusinessActive && selectedBusinessId === business.id;

                return (
                  <button
                    key={business.id}
                    type="button"
                    onClick={() => handleSelectBusiness(business.id)}
                    className={`flex w-full items-center gap-3 rounded-2xl px-4 py-3 text-left transition ${
                      isSelected
                        ? "app-sidebar-item-active"
                        : "app-sidebar-item"
                    }`}
                  >
                    <SidebarIconFrame isActive={isSelected} compact>
                      <BusinessIcon className="h-4 w-4" />
                    </SidebarIconFrame>

                    <span className="min-w-0">
                      <span className="block truncate text-sm font-black">
                        {business.name}
                      </span>

                      <span className="mt-0.5 block truncate text-xs opacity-75">
                        {business.type}
                      </span>
                    </span>
                  </button>
                );
              })}
            </div>
          ) : null}
        </nav>

        <footer
          className="shrink-0 space-y-3 border-t pt-4"
          style={{ borderColor: "var(--app-border)" }}
        >
          <SidebarGroupButton
            title="Configurações"
            description="Aparência e segurança"
            icon={SettingsIcon}
            isActive={isSettingsActive}
            isCollapsed={isCollapsed}
            isOpen={isSettingsMenuOpen}
            onClick={handleSettingsGroupClick}
            compact
          />

          {!isCollapsed && isSettingsMenuOpen ? (
            <div
              className="space-y-2 border-l pl-5"
              style={{ borderColor: "var(--app-border)" }}
            >
              {SETTINGS_ITEMS.map((item) => (
                <SidebarSubItem
                  key={item.view}
                  item={item}
                  isActive={activeView === item.view}
                  onClick={() => handleSettingsItemClick(item.view)}
                  compact
                />
              ))}
            </div>
          ) : null}

          {!isCollapsed ? (
            <div className="app-card-soft rounded-3xl p-4">
              <p className="app-title truncate text-sm font-black">
                {currentUser.name}
              </p>

              <p className="app-muted mt-1 truncate text-xs">
                {currentUser.email}
              </p>
            </div>
          ) : null}

          <button
            type="button"
            onClick={onLogout}
            className="app-btn app-btn-soft h-11 w-full rounded-2xl text-sm"
            aria-label="Sair"
            title="Sair"
          >
            <LogoutIcon className="h-4 w-4" />
            {!isCollapsed ? <span>Sair</span> : null}
          </button>
        </footer>
      </div>
    </aside>
  );
}

function SidebarGroupButton({
  title,
  description,
  icon,
  isActive,
  isCollapsed,
  isOpen,
  onClick,
  compact = false,
}: {
  title: string;
  description: string;
  icon: AppIcon;
  isActive: boolean;
  isCollapsed: boolean;
  isOpen: boolean;
  onClick: () => void;
  compact?: boolean;
}) {
  const Icon = icon;

  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex w-full items-center rounded-3xl text-left transition ${
        compact ? "py-2.5" : "py-3"
      } ${
        isCollapsed ? "justify-center px-2" : "gap-3 px-4"
      } ${isActive ? "app-sidebar-item-active" : "app-sidebar-item"}`}
      aria-label={title}
      title={title}
    >
      <SidebarIconFrame isActive={isActive} compact={compact}>
        <Icon className={compact ? "h-4 w-4" : "h-5 w-5"} />
      </SidebarIconFrame>

      {!isCollapsed ? (
        <span className="flex min-w-0 flex-1 items-center justify-between gap-3">
          <span className="min-w-0">
            <span className="block truncate font-bold">{title}</span>

            <span className="mt-0.5 block truncate text-xs opacity-75">
              {description}
            </span>
          </span>

          <ChevronDownIcon
            className={`h-4 w-4 shrink-0 transition-transform duration-200 ${
              isOpen ? "rotate-0" : "-rotate-90"
            }`}
          />
        </span>
      ) : null}
    </button>
  );
}

function SidebarSubItem({
  item,
  isActive,
  onClick,
  compact = false,
}: {
  item: MenuItem;
  isActive: boolean;
  onClick: () => void;
  compact?: boolean;
}) {
  const Icon = item.icon;

  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex w-full items-center gap-3 rounded-2xl px-4 text-left transition ${
        compact ? "py-2.5" : "py-3"
      } ${isActive ? "app-sidebar-item-active" : "app-sidebar-item"}`}
    >
      <SidebarIconFrame isActive={isActive} compact>
        <Icon className="h-4 w-4" />
      </SidebarIconFrame>

      <span className="min-w-0">
        <span className="block truncate text-sm font-black">{item.label}</span>

        {!compact ? (
          <span className="mt-0.5 block truncate text-xs opacity-75">
            {item.description}
          </span>
        ) : null}
      </span>
    </button>
  );
}

function SidebarIconFrame({
  isActive,
  compact = false,
  children,
}: {
  isActive: boolean;
  compact?: boolean;
  children: ReactNode;
}) {
  return (
    <span
      className={`flex shrink-0 items-center justify-center rounded-2xl border transition ${
        compact ? "h-8 w-8" : "h-10 w-10"
      } ${isActive ? "bg-white shadow-sm" : "app-brand-soft"}`}
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