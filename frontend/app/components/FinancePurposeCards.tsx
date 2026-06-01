"use client";

import { formatCurrencyBRL } from "../utils/dailyReview";

type PurposeOnboardingProps = {
  isVisible: boolean;
  onDismiss: () => void;
};

type TodayStatusCardProps = {
  userName: string;
  todayTotal: number;
  isDayClosed: boolean;
  isOnline: boolean;
  onAddExpense: () => void;
  onOpenDailyReview: () => void;
};

type QuickActionsCardProps = {
  isOnline: boolean;
  onQuickExpense: () => void;
  onDailyReview: () => void;
  onViewSummary: () => void;
};

type MonthlyPurposeSummaryProps = {
  monthlyExpenseTotal: number;
  monthlyIncomeTotal: number;
  monthlyBalance: number;
  monthlyInsightMessage: string;
};

type MoneyDestinationCardProps = {
  topCategories: Array<{
    category: string;
    total: number;
  }>;
};

const ONBOARDING_ITEMS = [
  {
    title: "Controle sem complicação",
    description: "Registre seus gastos em poucos segundos, sem formulários longos.",
  },
  {
    title: "Esqueceu de anotar?",
    description:
      "Tudo bem. No Fechamento do Dia, você recupera o que ficou faltando.",
  },
  {
    title: "Entenda seu mês",
    description:
      "Veja para onde seu dinheiro foi e mantenha sua vida financeira mais clara.",
  },
];

export function PurposeOnboarding({
  isVisible,
  onDismiss,
}: PurposeOnboardingProps) {
  if (!isVisible) {
    return null;
  }

  return (
    <section className="app-card rounded-3xl p-4 sm:p-5">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <p className="app-kicker">My Expenses</p>
          <h2 className="app-title mt-2 text-xl font-black">
            Anote rápido. Feche o dia. Entenda seu mês.
          </h2>
        </div>

        <button
          type="button"
          onClick={onDismiss}
          className="touch-button rounded-full border border-[var(--app-border)] px-4 py-2 text-sm font-black text-[var(--app-muted)] sm:self-start"
        >
          Pular
        </button>
      </div>

      <div className="mt-4 grid gap-3 md:grid-cols-3">
        {ONBOARDING_ITEMS.map((item) => (
          <article key={item.title} className="app-card-soft rounded-2xl p-4">
            <h3 className="app-title text-sm font-black">{item.title}</h3>
            <p className="app-muted mt-2 text-sm leading-6">
              {item.description}
            </p>
          </article>
        ))}
      </div>

      <button
        type="button"
        onClick={onDismiss}
        className="app-button-primary touch-button mt-4 w-full justify-center sm:w-auto"
      >
        Começar agora
      </button>
    </section>
  );
}

export function TodayStatusCard({
  userName,
  todayTotal,
  isDayClosed,
  isOnline,
  onAddExpense,
  onOpenDailyReview,
}: TodayStatusCardProps) {
  const firstName = userName.trim().split(/\s+/)[0] || "Olá";

  return (
    <section className="app-card overflow-hidden rounded-3xl">
      <div className="soft-header-gradient p-5 sm:p-6">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
          <div className="min-w-0">
            <p className="app-kicker">Hoje</p>
            <h1 className="app-title mt-2 text-3xl font-black tracking-tight sm:text-4xl">
              Olá, {firstName}
            </h1>
            <p className="app-muted mt-2 max-w-2xl text-sm font-medium leading-6">
              Vamos manter seu dia organizado sem complicar sua rotina?
            </p>
          </div>

          <div className="app-card-soft rounded-3xl p-4 lg:min-w-72">
            <DailyStatusBadge isDayClosed={isDayClosed} />

            <p className="app-title mt-3 text-2xl font-black">
              {formatCurrencyBRL(todayTotal)}
            </p>

            <p className="app-muted mt-1 text-sm leading-6">
              {isDayClosed
                ? "Seu controle de hoje está organizado. Você ainda pode adicionar novos gastos se precisar."
                : "Registrados até agora. Revise quando quiser."}
            </p>
          </div>
        </div>

        <div className="mt-5 flex flex-col gap-2 sm:flex-row">
          <button
            type="button"
            onClick={onAddExpense}
            disabled={!isOnline}
            className="app-button-primary touch-button justify-center disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isOnline ? "+ Adicionar" : "Adicionar disponível com internet"}
          </button>

          <button
            type="button"
            onClick={onOpenDailyReview}
            disabled={!isOnline}
            className="app-button-secondary touch-button justify-center disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isDayClosed ? "Revisar novamente" : "Fechar o dia"}
          </button>
        </div>
      </div>
    </section>
  );
}

export function QuickActionsCard({
  isOnline,
  onQuickExpense,
  onDailyReview,
  onViewSummary,
}: QuickActionsCardProps) {
  return (
    <section className="grid gap-3 md:grid-cols-3">
      <QuickActionButton
        title="Gasto rápido"
        description="Registrar em segundos."
        disabled={!isOnline}
        onClick={onQuickExpense}
      />
      <QuickActionButton
        title="Fechar o dia"
        description="Revisar o que ficou faltando."
        disabled={!isOnline}
        onClick={onDailyReview}
      />
      <QuickActionButton
        title="Ver resumo"
        description="Entender seu mês."
        disabled={false}
        onClick={onViewSummary}
      />
    </section>
  );
}

export function MonthlyPurposeSummary({
  monthlyExpenseTotal,
  monthlyIncomeTotal,
  monthlyBalance,
  monthlyInsightMessage,
}: MonthlyPurposeSummaryProps) {
  return (
    <section className="app-card rounded-3xl p-5 sm:p-6">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="app-kicker">Meu mês</p>
          <h2 className="app-title mt-2 text-xl font-black">
            Seu mês em uma frase
          </h2>
        </div>
      </div>

      <p className="app-muted mt-3 text-sm leading-6">
        {monthlyInsightMessage}
      </p>

      <div className="mt-5 grid gap-3 sm:grid-cols-3">
        <CompactMetric label="Ganhos" value={monthlyIncomeTotal} />
        <CompactMetric label="Gastos" value={monthlyExpenseTotal} />
        <CompactMetric label="Saldo" value={monthlyBalance} />
      </div>
    </section>
  );
}

export function MoneyDestinationCard({
  topCategories,
}: MoneyDestinationCardProps) {
  return (
    <section className="app-card rounded-3xl p-5 sm:p-6">
      <p className="app-kicker">Categorias</p>
      <h2 className="app-title mt-2 text-xl font-black">
        Para onde foi meu dinheiro?
      </h2>

      {topCategories.length > 0 ? (
        <div className="mt-5 space-y-3">
          {topCategories.map((item, index) => (
            <div
              key={item.category}
              className="app-card-soft flex items-center justify-between gap-3 rounded-2xl p-4"
            >
              <div className="min-w-0">
                <p className="app-title truncate text-sm font-black">
                  {index + 1}. {item.category}
                </p>
                <p className="app-muted mt-1 text-xs font-bold">
                  Categoria do mês
                </p>
              </div>

              <p className="app-title shrink-0 text-sm font-black">
                {formatCurrencyBRL(item.total)}
              </p>
            </div>
          ))}
        </div>
      ) : (
        <p className="app-muted mt-4 text-sm leading-6">
          Quando você registrar seus primeiros gastos, vamos mostrar aqui para
          onde seu dinheiro está indo.
        </p>
      )}
    </section>
  );
}

function DailyStatusBadge({ isDayClosed }: { isDayClosed: boolean }) {
  return (
    <span className="app-brand-soft inline-flex rounded-full px-3 py-1 text-xs font-black">
      {isDayClosed ? "Dia fechado" : "Hoje em aberto"}
    </span>
  );
}

function QuickActionButton({
  title,
  description,
  disabled,
  onClick,
}: {
  title: string;
  description: string;
  disabled: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="app-card-hover touch-button rounded-3xl p-5 text-left disabled:cursor-not-allowed disabled:opacity-60"
    >
      <span className="app-title block text-base font-black">{title}</span>
      <span className="app-muted mt-1 block text-sm leading-6">
        {disabled ? "Disponível com internet." : description}
      </span>
    </button>
  );
}

function CompactMetric({ label, value }: { label: string; value: number }) {
  const valueClassName =
    label === "Ganhos"
      ? "text-emerald-700"
      : label === "Gastos"
        ? "text-red-700"
        : "app-title";

  return (
    <article className="app-card-soft rounded-2xl p-4">
      <p className="app-muted text-xs font-black uppercase tracking-widest">
        {label}
      </p>
      <p className={`mt-2 truncate text-lg font-black ${valueClassName}`}>
        {formatCurrencyBRL(value)}
      </p>
    </article>
  );
}
