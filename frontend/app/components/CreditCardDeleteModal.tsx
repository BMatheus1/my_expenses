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
    <div
      className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/40 px-4 py-6 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="delete-credit-card-title"
    >
      <button
        type="button"
        className="fixed inset-0 cursor-default"
        aria-label="Cancelar exclusão do cartão"
        onClick={onCancel}
        disabled={isLoading}
      />

      <section
        className="relative z-10 w-full max-w-lg overflow-y-auto rounded-3xl border border-stone-200 bg-white p-5 shadow-2xl sm:p-6"
        style={{
          maxHeight: "calc(100dvh - 3rem)",
        }}
      >
        <header className="mb-5">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-3xl bg-red-50 text-lg font-black text-red-600">
            !
          </div>

          <p className="text-center text-xs font-black uppercase tracking-widest text-red-600">
            Excluir cartão
          </p>

          <h2
            id="delete-credit-card-title"
            className="mt-2 text-center text-2xl font-black tracking-tight text-stone-950"
          >
            {card.name} •••• {card.last_four_digits}
          </h2>

          <p className="mx-auto mt-3 max-w-md text-center text-sm font-medium leading-6 text-stone-600">
            {hasLinkedExpenses
              ? `Este cartão possui ${linkedExpensesCount} lançamento${
                  linkedExpensesCount === 1 ? "" : "s"
                } vinculado${
                  linkedExpensesCount === 1 ? "" : "s"
                }. Escolha como deseja continuar.`
              : "Este cartão não possui lançamentos vinculados. Você pode removê-lo com segurança."}
          </p>
        </header>

        {hasLinkedExpenses ? (
          <div className="space-y-3">
            <DeleteOptionButton
              title="Excluir só o cartão"
              description="O cartão será removido da sua carteira, mas os lançamentos continuam no histórico marcados como cartão excluído."
              disabled={isLoading}
              onClick={onKeepExpenses}
            />

            <DeleteOptionButton
              title="Excluir cartão e lançamentos"
              description="Remove o cartão e todos os gastos vinculados a ele, incluindo parcelas futuras. Essa ação não pode ser desfeita."
              variant="danger"
              disabled={isLoading}
              onClick={onDeleteExpenses}
            />

            <button
              type="button"
              onClick={onCancel}
              disabled={isLoading}
              className="touch-button w-full rounded-3xl border border-stone-200 bg-white px-4 py-4 text-sm font-black text-stone-700 transition hover:bg-stone-50 disabled:cursor-not-allowed disabled:opacity-60"
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
              {isLoading ? "Excluindo..." : "Excluir cartão"}
            </button>

            <button
              type="button"
              onClick={onCancel}
              disabled={isLoading}
              className="touch-button w-full rounded-3xl border border-stone-200 bg-white px-4 py-4 text-sm font-black text-stone-700 transition hover:bg-stone-50 disabled:cursor-not-allowed disabled:opacity-60"
            >
              Cancelar
            </button>
          </div>
        )}
      </section>
    </div>
  );
}

type DeleteOptionButtonProps = {
  title: string;
  description: string;
  variant?: "default" | "danger";
  disabled: boolean;
  onClick: () => void;
};

function DeleteOptionButton({
  title,
  description,
  variant = "default",
  disabled,
  onClick,
}: DeleteOptionButtonProps) {
  const isDanger = variant === "danger";

  const className = isDanger
    ? "touch-button w-full rounded-3xl border border-red-100 bg-red-50 px-4 py-4 text-left transition hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-60"
    : "touch-button w-full rounded-3xl border border-stone-200 bg-white px-4 py-4 text-left transition hover:bg-stone-50 disabled:cursor-not-allowed disabled:opacity-60";

  const titleClassName = isDanger
    ? "block text-sm font-black text-red-700"
    : "block text-sm font-black text-stone-950";

  const descriptionClassName = isDanger
    ? "mt-1 block text-xs font-semibold leading-5 text-red-600"
    : "mt-1 block text-xs font-semibold leading-5 text-stone-500";

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={className}
    >
      <span className={titleClassName}>{title}</span>
      <span className={descriptionClassName}>{description}</span>
    </button>
  );
}