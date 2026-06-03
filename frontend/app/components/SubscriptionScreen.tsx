"use client";

import { useEffect, useMemo, useState } from "react";

import {
  createSubscriptionCheckout,
} from "../lib/api";
import { trackEvent } from "../lib/tracking";
import type { SubscriptionStatusResponse } from "../types/subscription";
import type { User } from "../types/auth";
import { LoadingButton } from "./AppFeedback";

type SubscriptionScreenProps = {
  currentUser: User;
  subscription: SubscriptionStatusResponse;
  onSubscriptionChange: (subscription: SubscriptionStatusResponse) => void;
  onLogout: () => void;
};

const BENEFITS = [
  "Registre gastos em segundos.",
  "Feche o dia quando esquecer.",
  "Entenda seu mês com relatórios simples.",
  "Controle cartões, ganhos e gastos.",
  "Use também para pequenos negócios.",
  "Sem anúncios. Cancele quando quiser.",
];

export function SubscriptionScreen({
  currentUser,
  subscription,
  onLogout,
}: SubscriptionScreenProps) {
  const [isStartingCheckout, setIsStartingCheckout] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const isTrialExpired = subscription.status === "trial_expired";
  const isPastDue = subscription.status === "past_due";

  const content = useMemo(() => {
    if (isTrialExpired) {
      return {
        title: "Seu teste grátis terminou",
        description:
          "Para continuar usando o My Expenses, ative sua assinatura por R$ 8,99/mês.",
        primaryLabel: "Assinar por R$ 8,99/mês",
        reflection:
          "Controle financeiro não precisa ser perfeito. Precisa ser possível de manter.",
      };
    }

    if (isPastDue) {
      return {
        title: "Regularize sua assinatura",
        description:
          "Há uma pendência no pagamento. Consulte o Mercado Pago para continuar usando o app.",
        primaryLabel: "Regularizar assinatura",
        reflection:
          "Seu controle financeiro não precisa depender da memória.",
      };
    }

    return {
      title: "Comece seu teste grátis",
      description:
        "Use o My Expenses completo por 30 dias. Depois, R$ 8,99/mês.",
      primaryLabel: "Começar 30 dias grátis",
      reflection:
        "Se pequenos gastos somam sem você perceber, ter clareza pode custar menos que um lanche por mês.",
    };
  }, [isPastDue, isTrialExpired]);

  useEffect(() => {
    trackEvent("subscription_screen_viewed", {
      status: subscription.status,
    });

    if (subscription.status === "trial_expired") {
      trackEvent("trial_expired_viewed");
    }
  }, [subscription.status]);

  async function handleCheckout() {
    try {
      setErrorMessage("");
      setIsStartingCheckout(true);
      trackEvent("checkout_started", {
        user_id: currentUser.id,
        status: subscription.status,
      });

      const checkout = await createSubscriptionCheckout();
      window.location.href = checkout.checkout_url;
    } catch (error) {
      setErrorMessage(getSubscriptionErrorMessage(error));
    } finally {
      setIsStartingCheckout(false);
    }
  }

  const isLoading = isStartingCheckout;

  return (
    <main className="flex min-h-screen items-center justify-center bg-[var(--app-bg)] px-4 py-6 text-[var(--app-text)]">
      <section className="w-full max-w-xl rounded-3xl border border-[var(--app-border)] bg-[var(--app-surface)] p-5 shadow-sm sm:p-7">
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
            Anote rápido. Feche o dia. Entenda seu mês.
          </p>
          <p className="mt-1 text-xs font-semibold leading-5">
            Sem anúncios. Cancele quando quiser.
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

        <p className="app-muted mt-5 rounded-2xl bg-[var(--app-surface-soft)] px-4 py-3 text-sm font-semibold leading-6">
          {content.reflection}
        </p>

        {errorMessage ? (
          <p className="mt-4 rounded-2xl border border-red-100 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
            {errorMessage}
          </p>
        ) : null}

        <div className="mt-5">
          <LoadingButton
            isLoading={isLoading}
            loadingLabel="Preparando..."
            onClick={handleCheckout}
            className="app-button-primary touch-button w-full justify-center"
          >
            {content.primaryLabel}
          </LoadingButton>
        </div>
      </section>
    </main>
  );
}

function getSubscriptionErrorMessage(error: unknown) {
  if (error instanceof Error) {
    return error.message || "Não conseguimos abrir a assinatura agora.";
  }

  return "Não conseguimos abrir a assinatura agora.";
}
