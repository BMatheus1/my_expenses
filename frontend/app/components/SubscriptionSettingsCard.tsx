"use client";

import { useMemo, useState } from "react";

import {
  cancelSubscription,
  createCheckout,
  getBillingStatus,
  syncBillingStatus,
} from "../lib/billing-api";
import type { BillingStatusResponse } from "../types/billing";
import { ConfirmModal } from "./ConfirmModal";

type SubscriptionSettingsCardProps = {
  billing: BillingStatusResponse;
  onBillingChange: (billing: BillingStatusResponse) => void;
};

const STATUS_LABELS: Record<BillingStatusResponse["status"], string> = {
  none: "Sem assinatura ativa",
  trialing: "Teste grátis ativo",
  active: "Assinatura ativa",
  pending: "Pagamento pendente",
  past_due: "Pagamento pendente",
  canceled: "Assinatura cancelada",
  expired: "Teste expirado",
  unknown: "Status em análise",
};

export function SubscriptionSettingsCard({
  billing,
  onBillingChange,
}: SubscriptionSettingsCardProps) {
  const [isCancelModalOpen, setIsCancelModalOpen] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [message, setMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  const canCancel = useMemo(
    () => ["active", "trialing", "pending"].includes(billing.status),
    [billing.status],
  );
  const canSubscribe = !canCancel;
  const primaryActionLabel =
    billing.status === "canceled" ? "Assinar novamente" : "Assinar";

  async function handleCheckout() {
    try {
      setIsProcessing(true);
      setMessage("");
      setErrorMessage("");

      const checkout = await createCheckout();
      window.location.href = checkout.checkout_url;
    } catch (error) {
      setErrorMessage(getBillingErrorMessage(error));
    } finally {
      setIsProcessing(false);
    }
  }

  async function handleCancel() {
    try {
      setIsProcessing(true);
      setMessage("");
      setErrorMessage("");

      await cancelSubscription();
      const updatedBilling = await getBillingStatus();
      onBillingChange(updatedBilling);
      setIsCancelModalOpen(false);
      setMessage("Sua assinatura foi cancelada.");
    } catch (error) {
      setErrorMessage(getBillingErrorMessage(error));
    } finally {
      setIsProcessing(false);
    }
  }

  async function handleVerifySubscription() {
    try {
      setIsProcessing(true);
      setMessage("");
      setErrorMessage("");

      await syncBillingStatus();
      const updatedBilling = await getBillingStatus();
      onBillingChange(updatedBilling);
      setMessage(
        updatedBilling.is_access_allowed
          ? "Sua assinatura foi confirmada."
          : "Ainda estamos aguardando a confirmação da sua assinatura.",
      );
    } catch (error) {
      setErrorMessage(getBillingErrorMessage(error));
    } finally {
      setIsProcessing(false);
    }
  }

  return (
    <section className="app-card rounded-3xl p-6">
      <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <p className="app-kicker">Assinatura</p>
          <h2 className="app-title mt-2 text-xl font-black tracking-tight">
            Minha assinatura
          </h2>
          <p className="app-muted mt-2 text-sm leading-6">
            Gerencie seu plano do My Expenses pelo Mercado Pago.
          </p>
        </div>

        <StatusBadge status={billing.status} />
      </div>

      <div className="mt-5 grid gap-3 sm:grid-cols-2">
        <InfoPill label="Plano" value={billing.plan_name} />
        <InfoPill label="Preço" value="R$ 8,99/mês" />
        <InfoPill label="Status atual" value={STATUS_LABELS[billing.status]} />
        {billing.trial_ends_at ? (
          <InfoPill
            label="Fim do teste"
            value={formatDate(billing.trial_ends_at)}
          />
        ) : null}
        {billing.current_period_ends_at ? (
          <InfoPill
            label="Próxima cobrança ou período"
            value={formatDate(billing.current_period_ends_at)}
          />
        ) : null}
      </div>

      {billing.status === "canceled" ? (
        <p className="app-muted mt-4 rounded-3xl border border-[var(--app-border)] bg-[var(--app-surface-soft)] px-4 py-3 text-sm font-bold">
          Sua assinatura foi cancelada.
        </p>
      ) : null}

      {message ? (
        <p className="mt-4 rounded-3xl border border-emerald-100 bg-emerald-50 px-4 py-3 text-sm font-bold text-emerald-800">
          {message}
        </p>
      ) : null}

      {errorMessage ? (
        <p className="mt-4 rounded-3xl border border-red-100 bg-red-50 px-4 py-3 text-sm font-bold text-red-700">
          {errorMessage}
        </p>
      ) : null}

      <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:justify-end">
        {billing.status === "pending" ? (
          <button
            type="button"
            onClick={handleVerifySubscription}
            disabled={isProcessing}
            className="app-button-secondary touch-button w-full justify-center sm:w-auto"
          >
            {isProcessing ? "Verificando..." : "Verificar assinatura"}
          </button>
        ) : null}

        {canSubscribe ? (
          <button
            type="button"
            onClick={handleCheckout}
            disabled={isProcessing}
            className="app-button-primary touch-button w-full justify-center sm:w-auto"
          >
            {isProcessing ? "Preparando..." : primaryActionLabel}
          </button>
        ) : null}

        {canCancel ? (
          <button
            type="button"
            onClick={() => setIsCancelModalOpen(true)}
            disabled={isProcessing}
            className="touch-button w-full justify-center rounded-2xl border border-red-200 px-5 py-3 text-sm font-black text-red-700 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
          >
            Cancelar assinatura
          </button>
        ) : null}
      </div>

      <ConfirmModal
        isOpen={isCancelModalOpen}
        title="Cancelar assinatura?"
        description="Você está prestes a cancelar sua assinatura do My Expenses. Seu acesso aos recursos pagos poderá ser interrompido após o cancelamento."
        confirmLabel="Cancelar assinatura"
        cancelLabel="Manter assinatura"
        loadingLabel="Cancelando..."
        variant="danger"
        isLoading={isProcessing}
        onConfirm={handleCancel}
        onCancel={() => {
          if (!isProcessing) {
            setIsCancelModalOpen(false);
          }
        }}
      />
    </section>
  );
}

function InfoPill({ label, value }: { label: string; value: string }) {
  return (
    <div className="app-card-soft min-w-0 rounded-3xl p-4">
      <p className="app-muted text-xs font-bold uppercase tracking-wide">
        {label}
      </p>
      <p className="app-title mt-1 break-words text-sm font-black">{value}</p>
    </div>
  );
}

function StatusBadge({ status }: { status: BillingStatusResponse["status"] }) {
  const isPositive = status === "active" || status === "trialing";

  return (
    <span
      className={`w-fit rounded-full px-3 py-2 text-xs font-black ${
        isPositive
          ? "border border-emerald-200 bg-emerald-50 text-emerald-700"
          : "border border-[var(--app-border)] bg-[var(--app-surface-soft)] text-[var(--app-text-soft)]"
      }`}
    >
      {STATUS_LABELS[status]}
    </span>
  );
}

function formatDate(value: string) {
  return new Date(value).toLocaleDateString("pt-BR");
}

function getBillingErrorMessage(error: unknown) {
  if (error instanceof Error && error.message) {
    return error.message;
  }

  return "Não foi possível cancelar agora. Tente novamente em alguns instantes.";
}
