"use client";

import { useState } from "react";

import type { User } from "../types/auth";

export type AppView = "expenses" | "incomes" | "reports";

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

  return (
    <aside
      className={`sticky top-0 hidden h-screen shrink-0 border-r border-stone-200 bg-white p-4 shadow-sm transition-all lg:block ${
        isCollapsed ? "w-24" : "w-72"
      }`}
    >
      <div className="flex h-full flex-col">
        <div className="flex items-center justify-between gap-3">
          {!isCollapsed && (
            <div>
              <h1 className="text-xl font-bold tracking-tight text-stone-950">
                My Expenses
              </h1>

              <p className="mt-1 text-sm text-stone-500">
                Controle financeiro pessoal
              </p>
            </div>
          )}

          <button
            type="button"
            onClick={() => setIsCollapsed((currentValue) => !currentValue)}
            className="flex h-10 w-10 items-center justify-center rounded-full border border-stone-200 bg-stone-50 text-sm font-bold text-stone-700 transition hover:bg-stone-100"
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
        </nav>

        <div className="mt-auto space-y-3">
          {!isCollapsed && (
            <div className="rounded-3xl border border-stone-200 bg-stone-50 p-4">
              <p className="truncate text-sm font-bold text-stone-950">
                {currentUser.name}
              </p>

              <p className="mt-1 truncate text-xs text-stone-500">
                {currentUser.email}
              </p>
            </div>
          )}

          <button
            type="button"
            onClick={onLogout}
            className="flex w-full items-center justify-center rounded-full border border-stone-200 px-4 py-3 text-sm font-bold text-stone-700 transition hover:bg-stone-50"
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
        className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl text-sm font-bold ${
          isActive ? "bg-white text-emerald-700" : "bg-stone-100 text-stone-700"
        }`}
      >
        {item.shortLabel}
      </span>

      {!isCollapsed && (
        <span className="min-w-0">
          <span className="block font-semibold">{item.label}</span>

          <span
            className={`mt-0.5 block text-xs ${
              isActive ? "text-emerald-50" : "text-stone-400"
            }`}
          >
            {item.description}
          </span>
        </span>
      )}
    </button>
  );
}