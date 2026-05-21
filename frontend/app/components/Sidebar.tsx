"use client";

import { useCallback, useEffect, useState } from "react";

import { listBusinesses } from "@/app/lib/business-api";
import {
  BUSINESS_REFRESH_EVENT,
  navigateToBusiness,
  navigateToCreateBusiness,
} from "@/app/lib/business-navigation";
import type { Business } from "@/app/types/business";
import type { User } from "../types/auth";

export type AppView =
  | "expenses"
  | "incomes"
  | "reports"
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
  shortLabel: string;
};

const PERSONAL_FINANCE_ITEMS: MenuItem[] = [
  {
    view: "incomes",
    label: "Ganhos",
    description: "Entradas de dinheiro",
    shortLabel: "+",
  },
  {
    view: "expenses",
    label: "Gastos",
    description: "Despesas pessoais",
    shortLabel: "-",
  },
  {
    view: "reports",
    label: "Relatórios",
    description: "Resumo e gráficos",
    shortLabel: "R",
  },
];

const SETTINGS_ITEMS: MenuItem[] = [
  {
    view: "appearance-settings",
    label: "Aparência e tema",
    description: "Cores e modo escuro",
    shortLabel: "🎨",
  },
  {
    view: "security-settings",
    label: "Segurança",
    description: "Sessão e proteção",
    shortLabel: "🔐",
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

  function openWalletArea() {
    if (isCollapsed) {
      onActiveViewChange("expenses");
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
            <span
              className={`text-xl font-black leading-none transition-transform duration-200 group-hover:scale-110 ${
                isCollapsed ? "rotate-180" : ""
              }`}
            >
              ❮
            </span>
          </button>
        </div>

        <nav className="mt-8 min-h-0 flex-1 space-y-3 overflow-y-auto pb-4 pr-1">
          <SidebarGroupButton
            title="Minha Carteira"
            description="Ganhos, gastos e relatórios"
            shortLabel="C"
            isActive={isWalletActive}
            isCollapsed={isCollapsed}
            isOpen={isWalletMenuOpen}
            onClick={openWalletArea}
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
            shortLabel="N"
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
                className="app-brand-soft w-full rounded-2xl border border-dashed px-4 py-3 text-left text-sm font-black transition hover:shadow-sm"
              >
                + Criar novo negócio
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
                    className={`w-full rounded-2xl px-4 py-3 text-left transition ${
                      isSelected
                        ? "app-sidebar-item-active"
                        : "app-sidebar-item"
                    }`}
                  >
                    <span className="block truncate text-sm font-black">
                      {business.name}
                    </span>

                    <span className="mt-0.5 block truncate text-xs opacity-75">
                      {business.type}
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
            shortLabel="⚙"
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
            <span aria-hidden="true">⎋</span>
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
  shortLabel,
  isActive,
  isCollapsed,
  isOpen,
  onClick,
  compact = false,
}: {
  title: string;
  description: string;
  shortLabel: string;
  isActive: boolean;
  isCollapsed: boolean;
  isOpen: boolean;
  onClick: () => void;
  compact?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex w-full items-center gap-3 rounded-3xl px-4 text-left transition ${
        compact ? "py-2.5" : "py-3"
      } ${isActive ? "app-sidebar-item-active" : "app-sidebar-item"}`}
      aria-label={title}
      title={title}
    >
      <span
        className={`flex shrink-0 items-center justify-center rounded-2xl text-sm font-black ${
          compact ? "h-9 w-9" : "h-10 w-10"
        } ${isActive ? "bg-white" : "app-brand-soft"}`}
        style={{ color: isActive ? "var(--brand-primary)" : undefined }}
      >
        {shortLabel}
      </span>

      {!isCollapsed ? (
        <span className="flex min-w-0 flex-1 items-center justify-between gap-3">
          <span className="min-w-0">
            <span className="block truncate font-bold">{title}</span>

            <span className="mt-0.5 block truncate text-xs opacity-75">
              {description}
            </span>
          </span>

          <span className="text-sm font-black">{isOpen ? "−" : "+"}</span>
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
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex w-full items-center gap-3 rounded-2xl px-4 text-left transition ${
        compact ? "py-2.5" : "py-3"
      } ${isActive ? "app-sidebar-item-active" : "app-sidebar-item"}`}
    >
      <span
        className={`flex shrink-0 items-center justify-center rounded-xl text-xs font-black ${
          compact ? "h-7 w-7" : "h-8 w-8"
        } ${isActive ? "bg-white" : "app-brand-soft"}`}
        style={{ color: isActive ? "var(--brand-primary)" : undefined }}
      >
        {item.shortLabel}
      </span>

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