"use client";

import { useEffect, useMemo, useState } from "react";

import {
  disableSmartNotificationsForUser,
  enableSmartNotificationsForUser,
  getSmartNotificationPermissionStatus,
  isNativeNotificationRuntime,
  readSmartNotificationPreferences,
  SMART_NOTIFICATIONS_CHANGED_EVENT,
  type SmartNotificationPermissionStatus,
  type SmartNotificationPreferences,
} from "../lib/notification-service";
import type { User } from "../types/auth";

type NotificationSettingsPanelProps = {
  currentUser: User;
};

const PERMISSION_LABELS: Record<SmartNotificationPermissionStatus, string> = {
  granted: "Permissão concedida",
  denied: "Permissão bloqueada",
  prompt: "Permissão pendente",
  unavailable: "Disponível no app Android",
};

export function NotificationSettingsPanel({
  currentUser,
}: NotificationSettingsPanelProps) {
  const [preferences, setPreferences] = useState<SmartNotificationPreferences>(
    () => readSmartNotificationPreferences(currentUser.id),
  );
  const [permissionStatus, setPermissionStatus] =
    useState<SmartNotificationPermissionStatus>("unavailable");
  const [isProcessing, setIsProcessing] = useState(false);
  const [feedbackMessage, setFeedbackMessage] = useState("");

  const isNativeRuntime = isNativeNotificationRuntime();
  const notificationsAreActive =
    isNativeRuntime && preferences.enabled && permissionStatus === "granted";

  const statusCopy = useMemo(() => {
    if (!isNativeRuntime) {
      return {
        label: "Prévia web",
        description:
          "As notificações aparecem no Android instalado. Na web, esta área serve apenas para visualizar a experiência.",
      };
    }

    if (notificationsAreActive) {
      return {
        label: "Notificações ativadas",
        description:
          "O My Expenses vai enviar lembretes leves de gastos e fatura neste aparelho.",
      };
    }

    if (permissionStatus === "denied") {
      return {
        label: "Notificações desativadas",
        description:
          "A permissão está bloqueada no Android. Ative nas configurações do app para receber lembretes.",
      };
    }

    return {
      label: "Notificações desativadas",
      description:
        "Ative para receber lembretes amigáveis sem excesso de alertas.",
    };
  }, [isNativeRuntime, notificationsAreActive, permissionStatus]);

  useEffect(() => {
    setPreferences(readSmartNotificationPreferences(currentUser.id));
    void refreshStatus();
  }, [currentUser.id]);

  useEffect(() => {
    function handleNotificationSettingsChange() {
      setPreferences(readSmartNotificationPreferences(currentUser.id));
      void refreshStatus();
    }

    window.addEventListener(
      SMART_NOTIFICATIONS_CHANGED_EVENT,
      handleNotificationSettingsChange,
    );

    return () => {
      window.removeEventListener(
        SMART_NOTIFICATIONS_CHANGED_EVENT,
        handleNotificationSettingsChange,
      );
    };
  }, [currentUser.id]);

  async function refreshStatus() {
    const nextPermissionStatus = await getSmartNotificationPermissionStatus();
    setPermissionStatus(nextPermissionStatus);
  }

  async function handleEnableNotifications() {
    setIsProcessing(true);
    setFeedbackMessage("");

    try {
      const nextPermissionStatus = await enableSmartNotificationsForUser(
        currentUser.id,
      );

      setPermissionStatus(nextPermissionStatus);
      setPreferences(readSmartNotificationPreferences(currentUser.id));

      if (nextPermissionStatus === "granted") {
        setFeedbackMessage(
          "Pronto. As notificações estão ativadas com lembretes leves e sem excesso.",
        );
      } else if (nextPermissionStatus === "denied") {
        setFeedbackMessage(
          "O Android bloqueou a permissão. Para ativar, libere notificações nas configurações do app.",
        );
      } else {
        setFeedbackMessage(
          "Não foi possível ativar as notificações neste ambiente.",
        );
      }
    } finally {
      setIsProcessing(false);
      void refreshStatus();
    }
  }

  async function handleDisableNotifications() {
    setIsProcessing(true);
    setFeedbackMessage("");

    try {
      await disableSmartNotificationsForUser(currentUser.id);
      setPreferences(readSmartNotificationPreferences(currentUser.id));
      setFeedbackMessage("Notificações desativadas neste aparelho.");
    } finally {
      setIsProcessing(false);
      void refreshStatus();
    }
  }

  return (
    <section className="app-card overflow-hidden rounded-3xl">
      <div className="soft-header-gradient p-5 sm:p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <p className="app-kicker">Notificações</p>

            <h2 className="app-title mt-2 text-2xl font-black tracking-tight">
              Lembretes inteligentes
            </h2>

            <p className="app-muted mt-2 max-w-2xl text-sm leading-6">
              Uma rotina simples: lembrete da tarde, fechamento do dia e alerta
              de fatura. Sem mensagens repetitivas, sem tom de cobrança.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <span
              className={`rounded-full px-3 py-1 text-xs font-black ${
                notificationsAreActive
                  ? "app-brand-soft"
                  : "border"
              }`}
              style={{
                borderColor: notificationsAreActive
                  ? undefined
                  : "var(--app-border)",
                color: notificationsAreActive
                  ? undefined
                  : "var(--app-text-soft)",
              }}
            >
              {statusCopy.label}
            </span>

            <span
              className="rounded-full border px-3 py-1 text-xs font-bold"
              style={{
                borderColor: "var(--app-border)",
                color: "var(--app-text-soft)",
              }}
            >
              {PERMISSION_LABELS[permissionStatus]}
            </span>
          </div>
        </div>
      </div>

      <div className="space-y-4 p-5 sm:p-6">
        <div className="app-card-soft rounded-3xl p-5">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0">
              <h3 className="app-title text-lg font-black">
                {statusCopy.label}
              </h3>

              <p className="app-muted mt-1 text-sm leading-6">
                {statusCopy.description}
              </p>
            </div>

            <NotificationSwitch
              checked={notificationsAreActive}
              disabled={!isNativeRuntime || isProcessing}
              onChange={(checked) => {
                if (checked) {
                  void handleEnableNotifications();
                  return;
                }

                void handleDisableNotifications();
              }}
            />
          </div>
        </div>

        <div className="grid gap-3 md:grid-cols-3">
          <NotificationInfoCard
            title="14:30"
            description="Lembrete rápido para registrar gastos do dia."
            isActive={notificationsAreActive}
          />

          <NotificationInfoCard
            title="20:00"
            description="Fechamento leve para anotar o que faltou."
            isActive={notificationsAreActive}
          />

          <NotificationInfoCard
            title="Fatura"
            description="Aviso amigável 3 dias antes do vencimento."
            isActive={notificationsAreActive}
          />
        </div>

        {!isNativeRuntime ? (
          <div className="app-card-soft rounded-3xl p-4">
            <h3 className="app-title text-sm font-black">
              Disponível no app instalado
            </h3>

            <p className="app-muted mt-1 text-sm leading-6">
              As notificações locais aparecem direto no Android. Na web, esta
              área fica apenas como prévia da configuração mobile.
            </p>
          </div>
        ) : null}

        {permissionStatus === "denied" ? (
          <div className="rounded-3xl border border-amber-200 bg-amber-50 p-4 text-sm font-semibold text-amber-900 dark:border-amber-900/40 dark:bg-amber-950/30 dark:text-amber-100">
            O Android bloqueou as notificações. Abra as configurações do app no
            celular e permita notificações para o My Expenses.
          </div>
        ) : null}

        {feedbackMessage ? (
          <p
            className="app-muted rounded-3xl border px-4 py-3 text-sm font-semibold"
            style={{ borderColor: "var(--app-border)" }}
          >
            {feedbackMessage}
          </p>
        ) : null}
      </div>
    </section>
  );
}

function NotificationInfoCard({
  title,
  description,
  isActive,
}: {
  title: string;
  description: string;
  isActive: boolean;
}) {
  return (
    <article className="app-card-soft rounded-3xl p-4">
      <div className="flex items-start justify-between gap-3">
        <strong className="app-title block text-lg font-black">{title}</strong>

        <span
          className={`rounded-full px-2.5 py-1 text-[0.65rem] font-black uppercase tracking-[0.16em] ${
            isActive ? "app-brand-soft" : ""
          }`}
          style={
            isActive
              ? undefined
              : {
                  backgroundColor: "var(--app-surface-muted)",
                  color: "var(--app-text-soft)",
                }
          }
        >
          {isActive ? "Ativo" : "Pausado"}
        </span>
      </div>

      <p className="app-muted mt-1 text-sm leading-6">{description}</p>
    </article>
  );
}

function NotificationSwitch({
  checked,
  disabled,
  onChange,
}: {
  checked: boolean;
  disabled: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      disabled={disabled}
      className="group flex shrink-0 items-center gap-3 rounded-full border px-3 py-2 text-sm font-black transition disabled:cursor-not-allowed disabled:opacity-55"
      style={{
        backgroundColor: checked ? "rgba(16, 185, 129, 0.14)" : "var(--app-surface)",
        borderColor: checked ? "rgba(16, 185, 129, 0.45)" : "var(--app-border)",
        color: checked ? "rgb(5, 150, 105)" : "var(--app-text-soft)",
      }}
      aria-pressed={checked}
      aria-label={checked ? "Desativar notificações" : "Ativar notificações"}
    >
      <span>{checked ? "Ligado" : "Desligado"}</span>

      <span
        className={`relative h-8 w-16 rounded-full border transition ${
          checked ? "app-brand-gradient shadow-lg" : ""
        }`}
        style={{
          backgroundColor: checked ? undefined : "var(--app-surface-muted)",
          borderColor: checked ? "transparent" : "var(--app-border)",
          boxShadow: checked ? "0 12px 30px rgba(16, 185, 129, 0.35)" : undefined,
        }}
        aria-hidden="true"
      >
        <span
          className={`absolute top-1 h-6 w-6 rounded-full bg-white shadow-md transition-transform duration-200 ${
            checked ? "translate-x-9" : "translate-x-1"
          }`}
        />
      </span>
    </button>
  );
}
