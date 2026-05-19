import type { CategoryTotal } from "../types/summary";
import { formatCurrency } from "../utils/formatters";

type SummaryCardsProps = {
  monthlyTotal: number;
  filteredTotal: number;
  expensesCount: number;
  categoryTotals: CategoryTotal[];
};

export function SummaryCards({
  monthlyTotal,
  filteredTotal,
  expensesCount,
  categoryTotals,
}: SummaryCardsProps) {
  const highestCategory = categoryTotals[0];

  return (
    <section className="grid gap-3 md:grid-cols-3">
      <SummaryCard
        label="Total do mês"
        value={formatCurrency(monthlyTotal)}
        description="Soma geral do mês selecionado"
      />

      <SummaryCard
        label="Total filtrado"
        value={formatCurrency(filteredTotal)}
        description={`${expensesCount} gasto${
          expensesCount === 1 ? "" : "s"
        } encontrado${expensesCount === 1 ? "" : "s"}`}
      />

      <SummaryCard
        label="Maior categoria"
        value={highestCategory ? highestCategory.category : "—"}
        description={
          highestCategory
            ? formatCurrency(highestCategory.total)
            : "Sem gastos nos filtros atuais"
        }
      />
    </section>
  );
}

type SummaryCardProps = {
  label: string;
  value: string;
  description: string;
};

function SummaryCard({ label, value, description }: SummaryCardProps) {
  return (
    <article className="rounded-3xl border border-stone-200 bg-white p-5 shadow-sm">      <p className="text-sm font-medium text-stone-500">{label}</p>

      <strong className="mt-2 block truncate text-2xl font-bold tracking-tight text-stone-950">
        {value}
      </strong>

      <p className="mt-2 text-sm text-stone-500">{description}</p>
    </article>
  );
}