"use client";

import { useEffect, useMemo, useState } from "react";

import {
  MISC_EXPENSE_CATEGORY,
  QUICK_EXPENSE_AMOUNTS,
  QUICK_EXPENSE_CATEGORY_SUGGESTIONS,
  formatCurrencyBRL,
} from "../utils/dailyReview";
import { parseMoneyToNumber, sanitizeMoneyInput } from "../utils/formatters";
import { LoadingButton } from "./AppFeedback";

type QuickAddExpenseSheetProps = {
  isOpen: boolean;
  categories: string[];
  isSaving: boolean;
  errorMessage: string;
  didSave: boolean;
  onClose: () => void;
  onSubmit: (data: { amount: number; category: string }) => Promise<void>;
  onResetSuccess: () => void;
};

export function QuickAddExpenseSheet({
  isOpen,
  categories,
  isSaving,
  errorMessage,
  didSave,
  onClose,
  onSubmit,
  onResetSuccess,
}: QuickAddExpenseSheetProps) {
  const [selectedAmount, setSelectedAmount] = useState<number | null>(10);
  const [customAmount, setCustomAmount] = useState("");
  const [selectedCategory, setSelectedCategory] = useState(MISC_EXPENSE_CATEGORY);
  const isCustomAmount = selectedAmount === null;

  const categoryOptions = useMemo(() => {
    const mergedCategories: string[] = [];
    const categoryKeys = new Set<string>();

    for (const categoryName of [
      ...QUICK_EXPENSE_CATEGORY_SUGGESTIONS,
      ...categories,
    ]) {
      const normalizedName = categoryName.trim();
      const categoryKey = normalizeOptionKey(normalizedName);

      if (!normalizedName || categoryKeys.has(categoryKey)) {
        continue;
      }

      mergedCategories.push(normalizedName);
      categoryKeys.add(categoryKey);
    }

    return mergedCategories;
  }, [categories]);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    setSelectedAmount(10);
    setCustomAmount("");
    setSelectedCategory(
      categoryOptions.includes(MISC_EXPENSE_CATEGORY)
        ? MISC_EXPENSE_CATEGORY
        : categoryOptions[0] ?? MISC_EXPENSE_CATEGORY,
    );
  }, [categoryOptions, isOpen]);

  if (!isOpen) {
    return null;
  }

  const amountToSave = isCustomAmount
    ? parseMoneyToNumber(customAmount)
    : selectedAmount;
  const canSubmit =
    !isSaving &&
    !didSave &&
    amountToSave !== null &&
    !Number.isNaN(amountToSave) &&
    amountToSave > 0 &&
    selectedCategory.trim().length > 0;

  async function handleSubmit() {
    if (!canSubmit || amountToSave === null) {
      return;
    }

    await onSubmit({
      amount: amountToSave,
      category: selectedCategory,
    });
  }

  return (
    <div
      className="fixed inset-0 z-[130] flex items-end justify-center bg-slate-950/35 px-3 pb-3 backdrop-blur-sm sm:items-center sm:p-6"
      role="dialog"
      aria-modal="true"
      aria-label="Gasto rápido"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) {
          onClose();
        }
      }}
    >
      <section className="w-full max-w-lg rounded-3xl border border-[var(--app-border)] bg-[var(--app-surface)] p-4 text-[var(--app-text)] shadow-2xl sm:p-5">
        <SheetHeader title="Gasto rápido" onClose={onClose} />

        {didSave ? (
          <div className="mt-5 rounded-3xl border border-[var(--brand-border)] bg-[var(--brand-soft)] p-5 text-[var(--brand-text)]">
            <h3 className="text-lg font-black">Pronto, gasto salvo.</h3>
            <p className="mt-1 text-sm leading-6">
              Ele já entra na sua lista e nos relatórios do mês.
            </p>

            <div className="mt-4 flex flex-col gap-2 sm:flex-row">
              <button
                type="button"
                onClick={onResetSuccess}
                className="app-button-secondary touch-button justify-center"
              >
                Adicionar outro
              </button>
              <button
                type="button"
                onClick={onClose}
                className="app-button-primary touch-button justify-center"
              >
                Fechar
              </button>
            </div>
          </div>
        ) : (
          <>
            <div className="mt-5">
              <p className="app-muted text-xs font-black uppercase tracking-widest">
                Valor
              </p>

              <div className="mt-3 grid grid-cols-3 gap-2 sm:grid-cols-6">
                {QUICK_EXPENSE_AMOUNTS.map((amount) => (
                  <button
                    key={amount}
                    type="button"
                    onClick={() => {
                      setSelectedAmount(amount);
                      setCustomAmount("");
                    }}
                    className={`touch-button rounded-2xl border px-3 py-3 text-sm font-black transition ${
                      selectedAmount === amount
                        ? "app-brand-soft"
                        : "border-[var(--app-border)] bg-[var(--app-surface-soft)] text-[var(--app-text-soft)]"
                    }`}
                  >
                    {formatCurrencyBRL(amount)}
                  </button>
                ))}
              </div>

              <button
                type="button"
                onClick={() => setSelectedAmount(null)}
                className={`touch-button mt-2 w-full rounded-2xl border px-4 py-3 text-sm font-black transition ${
                  isCustomAmount
                    ? "app-brand-soft"
                    : "border-[var(--app-border)] bg-[var(--app-surface-soft)] text-[var(--app-text-soft)]"
                }`}
              >
                Outro valor
              </button>

              {isCustomAmount ? (
                <label className="mt-3 block text-xs font-bold text-[var(--app-muted)]">
                  Valor
                  <input
                    autoFocus
                    type="text"
                    inputMode="decimal"
                    value={customAmount}
                    onChange={(event) =>
                      setCustomAmount(sanitizeMoneyInput(event.target.value))
                    }
                    placeholder="Ex: 12,50"
                    className="app-input mt-1.5"
                  />
                </label>
              ) : null}
            </div>

            <div className="mt-5">
              <p className="app-muted text-xs font-black uppercase tracking-widest">
                Categoria
              </p>
              <p className="app-muted mt-2 text-sm leading-6">
                Miudezas é para pequenos gastos que você não lembra exatamente,
                mas não quer deixar fora do controle.
              </p>

              <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3">
                {categoryOptions.map((categoryName) => (
                  <button
                    key={categoryName}
                    type="button"
                    onClick={() => setSelectedCategory(categoryName)}
                    className={`touch-button rounded-2xl border px-3 py-3 text-sm font-black transition ${
                      selectedCategory === categoryName
                        ? "app-brand-soft"
                        : "border-[var(--app-border)] bg-[var(--app-surface-soft)] text-[var(--app-text-soft)]"
                    }`}
                  >
                    {categoryName}
                  </button>
                ))}
              </div>
            </div>

            {errorMessage ? (
              <p className="mt-4 rounded-2xl border border-red-100 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
                {errorMessage}
              </p>
            ) : null}

            <div className="mt-5 flex flex-col gap-2 sm:flex-row">
              <button
                type="button"
                onClick={onClose}
                disabled={isSaving}
                className="app-button-secondary touch-button justify-center disabled:opacity-60"
              >
                Cancelar
              </button>

              <LoadingButton
                isLoading={isSaving}
                loadingLabel="Salvando..."
                disabled={!canSubmit}
                onClick={handleSubmit}
                className="app-button-primary touch-button flex-1 justify-center"
              >
                Salvar gasto
              </LoadingButton>
            </div>
          </>
        )}
      </section>
    </div>
  );
}

function SheetHeader({
  title,
  onClose,
}: {
  title: string;
  onClose: () => void;
}) {
  return (
    <>
      <div className="mx-auto mb-3 h-1.5 w-12 rounded-full bg-[var(--app-border-strong)] sm:hidden" />
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="app-kicker">Sem formulário longo</p>
          <h2 className="app-title mt-1 text-xl font-black">{title}</h2>
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
    </>
  );
}

function normalizeOptionKey(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .replace(/\s+/g, " ")
    .toLocaleLowerCase("pt-BR");
}
