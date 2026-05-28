"use client";

import type { FormEvent, ReactNode } from "react";
import { useMemo, useRef, useState } from "react";
import { EmptyState, LoadingButton, LoadingCard } from "./AppFeedback";
import { MonthSelect } from "./MonthSelect";
import { INCOME_SOURCES } from "../constants/incomeSources";
import type { Income } from "../types/income";
import {
  formatCurrency,
  formatDate,
  getCurrentDate,
  getCurrentMonth,
  parseMoneyToNumber,
  sanitizeMoneyInput,
} from "../utils/formatters";
import { smartScrollToRef } from "../utils/smartScroll";
import { ConfirmModal } from "./ConfirmModal";
import { WheelSelect } from "./WheelSelect";


type IncomesViewProps = {
  incomes: Income[];
  isLoading: boolean;
  onCreateIncome: (income: {
    description: string;
    amount: number;
    source: string;
    date: string;
  }) => Promise<void>;
  onUpdateIncome: (
    incomeId: string,
    income: {
      description: string;
      amount: number;
      source: string;
      date: string;
    }
  ) => Promise<void>;
  onDeleteIncome: (incomeId: string) => Promise<void>;
};

type ConfirmationState = {
  title: string;
  description: string;
  confirmLabel: string;
  variant?: "danger" | "default";
  onConfirm: () => Promise<void> | void;
};

export function IncomesView({
  incomes,
  isLoading,
  onCreateIncome,
  onUpdateIncome,
  onDeleteIncome,
}: IncomesViewProps) {
  const incomeFormSectionRef = useRef<HTMLElement | null>(null);
  const incomeFiltersSectionRef = useRef<HTMLDivElement | null>(null);

  const [selectedMonth, setSelectedMonth] = useState(() => getCurrentMonth());
  const [selectedSource, setSelectedSource] = useState("Todas");
  const [searchTerm, setSearchTerm] = useState("");

  const [editingIncomeId, setEditingIncomeId] = useState<string | null>(null);
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");
  const [source, setSource] = useState<string>(INCOME_SOURCES[0]);
  const [date, setDate] = useState(() => getCurrentDate());

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isFormOpen, setIsFormOpen] = useState(true);
  const [isFiltersOpen, setIsFiltersOpen] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [confirmation, setConfirmation] = useState<ConfirmationState | null>(
    null
  );

  const isEditing = editingIncomeId !== null;

  const filteredIncomes = useMemo(() => {
    const normalizedSearch = searchTerm.trim().toLowerCase();

    return incomes.filter((income) => {
      const matchesMonth = income.date.startsWith(selectedMonth);

      const matchesSource =
        selectedSource === "Todas" || income.source === selectedSource;

      const matchesDescription =
        normalizedSearch.length === 0 ||
        income.description.toLowerCase().includes(normalizedSearch);

      return matchesMonth && matchesSource && matchesDescription;
    });
  }, [incomes, selectedMonth, selectedSource, searchTerm]);

  const monthlyTotal = useMemo(() => {
    return filteredIncomes.reduce((total, income) => total + income.amount, 0);
  }, [filteredIncomes]);

  function handleNewIncomeClick() {
    resetForm();
    setIsFormOpen(true);

    smartScrollToRef(incomeFormSectionRef, {
      delayMs: 120,
      focusFirstField: true,
    });
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setErrorMessage("");

    const parsedAmount = parseMoneyToNumber(amount);
    const trimmedDescription = description.trim();

    if (trimmedDescription.length < 2) {
      setErrorMessage("Informe uma descrição com pelo menos 2 caracteres.");
      return;
    }

    if (!amount.trim() || Number.isNaN(parsedAmount) || parsedAmount <= 0) {
      setErrorMessage("Informe um valor válido.");
      return;
    }

    try {
      setIsSubmitting(true);

      const incomeData = {
        description: trimmedDescription,
        amount: parsedAmount,
        source,
        date,
      };

      if (editingIncomeId) {
        await onUpdateIncome(editingIncomeId, incomeData);
      } else {
        await onCreateIncome(incomeData);
      }

      resetForm();
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Não foi possível salvar o ganho."
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  function requestEditIncome(income: Income) {
    setConfirmation({
      title: "Editar este ganho?",
      description: `Você vai abrir "${income.description}" para edição.`,
      confirmLabel: "Editar ganho",
      variant: "default",
      onConfirm: () => startEditingIncome(income),
    });
  }

  function startEditingIncome(income: Income) {
    setEditingIncomeId(income.id);
    setDescription(income.description);
    setAmount(String(income.amount).replace(".", ","));
    setSource(income.source);
    setDate(income.date);
    setIsFormOpen(true);
    setErrorMessage("");

    smartScrollToRef(incomeFormSectionRef, {
      delayMs: 140,
      focusFirstField: true,
    });
  }

  function requestDeleteIncome(income: Income) {
    setConfirmation({
      title: "Remover este ganho?",
      description: `O ganho "${income.description}" será removido da sua lista.`,
      confirmLabel: "Remover ganho",
      variant: "danger",
      onConfirm: () => onDeleteIncome(income.id),
    });
  }

  function resetForm() {
    setEditingIncomeId(null);
    setDescription("");
    setAmount("");
    setSource(INCOME_SOURCES[0]);
    setDate(getCurrentDate());
    setErrorMessage("");
  }

  function clearFilters() {
    setSelectedMonth(getCurrentMonth());
    setSelectedSource("Todas");
    setSearchTerm("");
  }

  async function handleConfirmAction() {
    if (!confirmation) {
      return;
    }

    await confirmation.onConfirm();
    setConfirmation(null);
  }

  function handleFormToggle() {
    setIsFormOpen((currentValue) => {
      const nextValue = !currentValue;

      if (nextValue) {
        smartScrollToRef(incomeFormSectionRef, {
          delayMs: 100,
          focusFirstField: true,
        });
      }

      return nextValue;
    });
  }

  function handleFiltersToggle() {
    setIsFiltersOpen((currentValue) => {
      const nextValue = !currentValue;

      if (nextValue) {
        smartScrollToRef(incomeFiltersSectionRef, {
          delayMs: 100,
        });
      }

      return nextValue;
    });
  }

  return (
    <div className="space-y-5">
      <IncomeHeader
        monthlyTotal={monthlyTotal}
        onNewIncomeClick={handleNewIncomeClick}
      />

      <section className="grid gap-3 md:grid-cols-3">
        <IncomeSummaryCard
          label="Ganhos filtrados"
          value={formatCurrency(monthlyTotal)}
          description={`${filteredIncomes.length} entrada${
            filteredIncomes.length === 1 ? "" : "s"
          } encontrada${filteredIncomes.length === 1 ? "" : "s"}`}
        />

        <IncomeSummaryCard
          label="Mês selecionado"
          value={selectedMonth}
          description="Período usado nos filtros"
        />

        <IncomeSummaryCard
          label="Fonte"
          value={selectedSource}
          description="Origem selecionada"
        />
      </section>

      <div className="grid gap-5 xl:grid-cols-2">
        <section
          ref={incomeFormSectionRef}
          className="app-card scroll-mt-5 rounded-3xl"
        >
          <button
            type="button"
            onClick={handleFormToggle}
            className="flex w-full items-center justify-between gap-4 px-5 py-5 text-left transition hover:bg-[var(--app-surface-soft)]"
            aria-expanded={isFormOpen}
          >
            <div>
              <h2 className="text-lg font-semibold app-title">
                {isEditing ? "Editar ganho" : "Novo ganho"}
              </h2>

              <p className="mt-1 text-sm app-muted">
                {isEditing
                  ? "Ajuste as informações da entrada."
                  : "Cadastre uma nova entrada."}
              </p>
            </div>

            <span className="app-btn app-btn-soft flex h-10 w-10 shrink-0 rounded-full text-lg font-bold">
              {isFormOpen ? "−" : "+"}
            </span>
          </button>

          {isFormOpen && (
            <div className="border-t px-5 py-5" style={{ borderColor: "var(--app-border)" }}>
              <IncomeForm
                description={description}
                amount={amount}
                source={source}
                date={date}
                isSubmitting={isSubmitting}
                isEditing={isEditing}
                errorMessage={errorMessage}
                onDescriptionChange={setDescription}
                onAmountChange={(value) => setAmount(sanitizeMoneyInput(value))}
                onSourceChange={setSource}
                onDateChange={setDate}
                onCancelEdit={resetForm}
                onSubmit={handleSubmit}
              />
            </div>
          )}
        </section>

        <div className="space-y-4">
          <div ref={incomeFiltersSectionRef} className="scroll-mt-5">
            <IncomeFilters
              selectedMonth={selectedMonth}
              selectedSource={selectedSource}
              searchTerm={searchTerm}
              isOpen={isFiltersOpen}
              onToggle={handleFiltersToggle}
              onSelectedMonthChange={setSelectedMonth}
              onSelectedSourceChange={setSelectedSource}
              onSearchTermChange={setSearchTerm}
              onClearFilters={clearFilters}
            />
          </div>

          <IncomeList
            incomes={filteredIncomes}
            isLoading={isLoading}
            onEdit={requestEditIncome}
            onDelete={requestDeleteIncome}
          />
        </div>
      </div>

      <ConfirmModal
        isOpen={confirmation !== null}
        title={confirmation?.title ?? ""}
        description={confirmation?.description ?? ""}
        confirmLabel={confirmation?.confirmLabel ?? "Confirmar"}
        variant={confirmation?.variant}
        onConfirm={handleConfirmAction}
        onCancel={() => setConfirmation(null)}
      />
    </div>
  );
}

type IncomeHeaderProps = {
  monthlyTotal: number;
  onNewIncomeClick: () => void;
};

function IncomeHeader({ monthlyTotal, onNewIncomeClick }: IncomeHeaderProps) {
  return (
    <header className="app-card rounded-3xl p-6">
      <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <p className="app-kicker">
            My Expenses
          </p>

          <h1 className="app-title mt-2 text-3xl font-bold tracking-tight">
            Ganhos
          </h1>

          <p className="app-muted mt-2 max-w-2xl text-sm leading-6">
            Cadastre e acompanhe suas entradas mensais.
          </p>
        </div>

        <div className="app-card-soft rounded-3xl p-4 sm:w-72">
          <p className="text-sm font-medium app-muted">Ganhos filtrados</p>

          <strong className="app-brand-text mt-2 block text-2xl font-bold">
            {formatCurrency(monthlyTotal)}
          </strong>

          <button
            type="button"
            onClick={onNewIncomeClick}
            className="app-button-primary mt-4 w-full"
          >
            + Novo ganho
          </button>
        </div>
      </div>
    </header>
  );
}

type IncomeSummaryCardProps = {
  label: string;
  value: string;
  description: string;
};

function IncomeSummaryCard({
  label,
  value,
  description,
}: IncomeSummaryCardProps) {
  return (
    <article className="app-card rounded-3xl p-5">
      <p className="text-sm font-medium app-muted">{label}</p>

      <strong className="app-title mt-2 block truncate text-2xl font-bold">
        {value}
      </strong>

      <p className="mt-2 text-sm app-muted">{description}</p>
    </article>
  );
}

type IncomeFormProps = {
  description: string;
  amount: string;
  source: string;
  date: string;
  isSubmitting: boolean;
  isEditing: boolean;
  errorMessage: string;
  onDescriptionChange: (value: string) => void;
  onAmountChange: (value: string) => void;
  onSourceChange: (value: string) => void;
  onDateChange: (value: string) => void;
  onCancelEdit: () => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
};

function IncomeForm({
  description,
  amount,
  source,
  date,
  isSubmitting,
  isEditing,
  errorMessage,
  onDescriptionChange,
  onAmountChange,
  onSourceChange,
  onDateChange,
  onCancelEdit,
  onSubmit,
}: IncomeFormProps) {
  return (
    <form onSubmit={onSubmit} className="space-y-5">
      <div className="grid gap-4 md:grid-cols-2">
        <FormField label="Descrição">
          <input
            type="text"
            value={description}
            onChange={(event) => onDescriptionChange(event.target.value)}
            placeholder="Ex: salário, freelance..."
            className="app-input"
          />
        </FormField>

        <FormField label="Valor">
          <input
            type="text"
            value={amount}
            onChange={(event) => onAmountChange(event.target.value)}
            inputMode="decimal"
            placeholder="Ex: 2500,00"
            className="app-input"
          />
        </FormField>

        <FormField label="Fonte">
          <WheelSelect
            value={source}
            onChange={onSourceChange}
            options={INCOME_SOURCES.map((item) => ({
              value: item,
              label: item,
            }))}
            title="Fonte selecionada"
            size="sm"
          />
        </FormField>

        <FormField label="Data">
          <input
            type="date"
            value={date}
            onChange={(event) => onDateChange(event.target.value)}
            className="app-input"
          />
        </FormField>
      </div>

      {errorMessage && (
        <p className="rounded-2xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-700">
          {errorMessage}
        </p>
      )}

      <div className="flex flex-col gap-3 sm:flex-row">
        <LoadingButton
          type="submit"
          isLoading={isSubmitting}
          loadingLabel="Salvando..."
          className="app-button-primary sm:w-auto"
        >
          {isEditing ? "Salvar alterações" : "Adicionar ganho"}
        </LoadingButton>

        {isEditing && (
          <button
            type="button"
            onClick={onCancelEdit}
            disabled={isSubmitting}
            className="app-button-secondary sm:w-auto"
          >
            Cancelar edição
          </button>
        )}
      </div>
    </form>
  );
}

type IncomeFiltersProps = {
  selectedMonth: string;
  selectedSource: string;
  searchTerm: string;
  isOpen: boolean;
  onToggle: () => void;
  onSelectedMonthChange: (value: string) => void;
  onSelectedSourceChange: (value: string) => void;
  onSearchTermChange: (value: string) => void;
  onClearFilters: () => void;
};

function IncomeFilters({
  selectedMonth,
  selectedSource,
  searchTerm,
  isOpen,
  onToggle,
  onSelectedMonthChange,
  onSelectedSourceChange,
  onSearchTermChange,
  onClearFilters,
}: IncomeFiltersProps) {
  const hasActiveFilters = selectedSource !== "Todas" || searchTerm.trim();

  return (
    <section className="app-card rounded-3xl">
      <button
        type="button"
        onClick={onToggle}
        className="flex w-full items-center justify-between gap-4 px-4 py-4 text-left transition hover:bg-[var(--app-surface-soft)]"
        aria-expanded={isOpen}
      >
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-sm font-bold app-title">Filtros</h2>

            {hasActiveFilters && (
              <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-bold text-emerald-700">
                Ativo
              </span>
            )}
          </div>

          <p className="mt-1 text-xs app-muted">
            Filtre por mês, fonte ou descrição.
          </p>
        </div>

        <span className="app-btn app-btn-soft flex h-9 w-9 shrink-0 rounded-full text-base font-bold">
          {isOpen ? "−" : "+"}
        </span>
      </button>

      {isOpen && (
        <div className="border-t p-4" style={{ borderColor: "var(--app-border)" }}>
          <div className="grid gap-3 md:grid-cols-3">
            <FormField label="Mês">
              <MonthSelect
                value={selectedMonth}
                onChange={onSelectedMonthChange}
                variant="wheel"
              />
            </FormField>

            <FormField label="Fonte">
              <WheelSelect
                value={selectedSource}
                onChange={onSelectedSourceChange}
                options={[
                  { value: "Todas", label: "Todas" },
                  ...INCOME_SOURCES.map((item) => ({
                    value: item,
                    label: item,
                  })),
                ]}
                title="Fonte selecionada"
                size="sm"
              />
            </FormField>

            <FormField label="Buscar">
              <input
                type="text"
                value={searchTerm}
                onChange={(event) => onSearchTermChange(event.target.value)}
                placeholder="Descrição..."
                className="app-input px-4 py-3 text-sm"
              />
            </FormField>
          </div>

          <div className="mt-4 flex justify-end">
            <button
              type="button"
              onClick={onClearFilters}
              className="app-btn app-btn-soft rounded-full px-4 py-2 text-xs"
            >
              Limpar filtros
            </button>
          </div>
        </div>
      )}
    </section>
  );
}

type IncomeListProps = {
  incomes: Income[];
  isLoading: boolean;
  onEdit: (income: Income) => void;
  onDelete: (income: Income) => void;
};

function IncomeList({ incomes, isLoading, onEdit, onDelete }: IncomeListProps) {
  return (
    <section className="app-card overflow-hidden rounded-3xl">
      <div className="flex flex-col gap-2 border-b px-5 py-5 sm:flex-row sm:items-center sm:justify-between sm:px-6" style={{ borderColor: "var(--app-border)" }}>
        <div>
          <h2 className="text-lg font-semibold app-title">
            Ganhos encontrados
          </h2>

          <p className="mt-1 text-sm app-muted">
            Edite ou remova entradas cadastradas.
          </p>
        </div>

        <span className="app-card-soft w-fit rounded-full px-3 py-1 text-xs font-semibold">
          {incomes.length} item{incomes.length === 1 ? "" : "s"}
        </span>
      </div>

      <div className="divide-y" style={{ borderColor: "var(--app-border)" }}>
        {isLoading ? (
          <div className="p-5">
            <LoadingCard
              title="Carregando ganhos"
              description="Buscando suas entradas cadastradas."
            />
          </div>
        ) : incomes.length === 0 ? (
          <div className="p-5">
            <EmptyState
              title="Nenhum ganho encontrado"
              description="Cadastre seu primeiro ganho ou ajuste os filtros para encontrar entradas já registradas."
            />
          </div>
        ) : (
          incomes.map((income) => (
            <article
              key={income.id}
              className="flex flex-col gap-4 px-5 py-4 transition hover:bg-[var(--app-surface-soft)] sm:flex-row sm:items-center sm:justify-between sm:px-6"
            >
              <div className="min-w-0">
                <h3 className="truncate font-semibold app-title">
                  {income.description}
                </h3>

                <p className="mt-1 text-sm app-muted">
                  {income.source} • {formatDate(income.date)}
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2 sm:justify-end">
                <strong className="app-brand-text mr-2 whitespace-nowrap text-base">
                  {formatCurrency(income.amount)}
                </strong>

                <button
                  type="button"
                  onClick={() => onEdit(income)}
                  className="app-btn app-btn-soft rounded-full px-4 py-2 text-sm font-semibold"
                >
                  Editar
                </button>

                <button
                  type="button"
                  onClick={() => onDelete(income)}
                  className="rounded-full border border-red-100 px-4 py-2 text-sm font-semibold text-red-700 transition hover:bg-red-50"
                >
                  Remover
                </button>
              </div>
            </article>
          ))
        )}
      </div>
    </section>
  );
}

type FormFieldProps = {
  label: string;
  children: ReactNode;
};

function FormField({ label, children }: FormFieldProps) {
  return (
    <label className="space-y-1.5 text-xs font-bold app-text-soft">
      <span>{label}</span>
      {children}
    </label>
  );
}