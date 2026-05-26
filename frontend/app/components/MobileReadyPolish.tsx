"use client";

import { useMemo } from "react";
import { formatDashboardCacheDate } from "../lib/dashboard-cache";
import { useOnlineStatus } from "../hooks/useOnlineStatus";

import type { CreditCard } from "../types/credit-card";
import type { Expense } from "../types/expense";
import {
  formatCurrency,
  getCurrentDate,
  getCurrentMonth,
} from "../utils/formatters";

type UpcomingInvoicesStripProps = {
  creditCards: CreditCard[];
  expenses: Expense[];
  onOpenCards: () => void;
};

type InvoiceSummary = {
  card: CreditCard;
  total: number;
  dueLabel: string;
  dueTone: "neutral" | "attention" | "soft";
  daysUntilDue: number;
};

const INVOICE_ALERT_DAYS_BEFORE_DUE = 3;

export function OfflineStatusBanner() {
  const isOnline = useOnlineStatus();

  if (isOnline) {
    return null;
  }

  return (
    <section className="rounded-3xl border border-amber-200 bg-amber-50 px-4 py-3 text-amber-900 shadow-sm sm:px-5">
      <div className="flex items-start gap-3">
        <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-2xl bg-amber-100 text-sm font-black">
          !
        </span>

        <div className="min-w-0">
          <p className="text-sm font-black">Você está sem internet</p>

          <p className="mt-0.5 text-xs font-semibold leading-5 text-amber-800">
            Você ainda pode visualizar a tela atual, mas novas ações precisam de
            conexão para sincronizar.
          </p>
        </div>
      </div>
    </section>
  );
}
export function CachedDataNotice({
  savedAt,
}: {
  savedAt: string | null;
}) {
  if (!savedAt) {
    return null;
  }

  const formattedDate = formatDashboardCacheDate(savedAt);

  return (
    <section className="rounded-3xl border border-stone-200 bg-white px-4 py-3 shadow-sm sm:px-5">
      <div className="flex items-start gap-3">
        <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-2xl bg-stone-100 text-xs font-black text-stone-700">
          i
        </span>

        <div className="min-w-0">
          <p className="text-sm font-black text-stone-900">
            Mostrando últimos dados salvos
          </p>

          <p className="mt-0.5 text-xs font-semibold leading-5 text-stone-500">
            {formattedDate
              ? `Última atualização local: ${formattedDate}.`
              : "Os dados podem estar desatualizados até a conexão voltar."}
          </p>
        </div>
      </div>
    </section>
  );
}

export function UpcomingInvoicesStrip({
  creditCards,
  expenses,
  onOpenCards,
}: UpcomingInvoicesStripProps) {
  const invoiceSummaries = useMemo(() => {
    return buildUpcomingInvoiceSummaries(creditCards, expenses);
  }, [creditCards, expenses]);

  if (invoiceSummaries.length === 0) {
    return null;
  }

  return (
    <section className="rounded-3xl border border-stone-200 bg-white p-4 shadow-sm sm:p-5">
      <div className="mb-3 flex items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-black uppercase tracking-widest text-emerald-700">
            Faturas próximas
          </p>

          <h2 className="mt-1 truncate text-base font-black text-stone-950">
            Acompanhe sem abrir outra tela
          </h2>
        </div>

        <button
          type="button"
          onClick={onOpenCards}
          className="rounded-full border border-stone-200 px-3 py-2 text-xs font-black text-stone-700 transition hover:bg-stone-50"
        >
          Ver cartões
        </button>
      </div>

      <div
        className="flex gap-3 overflow-x-auto pb-1"
        style={{
          scrollSnapType: "x mandatory",
          scrollbarWidth: "none",
          msOverflowStyle: "none",
        }}
      >
        {invoiceSummaries.map((summary) => (
          <InvoiceMiniCard key={summary.card.id} summary={summary} />
        ))}
      </div>
    </section>
  );
}

export function MobileDashboardSkeleton() {
  return (
    <div className="space-y-4">
      <SkeletonBlock className="h-32 rounded-3xl" />

      <div className="grid gap-3 sm:grid-cols-3">
        <SkeletonBlock className="h-24 rounded-3xl" />
        <SkeletonBlock className="h-24 rounded-3xl" />
        <SkeletonBlock className="h-24 rounded-3xl" />
      </div>

      <div className="grid gap-5 xl:grid-cols-2">
        <SkeletonBlock className="h-80 rounded-3xl" />
        <SkeletonBlock className="h-96 rounded-3xl" />
      </div>
    </div>
  );
}

function InvoiceMiniCard({ summary }: { summary: InvoiceSummary }) {
  const toneClassName = getDueToneClassName(summary.dueTone);

  return (
    <article
      className="shrink-0 rounded-3xl border border-stone-100 bg-stone-50 p-4"
      style={{
        minWidth: "240px",
        scrollSnapAlign: "start",
      }}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-sm font-black text-stone-950">
            {summary.card.name}
          </p>

          <p className="mt-1 text-xs font-bold text-stone-500">
            {summary.card.brand} •••• {summary.card.last_four_digits}
          </p>
        </div>

        <span
          className={`rounded-full px-2.5 py-1 text-xs font-black ${toneClassName}`}
        >
          {summary.dueLabel}
        </span>
      </div>

      <div className="mt-4 flex items-end justify-between gap-3">
        <div>
          <p className="text-xs font-semibold text-stone-500">Fatura atual</p>

          <strong className="mt-1 block text-lg font-black text-stone-950">
            {formatCurrency(summary.total)}
          </strong>
        </div>

        <div
          className="h-9 w-12 rounded-2xl shadow-sm"
          style={{
            background: "linear-gradient(135deg, #1c1917 0%, #57534e 100%)",
          }}
        />
      </div>
    </article>
  );
}

function SkeletonBlock({ className }: { className: string }) {
  return (
    <div
      className={`animate-pulse border border-stone-100 bg-stone-100 ${className}`}
    />
  );
}

function buildUpcomingInvoiceSummaries(
  creditCards: CreditCard[],
  expenses: Expense[],
) {
  const currentMonth = getCurrentMonth();

  return creditCards
    .map((card) => {
      const invoiceExpenses = expenses.filter((expense) => {
        if (expense.payment_method !== "credit_card") {
          return false;
        }

        if (expense.credit_card_id !== card.id) {
          return false;
        }

        if (expense.invoice_month) {
          return expense.invoice_month === currentMonth;
        }

        return expense.date.startsWith(currentMonth);
      });

      const total = invoiceExpenses.reduce(
        (currentTotal, expense) => currentTotal + expense.amount,
        0,
      );

      const dueInfo = getInvoiceDueInfo(currentMonth, card.due_day);

      return {
        card,
        total,
        dueLabel: dueInfo.label,
        dueTone: dueInfo.tone,
        daysUntilDue: dueInfo.daysUntilDue,
      };
    })
    .filter((summary) => {
      const hasInvoiceValue = summary.total > 0;
      const isExactlyThreeDaysBeforeDue =
        summary.daysUntilDue === INVOICE_ALERT_DAYS_BEFORE_DUE;

      return hasInvoiceValue && isExactlyThreeDaysBeforeDue;
    })
    .sort((first, second) => first.daysUntilDue - second.daysUntilDue)
    .slice(0, 3);
}

function getInvoiceDueInfo(invoiceMonth: string, dueDay: number) {
  const [year, month] = invoiceMonth.split("-").map(Number);
  const lastDayOfMonth = new Date(year, month, 0).getDate();
  const safeDueDay = Math.min(dueDay, lastDayOfMonth);
  const dueDate = new Date(year, month - 1, safeDueDay);
  const today = new Date(`${getCurrentDate()}T00:00:00`);

  const daysUntilDue = Math.ceil(
    (dueDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24),
  );

  return {
    daysUntilDue,
    label: `Vence ${formatDueDateLabel(dueDate)}`,
    tone: "attention" as const,
  };
}

function formatDueDateLabel(date: Date) {
  const day = String(date.getDate()).padStart(2, "0");
  const month = String(date.getMonth() + 1).padStart(2, "0");

  return `dia ${day}/${month}`;
}

function getDueToneClassName(tone: InvoiceSummary["dueTone"]) {
  const classNames: Record<InvoiceSummary["dueTone"], string> = {
    attention: "bg-amber-100 text-amber-800",
    neutral: "bg-stone-200 text-stone-700",
    soft: "bg-emerald-50 text-emerald-700",
  };

  return classNames[tone];
}