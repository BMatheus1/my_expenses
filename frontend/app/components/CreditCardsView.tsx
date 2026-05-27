"use client";

import {
  useCallback,
  useEffect,
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
  isOnline: boolean;
  isLoading: boolean;
  isSaving: boolean;
  deletingCardId: string | null;
  errorMessage: string;
  autoOpenCreateFormToken: number | null;
  onCreateCard: (card: CreateCreditCardRequest) => Promise<boolean>;
  onUpdateCard: (
    cardId: string,
    card: CreateCreditCardRequest,
  ) => Promise<boolean>;
  onDeleteCard: (card: CreditCard) => void;
  onClearError: () => void;
  onAutoOpenCreateFormHandled: () => void;
};

export function CreditCardsView({
  cards,
  expenses,
  isOnline,
  isLoading,
  isSaving,
  deletingCardId,
  errorMessage,
  autoOpenCreateFormToken,
  onCreateCard,
  onUpdateCard,
  onDeleteCard,
  onClearError,
  onAutoOpenCreateFormHandled,
}: CreditCardsViewProps) {
  const formSectionRef = useRef<HTMLDivElement | null>(null);

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingCard, setEditingCard] = useState<CreditCard | null>(null);
  const [form, setForm] = useState<CardFormState>(EMPTY_FORM);

  const currentInvoiceMonth = getCurrentMonth();

  const cardSummaries = useMemo(() => {
    return cards.map((card) => {
      const invoiceExpenses = expenses.filter((expense) => {
        if (expense.payment_method !== "credit_card") {
          return false;
        }

        if (expense.credit_card_id !== card.id) {
          return false;
        }

        if (expense.invoice_month) {
          return expense.invoice_month === currentInvoiceMonth;
        }

        return expense.date.startsWith(currentInvoiceMonth);
      });

      const invoiceTotal = invoiceExpenses.reduce(
        (total, expense) => total + expense.amount,
        0,
      );

      const limitUsagePercentage = card.limit_amount
        ? Math.min(100, Math.round((invoiceTotal / card.limit_amount) * 100))
        : null;

      return {
        card,
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
    .sort((first, second) => first.dueInfo.priority - second.dueInfo.priority)[0];

  const scrollToCardForm = useCallback(() => {
    window.setTimeout(() => {
      smartScrollToRef(formSectionRef, {
        delayMs: 0,
        focusFirstField: true,
      });
    }, 120);
  }, []);

  const openCreateForm = useCallback(() => {
    if (!isOnline) {
      return;
    }

    onClearError();
    setEditingCard(null);
    setForm(EMPTY_FORM);
    setIsFormOpen(true);
    scrollToCardForm();
  }, [isOnline, onClearError, scrollToCardForm]);

  useEffect(() => {
    if (!autoOpenCreateFormToken) {
      return;
    }

    openCreateForm();
    onAutoOpenCreateFormHandled();
  }, [
    autoOpenCreateFormToken,
    onAutoOpenCreateFormHandled,
    openCreateForm,
  ]);

  function openEditForm(card: CreditCard) {
    if (!isOnline) {
      return;
    }

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

    if (!isOnline) {
      return;
    }

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
      <header className="app-card overflow-hidden rounded-3xl">
        <div className="soft-header-gradient p-5 sm:p-6">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="app-kicker">Cartões</p>

              <h1 className="app-title mt-2 text-3xl font-black tracking-tight">
                Cartões de crédito
              </h1>

              <p className="app-muted mt-2 max-w-2xl text-sm leading-6">
                Acompanhe faturas, vencimentos e compras no crédito sem
                transformar cartão em categoria.
              </p>
            </div>

            <button
              type="button"
              onClick={openCreateForm}
              disabled={!isOnline}
              className="app-button-primary touch-button disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isOnline ? "+ Novo cartão" : "Novo cartão disponível com internet"}
            </button>
          </div>
        </div>
      </header>

      {!isOnline ? (
        <section className="rounded-3xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-800 shadow-sm">
          Você está offline. Seus cartões continuam disponíveis para consulta,
          mas para cadastrar, editar ou excluir é necessário conectar à internet.
        </section>
      ) : null}

      <section className="grid gap-3 md:grid-cols-3">
        <SummaryCard
          label="Fatura atual"
          value={formatCurrency(totalInvoice)}
          description="Soma dos cartões neste mês"
        />

        <SummaryCard
          label="Cartões"
          value={String(cards.length)}
          description="Cadastrados na carteira"
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
          <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="app-title text-lg font-black">
                {editingCard ? "Editar cartão" : "Novo cartão"}
              </h2>

              <p className="app-muted mt-1 text-sm leading-6">
                Salve apenas apelido, bandeira e final do cartão. Nunca salve
                número completo, validade ou CVV.
              </p>
            </div>

            <button
              type="button"
              onClick={closeForm}
              className="app-button-secondary touch-button text-sm"
            >
              Cancelar
            </button>
          </div>

          {!isOnline ? (
            <div className="mb-5 rounded-3xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-800">
              Você está offline. Conecte-se para salvar alterações neste cartão.
            </div>
          ) : null}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="grid gap-4 md:grid-cols-2">
              <FormField label="Apelido do cartão">
                <input
                  value={form.name}
                  onChange={(event) => updateForm("name", event.target.value)}
                  className="app-input"
                  placeholder="Ex: Nubank Roxinho"
                  disabled={!isOnline}
                />
              </FormField>

              <FormField label="Bandeira">
                <select
                  value={form.brand}
                  onChange={(event) => updateForm("brand", event.target.value)}
                  className="app-input"
                  disabled={!isOnline}
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
                  disabled={!isOnline}
                />
              </FormField>

              <FormField label="Limite opcional">
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
                  disabled={!isOnline}
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
                  disabled={!isOnline}
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
                  disabled={!isOnline}
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
                    disabled={!isOnline}
                    className={`touch-button rounded-full border px-4 py-2 text-xs font-black transition disabled:cursor-not-allowed disabled:opacity-60 ${
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
              disabled={!isOnline || isSaving}
              className="app-button-primary touch-button sm:w-auto disabled:cursor-not-allowed disabled:opacity-60"
            >
              {!isOnline
                ? "Disponível com internet"
                : editingCard
                  ? "Salvar cartão"
                  : "Cadastrar cartão"}
            </LoadingButton>
          </form>
        </section>
      ) : null}

      {isLoading ? (
        <CardsLoadingState />
      ) : cards.length === 0 ? (
        <EmptyState
          title="Nenhum cartão cadastrado"
          description={
            isOnline
              ? "Cadastre seu primeiro cartão para lançar gastos no crédito e acompanhar vencimentos."
              : "Nenhum cartão salvo localmente. Conecte-se para carregar ou cadastrar cartões."
          }
          action={
            isOnline
              ? { label: "Cadastrar cartão", onClick: openCreateForm }
              : undefined
          }
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
              isOnline={isOnline}
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
  isOnline: boolean;
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
  isOnline,
  isDeleting,
  onEdit,
  onDelete,
}: CreditCardPanelProps) {
  return (
    <article className="app-card mobile-card-shadow overflow-hidden rounded-3xl">
      <div
        className="p-5 text-white"
        style={{
          background: getCardGradient(card.color),
        }}
      >
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <p className="text-xs font-black uppercase tracking-widest text-white opacity-75">
              {card.brand}
            </p>

            <h2 className="mt-2 truncate text-2xl font-black tracking-tight">
              {card.name}
            </h2>
          </div>

          <span className="shrink-0 rounded-full bg-white px-3 py-1 text-xs font-black text-stone-900">
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

        <InvoicePreview expenses={invoiceExpenses} />

        <div className="grid gap-2 sm:grid-cols-2">
          <button
            type="button"
            onClick={onEdit}
            disabled={!isOnline}
            className="app-button-secondary touch-button text-sm disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isOnline ? "Editar" : "Offline"}
          </button>

          <button
            type="button"
            onClick={onDelete}
            disabled={isDeleting || !isOnline}
            className="touch-button rounded-full border border-red-100 px-4 py-3 text-sm font-black text-red-700 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:bg-stone-100 disabled:text-stone-400"
          >
            {isDeleting ? "Excluindo..." : isOnline ? "Excluir" : "Offline"}
          </button>
        </div>
      </div>
    </article>
  );
}

function InvoicePreview({ expenses }: { expenses: Expense[] }) {
  return (
    <div className="rounded-2xl border border-stone-100 bg-stone-50 p-4">
      <div className="flex items-center justify-between gap-3">
        <h3 className="text-sm font-black text-stone-900">Gastos da fatura</h3>

        <span className="text-xs font-bold text-stone-500">
          {expenses.length} item{expenses.length === 1 ? "" : "s"}
        </span>
      </div>

      <div className="mt-3 space-y-2">
        {expenses.length === 0 ? (
          <p className="text-sm text-stone-500">Nenhum gasto nessa fatura.</p>
        ) : (
          expenses.slice(0, 4).map((expense) => (
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
    <div className="rounded-2xl bg-white p-3 text-stone-950 opacity-95">
      <p className="text-xs font-bold text-stone-500">{label}</p>

      <strong className="mt-1 block truncate text-sm font-black">{value}</strong>
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

function CardsLoadingState() {
  return (
    <section className="grid gap-5 xl:grid-cols-2">
      <div className="h-96 animate-pulse rounded-3xl border border-stone-100 bg-stone-100" />
      <div className="h-96 animate-pulse rounded-3xl border border-stone-100 bg-stone-100" />
    </section>
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
      priority: 0,
      label: `Hoje · ${dueDateLabel}`,
    };
  }

  if (rawDaysLeft === 1) {
    return {
      priority: 1,
      label: `Amanhã · ${dueDateLabel}`,
    };
  }

  if (rawDaysLeft > 1 && rawDaysLeft <= 7) {
    return {
      priority: rawDaysLeft,
      label: `${rawDaysLeft} dias · ${dueDateLabel}`,
    };
  }

  if (rawDaysLeft > 7) {
    return {
      priority: rawDaysLeft,
      label: dueDateLabel,
    };
  }

  return {
    priority: 999,
    label: dueDateLabel,
  };
}

function formatShortDueDate(date: Date) {
  const day = String(date.getDate()).padStart(2, "0");
  const month = String(date.getMonth() + 1).padStart(2, "0");

  return `dia ${day}/${month}`;
}

function getCardGradient(color: CreditCardColor) {
  const gradients: Record<CreditCardColor, string> = {
    purple: "linear-gradient(135deg, #2e1065 0%, #7e22ce 55%, #c026d3 100%)",
    blue: "linear-gradient(135deg, #082f49 0%, #1d4ed8 55%, #06b6d4 100%)",
    emerald: "linear-gradient(135deg, #022c22 0%, #047857 55%, #14b8a6 100%)",
    rose: "linear-gradient(135deg, #4c0519 0%, #be185d 55%, #f43f5e 100%)",
    amber: "linear-gradient(135deg, #1c1917 0%, #b45309 55%, #f97316 100%)",
    black: "linear-gradient(135deg, #0c0a09 0%, #292524 55%, #57534e 100%)",
    slate: "linear-gradient(135deg, #020617 0%, #334155 55%, #64748b 100%)",
  };

  return gradients[color] ?? gradients.slate;
}