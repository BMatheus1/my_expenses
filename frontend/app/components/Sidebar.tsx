"use client";

import { useEffect, useState } from "react";

import {
  BUSINESS_REFRESH_EVENT,
  navigateToBusiness,
  navigateToCreateBusiness,
} from "@/app/lib/business-navigation";
import { listBusinesses } from "@/app/lib/business-api";
import type { Business } from "@/app/types/business";
import type { User } from "../types/auth";

export type AppView = "expenses" | "incomes" | "reports" | "businesses";

type SidebarProps = {
  activeView: AppView;
  currentUser: User;
  onActiveViewChange: (view: AppView) => void;
  onLogout: () => void;
};

const MENU_ITEMS: Array<{
  view: AppView;
  label: string;
  shortLabel: string;
  description: string;
}> = [
  {
    view: "incomes",
    label: "Ganhos",
    shortLabel: "+ $",
    description: "Entradas",
  },
  {
    view: "expenses",
    label: "Gastos",
    shortLabel: "- $",
    description: "Lista e cadastro",
  },
  {
    view: "reports",
    label: "Relatórios",
    shortLabel: "R",
    description: "Gráficos",
  },
];

export function Sidebar({
  activeView,
  currentUser,
  onActiveViewChange,
  onLogout,
}: SidebarProps) {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isBusinessMenuOpen, setIsBusinessMenuOpen] = useState(true);
  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [selectedBusinessId, setSelectedBusinessId] = useState<string | null>(null);

  const isBusinessActive = activeView === "businesses";

  useEffect(() => {
    loadBusinesses();

    function handleRefresh() {
      loadBusinesses();
    }

    window.addEventListener(BUSINESS_REFRESH_EVENT, handleRefresh);

    return () => {
      window.removeEventListener(BUSINESS_REFRESH_EVENT, handleRefresh);
    };
  }, []);

  async function loadBusinesses() {
    try {
      const loadedBusinesses = await listBusinesses();
      setBusinesses(loadedBusinesses);
    } catch {
      setBusinesses([]);
    }
  }

  function openBusinessArea() {
    onActiveViewChange("businesses");
    setIsBusinessMenuOpen(true);
  }

  function handleCreateBusiness() {
    openBusinessArea();
    setSelectedBusinessId(null);
    navigateToCreateBusiness();
  }

  function handleSelectBusiness(businessId: string) {
    openBusinessArea();
    setSelectedBusinessId(businessId);
    navigateToBusiness(businessId);
  }

  return (
    <aside
      className={`sticky top-0 hidden h-screen shrink-0 border-r border-stone-200 bg-white p-4 shadow-sm transition-all lg:block ${
        isCollapsed ? "w-24" : "w-72"
      }`}
    >
      <div className="flex h-full flex-col">
        <div className="flex items-center justify-between gap-3">
          {!isCollapsed ? (
            <div>
              <h1 className="text-xl font-black tracking-tight text-stone-950">
                My Expenses
              </h1>

              <p className="mt-1 text-sm text-stone-500">
                Controle financeiro
              </p>
            </div>
          ) : null}

          <button
            type="button"
            onClick={() => setIsCollapsed((currentValue) => !currentValue)}
            className="flex h-10 w-10 items-center justify-center rounded-full border border-stone-200 bg-stone-50 text-sm font-black text-stone-700 transition hover:bg-stone-100"
            aria-label={isCollapsed ? "Expandir menu" : "Recolher menu"}
          >
            {isCollapsed ? ">" : "<"}
          </button>
        </div>

        <nav className="mt-8 space-y-2">
          {MENU_ITEMS.map((item) => (
            <SidebarButton
              key={item.view}
              item={item}
              isActive={activeView === item.view}
              isCollapsed={isCollapsed}
              onClick={() => onActiveViewChange(item.view)}
            />
          ))}

          <div className="pt-3">
            <button
              type="button"
              onClick={() => {
                if (isCollapsed) {
                  openBusinessArea();
                  return;
                }

                setIsBusinessMenuOpen((currentValue) => !currentValue);
              }}
              className={`flex w-full items-center gap-3 rounded-3xl px-4 py-3 text-left transition ${
                isBusinessActive
                  ? "bg-emerald-700 text-white shadow-sm"
                  : "text-stone-600 hover:bg-stone-100 hover:text-stone-950"
              }`}
            >
              <span
                className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl text-sm font-black ${
                  isBusinessActive
                    ? "bg-white text-emerald-700"
                    : "bg-stone-100 text-stone-700"
                }`}
              >
                N
              </span>

              {!isCollapsed ? (
                <span className="flex min-w-0 flex-1 items-center justify-between gap-3">
                  <span className="min-w-0">
                    <span className="block truncate font-bold">
                      Meus Negócios
                    </span>

                    <span
                      className={`mt-0.5 block truncate text-xs ${
                        isBusinessActive ? "text-emerald-50" : "text-stone-400"
                      }`}
                    >
                      Estoque e fichas
                    </span>
                  </span>

                  <span className="text-sm font-black">
                    {isBusinessMenuOpen ? "−" : "+"}
                  </span>
                </span>
              ) : null}
            </button>

            {!isCollapsed && isBusinessMenuOpen ? (
              <div className="mt-2 space-y-2 border-l border-stone-200 pl-5">
                <button
                  type="button"
                  onClick={handleCreateBusiness}
                  className="w-full rounded-2xl border border-dashed border-emerald-300 bg-emerald-50 px-4 py-3 text-left text-sm font-black text-emerald-800 transition hover:border-emerald-700 hover:bg-emerald-100"
                >
                  + Criar novo negócio
                </button>

                {businesses.length === 0 ? (
                  <p className="rounded-2xl bg-stone-50 px-4 py-3 text-xs font-semibold text-stone-400">
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
                          ? "bg-stone-900 text-white"
                          : "text-stone-600 hover:bg-stone-50 hover:text-stone-950"
                      }`}
                    >
                      <span className="block truncate text-sm font-black">
                        {business.name}
                      </span>

                      <span
                        className={`mt-0.5 block truncate text-xs ${
                          isSelected ? "text-stone-300" : "text-stone-400"
                        }`}
                      >
                        {business.type}
                      </span>
                    </button>
                  );
                })}
              </div>
            ) : null}
          </div>
        </nav>

        <div className="mt-auto space-y-3">
          {!isCollapsed ? (
            <div className="rounded-3xl border border-stone-200 bg-stone-50 p-4">
              <p className="truncate text-sm font-black text-stone-950">
                {currentUser.name}
              </p>

              <p className="mt-1 truncate text-xs text-stone-500">
                {currentUser.email}
              </p>
            </div>
          ) : null}

          <button
            type="button"
            onClick={onLogout}
            className="flex w-full items-center justify-center rounded-full border border-stone-200 px-4 py-3 text-sm font-black text-stone-700 transition hover:bg-stone-50"
          >
            {isCollapsed ? "S" : "Sair"}
          </button>
        </div>
      </div>
    </aside>
  );
}

type SidebarButtonProps = {
  item: {
    view: AppView;
    label: string;
    shortLabel: string;
    description: string;
  };
  isActive: boolean;
  isCollapsed: boolean;
  onClick: () => void;
};

function SidebarButton({
  item,
  isActive,
  isCollapsed,
  onClick,
}: SidebarButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex w-full items-center gap-3 rounded-3xl px-4 py-3 text-left transition ${
        isActive
          ? "bg-emerald-700 text-white shadow-sm"
          : "text-stone-600 hover:bg-stone-100 hover:text-stone-950"
      }`}
    >
      <span
        className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl text-sm font-black ${
          isActive ? "bg-white text-emerald-700" : "bg-stone-100 text-stone-700"
        }`}
      >
        {item.shortLabel}
      </span>

      {!isCollapsed ? (
        <span className="min-w-0">
          <span className="block truncate font-bold">{item.label}</span>

          <span
            className={`mt-0.5 block truncate text-xs ${
              isActive ? "text-emerald-50" : "text-stone-400"
            }`}
          >
            {item.description}
          </span>
        </span>
      ) : null}
    </button>
  );
}