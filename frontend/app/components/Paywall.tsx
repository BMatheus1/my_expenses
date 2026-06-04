"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import {
  cancelSubscription,
  createCheckout,
  getBillingStatus,
  syncBillingStatus,
} from "../lib/billing-api";
import { trackEvent } from "../lib/tracking";
import type { BillingStatusResponse } from "../types/billing";
import type { User } from "../types/auth";
import { BillingStatusCard } from "./BillingStatusCard";
import { LoadingButton } from "./AppFeedback";

type PaywallProps = {
  currentUser: User;
  billing: BillingStatusResponse;
  onBillingChange: (billing: BillingStatusResponse) => void;
  onLogout: () => void;
};

const BENEFITS = [
  "Controle financeiro pessoal e pequenos negócios.",
  "1 mês grátis para começar com calma.",
  "Depois R$ 8,99/mês em preço único.",
  "Sem anúncios e sem plano grátis permanente.",
  "Cancele quando quiser pelo Mercado Pago.",
  "Seus dados do app separados dos dados de pagamento.",
];

export function Paywall({
  currentUser,
  billing,
  onBillingChange,
  onLogout,
}: PaywallProps) {
  const router = useRouter();
  const [isProcessing, setIsProcessing] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const content = useMemo(() => {
    if (billing.status === "expired") {
      return {
        title: "Seu teste grátis terminou",
        description:
          "Seu teste grátis terminou ou sua assinatura ainda não foi ativada. Para continuar usando o My Expenses, confirme sua assinatura por R$ 8,99/mês após 1 mês grátis.",
        primaryLabel: "Assinar por R$ 8,99/mês",
      };
    }

    if (billing.status === "pending") {
      return {
        title: "Aguardando confirmação",
        description:
          "Estamos aguardando a confirmação da sua assinatura.",
        primaryLabel: "Abrir Mercado Pago",
      };
    }

    if (billing.status === "canceled") {
      return {
        title: "Assinatura cancelada",
        description:
          "Sua assinatura foi cancelada. Para voltar a usar o My Expenses completo, assine novamente por R$ 8,99/mês.",
        primaryLabel: "Assinar novamente",
      };
    }

    if (billing.status === "past_due") {
      return {
        title: "Regularize sua assinatura",
        description:
          "Há uma pendência no pagamento. Regularize pelo Mercado Pago para voltar a usar o app.",
        primaryLabel: "Regularizar assinatura",
      };
    }

    return {
      title: "Começar teste grátis",
      description:
        "Comece seu teste grátis de 1 mês. Depois, R$ 8,99/mês.",
      primaryLabel: "Começar teste grátis",
    };
  }, [billing.status]);

  useEffect(() => {
    trackEvent("subscription_screen_viewed", {
      status: billing.status,
    });
  }, [billing.status]);

  async function handleCheckout() {
    try {
      setIsProcessing(true);
      setErrorMessage("");
      trackEvent("checkout_started", {
        user_id: currentUser.id,
        status: billing.status,
      });

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
      setErrorMessage("");
      const updatedBilling = await cancelSubscription();
      onBillingChange(updatedBilling);
    } catch (error) {
      setErrorMessage(getBillingErrorMessage(error));
    } finally {
      setIsProcessing(false);
    }
  }

  async function handleVerifyPayment() {
    try {
      setIsProcessing(true);
      setErrorMessage("");
      await syncBillingStatus();
      const updatedBilling = await getBillingStatus();
      onBillingChange(updatedBilling);

      if (updatedBilling.is_access_allowed) {
        router.replace("/app");
      }
    } catch (error) {
      setErrorMessage(getBillingErrorMessage(error));
    } finally {
      setIsProcessing(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-[var(--app-bg)] px-4 py-6 text-[var(--app-text)]">
      <section className="w-full max-w-2xl rounded-3xl border border-[var(--app-border)] bg-[var(--app-surface)] p-5 shadow-sm sm:p-7">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="app-kicker">My Expenses</p>
            <h1 className="app-title mt-2 text-2xl font-black tracking-tight sm:text-3xl">
              {content.title}
            </h1>
          </div>

          <button
            type="button"
            onClick={onLogout}
            className="app-button-secondary touch-button shrink-0 rounded-2xl px-4 py-2 text-xs"
          >
            Sair
          </button>
        </div>

        <p className="app-muted mt-3 text-sm leading-6">
          {content.description}
        </p>

        <div className="mt-5 rounded-3xl border border-[var(--brand-border)] bg-[var(--brand-soft)] p-4 text-[var(--brand-text)]">
          <p className="text-sm font-black">
            1 mês grátis. Depois R$ 8,99/mês.
          </p>
          <p className="mt-1 text-xs font-semibold leading-5">
            Preço único, sem anúncios e com cancelamento quando quiser.
          </p>
        </div>

        <ul className="mt-5 grid gap-2 sm:grid-cols-2">
          {BENEFITS.map((benefit) => (
            <li
              key={benefit}
              className="rounded-2xl border border-[var(--app-border)] bg-[var(--app-surface-soft)] px-4 py-3 text-sm font-bold"
            >
              {benefit}
            </li>
          ))}
        </ul>

        <div className="mt-5">
          <BillingStatusCard
            billing={billing}
            onCheckout={handleCheckout}
            onCancel={handleCancel}
            isProcessing={isProcessing}
          />
        </div>

        {errorMessage ? (
          <p className="mt-4 rounded-2xl border border-red-100 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
            {errorMessage}
          </p>
        ) : null}

        <div className="mt-5">
          <LoadingButton
            isLoading={isProcessing}
            loadingLabel="Preparando..."
            onClick={handleCheckout}
            className="app-button-primary touch-button w-full justify-center"
          >
            {content.primaryLabel}
          </LoadingButton>
        </div>

        {billing.status === "pending" ? (
          <div className="mt-3">
            <LoadingButton
              isLoading={isProcessing}
              loadingLabel="Verificando..."
              onClick={handleVerifyPayment}
              className="app-button-secondary touch-button w-full justify-center"
            >
              Já confirmei, verificar assinatura
            </LoadingButton>
          </div>
        ) : null}
      </section>
    </main>
  );
}

function getBillingErrorMessage(error: unknown) {
  if (error instanceof Error) {
    return error.message || "Não conseguimos abrir a assinatura agora.";
  }

  return "Não conseguimos abrir a assinatura agora.";
}
