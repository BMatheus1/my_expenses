"use client";

import type { ReactNode } from "react";

type FeedbackActionProps = {
  label: string;
  onClick: () => void;
};

type FeedbackCardProps = {
  title: string;
  description: string;
  icon?: ReactNode;
  action?: FeedbackActionProps;
  variant?: "default" | "error" | "success";
};

type LoadingButtonProps = {
  type?: "button" | "submit" | "reset";
  isLoading: boolean;
  loadingLabel?: string;
  disabled?: boolean;
  className?: string;
  children: ReactNode;
  onClick?: () => void;
};

export function PageLoading({
  title = "Carregando...",
  description = "Preparando tudo para você.",
}: {
  title?: string;
  description?: string;
}) {
  return (
    <main className="flex min-h-screen items-center justify-center bg-stone-50 px-4">
      <div className="w-full max-w-sm rounded-3xl border border-stone-200 bg-white p-6 text-center shadow-sm">
        <Spinner className="mx-auto h-9 w-9" />

        <h1 className="mt-5 text-lg font-black text-stone-950">{title}</h1>

        <p className="mt-2 text-sm leading-6 text-stone-500">
          {description}
        </p>
      </div>
    </main>
  );
}

export function LoadingCard({
  title = "Carregando...",
  description = "Buscando as informações.",
}: {
  title?: string;
  description?: string;
}) {
  return (
    <div className="rounded-3xl border border-stone-200 bg-white p-8 text-center shadow-sm">
      <Spinner className="mx-auto h-8 w-8" />

      <h2 className="mt-5 text-base font-black text-stone-950">{title}</h2>

      <p className="mt-2 text-sm leading-6 text-stone-500">{description}</p>
    </div>
  );
}

export function EmptyState({
  title,
  description,
  action,
  icon,
}: FeedbackCardProps) {
  return (
    <FeedbackCard
      title={title}
      description={description}
      action={action}
      icon={icon ?? <span>＋</span>}
      variant="default"
    />
  );
}

export function ErrorState({
  title,
  description,
  action,
  icon,
}: FeedbackCardProps) {
  return (
    <FeedbackCard
      title={title}
      description={description}
      action={action}
      icon={icon ?? <span>!</span>}
      variant="error"
    />
  );
}

export function ConnectionErrorState({
  onRetry,
}: {
  onRetry: () => void;
}) {
  const isOffline =
    typeof navigator !== "undefined" && navigator.onLine === false;

  return (
    <ErrorState
      title={isOffline ? "Você está sem internet" : "API fora do ar"}
      description={
        isOffline
          ? "Verifique sua conexão e tente novamente."
          : "Não foi possível conectar ao servidor agora. A API pode estar iniciando ou temporariamente indisponível."
      }
      action={{
        label: "Tentar novamente",
        onClick: onRetry,
      }}
    />
  );
}

export function LoadingButton({
  type = "button",
  isLoading,
  loadingLabel = "Aguarde...",
  disabled,
  className = "app-button-primary w-full",
  children,
  onClick,
}: LoadingButtonProps) {
  return (
    <button
      type={type}
      disabled={disabled || isLoading}
      onClick={onClick}
      className={`${className} disabled:cursor-not-allowed disabled:opacity-70`}
    >
      {isLoading ? (
        <span className="inline-flex items-center justify-center gap-2">
          <Spinner className="h-4 w-4" />
          <span>{loadingLabel}</span>
        </span>
      ) : (
        children
      )}
    </button>
  );
}

export function Spinner({ className = "h-5 w-5" }: { className?: string }) {
  return (
    <span
      className={`inline-block animate-spin rounded-full border-2 border-current border-t-transparent ${className}`}
      aria-hidden="true"
    />
  );
}

function FeedbackCard({
  title,
  description,
  action,
  icon,
  variant = "default",
}: FeedbackCardProps) {
  const variantClass =
    variant === "error"
      ? "border-red-100 bg-red-50 text-red-700"
      : variant === "success"
        ? "border-emerald-100 bg-emerald-50 text-emerald-700"
        : "border-stone-200 bg-white text-stone-700";

  return (
    <div className={`rounded-3xl border p-8 text-center shadow-sm ${variantClass}`}>
      <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-white text-xl font-black shadow-sm">
        {icon}
      </div>

      <h2 className="mt-5 text-lg font-black text-stone-950">{title}</h2>

      <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-stone-500">
        {description}
      </p>

      {action ? (
        <button
          type="button"
          onClick={action.onClick}
          className="app-button-primary mx-auto mt-5 w-full sm:w-auto"
        >
          {action.label}
        </button>
      ) : null}
    </div>
  );
}