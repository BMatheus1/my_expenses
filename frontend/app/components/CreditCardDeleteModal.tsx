"use client";

import type { CreditCard } from "../types/credit-card";

type CreditCardDeleteModalProps = {
  card: CreditCard | null;
  linkedExpensesCount: number;
  isLoading: boolean;
  onKeepExpenses: () => void;
  onDeleteExpenses: () => void;
  onCancel: () => void;
};

export function CreditCardDeleteModal({
  card,
  linkedExpensesCount,
  isLoading,
  onKeepExpenses,
  onDeleteExpenses,
  onCancel,
}: CreditCardDeleteModalProps) {
  if (!card) {
    return null;
  }

  const hasLinkedExpenses = linkedExpensesCount > 0;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 px-4 py-4 backdrop-blur-sm sm:items-center">
      <section className="w-full max-w-lg rounded-3xl border border-stone-200 bg-white p-5 shadow-2xl sm:p-6">
        <header className="mb-5">
          <p className="text-xs font-black uppercase tracking-widest text-red-600">
            Excluir cartão
          </p>

          <h2 className="mt-2 text-2xl font-black tracking-tight text-stone-950">
            {card.name} •••• {card.last_four_digits}
          </h2>

          <p className="mt-2 text-sm font-medium leading-6 text-stone-600">
            {hasLinkedExpenses
              ? `Este cartão possui ${linkedExpensesCount} lançamento${
                  linkedExpensesCount === 1 ? "" : "s"
                } vinculado${
                  linkedExpensesCount === 1 ? "" : "s"
                }. Escolha o que deseja fazer.`
              : "Este cartão não possui lançamentos vinculados. Você pode removê-lo com segurança."}
          </p>
        </header>

        {hasLinkedExpenses ? (
          <div className="space-y-3">
            <button
              type="button"
              onClick={onKeepExpenses}
              disabled={isLoading}
              className="touch-button w-full rounded-3xl border border-stone-200 bg-white px-4 py-4 text-left transition hover:bg-stone-50 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <span className="block text-sm font-black text-stone-950">
                Excluir só o cartão
              </span>

              <span className="mt-1 block text-xs font-semibold leading-5 text-stone-500">
                O cartão será removido da sua carteira, mas os lançamentos vão
                continuar no histórico marcados como “cartão excluído”.
              </span>
            </button>

            <button
              type="button"
              onClick={onDeleteExpenses}
              disabled={isLoading}
              className="touch-button w-full rounded-3xl border border-red-100 bg-red-50 px-4 py-4 text-left transition hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <span className="block text-sm font-black text-red-700">
                Excluir cartão e lançamentos
              </span>

              <span className="mt-1 block text-xs font-semibold leading-5 text-red-600">
                Remove o cartão e todos os gastos vinculados a ele, incluindo
                parcelas futuras. Essa ação não pode ser desfeita.
              </span>
            </button>

            <button
              type="button"
              onClick={onCancel}
              disabled={isLoading}
              className="touch-button w-full rounded-3xl border border-stone-200 px-4 py-4 text-sm font-black text-stone-700 transition hover:bg-stone-50 disabled:cursor-not-allowed disabled:opacity-60"
            >
              Cancelar exclusão
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            <button
              type="button"
              onClick={onKeepExpenses}
              disabled={isLoading}
              className="touch-button w-full rounded-3xl bg-stone-950 px-4 py-4 text-sm font-black text-white transition hover:bg-stone-800 disabled:cursor-not-allowed disabled:opacity-60"
            >
              Excluir cartão
            </button>

            <button
              type="button"
              onClick={onCancel}
              disabled={isLoading}
              className="touch-button w-full rounded-3xl border border-stone-200 px-4 py-4 text-sm font-black text-stone-700 transition hover:bg-stone-50 disabled:cursor-not-allowed disabled:opacity-60"
            >
              Cancelar
            </button>
          </div>
        )}
      </section>
    </div>
  );
}