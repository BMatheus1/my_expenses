import type { Expense, PaymentMethod } from "../types/expense";
import { formatCurrency, formatDate } from "../utils/formatters";
import { EmptyState, LoadingCard } from "./AppFeedback";

type ExpenseListProps = {
  expenses: Expense[];
  isLoading: boolean;
  deletingExpenseId: string | null;
  onEdit: (expense: Expense) => void;
  onDelete: (expenseId: string) => void;
};

export function ExpenseList({
  expenses,
  isLoading,
  deletingExpenseId,
  onEdit,
  onDelete,
}: ExpenseListProps) {
  return (
    <section className="overflow-hidden rounded-3xl border border-stone-200 bg-white shadow-sm">
      <div className="flex flex-col gap-2 border-b border-stone-100 px-5 py-5 sm:flex-row sm:items-center sm:justify-between sm:px-6">
        <div>
          <h2 className="text-lg font-semibold text-stone-950">
            Gastos encontrados
          </h2>

          <p className="mt-1 text-sm text-stone-500">
            Edite ou remova despesas cadastradas.
          </p>
        </div>

        <span className="w-fit rounded-full border border-stone-200 bg-stone-50 px-3 py-1 text-xs font-semibold text-stone-600">
          {expenses.length} item{expenses.length === 1 ? "" : "s"}
        </span>
      </div>

      <div className="divide-y divide-stone-100">
        {isLoading ? (
          <div className="p-5">
            <LoadingCard
              title="Carregando gastos"
              description="Buscando suas despesas cadastradas."
            />
          </div>
        ) : expenses.length === 0 ? (
          <div className="p-5">
            <EmptyState
              title="Nenhum gasto encontrado"
              description="Cadastre seu primeiro gasto ou ajuste os filtros para encontrar despesas já registradas."
            />
          </div>
        ) : (
          expenses.map((expense) => (
            <ExpenseItem
              key={expense.id}
              expense={expense}
              isDeleting={deletingExpenseId === expense.id}
              onEdit={onEdit}
              onDelete={onDelete}
            />
          ))
        )}
      </div>
    </section>
  );
}

type ExpenseItemProps = {
  expense: Expense;
  isDeleting: boolean;
  onEdit: (expense: Expense) => void;
  onDelete: (expenseId: string) => void;
};

function ExpenseItem({
  expense,
  isDeleting,
  onEdit,
  onDelete,
}: ExpenseItemProps) {
  return (
    <article className="flex flex-col gap-4 px-5 py-4 transition hover:bg-stone-50 sm:flex-row sm:items-center sm:justify-between sm:px-6">
      <div className="min-w-0">
        <h3 className="truncate font-semibold text-stone-950">
          {expense.description}
        </h3>

        <div className="mt-1 flex flex-wrap items-center gap-2 text-sm text-stone-500">
          <span>
            {expense.category} • {formatDate(expense.date)}
          </span>

          <PaymentMethodBadge expense={expense} />
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2 sm:justify-end">
        <strong className="mr-2 whitespace-nowrap text-base text-emerald-700">
          {formatCurrency(expense.amount)}
        </strong>

        <button
          type="button"
          onClick={() => onEdit(expense)}
          className="rounded-full border border-stone-200 px-4 py-2 text-sm font-semibold text-stone-700 transition hover:bg-stone-50"
        >
          Editar
        </button>

        <button
          type="button"
          onClick={() => onDelete(expense.id)}
          disabled={isDeleting}
          className="rounded-full border border-red-100 px-4 py-2 text-sm font-semibold text-red-700 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isDeleting ? "Removendo..." : "Remover"}
        </button>
      </div>
    </article>
  );
}

function PaymentMethodBadge({ expense }: { expense: Expense }) {
  const label = getPaymentMethodLabel(expense.payment_method);

  const installmentLabel =
    expense.payment_method === "credit_card" && expense.installments_count > 1
      ? ` • ${expense.installment_number}/${expense.installments_count}`
      : "";

  if (expense.payment_method === "credit_card" && expense.credit_card) {
    return (
      <span className="rounded-full border border-stone-200 bg-stone-50 px-2.5 py-1 text-xs font-black text-stone-600">
        {expense.credit_card.name} •••• {expense.credit_card.last_four_digits}
        {installmentLabel}
      </span>
    );
  }

  return (
    <span className="rounded-full border border-stone-200 bg-stone-50 px-2.5 py-1 text-xs font-black text-stone-600">
      {label}
    </span>
  );
}

function getPaymentMethodLabel(paymentMethod: PaymentMethod) {
  const labels: Record<PaymentMethod, string> = {
    cash: "Dinheiro",
    pix: "Pix",
    debit_card: "Débito",
    credit_card: "Crédito",
    bank_transfer: "Transferência",
    other: "Outro",
  };

  return labels[paymentMethod] ?? "Outro";
}