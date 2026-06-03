import type { BillingStatusResponse } from "../types/billing";

type BillingStatusCardProps = {
  billing: BillingStatusResponse;
  onCheckout: () => void;
  onCancel: () => void;
  isProcessing: boolean;
};

const STATUS_LABELS: Record<BillingStatusResponse["status"], string> = {
  trialing: "Teste grátis ativo",
  active: "Assinatura ativa",
  pending: "Pagamento pendente",
  past_due: "Pagamento pendente",
  canceled: "Assinatura cancelada",
  expired: "Teste expirado",
  unknown: "Status em análise",
};

export function BillingStatusCard({
  billing,
  onCheckout,
  onCancel,
  isProcessing,
}: BillingStatusCardProps) {
  const finalDate = billing.trial_ends_at || billing.current_period_ends_at;

  return (
    <section className="rounded-3xl border border-[var(--app-border)] bg-[var(--app-surface-soft)] p-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="app-kicker">Assinatura</p>
          <h2 className="mt-1 text-lg font-black">
            {STATUS_LABELS[billing.status]}
          </h2>
          <p className="app-muted mt-2 text-sm leading-6">
            {billing.message}
          </p>
          {finalDate ? (
            <p className="app-muted mt-2 text-xs font-bold">
              {billing.status === "trialing" ? "Teste até" : "Período até"}{" "}
              {new Date(finalDate).toLocaleDateString("pt-BR")}
            </p>
          ) : null}
        </div>

        <div className="flex shrink-0 flex-col gap-2 sm:min-w-44">
          {!billing.is_access_allowed ? (
            <button
              type="button"
              onClick={onCheckout}
              disabled={isProcessing}
              className="app-button-primary touch-button justify-center text-sm"
            >
              Assinar
            </button>
          ) : null}

          {billing.can_cancel ? (
            <button
              type="button"
              onClick={onCancel}
              disabled={isProcessing}
              className="app-button-secondary touch-button justify-center text-sm"
            >
              Cancelar
            </button>
          ) : null}
        </div>
      </div>
    </section>
  );
}
