"use client";

import type { FormEvent } from "react";

import type { CreditCard } from "../types/credit-card";
import type { PaymentMethod } from "../types/expense";
import { LoadingButton } from "./AppFeedback";

const PAYMENT_METHOD_OPTIONS: { value: PaymentMethod; label: string }[] = [
  { value: "pix", label: "Pix" },
  { value: "debit_card", label: "Débito" },
  { value: "credit_card", label: "Crédito" },
  { value: "cash", label: "Dinheiro" },
  { value: "bank_transfer", label: "Transferência" },
  { value: "other", label: "Outro" },
];

type ExpenseFormProps = {
  description: string;
  amount: string;
  category: string;
  date: string;
  paymentMethod: PaymentMethod;
  creditCardId: string;
  installmentsCount: string;
  creditCards: CreditCard[];
  categories: string[];
  isSubmitting: boolean;
  isEditing: boolean;
  errorMessage: string;
  onDescriptionChange: (value: string) => void;
  onAmountChange: (value: string) => void;
  onCategoryChange: (value: string) => void;
  onDateChange: (value: string) => void;
  onPaymentMethodChange: (value: PaymentMethod) => void;
  onCreditCardChange: (value: string) => void;
  onInstallmentsCountChange: (value: string) => void;
  onManageCategoriesClick: () => void;
  onManageCardsClick: () => void;
  onCancelEdit: () => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
};

export function ExpenseForm({
  description,
  amount,
  category,
  date,
  paymentMethod,
  creditCardId,
  installmentsCount,
  creditCards,
  categories,
  isSubmitting,
  isEditing,
  errorMessage,
  onDescriptionChange,
  onAmountChange,
  onCategoryChange,
  onDateChange,
  onPaymentMethodChange,
  onCreditCardChange,
  onInstallmentsCountChange,
  onManageCategoriesClick,
  onManageCardsClick,
  onCancelEdit,
  onSubmit,
}: ExpenseFormProps) {
  const isCreditCardPayment = paymentMethod === "credit_card";

  return (
    <form onSubmit={onSubmit} className="space-y-5">
      <div className="grid gap-4 md:grid-cols-2">
        <FormField label="Descrição">
          <input
            type="text"
            value={description}
            onChange={(event) => onDescriptionChange(event.target.value)}
            placeholder="Ex: mercado, aluguel..."
            className="app-input"
          />
        </FormField>

        <FormField label="Valor">
          <input
            type="text"
            value={amount}
            onChange={(event) => onAmountChange(event.target.value)}
            inputMode="decimal"
            placeholder="Ex: 120,50"
            className="app-input"
          />
        </FormField>

        <FormField label="Categoria">
          <div className="flex min-w-0 flex-col gap-2 sm:flex-row">
            <select
              value={category}
              onChange={(event) => onCategoryChange(event.target.value)}
              className="app-input min-w-0 flex-1"
            >
              {categories.map((categoryName) => (
                <option key={categoryName} value={categoryName}>
                  {categoryName}
                </option>
              ))}
            </select>

            <button
              type="button"
              onClick={onManageCategoriesClick}
              className="rounded-2xl border border-stone-200 px-4 py-3 text-sm font-black text-stone-700 transition hover:bg-stone-50 sm:w-auto"
            >
              Categorias
            </button>
          </div>
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

      <div className="rounded-3xl border border-stone-100 bg-stone-50 p-4">
        <p className="mb-3 text-xs font-black uppercase tracking-widest text-stone-500">
          Forma de pagamento
        </p>

        <div className="grid gap-2 sm:grid-cols-3">
          {PAYMENT_METHOD_OPTIONS.map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => onPaymentMethodChange(option.value)}
              className={`rounded-2xl border px-3 py-3 text-sm font-black transition ${
                paymentMethod === option.value
                  ? "app-brand-soft shadow-sm"
                  : "border-stone-200 bg-white text-stone-600 hover:bg-stone-50"
              }`}
            >
              {option.label}
            </button>
          ))}
        </div>

        {isCreditCardPayment ? (
          <div className="mt-4 grid gap-4 md:grid-cols-2">
            <FormField label="Cartão usado">
              <div className="flex min-w-0 flex-col gap-2 sm:flex-row">
                <select
                  value={creditCardId}
                  onChange={(event) => onCreditCardChange(event.target.value)}
                  className="app-input min-w-0 flex-1"
                >
                  <option value="">Selecione um cartão</option>
                  {creditCards.map((card) => (
                    <option key={card.id} value={card.id}>
                      {card.name} •••• {card.last_four_digits}
                    </option>
                  ))}
                </select>

                <button
                  type="button"
                  onClick={onManageCardsClick}
                  className="rounded-2xl border border-stone-200 bg-white px-4 py-3 text-sm font-black text-stone-700 transition hover:bg-stone-50 sm:w-auto"
                >
                  Cartões
                </button>
              </div>
            </FormField>

            <FormField label="Parcelas">
              <select
                value={installmentsCount}
                onChange={(event) =>
                  onInstallmentsCountChange(event.target.value)
                }
                className="app-input"
                disabled={isEditing}
              >
                {Array.from({ length: 24 }, (_, index) => index + 1).map(
                  (installment) => (
                    <option key={installment} value={String(installment)}>
                      {installment === 1 ? "À vista" : `${installment}x`}
                    </option>
                  ),
                )}
              </select>

              {isEditing ? (
                <p className="mt-1 text-xs font-medium text-stone-500">
                  Para evitar duplicidade, parcelas só são criadas em novo gasto.
                </p>
              ) : null}
            </FormField>
          </div>
        ) : null}
      </div>

      {errorMessage ? (
        <p className="rounded-2xl border border-red-100 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
          {errorMessage}
        </p>
      ) : null}

      <div className="flex flex-col gap-3 sm:flex-row">
        <LoadingButton
          type="submit"
          isLoading={isSubmitting}
          loadingLabel="Salvando..."
          className="app-button-primary sm:w-auto"
        >
          {isEditing ? "Salvar alterações" : "Adicionar gasto"}
        </LoadingButton>

        {isEditing ? (
          <button
            type="button"
            onClick={onCancelEdit}
            disabled={isSubmitting}
            className="app-button-secondary sm:w-auto disabled:cursor-not-allowed disabled:opacity-70"
          >
            Cancelar edição
          </button>
        ) : null}
      </div>
    </form>
  );
}

type FormFieldProps = {
  label: string;
  children: React.ReactNode;
};

function FormField({ label, children }: FormFieldProps) {
  return (
    <label className="space-y-1.5 text-xs font-bold text-stone-600">
      <span>{label}</span>
      {children}
    </label>
  );
}