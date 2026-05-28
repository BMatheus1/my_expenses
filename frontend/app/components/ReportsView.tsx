import { useMemo } from "react";
import { MonthSelect } from "./MonthSelect";
import type { Expense } from "../types/expense";
import type { Income } from "../types/income";
import type { CategoryTotal } from "../types/summary";
import { formatCurrency } from "../utils/formatters";
import { CategoryChart } from "./CategoryChart";
import { EmptyState } from "./AppFeedback";

type ReportsViewProps = {
  expenses: Expense[];
  incomes: Income[];
  selectedMonth: string;
  onSelectedMonthChange: (value: string) => void;
};

export function ReportsView({
  expenses,
  incomes,
  selectedMonth,
  onSelectedMonthChange,
}: ReportsViewProps) {
  const previousMonth = useMemo(
    () => getPreviousMonth(selectedMonth),
    [selectedMonth]
  );

  const monthlyExpenses = useMemo(() => {
    return expenses.filter((expense) => expense.date.startsWith(selectedMonth));
  }, [expenses, selectedMonth]);

  const previousMonthExpenses = useMemo(() => {
    return expenses.filter((expense) => expense.date.startsWith(previousMonth));
  }, [expenses, previousMonth]);

  const monthlyIncomes = useMemo(() => {
    return incomes.filter((income) => income.date.startsWith(selectedMonth));
  }, [incomes, selectedMonth]);

  const previousMonthIncomes = useMemo(() => {
    return incomes.filter((income) => income.date.startsWith(previousMonth));
  }, [incomes, previousMonth]);

  const monthlyExpenseTotal = useMemo(() => {
    return sumExpenses(monthlyExpenses);
  }, [monthlyExpenses]);

  const previousMonthExpenseTotal = useMemo(() => {
    return sumExpenses(previousMonthExpenses);
  }, [previousMonthExpenses]);

  const monthlyIncomeTotal = useMemo(() => {
    return sumIncomes(monthlyIncomes);
  }, [monthlyIncomes]);

  const previousMonthIncomeTotal = useMemo(() => {
    return sumIncomes(previousMonthIncomes);
  }, [previousMonthIncomes]);

  const monthlyBalance = monthlyIncomeTotal - monthlyExpenseTotal;
  const previousMonthBalance =
    previousMonthIncomeTotal - previousMonthExpenseTotal;
  const balanceDifference = monthlyBalance - previousMonthBalance;

  const categoryTotals = useMemo<CategoryTotal[]>(() => {
    return calculateCategoryTotals(monthlyExpenses);
  }, [monthlyExpenses]);

  const highestCategory = categoryTotals[0];
  const hasMonthlyData =
    monthlyExpenses.length > 0 || monthlyIncomes.length > 0;

  return (
    <div className="space-y-5">
      <PageHeader
        title="Relatórios"
        description="Acompanhe ganhos, gastos, saldo e categorias do mês."
      />

      <section className="rounded-3xl border border-stone-200 bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h2 className="text-lg font-bold text-stone-950">
              Relatório mensal
            </h2>

            <p className="mt-1 text-sm text-stone-500">
              Selecione o mês que deseja analisar.
            </p>
          </div>

          <label className="space-y-1.5 text-sm font-bold text-stone-700">
            <span>Mês</span>

            <MonthSelect
              value={selectedMonth}
              onChange={onSelectedMonthChange}
              variant="wheel"
            />
          </label>
        </div>

        {!hasMonthlyData ? (
          <div className="mt-5">
            <EmptyState
              title="Sem dados para este mês"
              description="Cadastre ganhos ou gastos para liberar os relatórios, comparativos e gráficos deste período."
            />
          </div>
        ) : (
          <>
            <div className="mt-5 grid gap-3 md:grid-cols-4">
              <ReportCard
                label="Ganhos do mês"
                value={formatCurrency(monthlyIncomeTotal)}
                variant="positive"
              />

              <ReportCard
                label="Gastos do mês"
                value={formatCurrency(monthlyExpenseTotal)}
                variant="negative"
              />

              <ReportCard
                label="Saldo do mês"
                value={formatCurrency(monthlyBalance)}
                variant={monthlyBalance >= 0 ? "positive" : "negative"}
              />

              <ReportCard
                label="Quantidade de gastos"
                value={`${monthlyExpenses.length}`}
              />
            </div>

            <div className="mt-3 grid gap-3 md:grid-cols-3">
              <ReportCard
                label="Quantidade de ganhos"
                value={`${monthlyIncomes.length}`}
              />

              <ReportCard
                label="Maior categoria"
                value={highestCategory ? highestCategory.category : "—"}
              />

              <ReportCard
                label="Mês anterior"
                value={formatCurrency(previousMonthBalance)}
                variant={previousMonthBalance >= 0 ? "positive" : "negative"}
              />
            </div>

            <MonthlyComparison
              currentMonth={formatMonthLabel(selectedMonth)}
              previousMonth={formatMonthLabel(previousMonth)}
              currentBalance={monthlyBalance}
              previousBalance={previousMonthBalance}
              difference={balanceDifference}
            />
          </>
        )}
      </section>

      <section className="grid gap-5 xl:grid-cols-2">
        <div className="rounded-3xl border border-stone-200 bg-white p-5 shadow-sm">
          <h2 className="text-lg font-bold text-stone-950">
            Total por categoria
          </h2>

          <p className="mt-1 text-sm text-stone-500">
            Distribuição dos gastos no mês selecionado.
          </p>

          <div className="mt-5">
            <CategoryTotalsList
              categoryTotals={categoryTotals}
              monthlyTotal={monthlyExpenseTotal}
            />
          </div>
        </div>

        <div className="rounded-3xl border border-stone-200 bg-white p-5 shadow-sm">
          <h2 className="text-lg font-bold text-stone-950">
            Gráfico por categoria
          </h2>

          <p className="mt-1 text-sm text-stone-500">
            Visualização rápida dos maiores gastos.
          </p>

          <div className="mt-5">
            {categoryTotals.length === 0 ? (
              <EmptyState
                title="Gráfico indisponível"
                description="Cadastre gastos neste mês para visualizar a distribuição por categoria."
              />
            ) : (
              <CategoryChart
                categoryTotals={categoryTotals}
                total={monthlyExpenseTotal}
              />
            )}
          </div>
        </div>
      </section>
    </div>
  );
}

type PageHeaderProps = {
  title: string;
  description: string;
};

function PageHeader({ title, description }: PageHeaderProps) {
  return (
    <header className="rounded-3xl border border-stone-200 bg-white p-6 shadow-sm">
      <p className="text-sm font-semibold uppercase tracking-widest text-emerald-700">
        My Expenses
      </p>

      <h1 className="mt-2 text-3xl font-bold tracking-tight text-stone-950">
        {title}
      </h1>

      <p className="mt-2 max-w-2xl text-sm leading-6 text-stone-600">
        {description}
      </p>
    </header>
  );
}

type ReportCardProps = {
  label: string;
  value: string;
  variant?: "positive" | "negative" | "default";
};

function ReportCard({ label, value, variant = "default" }: ReportCardProps) {
  const valueClass =
    variant === "positive"
      ? "text-emerald-700"
      : variant === "negative"
        ? "text-red-700"
        : "text-stone-950";

  return (
    <article className="rounded-3xl border border-stone-100 bg-stone-50 p-4">
      <p className="text-sm font-medium text-stone-500">{label}</p>

      <strong className={`mt-2 block truncate text-xl font-bold ${valueClass}`}>
        {value}
      </strong>
    </article>
  );
}

type MonthlyComparisonProps = {
  currentMonth: string;
  previousMonth: string;
  currentBalance: number;
  previousBalance: number;
  difference: number;
};

function MonthlyComparison({
  currentMonth,
  previousMonth,
  currentBalance,
  previousBalance,
  difference,
}: MonthlyComparisonProps) {
  const percentageChange = calculatePercentageChange(
    difference,
    previousBalance
  );

  return (
    <div className="mt-5 rounded-3xl border border-stone-100 bg-stone-50 p-5">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h3 className="text-base font-bold text-stone-950">
            Comparativo de saldo
          </h3>

          <p className="mt-1 text-sm text-stone-500">
            {previousMonth} comparado com {currentMonth}
          </p>
        </div>

        <div className="rounded-full border border-stone-200 bg-white px-4 py-2 text-sm font-bold text-stone-700">
          Diferença: {getVariationLabel(difference)}
        </div>
      </div>

      <div className="mt-5 grid gap-3 md:grid-cols-3">
        <ComparisonItem label={previousMonth} value={previousBalance} />
        <ComparisonItem label={currentMonth} value={currentBalance} />

        <article className="rounded-3xl border border-stone-200 bg-white p-4">
          <p className="text-sm font-medium text-stone-500">Variação</p>

          <strong
            className={`mt-2 block text-xl font-bold ${
              difference >= 0 ? "text-emerald-700" : "text-red-700"
            }`}
          >
            {getVariationLabel(difference)}
          </strong>

          <p className="mt-1 text-sm text-stone-500">
            {percentageChange === null
              ? "Sem base no mês anterior"
              : `${percentageChange.toFixed(1)}%`}
          </p>
        </article>
      </div>
    </div>
  );
}

type ComparisonItemProps = {
  label: string;
  value: number;
};

function ComparisonItem({ label, value }: ComparisonItemProps) {
  return (
    <article className="rounded-3xl border border-stone-200 bg-white p-4">
      <p className="text-sm font-medium capitalize text-stone-500">{label}</p>

      <strong
        className={`mt-2 block text-xl font-bold ${
          value >= 0 ? "text-emerald-700" : "text-red-700"
        }`}
      >
        {formatCurrency(value)}
      </strong>
    </article>
  );
}

type CategoryTotalsListProps = {
  categoryTotals: CategoryTotal[];
  monthlyTotal: number;
};

function CategoryTotalsList({
  categoryTotals,
  monthlyTotal,
}: CategoryTotalsListProps) {
  if (categoryTotals.length === 0) {
    return (
      <EmptyState
        title="Nenhuma categoria encontrada"
        description="Cadastre gastos neste mês para visualizar os totais por categoria."
      />
    );
  }

  return (
    <div className="space-y-3">
      {categoryTotals.map((item) => {
        const percentage =
          monthlyTotal > 0 ? (item.total / monthlyTotal) * 100 : 0;

        return (
          <article
            key={item.category}
            className="flex items-center justify-between gap-4 rounded-3xl border border-stone-100 bg-stone-50 p-4"
          >
            <div className="min-w-0">
              <h3 className="truncate font-bold text-stone-950">
                {item.category}
              </h3>

              <p className="mt-1 text-sm text-stone-500">
                {percentage.toFixed(1)}% dos gastos
              </p>
            </div>

            <strong className="whitespace-nowrap text-red-700">
              {formatCurrency(item.total)}
            </strong>
          </article>
        );
      })}
    </div>
  );
}

function sumExpenses(expenses: Expense[]) {
  return expenses.reduce((total, expense) => total + expense.amount, 0);
}

function sumIncomes(incomes: Income[]) {
  return incomes.reduce((total, income) => total + income.amount, 0);
}

function calculateCategoryTotals(expenses: Expense[]): CategoryTotal[] {
  const totals = expenses.reduce<Record<string, number>>(
    (accumulator, expense) => {
      accumulator[expense.category] =
        (accumulator[expense.category] || 0) + expense.amount;

      return accumulator;
    },
    {}
  );

  return Object.entries(totals)
    .map(([category, total]) => ({
      category,
      total,
    }))
    .sort((first, second) => second.total - first.total);
}

function getPreviousMonth(month: string) {
  const [yearValue, monthValue] = month.split("-").map(Number);

  if (monthValue === 1) {
    return `${yearValue - 1}-12`;
  }

  return `${yearValue}-${String(monthValue - 1).padStart(2, "0")}`;
}

function formatMonthLabel(month: string) {
  const [yearValue, monthValue] = month.split("-").map(Number);
  const date = new Date(yearValue, monthValue - 1, 1);

  return new Intl.DateTimeFormat("pt-BR", {
    month: "long",
    year: "numeric",
  }).format(date);
}

function calculatePercentageChange(difference: number, previousValue: number) {
  if (previousValue === 0) {
    return null;
  }

  return (difference / Math.abs(previousValue)) * 100;
}

function getVariationLabel(difference: number) {
  if (difference > 0) {
    return `+${formatCurrency(Math.abs(difference))}`;
  }

  if (difference < 0) {
    return `-${formatCurrency(Math.abs(difference))}`;
  }

  return formatCurrency(0);
}