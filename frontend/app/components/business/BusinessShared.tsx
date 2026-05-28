import type { ReactNode } from "react";

import { WheelSelect } from "../WheelSelect";

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
      <span className="mb-1.5 block truncate text-sm font-bold app-text-soft">
        {label}
      </span>
      <input
        type={type}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        inputMode={inputMode}
        required={required}
        className="app-input text-sm"
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
      <span className="mb-1.5 block truncate text-sm font-bold app-text-soft">
        {label}
      </span>
      <textarea
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        rows={3}
        className="app-input min-h-28 resize-none text-sm"
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
  const normalizedOptions = options.map((option) =>
    typeof option === "string" ? { label: option, value: option } : option,
  );

  const wheelOptions = placeholder
    ? [{ label: placeholder, value: "" }, ...normalizedOptions]
    : normalizedOptions;

  return (
    <div className="block min-w-0">
      <span className="mb-1.5 block truncate text-sm font-bold app-text-soft">
        {label}
      </span>

      <WheelSelect
        value={value}
        onChange={onChange}
        options={wheelOptions}
        title={label}
        size="sm"
      />
    </div>
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
      className="app-button-primary touch-button w-full rounded-2xl px-5 py-3 text-sm disabled:cursor-not-allowed disabled:opacity-60"
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
      className="app-button-secondary touch-button w-full rounded-2xl px-5 py-3 text-sm"
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
      className="touch-button w-full rounded-2xl bg-red-600 px-5 py-3 text-sm font-black text-white transition hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-60"
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
          ? "app-brand-soft"
          : "border-red-200 bg-red-50 text-red-700"
      }`}
    >
      <span className="texto-quebra">{message}</span>
      <button type="button" onClick={onClose} className="shrink-0 font-black">
        Fechar
      </button>
    </div>
  );
}

export function EmptyList({ message }: { message: string }) {
  return (
    <div className="rounded-2xl p-4 text-sm app-card-soft app-muted">
      {message}
    </div>
  );
}

export function EmptyBusinessState({ onCreate }: { onCreate: () => void }) {
  return (
    <SectionCard>
      <div className="text-center">
        <p className="app-kicker">Meus Negócios</p>
        <h1 className="app-title mt-2 text-2xl font-black tracking-tight">
          Crie seu primeiro negócio
        </h1>
        <p className="app-muted mx-auto mt-2 max-w-xl text-sm leading-6">
          Controle materiais, fichas de custo, vendas, lucro bruto e capacidade
          de produção por serviço ou produto.
        </p>
        <button
          type="button"
          onClick={onCreate}
          className="app-button-primary touch-button mt-6 rounded-2xl px-5 py-3 text-sm"
        >
          Criar novo negócio
        </button>
      </div>
    </SectionCard>
  );
}

export function SectionCard({ children }: { children: ReactNode }) {
  return <section className="app-card min-w-0 rounded-3xl p-6">{children}</section>;
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-stone-950/50 p-4 backdrop-blur-sm">
      <div className="app-card max-h-[90vh] w-full max-w-xl overflow-y-auto rounded-3xl p-6 shadow-xl">
        <div className="mb-5 flex items-center justify-between gap-4">
          <h2 className="texto-quebra text-xl font-black app-title">{title}</h2>

          <button
            type="button"
            onClick={onClose}
            className="app-btn app-btn-soft rounded-full px-3 py-2 text-sm"
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
    success: "app-brand-soft",
    danger: "bg-red-100 text-red-700",
    neutral: "app-card-soft app-muted",
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
    <div className="min-w-0 rounded-2xl px-3 py-2 app-card-soft">
      <p className="texto-quebra text-xs font-black uppercase app-muted">
        {label}
      </p>
      <p className="mt-1 texto-quebra text-sm font-bold app-text-soft">
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
    <article className="app-card min-w-0 rounded-3xl p-5">
      <p className="truncate text-sm font-bold app-muted">{label}</p>
      <p className="mt-2 texto-quebra text-2xl font-black tracking-tight app-title">
        {value}
      </p>
      {hint ? (
        <p className="mt-1 texto-quebra text-xs font-semibold app-muted">
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
    <article className="app-card min-w-0 rounded-3xl p-4">
      <p className="truncate text-sm font-bold app-muted">{title}</p>
      <p className="mt-2 texto-quebra text-2xl font-black app-title">
        {value}
      </p>
      <p className="mt-1 texto-quebra text-xs app-muted">{description}</p>

      {actionLabel && onAction ? (
        <button
          type="button"
          onClick={onAction}
          className="app-btn app-btn-soft mt-4 rounded-full px-4 py-2 text-xs"
        >
          {actionLabel}
        </button>
      ) : null}
    </article>
  );
}
