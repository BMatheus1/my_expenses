import type { FormEvent, ReactNode } from "react";

type ExpenseFormProps = {
  description: string;
  amount: string;
  category: string;
  date: string;
  categories: readonly string[];
  isSubmitting: boolean;
  isEditing: boolean;
  errorMessage: string;
  onDescriptionChange: (value: string) => void;
  onAmountChange: (value: string) => void;
  onCategoryChange: (value: string) => void;
  onDateChange: (value: string) => void;
  onManageCategoriesClick: () => void;
  onCancelEdit: () => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
};

export function ExpenseForm({
  description,
  amount,
  category,
  date,
  categories,
  isSubmitting,
  isEditing,
  errorMessage,
  onDescriptionChange,
  onAmountChange,
  onCategoryChange,
  onDateChange,
  onManageCategoriesClick,
  onCancelEdit,
  onSubmit,
}: ExpenseFormProps) {
  return (
    <form onSubmit={onSubmit} className="space-y-5">
      <div className="grid gap-4 md:grid-cols-2">
        <FormField label="Descrição">
          <input
            type="text"
            value={description}
            onChange={(event) => onDescriptionChange(event.target.value)}
            placeholder="Ex: mercado, farmácia..."
            className="app-input"
          />
        </FormField>

        <FormField label="Valor">
          <input
            type="text"
            value={amount}
            onChange={(event) => onAmountChange(event.target.value)}
            inputMode="decimal"
            placeholder="Ex: 25,90"
            className="app-input"
          />
        </FormField>

        <div className="space-y-2">
          <div className="flex items-center justify-between gap-3">
            <span className="text-sm font-medium text-stone-700">
              Categoria
            </span>

            <button
              type="button"
              onClick={onManageCategoriesClick}
              className="rounded-full border border-stone-200 px-3 py-1 text-xs font-bold text-stone-500 transition hover:bg-stone-50 hover:text-stone-800"
            >
              Gerenciar
            </button>
          </div>

          <select
            value={category}
            onChange={(event) => onCategoryChange(event.target.value)}
            className="app-input"
          >
            {categories.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>
        </div>

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
        <button
          type="submit"
          disabled={isSubmitting}
          className="app-button-primary sm:w-auto"
        >
          {isSubmitting
            ? "Salvando..."
            : isEditing
              ? "Salvar alterações"
              : "Adicionar gasto"}
        </button>

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

type FormFieldProps = {
  label: string;
  children: ReactNode;
};

function FormField({ label, children }: FormFieldProps) {
  return (
    <label className="space-y-2 text-sm font-medium text-stone-700">
      <span>{label}</span>
      {children}
    </label>
  );
}