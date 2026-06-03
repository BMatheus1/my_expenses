"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import { ApiError } from "../../lib/api";
import {
  getBillingStatus,
  syncBillingStatus,
} from "../../lib/billing-api";
import type { BillingStatusResponse } from "../../types/billing";
import { LoadingButton, Spinner } from "../../components/AppFeedback";

const MAX_SYNC_ATTEMPTS = 8;
const SYNC_RETRY_DELAY_MS = 2000;

type ReturnState =
  | "checking"
  | "pending"
  | "blocked"
  | "unauthenticated"
  | "error";

function wait(milliseconds: number) {
  return new Promise((resolve) => window.setTimeout(resolve, milliseconds));
}

export default function PaymentReturnPage() {
  const router = useRouter();
  const [returnState, setReturnState] = useState<ReturnState>("checking");
  const [billing, setBilling] = useState<BillingStatusResponse | null>(null);
  const [errorMessage, setErrorMessage] = useState("");
  const [attempt, setAttempt] = useState(1);
  const [isRetrying, setIsRetrying] = useState(false);

  const confirmSubscription = useCallback(async () => {
    setReturnState("checking");
    setErrorMessage("");

    for (let currentAttempt = 1; currentAttempt <= MAX_SYNC_ATTEMPTS; currentAttempt += 1) {
      setAttempt(currentAttempt);

      try {
        await syncBillingStatus();
        const loadedBilling = await getBillingStatus();
        setBilling(loadedBilling);

        if (loadedBilling.is_access_allowed) {
          router.replace("/app");
          return;
        }

        if (loadedBilling.status !== "pending") {
          setReturnState("blocked");
          return;
        }

        if (currentAttempt < MAX_SYNC_ATTEMPTS) {
          await wait(SYNC_RETRY_DELAY_MS);
        }
      } catch (error) {
        if (error instanceof ApiError && error.statusCode === 401) {
          setReturnState("unauthenticated");
          return;
        }

        setErrorMessage(
          error instanceof Error
            ? error.message
            : "Não foi possível confirmar sua assinatura agora.",
        );
        setReturnState("error");
        return;
      }
    }

    setReturnState("pending");
  }, [router]);

  useEffect(() => {
    void confirmSubscription();
  }, [confirmSubscription]);

  async function handleRetry() {
    setIsRetrying(true);

    try {
      await confirmSubscription();
    } finally {
      setIsRetrying(false);
    }
  }

  const showSpinner = returnState === "checking";
  const title =
    returnState === "unauthenticated"
      ? "Entre para confirmar assinatura"
      : returnState === "pending"
        ? "Assinatura em confirmação"
        : returnState === "blocked"
          ? "Assinatura não liberada"
          : returnState === "error"
            ? "Não foi possível confirmar"
            : "Verificando sua assinatura...";
  const description =
    returnState === "unauthenticated"
      ? "Para concluir a verificação, entre com a mesma conta usada no checkout."
      : returnState === "pending"
        ? "Sua assinatura ainda está sendo confirmada. Aguarde alguns instantes e tente novamente."
        : returnState === "blocked"
          ? billing?.message || "Ainda não encontramos uma assinatura ativa para esta conta."
          : returnState === "error"
            ? errorMessage
            : `Estamos preparando seu ambiente. Isso leva só alguns instantes. Tentativa ${attempt} de ${MAX_SYNC_ATTEMPTS}.`;

  return (
    <main className="flex min-h-screen items-center justify-center bg-[var(--app-bg)] px-4 py-6 text-[var(--app-text)]">
      <section className="w-full max-w-xl rounded-3xl border border-[var(--app-border)] bg-[var(--app-surface)] p-6 text-center shadow-sm">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-3xl bg-[var(--brand-soft)] text-[var(--brand-text)]">
          {showSpinner ? <Spinner className="h-6 w-6" /> : <span className="text-xl font-black">!</span>}
        </div>

        <p className="app-kicker mt-5">Mercado Pago</p>
        <h1 className="app-title mt-2 text-2xl font-black tracking-tight">
          {title}
        </h1>
        <p className="app-muted mt-3 text-sm leading-6">{description}</p>

        {returnState === "pending" || returnState === "error" ? (
          <div className="mt-6">
            <LoadingButton
              isLoading={isRetrying}
              loadingLabel="Verificando..."
              onClick={handleRetry}
              className="app-button-primary touch-button w-full justify-center"
            >
              Verificar novamente
            </LoadingButton>
          </div>
        ) : null}

        {returnState === "blocked" ? (
          <div className="mt-6">
            <button
              type="button"
              onClick={() => router.replace("/app")}
              className="app-button-primary touch-button w-full justify-center"
            >
              Voltar para assinatura
            </button>
          </div>
        ) : null}

        {returnState === "unauthenticated" ? (
          <div className="mt-6">
            <button
              type="button"
              onClick={() => router.replace("/app?auth=login")}
              className="app-button-primary touch-button w-full justify-center"
            >
              Entrar para confirmar assinatura
            </button>
          </div>
        ) : null}
      </section>
    </main>
  );
}
