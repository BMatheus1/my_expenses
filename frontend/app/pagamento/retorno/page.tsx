"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import { ApiError } from "../../lib/api";
import {
  getBillingStatus,
  syncBillingStatus,
} from "../../lib/billing-api";
import {
  getCurrentPathWithSearch,
  savePostAuthRedirect,
} from "../../lib/post-auth-redirect";
import { trackEvent } from "../../lib/tracking";
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
  const [errorMessage, setErrorMessage] = useState("");
  const [attempt, setAttempt] = useState(1);
  const [isRetrying, setIsRetrying] = useState(false);

  const confirmSubscription = useCallback(async () => {
    setReturnState("checking");
    setErrorMessage("");
    trackEvent("payment_return_accessed", {
      authenticated: true,
    });

    for (let currentAttempt = 1; currentAttempt <= MAX_SYNC_ATTEMPTS; currentAttempt += 1) {
      setAttempt(currentAttempt);

      try {
        trackEvent("payment_return_sync_called", {
          sync_called: true,
          attempt: currentAttempt,
        });
        await syncBillingStatus();
        const loadedBilling = await getBillingStatus();
        trackEvent("payment_return_sync_result", {
          provider_subscription_id_present: Boolean(
            loadedBilling.provider_subscription_id,
          ),
          internal_status: loadedBilling.status,
          is_access_allowed: loadedBilling.is_access_allowed,
        });

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
          savePostAuthRedirect(getCurrentPathWithSearch());
          trackEvent("payment_return_auth_required", {
            authenticated: false,
            redirect_saved: true,
            sync_called: true,
          });
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

  function handleLoginRedirect() {
    savePostAuthRedirect(getCurrentPathWithSearch());
    router.replace("/app?auth=login&focus=auth");
  }

  const showSpinner = returnState === "checking";
  const title =
    returnState === "unauthenticated"
      ? "Entre novamente"
      : returnState === "pending"
        ? "Assinatura em confirmação"
        : returnState === "blocked"
          ? "Não conseguimos confirmar"
          : returnState === "error"
            ? "Não foi possível confirmar"
            : "Verificando sua assinatura...";
  const description =
    returnState === "unauthenticated"
      ? "Entre novamente para concluir a ativação da sua assinatura."
      : returnState === "pending"
        ? "Sua assinatura ainda está sendo confirmada. Isso pode levar alguns instantes."
        : returnState === "blocked"
          ? "Não conseguimos confirmar sua assinatura ainda."
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

        {returnState === "pending" ||
        returnState === "error" ||
        returnState === "blocked" ? (
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
          <div className="mt-3">
            <button
              type="button"
              onClick={() => router.replace("/app")}
              className="app-button-secondary touch-button w-full justify-center"
            >
              Tentar assinatura novamente
            </button>
          </div>
        ) : null}

        {returnState === "unauthenticated" ? (
          <div className="mt-6">
            <button
              type="button"
              onClick={handleLoginRedirect}
              className="app-button-primary touch-button w-full justify-center"
            >
              Entrar
            </button>
          </div>
        ) : null}
      </section>
    </main>
  );
}
