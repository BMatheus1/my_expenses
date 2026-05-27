"use client";

import { useEffect, useRef, type FormEvent, type ReactNode } from "react";

import type { CreditCard } from "../types/credit-card";
import type { PaymentMethod } from "../types/expense";
import { smartScrollToElement } from "../utils/smartScroll";
import { LoadingButton } from "./AppFeedback";
import { WheelSelect } from "./WheelSelect";

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
  isOnline: boolean;
  isLoadingCreditCards: boolean;
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
  onRegisterCreditCardClick: () => void;
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
  isOnline,
  isLoadingCreditCards,
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
  onRegisterCreditCardClick,
  onCancelEdit,
  onSubmit,
}: ExpenseFormProps) {
  const creditCardFieldsRef = useRef<HTMLDivElement | null>(null);
  const previousPaymentMethodRef = useRef<PaymentMethod>(paymentMethod);

  const isCreditCardPayment = paymentMethod === "credit_card";
  const hasCreditCards = creditCards.length > 0;
  const shouldShowEmptyCreditCardState =
    isCreditCardPayment && !isLoadingCreditCards && !hasCreditCards;
  const isActionDisabled = isSubmitting || !isOnline;

  useEffect(() => {
    const previousPaymentMethod = previousPaymentMethodRef.current;
    const changedToCreditCard =
      previousPaymentMethod !== "credit_card" && paymentMethod === "credit_card";

    previousPaymentMethodRef.current = paymentMethod;

    if (!changedToCreditCard || !isOnline) {
      return;
    }

    smartScrollToElement(creditCardFieldsRef.current, {
      delayMs: 140,
      focusFirstField: true,
      block: "center",
    });
  }, [paymentMethod, isOnline]);

  return (
    <form onSubmit={onSubmit} className="space-y-5">
      {!isOnline ? (
        <div className="rounded-3xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-800">
          Você está offline. Os dados continuam visíveis, mas para cadastrar ou
          editar gastos é necessário conectar à internet.
        </div>
      ) : null}

      <div className="grid gap-4 md:grid-cols-2">
        <FormField label="Descrição">
          <input
            type="text"
            value={description}
            onChange={(event) => onDescriptionChange(event.target.value)}
            placeholder="Ex: mercado, aluguel..."
            className="app-input"
            disabled={!isOnline}
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
            disabled={!isOnline}
          />
        </FormField>

        <FormField label="Categoria">
          <div className="space-y-3">
            <WheelSelect
              value={category}
              onChange={onCategoryChange}
              options={categories.map((categoryName) => ({
                value: categoryName,
                label: categoryName,
              }))}
              title="Categoria selecionada"
              disabled={!isOnline}
              size="sm"
            />

            <button
              type="button"
              onClick={onManageCategoriesClick}
              disabled={!isOnline}
              className="touch-button w-full rounded-2xl border border-stone-200 px-4 py-3 text-sm font-black text-stone-700 transition hover:bg-stone-50 disabled:cursor-not-allowed disabled:bg-stone-100 disabled:text-stone-400 sm:w-auto"
            >
              {isOnline ? "Gerenciar categorias" : "Com internet"}
            </button>
          </div>
        </FormField>

        <FormField label="Data">
          <input
            type="date"
            value={date}
            onChange={(event) => onDateChange(event.target.value)}
            className="app-input"
            disabled={!isOnline}
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
              disabled={!isOnline}
              className={`touch-button rounded-2xl border px-3 py-3 text-sm font-black transition disabled:cursor-not-allowed disabled:opacity-60 ${
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
          <div
            ref={creditCardFieldsRef}
            className="mt-4 scroll-mt-24 space-y-4"
          >
            {isLoadingCreditCards ? (
              <div className="rounded-3xl border border-stone-200 bg-white px-4 py-3 text-sm font-bold text-stone-600">
                Carregando seus cartões...
              </div>
            ) : shouldShowEmptyCreditCardState ? (
              <div className="rounded-3xl border border-dashed border-stone-300 bg-white p-4">
                <p className="text-sm font-black text-stone-800">
                  Nenhum cartão cadastrado
                </p>

                <p className="mt-1 text-sm leading-6 text-stone-500">
                  Para lançar um gasto no crédito, cadastre primeiro um cartão.
                  Assim o app consegue organizar parcelas, faturas e gastos por
                  cartão.
                </p>

                <button
                  type="button"
                  onClick={onRegisterCreditCardClick}
                  disabled={!isOnline}
                  className="app-button-primary touch-button mt-4 w-full justify-center disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
                >
                  Cadastrar cartão de crédito
                </button>
              </div>
            ) : (
              <div className="grid gap-4 md:grid-cols-2">
                <FormField label="Cartão usado">
                  <div className="flex min-w-0 flex-col gap-2 sm:flex-row">
                    <select
                      value={creditCardId}
                      onChange={(event) =>
                        onCreditCardChange(event.target.value)
                      }
                      className="app-input min-w-0 flex-1"
                      disabled={!isOnline}
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
                      disabled={!isOnline}
                      className="touch-button rounded-2xl border border-stone-200 bg-white px-4 py-3 text-sm font-black text-stone-700 transition hover:bg-stone-50 disabled:cursor-not-allowed disabled:bg-stone-100 disabled:text-stone-400 sm:w-auto"
                    >
                      {isOnline ? "Cartões" : "Com internet"}
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
                    disabled={isEditing || !isOnline}
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
                      Para evitar duplicidade, parcelas só são criadas em novo
                      gasto.
                    </p>
                  ) : null}
                </FormField>
              </div>
            )}
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
          disabled={isActionDisabled}
          className="app-button-primary touch-button sm:w-auto disabled:cursor-not-allowed disabled:opacity-60"
        >
          {!isOnline
            ? "Disponível com internet"
            : isEditing
              ? "Salvar alterações"
              : "Adicionar gasto"}
        </LoadingButton>

        {isEditing ? (
          <button
            type="button"
            onClick={onCancelEdit}
            disabled={isSubmitting}
            className="app-button-secondary touch-button sm:w-auto disabled:cursor-not-allowed disabled:opacity-70"
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
  children: ReactNode;
};

function FormField({ label, children }: FormFieldProps) {
  return (
    <label className="space-y-1.5 text-xs font-bold text-stone-600">
      <span>{label}</span>
      {children}
    </label>
  );
}
