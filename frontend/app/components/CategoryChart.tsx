import type { CategoryTotal } from "../types/summary";
import { formatCurrency } from "../utils/formatters";

type CategoryChartProps = {
  categoryTotals: CategoryTotal[];
  total: number;
};

export function CategoryChart({ categoryTotals, total }: CategoryChartProps) {
  const highestValue = Math.max(
    ...categoryTotals.map((item) => item.total),
    0
  );

  if (categoryTotals.length === 0) {
    return (
      <p className="rounded-2xl border border-dashed border-stone-300 p-8 text-center text-sm text-stone-500">
        Nenhum dado disponível para montar o gráfico.
      </p>
    );
  }

  return (
    <div className="space-y-4">
      {categoryTotals.map((item) => (
        <CategoryChartBar
          key={item.category}
          category={item.category}
          value={item.total}
          total={total}
          highestValue={highestValue}
        />
      ))}
    </div>
  );
}

type CategoryChartBarProps = {
  category: string;
  value: number;
  total: number;
  highestValue: number;
};

function CategoryChartBar({
  category,
  value,
  total,
  highestValue,
}: CategoryChartBarProps) {
  const widthPercentage = highestValue > 0 ? (value / highestValue) * 100 : 0;
  const totalPercentage = total > 0 ? (value / total) * 100 : 0;

  return (
    <article className="rounded-2xl border border-stone-100 bg-stone-50 p-4">
      <div className="flex items-center justify-between gap-4 text-sm">
        <span className="font-semibold text-stone-800">{category}</span>

        <span className="text-stone-500">
          {formatCurrency(value)} • {totalPercentage.toFixed(1)}%
        </span>
      </div>

      <div className="mt-3 h-3 overflow-hidden rounded-full bg-white">
        <div
          className="h-full rounded-full bg-emerald-700"
          style={{ width: `${widthPercentage}%` }}
        />
      </div>
    </article>
  );
}