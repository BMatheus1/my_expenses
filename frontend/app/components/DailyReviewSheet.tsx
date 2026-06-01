"use client";

import { useEffect, useMemo, useState } from "react";

import {
  MISC_EXPENSE_CATEGORY,
  calculateMissingAmount,
  formatCurrencyBRL,
} from "../utils/dailyReview";
import { parseMoneyToNumber, sanitizeMoneyInput } from "../utils/formatters";
import { LoadingButton } from "./AppFeedback";

type DailyReviewSheetProps = {
  isOpen: boolean;
  todayTotal: number;
  categories: string[];
  isSaving: boolean;
  errorMessage: string;
  didSave: boolean;
  onClose: () => void;
  onCompleteToday: () => void;
  onDismissToday: () => void;
  onSubmitDifference: (data: { amount: number; category: string }) => Promise<void>;
  onResetSuccess: () => void;
};

type ReviewStep = "intro" | "total" | "difference" | "category" | "done";

export function DailyReviewSheet({
  isOpen,
  todayTotal,
  categories,
  isSaving,
  errorMessage,
  didSave,
  onClose,
  onCompleteToday,
  onDismissToday,
  onSubmitDifference,
  onResetSuccess,
}: DailyReviewSheetProps) {
  const [step, setStep] = useState<ReviewStep>("intro");
  const [informedTotal, setInformedTotal] = useState("");
  const [selectedCategory, setSelectedCategory] = useState(MISC_EXPENSE_CATEGORY);

  const categoryOptions = useMemo(() => {
    const options = [MISC_EXPENSE_CATEGORY, ...categories];
    const seen = new Set<string>();

    return options.filter((categoryName) => {
      const key = normalizeOptionKey(categoryName);

      if (!categoryName.trim() || seen.has(key)) {
        return false;
      }

      seen.add(key);
      return true;
    });
  }, [categories]);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    setStep("intro");
    setInformedTotal("");
    setSelectedCategory(
      categoryOptions.includes(MISC_EXPENSE_CATEGORY)
        ? MISC_EXPENSE_CATEGORY
        : categoryOptions[0] ?? MISC_EXPENSE_CATEGORY,
    );
  }, [categoryOptions, isOpen]);

  useEffect(() => {
    if (didSave) {
      setStep("done");
    }
  }, [didSave]);

  if (!isOpen) {
    return null;
  }

  const parsedInformedTotal = parseMoneyToNumber(informedTotal);
  const missingAmount = Number.isNaN(parsedInformedTotal)
    ? 0
    : calculateMissingAmount(parsedInformedTotal, todayTotal);
  const canReviewTotal =
    informedTotal.trim().length > 0 &&
    !Number.isNaN(parsedInformedTotal) &&
    parsedInformedTotal >= 0;

  async function saveDifference(categoryName: string) {
    if (isSaving || missingAmount <= 0) {
      return;
    }

    await onSubmitDifference({
      amount: missingAmount,
      category: categoryName,
    });
  }

  return (
    <div
      className="fixed inset-0 z-[130] flex items-end justify-center bg-slate-950/35 px-3 pb-3 backdrop-blur-sm sm:items-center sm:p-6"
      role="dialog"
      aria-modal="true"
      aria-label="Fechamento do dia"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) {
          onClose();
        }
      }}
    >
      <section className="w-full max-w-lg rounded-3xl border border-[var(--app-border)] bg-[var(--app-surface)] p-4 text-[var(--app-text)] shadow-2xl sm:p-5">
        <SheetHeader onClose={onClose} />

        {step === "intro" ? (
          <div className="mt-5">
            <h3 className="app-title text-xl font-black">
              Vamos revisar rapidinho?
            </h3>
            <p className="app-muted mt-2 text-sm leading-6">
              Hoje você registrou {formatCurrencyBRL(todayTotal)} em gastos.
              Quer conferir se ficou faltando algo?
            </p>

            <div className="mt-5 flex flex-col gap-2 sm:flex-row">
              <button
                type="button"
                onClick={onDismissToday}
                className="app-button-secondary touch-button justify-center"
              >
                Agora não
              </button>
              <button
                type="button"
                onClick={() => setStep("total")}
                className="app-button-primary touch-button justify-center"
              >
                Sim, revisar
              </button>
            </div>
          </div>
        ) : null}

        {step === "total" ? (
          <div className="mt-5">
            <label className="block text-sm font-black text-[var(--app-text)]">
              Quanto você acha que gastou no total hoje?
              <input
                autoFocus
                type="text"
                inputMode="decimal"
                value={informedTotal}
                onChange={(event) =>
                  setInformedTotal(sanitizeMoneyInput(event.target.value))
                }
                placeholder="Ex: 85,00"
                className="app-input mt-2"
              />
            </label>

            <div className="mt-5 flex flex-col gap-2 sm:flex-row">
              <button
                type="button"
                onClick={() => setStep("intro")}
                className="app-button-secondary touch-button justify-center"
              >
                Voltar
              </button>
              <button
                type="button"
                onClick={() => setStep("difference")}
                disabled={!canReviewTotal}
                className="app-button-primary touch-button justify-center disabled:cursor-not-allowed disabled:opacity-60"
              >
                Conferir
              </button>
            </div>
          </div>
        ) : null}

        {step === "difference" ? (
          <div className="mt-5">
            {missingAmount > 0 ? (
              <>
                <div className="grid gap-2 sm:grid-cols-3">
                  <ReviewMetric label="Você registrou" value={todayTotal} />
                  <ReviewMetric label="Você informou" value={parsedInformedTotal} />
                  <ReviewMetric label="Diferença" value={missingAmount} />
                </div>

                <p className="app-muted mt-4 text-sm leading-6">
                  Parece que ficaram {formatCurrencyBRL(missingAmount)} sem
                  categoria. Quer organizar agora? Se não lembrar exatamente,
                  Miudezas resolve sem complicar.
                </p>

                {errorMessage ? <ErrorMessage message={errorMessage} /> : null}

                <div className="mt-5 flex flex-col gap-2">
                  <LoadingButton
                    isLoading={isSaving}
                    loadingLabel="Salvando..."
                    disabled={isSaving}
                    onClick={() => saveDifference(MISC_EXPENSE_CATEGORY)}
                    className="app-button-primary touch-button justify-center"
                  >
                    Registrar como Miudezas
                  </LoadingButton>

                  <button
                    type="button"
                    onClick={() => setStep("category")}
                    disabled={isSaving}
                    className="app-button-secondary touch-button justify-center disabled:opacity-60"
                  >
                    Escolher categoria
                  </button>

                  <button
                    type="button"
                    onClick={onDismissToday}
                    disabled={isSaving}
                    className="touch-button rounded-full px-5 py-3 text-sm font-black text-[var(--app-muted)] disabled:opacity-60"
                  >
                    Ignorar
                  </button>
                </div>
              </>
            ) : (
              <>
                <div className="rounded-3xl border border-[var(--brand-border)] bg-[var(--brand-soft)] p-5 text-[var(--brand-text)]">
                  <h3 className="text-lg font-black">Tudo certo por hoje.</h3>
                  <p className="mt-1 text-sm leading-6">
                    Seu dia já parece organizado.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={onCompleteToday}
                  className="app-button-primary touch-button mt-5 w-full justify-center"
                >
                  Fechar
                </button>
              </>
            )}
          </div>
        ) : null}

        {step === "category" ? (
          <div className="mt-5">
            <p className="app-muted text-sm leading-6">
              Vamos salvar a diferença de {formatCurrencyBRL(missingAmount)} em
              uma categoria simples.
            </p>

            <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3">
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

            {errorMessage ? <ErrorMessage message={errorMessage} /> : null}

            <div className="mt-5 flex flex-col gap-2 sm:flex-row">
              <button
                type="button"
                onClick={() => setStep("difference")}
                disabled={isSaving}
                className="app-button-secondary touch-button justify-center disabled:opacity-60"
              >
                Voltar
              </button>

              <LoadingButton
                isLoading={isSaving}
                loadingLabel="Salvando..."
                disabled={isSaving || missingAmount <= 0}
                onClick={() => saveDifference(selectedCategory)}
                className="app-button-primary touch-button flex-1 justify-center"
              >
                Salvar diferença
              </LoadingButton>
            </div>
          </div>
        ) : null}

        {step === "done" ? (
          <div className="mt-5 rounded-3xl border border-[var(--brand-border)] bg-[var(--brand-soft)] p-5 text-[var(--brand-text)]">
            <h3 className="text-lg font-black">Fechamento salvo.</h3>
            <p className="mt-1 text-sm leading-6">
              Dia organizado. Você ainda pode adicionar novos gastos se precisar.
            </p>

            <div className="mt-4 flex flex-col gap-2 sm:flex-row">
              <button
                type="button"
                onClick={() => {
                  setStep("intro");
                  setInformedTotal("");
                  onResetSuccess();
                }}
                className="app-button-secondary touch-button justify-center"
              >
                Revisar de novo
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
        ) : null}
      </section>
    </div>
  );
}

function SheetHeader({ onClose }: { onClose: () => void }) {
  return (
    <>
      <div className="mx-auto mb-3 h-1.5 w-12 rounded-full bg-[var(--app-border-strong)] sm:hidden" />
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="app-kicker">Fechamento do dia</p>
          <h2 className="app-title mt-1 text-xl font-black">
            Organize sem cobrança
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
    </>
  );
}

function ReviewMetric({ label, value }: { label: string; value: number }) {
  return (
    <div className="app-card-soft rounded-2xl p-3">
      <p className="app-muted text-xs font-black uppercase tracking-widest">
        {label}
      </p>
      <p className="app-title mt-1 text-sm font-black">
        {formatCurrencyBRL(value)}
      </p>
    </div>
  );
}

function ErrorMessage({ message }: { message: string }) {
  return (
    <p className="mt-4 rounded-2xl border border-red-100 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
      {message}
    </p>
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
