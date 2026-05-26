"use client";

import {
  useMemo,
  useRef,
  useState,
  type FormEvent,
  type ReactNode,
} from "react";

import type {
  CreateCreditCardRequest,
  CreditCard,
  CreditCardColor,
} from "../types/credit-card";
import type { Expense } from "../types/expense";
import {
  formatCurrency,
  getCurrentDate,
  getCurrentMonth,
  parseMoneyToNumber,
  sanitizeMoneyInput,
} from "../utils/formatters";

import { smartScrollToRef } from "../utils/smartScroll";
import { EmptyState, LoadingButton } from "./AppFeedback";

const CARD_BRANDS = [
  "Visa",
  "Mastercard",
  "Elo",
  "American Express",
  "Hipercard",
  "Outros",
];

const CARD_COLORS: {
  value: CreditCardColor;
  label: string;
}[] = [
  { value: "purple", label: "Roxo" },
  { value: "blue", label: "Azul" },
  { value: "emerald", label: "Verde" },
  { value: "rose", label: "Rosa" },
  { value: "amber", label: "Âmbar" },
  { value: "black", label: "Preto" },
  { value: "slate", label: "Cinza" },
];

const EMPTY_FORM = {
  name: "",
  brand: "Mastercard",
  lastFourDigits: "",
  closingDay: "28",
  dueDay: "10",
  limitAmount: "",
  color: "purple" as CreditCardColor,
};

type CardFormState = typeof EMPTY_FORM;

type CreditCardsViewProps = {
  cards: CreditCard[];
  expenses: Expense[];
  isLoading: boolean;
  isSaving: boolean;
  deletingCardId: string | null;
  errorMessage: string;
  onCreateCard: (card: CreateCreditCardRequest) => Promise<boolean>;
  onUpdateCard: (
    cardId: string,
    card: CreateCreditCardRequest,
  ) => Promise<boolean>;
  onDeleteCard: (card: CreditCard) => void;
  onClearError: () => void;
};

export function CreditCardsView({
  cards,
  expenses,
  isLoading,
  isSaving,
  deletingCardId,
  errorMessage,
  onCreateCard,
  onUpdateCard,
  onDeleteCard,
  onClearError,
}: CreditCardsViewProps) {
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingCard, setEditingCard] = useState<CreditCard | null>(null);
  const [form, setForm] = useState<CardFormState>(EMPTY_FORM);
  const formSectionRef = useRef<HTMLDivElement | null>(null);
  const currentInvoiceMonth = getCurrentMonth();

  const cardSummaries = useMemo(() => {
    return cards.map((card) => {
      const cardExpenses = expenses.filter(
        (expense) => expense.credit_card_id === card.id,
      );

      const invoiceExpenses = cardExpenses.filter((expense) =>
        isExpenseInInvoiceMonth(expense, currentInvoiceMonth),
      );

      const invoiceTotal = invoiceExpenses.reduce(
        (total, expense) => total + expense.amount,
        0,
      );

      const limitUsagePercentage = card.limit_amount
        ? Math.min(100, Math.round((invoiceTotal / card.limit_amount) * 100))
        : null;

      return {
        card,
        cardExpenses,
        invoiceExpenses,
        invoiceTotal,
        limitUsagePercentage,
        dueInfo: getDueInfo(currentInvoiceMonth, card.due_day),
      };
    });
  }, [cards, currentInvoiceMonth, expenses]);

  const totalInvoice = cardSummaries.reduce(
    (total, summary) => total + summary.invoiceTotal,
    0,
  );

  const nextDueCard = [...cardSummaries]
    .filter((summary) => summary.invoiceTotal > 0)
    .sort(
      (first, second) => first.dueInfo.daysLeft - second.dueInfo.daysLeft,
    )[0];

  function scrollToCardForm() {
    window.setTimeout(() => {
      smartScrollToRef(formSectionRef, {
        delayMs: 0,
        focusFirstField: true,
      });
    }, 120);
  }    
  function openCreateForm() {
    onClearError();
    setEditingCard(null);
    setForm(EMPTY_FORM);
    setIsFormOpen(true);
    scrollToCardForm();
  }

  function openEditForm(card: CreditCard) {
    onClearError();
    setEditingCard(card);
    setForm({
      name: card.name,
      brand: card.brand,
      lastFourDigits: card.last_four_digits,
      closingDay: String(card.closing_day),
      dueDay: String(card.due_day),
      limitAmount:
        card.limit_amount === null
          ? ""
          : String(card.limit_amount).replace(".", ","),
      color: card.color,
    });
    setIsFormOpen(true);
    scrollToCardForm();
  }
  function closeForm() {
    onClearError();
    setIsFormOpen(false);
    setEditingCard(null);
    setForm(EMPTY_FORM);
  }

  function updateForm<Field extends keyof CardFormState>(
    field: Field,
    value: CardFormState[Field],
  ) {
    setForm((currentForm) => ({
      ...currentForm,
      [field]: value,
    }));
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const requestData = buildCreditCardRequest(form);

    if (!requestData) {
      return;
    }

    const saved = editingCard
      ? await onUpdateCard(editingCard.id, requestData)
      : await onCreateCard(requestData);

    if (saved) {
      closeForm();
    }
  }

  return (
    <div className="space-y-5">
      <header className="app-card rounded-3xl p-6">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="app-kicker">Cartões</p>

            <h1 className="app-title mt-2 text-3xl font-black tracking-tight">
              Cartões de crédito
            </h1>

            <p className="app-muted mt-2 max-w-2xl text-sm leading-6">
              Cadastre seus cartões e acompanhe a fatura sem transformar cartão
              em categoria de gasto.
            </p>
          </div>

          <button
            type="button"
            onClick={openCreateForm}
            className="app-button-primary"
          >
            + Novo cartão
          </button>
        </div>
      </header>

      <section className="grid gap-3 md:grid-cols-3">
        <SummaryCard
          label="Fatura atual"
          value={formatCurrency(totalInvoice)}
          description="Soma dos cartões neste mês"
        />

        <SummaryCard
          label="Cartões cadastrados"
          value={String(cards.length)}
          description="Cartões ativos na carteira"
        />

        <SummaryCard
          label="Próximo vencimento"
          value={nextDueCard ? nextDueCard.card.name : "—"}
          description={
            nextDueCard ? nextDueCard.dueInfo.label : "Sem fatura em aberto"
          }
        />
      </section>

      {isFormOpen ? (
        <section
          ref={formSectionRef}
          className="app-card scroll-mt-5 rounded-3xl p-5 sm:p-6"
        >
          <div className="mb-5 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="app-title text-lg font-black">
                {editingCard ? "Editar cartão" : "Novo cartão"}
              </h2>

              <p className="app-muted mt-1 text-sm">
                Use apenas apelido, bandeira e final do cartão. Não salve número
                completo, validade ou CVV.
              </p>
            </div>

            <button
              type="button"
              onClick={closeForm}
              className="app-button-secondary text-sm"
            >
              Cancelar
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="grid gap-4 md:grid-cols-2">
              <FormField label="Apelido do cartão">
                <input
                  value={form.name}
                  onChange={(event) => updateForm("name", event.target.value)}
                  className="app-input"
                  placeholder="Ex: Nubank Roxinho"
                />
              </FormField>

              <FormField label="Bandeira">
                <select
                  value={form.brand}
                  onChange={(event) => updateForm("brand", event.target.value)}
                  className="app-input"
                >
                  {CARD_BRANDS.map((brand) => (
                    <option key={brand} value={brand}>
                      {brand}
                    </option>
                  ))}
                </select>
              </FormField>

              <FormField label="Final do cartão">
                <input
                  value={form.lastFourDigits}
                  onChange={(event) =>
                    updateForm(
                      "lastFourDigits",
                      event.target.value.replace(/\D/g, "").slice(0, 4),
                    )
                  }
                  inputMode="numeric"
                  maxLength={4}
                  className="app-input"
                  placeholder="Ex: 1234"
                />
              </FormField>

              <FormField label="Limite do cartão opcional">
                <input
                  value={form.limitAmount}
                  onChange={(event) =>
                    updateForm(
                      "limitAmount",
                      sanitizeMoneyInput(event.target.value),
                    )
                  }
                  inputMode="decimal"
                  className="app-input"
                  placeholder="Ex: 2500,00"
                />
              </FormField>

              <FormField label="Dia de fechamento">
                <input
                  value={form.closingDay}
                  onChange={(event) =>
                    updateForm(
                      "closingDay",
                      event.target.value.replace(/\D/g, "").slice(0, 2),
                    )
                  }
                  inputMode="numeric"
                  className="app-input"
                  placeholder="Ex: 28"
                />
              </FormField>

              <FormField label="Dia de vencimento">
                <input
                  value={form.dueDay}
                  onChange={(event) =>
                    updateForm(
                      "dueDay",
                      event.target.value.replace(/\D/g, "").slice(0, 2),
                    )
                  }
                  inputMode="numeric"
                  className="app-input"
                  placeholder="Ex: 10"
                />
              </FormField>
            </div>

            <div>
              <p className="mb-2 text-xs font-black uppercase tracking-widest text-stone-500">
                Cor do cartão
              </p>

              <div className="flex flex-wrap gap-2">
                {CARD_COLORS.map((color) => (
                  <button
                    key={color.value}
                    type="button"
                    onClick={() => updateForm("color", color.value)}
                    className={`rounded-full border px-3 py-2 text-xs font-black transition ${
                      form.color === color.value
                        ? "app-brand-soft"
                        : "border-stone-200 bg-white text-stone-600 hover:bg-stone-50"
                    }`}
                  >
                    {color.label}
                  </button>
                ))}
              </div>
            </div>

            {errorMessage ? (
              <p className="rounded-2xl border border-red-100 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
                {errorMessage}
              </p>
            ) : null}

            <LoadingButton
              type="submit"
              isLoading={isSaving}
              loadingLabel="Salvando..."
              className="app-button-primary sm:w-auto"
            >
              {editingCard ? "Salvar cartão" : "Cadastrar cartão"}
            </LoadingButton>
          </form>
        </section>
      ) : null}

      {isLoading ? (
        <section className="app-card rounded-3xl p-8 text-center">
          <p className="app-title text-base font-black">Carregando cartões...</p>
          <p className="app-muted mt-2 text-sm">
            Buscando sua carteira de cartões.
          </p>
        </section>
      ) : cards.length === 0 ? (
        <EmptyState
          title="Nenhum cartão cadastrado"
          description="Cadastre seu primeiro cartão para lançar gastos no crédito e acompanhar vencimentos."
          action={{ label: "Cadastrar cartão", onClick: openCreateForm }}
        />
      ) : (
        <section className="grid gap-5 xl:grid-cols-2">
          {cardSummaries.map((summary) => (
            <CreditCardPanel
              key={summary.card.id}
              card={summary.card}
              invoiceTotal={summary.invoiceTotal}
              invoiceExpenses={summary.invoiceExpenses}
              dueLabel={summary.dueInfo.label}
              limitUsagePercentage={summary.limitUsagePercentage}
              isDeleting={deletingCardId === summary.card.id}
              onEdit={() => openEditForm(summary.card)}
              onDelete={() => onDeleteCard(summary.card)}
            />
          ))}
        </section>
      )}
    </div>
  );
}

type CreditCardPanelProps = {
  card: CreditCard;
  invoiceTotal: number;
  invoiceExpenses: Expense[];
  dueLabel: string;
  limitUsagePercentage: number | null;
  isDeleting: boolean;
  onEdit: () => void;
  onDelete: () => void;
};

function CreditCardPanel({
  card,
  invoiceTotal,
  invoiceExpenses,
  dueLabel,
  limitUsagePercentage,
  isDeleting,
  onEdit,
  onDelete,
}: CreditCardPanelProps) {
  return (
    <article className="app-card overflow-hidden rounded-3xl">
      <div className={`${getCardGradientClass(card.color)} p-5 text-white`}>

        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.18em] text-white/70">
              {card.brand}
            </p>

            <h2 className="mt-2 text-2xl font-black tracking-tight">
              {card.name}
            </h2>
          </div>

          <span className="rounded-full bg-white/15 px-3 py-1 text-xs font-black backdrop-blur">
            •••• {card.last_four_digits}
          </span>
        </div>

        <div className="mt-8 grid grid-cols-2 gap-3">
          <CardMetric label="Fatura atual" value={formatCurrency(invoiceTotal)} />
          <CardMetric label="Vencimento" value={dueLabel} />
        </div>
      </div>

      <div className="space-y-4 p-5">
        {limitUsagePercentage !== null ? (
          <div>
            <div className="flex items-center justify-between gap-3 text-sm">
              <span className="app-muted font-semibold">Limite usado</span>
              <strong className="app-title">{limitUsagePercentage}%</strong>
            </div>

            <div className="mt-2 h-2 overflow-hidden rounded-full bg-stone-100">
              <div
                className="h-full rounded-full bg-stone-900"
                style={{ width: `${limitUsagePercentage}%` }}
              />
            </div>
          </div>
        ) : null}

        <div className="rounded-2xl border border-stone-100 bg-stone-50 p-4">
          <div className="flex items-center justify-between gap-3">
            <h3 className="text-sm font-black text-stone-900">
              Últimos gastos da fatura
            </h3>

            <span className="text-xs font-bold text-stone-500">
              {invoiceExpenses.length} item
              {invoiceExpenses.length === 1 ? "" : "s"}
            </span>
          </div>

          <div className="mt-3 space-y-2">
            {invoiceExpenses.length === 0 ? (
              <p className="text-sm text-stone-500">
                Nenhum gasto nessa fatura.
              </p>
            ) : (
              invoiceExpenses.slice(0, 4).map((expense) => (
                <div
                  key={expense.id}
                  className="flex items-center justify-between gap-3 text-sm"
                >
                  <span className="min-w-0 truncate text-stone-600">
                    {expense.description}
                  </span>

                  <strong className="whitespace-nowrap text-stone-950">
                    {formatCurrency(expense.amount)}
                  </strong>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="flex flex-col gap-2 sm:flex-row">
          <button
            type="button"
            onClick={onEdit}
            className="app-button-secondary text-sm sm:w-auto"
          >
            Editar
          </button>

          <button
            type="button"
            onClick={onDelete}
            disabled={isDeleting}
            className="rounded-full border border-red-100 px-4 py-3 text-sm font-black text-red-700 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
          >
            {isDeleting ? "Excluindo..." : "Excluir"}
          </button>
        </div>
      </div>
    </article>
  );
}

function SummaryCard({
  label,
  value,
  description,
}: {
  label: string;
  value: string;
  description: string;
}) {
  return (
    <article className="app-card rounded-3xl p-5">
      <p className="app-muted text-sm font-medium">{label}</p>

      <strong className="app-title mt-2 block truncate text-2xl font-black tracking-tight">
        {value}
      </strong>

      <p className="app-muted mt-2 text-sm">{description}</p>
    </article>
  );
}

function CardMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl bg-white/15 p-3 backdrop-blur">
      <p className="text-xs font-bold text-white/70">{label}</p>

      <strong className="mt-1 block truncate text-sm font-black text-white">
        {value}
      </strong>
    </div>
  );
}

function FormField({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <label className="space-y-1.5 text-xs font-bold text-stone-600">
      <span>{label}</span>
      {children}
    </label>
  );
}

function buildCreditCardRequest(
  form: CardFormState,
): CreateCreditCardRequest | null {
  const closingDay = Number(form.closingDay);
  const dueDay = Number(form.dueDay);
  const limitAmount = form.limitAmount.trim()
    ? parseMoneyToNumber(form.limitAmount)
    : null;

  if (form.name.trim().length < 2) {
    return null;
  }

  if (form.lastFourDigits.length !== 4) {
    return null;
  }

  if (!isValidCardDay(closingDay) || !isValidCardDay(dueDay)) {
    return null;
  }

  if (limitAmount !== null && (Number.isNaN(limitAmount) || limitAmount < 0)) {
    return null;
  }

  return {
    name: form.name.trim(),
    brand: form.brand.trim(),
    last_four_digits: form.lastFourDigits,
    closing_day: closingDay,
    due_day: dueDay,
    limit_amount: limitAmount,
    color: form.color,
  };
}

function isValidCardDay(day: number) {
  return Number.isInteger(day) && day >= 1 && day <= 31;
}

function isExpenseInInvoiceMonth(expense: Expense, invoiceMonth: string) {
  if (expense.invoice_month) {
    return expense.invoice_month === invoiceMonth;
  }

  return expense.date.startsWith(invoiceMonth);
}

function getDueInfo(invoiceMonth: string, dueDay: number) {
  const [year, month] = invoiceMonth.split("-").map(Number);
  const lastDay = new Date(year, month, 0).getDate();
  const safeDueDay = Math.min(dueDay, lastDay);
  const dueDate = new Date(year, month - 1, safeDueDay);
  const today = new Date(`${getCurrentDate()}T00:00:00`);

  const rawDaysLeft = Math.ceil(
    (dueDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24),
  );

  const dueDateLabel = formatShortDueDate(dueDate);

  if (rawDaysLeft === 0) {
    return {
      daysLeft: 0,
      label: `Vence hoje · ${dueDateLabel}`,
    };
  }

  if (rawDaysLeft === 1) {
    return {
      daysLeft: 1,
      label: `Vence amanhã · ${dueDateLabel}`,
    };
  }

  if (rawDaysLeft > 1 && rawDaysLeft <= 7) {
    return {
      daysLeft: rawDaysLeft,
      label: `Vence em ${rawDaysLeft} dias · ${dueDateLabel}`,
    };
  }

  if (rawDaysLeft > 7) {
    return {
      daysLeft: rawDaysLeft,
      label: `Vence ${dueDateLabel}`,
    };
  }

  return {
    daysLeft: 999,
    label: `Vence ${dueDateLabel}`,
  };
}

function formatShortDueDate(date: Date) {
  const day = String(date.getDate()).padStart(2, "0");
  const month = String(date.getMonth() + 1).padStart(2, "0");

  return `dia ${day}/${month}`;
}

function getCardGradientClass(color: CreditCardColor) {
  const gradients: Record<CreditCardColor, string> = {
    purple: "bg-gradient-to-br from-violet-950 via-purple-800 to-fuchsia-600",
    blue: "bg-gradient-to-br from-sky-950 via-blue-800 to-cyan-500",
    emerald: "bg-gradient-to-br from-emerald-950 via-emerald-800 to-teal-500",
    rose: "bg-gradient-to-br from-rose-950 via-pink-800 to-rose-500",
    amber: "bg-gradient-to-br from-stone-950 via-amber-800 to-orange-500",
    black: "bg-gradient-to-br from-stone-950 via-stone-800 to-stone-600",
    slate: "bg-gradient-to-br from-slate-950 via-slate-700 to-slate-500",
  };

  return gradients[color] ?? gradients.slate;
}