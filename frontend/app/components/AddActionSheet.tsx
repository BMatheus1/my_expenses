"use client";

import { useKeyboardAwareViewport } from "../hooks/useKeyboardAwareViewport";

type AddAction = "quick" | "full" | "daily-review";

type AddActionSheetProps = {
  isOpen: boolean;
  isOnline: boolean;
  onClose: () => void;
  onSelect: (action: AddAction) => void;
};

const ACTIONS: Array<{
  id: AddAction;
  title: string;
  description: string;
}> = [
  {
    id: "quick",
    title: "Gasto rápido",
    description: "Registre em poucos segundos.",
  },
  {
    id: "full",
    title: "Adicionar completo",
    description: "Com descrição, categoria e detalhes.",
  },
  {
    id: "daily-review",
    title: "Fechamento do dia",
    description: "Revise o que pode ter ficado faltando.",
  },
];

export function AddActionSheet({
  isOpen,
  isOnline,
  onClose,
  onSelect,
}: AddActionSheetProps) {
  useKeyboardAwareViewport();

  if (!isOpen) {
    return null;
  }

  return (
    <div
      className="fixed inset-0 z-[120] flex items-end justify-center bg-slate-950/35 px-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] backdrop-blur-sm sm:items-center sm:p-6"
      role="dialog"
      aria-modal="true"
      aria-label="Adicionar lançamento"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) {
          onClose();
        }
      }}
    >
      <section className="mobile-sheet-panel w-full max-w-md rounded-3xl border border-[var(--app-border)] bg-[var(--app-surface)] p-4 text-[var(--app-text)] shadow-2xl sm:p-5">
        <div className="mx-auto mb-3 h-1.5 w-12 rounded-full bg-[var(--app-border-strong)] sm:hidden" />

        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="app-kicker">Adicionar</p>
            <h2 className="app-title mt-1 text-xl font-black">
              O que você quer registrar?
            </h2>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="touch-button flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-[var(--app-border)] bg-[var(--app-surface-soft)] text-lg font-black"
            aria-label="Fechar"
          >
            ×
          </button>
        </div>

        {!isOnline ? (
          <p className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-800">
            Com internet você consegue salvar novos lançamentos.
          </p>
        ) : null}

        <div className="mt-4 space-y-2">
          {ACTIONS.map((action) => (
            <button
              key={action.id}
              type="button"
              onClick={() => onSelect(action.id)}
              disabled={!isOnline}
              className="app-card-hover touch-button w-full rounded-2xl p-4 text-left disabled:cursor-not-allowed disabled:opacity-60"
            >
              <span className="app-title block text-sm font-black">
                {action.title}
              </span>
              <span className="app-muted mt-1 block text-sm leading-5">
                {action.description}
              </span>
            </button>
          ))}
        </div>
      </section>
    </div>
  );
}
