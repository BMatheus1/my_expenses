import type { ReactNode } from "react";

export function InputField({
  label,
  value,
  onChange,
  placeholder,
  type = "text",
  inputMode,
  required = false,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  type?: string;
  inputMode?: "text" | "decimal" | "numeric";
  required?: boolean;
}) {
  return (
    <label className="block min-w-0">
      <span className="mb-1 block truncate text-sm font-bold text-stone-700">
        {label}
      </span>
      <input
        type={type}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        inputMode={inputMode}
        required={required}
        className="w-full min-w-0 rounded-2xl border border-stone-200 bg-white px-4 py-3 text-sm outline-none transition placeholder:text-stone-300 focus:border-emerald-600"
      />
    </label>
  );
}

export function TextareaField({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}) {
  return (
    <label className="block min-w-0">
      <span className="mb-1 block truncate text-sm font-bold text-stone-700">
        {label}
      </span>
      <textarea
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        rows={3}
        className="w-full min-w-0 resize-none rounded-2xl border border-stone-200 bg-white px-4 py-3 text-sm outline-none transition placeholder:text-stone-300 focus:border-emerald-600"
      />
    </label>
  );
}

export function SelectField({
  label,
  value,
  onChange,
  options,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: Array<string | { label: string; value: string }>;
  placeholder?: string;
}) {
  return (
    <label className="block min-w-0">
      <span className="mb-1 block truncate text-sm font-bold text-stone-700">
        {label}
      </span>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="w-full min-w-0 rounded-2xl border border-stone-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-emerald-600"
      >
        {placeholder ? <option value="">{placeholder}</option> : null}

        {options.map((option) => {
          const normalizedOption =
            typeof option === "string"
              ? { label: option, value: option }
              : option;

          return (
            <option key={normalizedOption.value} value={normalizedOption.value}>
              {normalizedOption.label}
            </option>
          );
        })}
      </select>
    </label>
  );
}

export function PrimaryButton({
  children,
  disabled,
}: {
  children: ReactNode;
  disabled?: boolean;
}) {
  return (
    <button
      type="submit"
      disabled={disabled}
      className="w-full rounded-2xl bg-emerald-700 px-5 py-3 text-sm font-black text-white transition hover:bg-emerald-800 disabled:cursor-not-allowed disabled:opacity-60"
    >
      {children}
    </button>
  );
}

export function SecondaryButton({
  children,
  type = "button",
  onClick,
}: {
  children: ReactNode;
  type?: "button" | "submit";
  onClick?: () => void;
}) {
  return (
    <button
      type={type}
      onClick={onClick}
      className="w-full rounded-2xl border border-stone-200 px-5 py-3 text-sm font-black text-stone-700 transition hover:bg-stone-50"
    >
      {children}
    </button>
  );
}

export function DangerButton({
  children,
  type = "button",
  disabled,
  onClick,
}: {
  children: ReactNode;
  type?: "button" | "submit";
  disabled?: boolean;
  onClick?: () => void;
}) {
  return (
    <button
      type={type}
      disabled={disabled}
      onClick={onClick}
      className="w-full rounded-2xl bg-red-600 px-5 py-3 text-sm font-black text-white transition hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-60"
    >
      {children}
    </button>
  );
}

export function AlertMessage({
  type,
  message,
  onClose,
}: {
  type: "success" | "error";
  message: string;
  onClose: () => void;
}) {
  return (
    <div
      className={`mb-4 flex items-center justify-between gap-4 rounded-2xl border px-4 py-3 text-sm font-bold ${
        type === "success"
          ? "border-emerald-200 bg-emerald-50 text-emerald-700"
          : "border-red-200 bg-red-50 text-red-700"
      }`}
    >
      <span className="texto-quebra">{message}</span>
      <button type="button" onClick={onClose} className="shrink-0">
        Fechar
      </button>
    </div>
  );
}

export function EmptyList({ message }: { message: string }) {
  return (
    <div className="rounded-2xl bg-stone-50 p-4 text-sm text-stone-500">
      {message}
    </div>
  );
}

export function EmptyBusinessState({ onCreate }: { onCreate: () => void }) {
  return (
    <SectionCard>
      <div className="text-center">
        <p className="text-sm font-black uppercase tracking-widest text-emerald-700">
          Meus Negócios
        </p>
        <h1 className="mt-2 text-2xl font-black tracking-tight text-stone-950">
          Crie seu primeiro negócio
        </h1>
        <p className="mx-auto mt-2 max-w-xl text-sm text-stone-500">
          Controle materiais, fichas de custo, vendas, lucro bruto e capacidade
          de produção por serviço ou produto.
        </p>
        <button
          type="button"
          onClick={onCreate}
          className="mt-6 rounded-2xl bg-emerald-700 px-5 py-3 text-sm font-black text-white transition hover:bg-emerald-800"
        >
          Criar novo negócio
        </button>
      </div>
    </SectionCard>
  );
}

export function SectionCard({ children }: { children: ReactNode }) {
  return (
    <section className="min-w-0 rounded-3xl border border-stone-200 bg-white p-6 shadow-sm">
      {children}
    </section>
  );
}

export function Modal({
  title,
  children,
  onClose,
}: {
  title: string;
  children: ReactNode;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-stone-950 bg-opacity-40 p-4">
      <div className="w-full max-w-xl rounded-3xl bg-white p-6 shadow-xl">
        <div className="mb-5 flex items-center justify-between gap-4">
          <h2 className="texto-quebra text-xl font-black text-stone-950">
            {title}
          </h2>

          <button
            type="button"
            onClick={onClose}
            className="rounded-full border border-stone-200 px-3 py-2 text-sm font-black text-stone-600 transition hover:bg-stone-50"
          >
            Fechar
          </button>
        </div>

        {children}
      </div>
    </div>
  );
}

export function Badge({
  children,
  tone,
}: {
  children: ReactNode;
  tone: "success" | "danger" | "neutral";
}) {
  const classNameByTone = {
    success: "bg-emerald-100 text-emerald-800",
    danger: "bg-red-100 text-red-700",
    neutral: "bg-stone-100 text-stone-700",
  };

  return (
    <span
      className={`shrink-0 rounded-full px-3 py-1 text-xs font-black ${classNameByTone[tone]}`}
    >
      {children}
    </span>
  );
}

export function InfoLine({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="min-w-0 rounded-2xl bg-stone-50 px-3 py-2">
      <p className="texto-quebra text-xs font-black uppercase text-stone-400">
        {label}
      </p>
      <p className="mt-1 texto-quebra text-sm font-bold text-stone-800">
        {value}
      </p>
    </div>
  );
}

export function MetricCard({
  label,
  value,
  hint,
}: {
  label: string;
  value: string;
  hint?: string;
}) {
  return (
    <article className="min-w-0 rounded-3xl border border-stone-200 bg-white p-5 shadow-sm">
      <p className="truncate text-sm font-bold text-stone-500">{label}</p>
      <p className="mt-2 texto-quebra text-2xl font-black tracking-tight text-stone-950">
        {value}
      </p>
      {hint ? (
        <p className="mt-1 texto-quebra text-xs font-semibold text-stone-400">
          {hint}
        </p>
      ) : null}
    </article>
  );
}

export function HealthCard({
  title,
  value,
  description,
  actionLabel,
  onAction,
}: {
  title: string;
  value: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
}) {
  return (
    <article className="min-w-0 rounded-3xl border border-stone-200 bg-white p-4">
      <p className="truncate text-sm font-bold text-stone-500">{title}</p>
      <p className="mt-2 texto-quebra text-2xl font-black text-stone-950">
        {value}
      </p>
      <p className="mt-1 texto-quebra text-xs text-stone-500">{description}</p>

      {actionLabel && onAction ? (
        <button
          type="button"
          onClick={onAction}
          className="mt-4 rounded-full bg-stone-900 px-4 py-2 text-xs font-bold text-white transition hover:bg-stone-700"
        >
          {actionLabel}
        </button>
      ) : null}
    </article>
  );
}