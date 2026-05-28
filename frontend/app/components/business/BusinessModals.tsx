"use client";

import { Capacitor } from "@capacitor/core";
import { type FormEvent, useEffect, useRef, useState } from "react";

import { TIPOS_NEGOCIO } from "./businessConstants";
import type {
  BusinessFormState,
  DeleteBusinessMode,
  GoogleCredentialResponse,
} from "./businessTypes";
import {
  DangerButton,
  InputField,
  Modal,
  PrimaryButton,
  SecondaryButton,
  SelectField,
  TextareaField,
} from "./BusinessShared";
import {
  getErrorMessage,
  getGoogleIdentityService,
  loadGoogleScript,
} from "./businessUtils";

const GOOGLE_SCOPES = ["email", "profile"] as const;

let nativeGoogleInitializePromise: Promise<void> | null = null;

type NativeGoogleLoginResult = {
  provider?: string;
  result?: {
    idToken?: string | null;
    responseType?: "online" | "offline";
    profile?: {
      email?: string | null;
      name?: string | null;
      imageUrl?: string | null;
    };
  };
};

export function EditBusinessModal({
  form,
  saving,
  onChange,
  onClose,
  onSubmit,
}: {
  form: BusinessFormState;
  saving: boolean;
  onChange: (form: BusinessFormState) => void;
  onClose: () => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
}) {
  return (
    <Modal title="Editar negócio" onClose={onClose}>
      <form onSubmit={onSubmit} className="space-y-4">
        <InputField
          label="Nome do negócio"
          value={form.name}
          onChange={(value) => onChange({ ...form, name: value })}
          required
        />

        <SelectField
          label="Tipo"
          value={form.type}
          onChange={(value) => onChange({ ...form, type: value })}
          options={TIPOS_NEGOCIO}
        />

        <TextareaField
          label="Descrição"
          value={form.description}
          onChange={(value) => onChange({ ...form, description: value })}
        />

        <div className="flex flex-col gap-3 sm:flex-row">
          <SecondaryButton type="button" onClick={onClose}>
            Cancelar
          </SecondaryButton>

          <PrimaryButton disabled={saving}>
            {saving ? "Salvando..." : "Salvar alterações"}
          </PrimaryButton>
        </div>
      </form>
    </Modal>
  );
}

export function DeleteBusinessModal({
  businessName,
  mode,
  password,
  saving,
  googleEnabled,
  onModeChange,
  onPasswordChange,
  onClose,
  onSubmitPassword,
  onGoogleCredential,
}: {
  businessName: string;
  mode: DeleteBusinessMode;
  password: string;
  saving: boolean;
  googleEnabled: boolean;
  onModeChange: (mode: DeleteBusinessMode) => void;
  onPasswordChange: (value: string) => void;
  onClose: () => void;
  onSubmitPassword: (event: FormEvent<HTMLFormElement>) => void;
  onGoogleCredential: (credential: string) => void;
}) {
  return (
    <Modal title="Excluir negócio" onClose={onClose}>
      <div className="space-y-5">
        <div className="rounded-3xl border border-red-200 bg-red-50 p-4 dark:border-red-500/25 dark:bg-red-500/10">
          <p className="texto-quebra text-sm font-bold text-red-800 dark:text-red-100">
            Você está prestes a excluir o negócio{" "}
            <span className="font-black">{businessName}</span>.
          </p>

          <p className="mt-2 texto-quebra text-sm text-red-700 dark:text-red-200/85">
            Essa ação remove materiais, serviços, fichas e vendas desse negócio.
            Para sua segurança, confirme com senha ou conta Google.
          </p>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <DeleteModeButton
            isActive={mode === "password"}
            title="Senha"
            description="Use a senha da conta"
            onClick={() => onModeChange("password")}
          />

          <DeleteModeButton
            isActive={mode === "google"}
            title="Google"
            description="Confirme com sua conta"
            onClick={() => onModeChange("google")}
          />
        </div>

        {mode === "password" ? (
          <form onSubmit={onSubmitPassword} className="space-y-4">
            <InputField
              label="Digite sua senha"
              type="password"
              value={password}
              onChange={onPasswordChange}
              required
            />

            <div className="flex flex-col gap-3 sm:flex-row">
              <SecondaryButton type="button" onClick={onClose}>
                Cancelar
              </SecondaryButton>

              <DangerButton type="submit" disabled={saving}>
                {saving ? "Excluindo..." : "Excluir negócio"}
              </DangerButton>
            </div>
          </form>
        ) : (
          <div className="space-y-4">
            {!googleEnabled ? (
              <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm font-semibold text-amber-800 dark:border-amber-400/25 dark:bg-amber-400/10 dark:text-amber-100">
                Login com Google não está configurado no frontend.
              </div>
            ) : (
              <GoogleDeleteButton
                disabled={saving}
                onCredential={onGoogleCredential}
              />
            )}

            <SecondaryButton type="button" onClick={onClose}>
              Cancelar
            </SecondaryButton>
          </div>
        )}
      </div>
    </Modal>
  );
}

function DeleteModeButton({
  isActive,
  title,
  description,
  onClick,
}: {
  isActive: boolean;
  title: string;
  description: string;
  onClick: () => void;
}) {
  const buttonStyle = isActive
    ? {
        borderColor: "var(--app-brand)",
        backgroundColor: "var(--app-brand)",
        color: "#ffffff",
      }
    : {
        borderColor: "var(--app-border)",
        backgroundColor: "var(--app-surface-soft)",
        color: "var(--app-text)",
      };

  return (
    <button
      type="button"
      onClick={onClick}
      style={buttonStyle}
      className={`rounded-2xl border px-4 py-3 text-left transition active:scale-[0.99] ${
        isActive ? "shadow-lg shadow-black/10" : "hover:opacity-90"
      }`}
    >
      <span className="block text-sm font-black">{title}</span>
      <span
        className={`mt-0.5 block text-xs font-semibold ${
          isActive ? "text-white/80" : "app-muted"
        }`}
      >
        {description}
      </span>
    </button>
  );
}

function GoogleDeleteButton({
  disabled,
  onCredential,
}: {
  disabled: boolean;
  onCredential: (credential: string) => void;
}) {
  if (Capacitor.isNativePlatform()) {
    return (
      <NativeGoogleDeleteButton
        disabled={disabled}
        onCredential={onCredential}
      />
    );
  }

  return <WebGoogleDeleteButton disabled={disabled} onCredential={onCredential} />;
}

function NativeGoogleDeleteButton({
  disabled,
  onCredential,
}: {
  disabled: boolean;
  onCredential: (credential: string) => void;
}) {
  const [error, setError] = useState<string | null>(null);
  const [isConfirming, setIsConfirming] = useState(false);

  async function handleConfirmWithGoogle() {
    try {
      setError(null);
      setIsConfirming(true);

      await initializeNativeGoogle();

      const { SocialLogin } = await import("@capgo/capacitor-social-login");

      const response = (await SocialLogin.login({
        provider: "google",
        options: {
          scopes: [...GOOGLE_SCOPES],
          autoSelectEnabled: false,
          filterByAuthorizedAccounts: false,
        },
      })) as NativeGoogleLoginResult;

      const idToken = response.result?.idToken;

      if (!idToken) {
        setError("Não foi possível confirmar sua conta Google. Tente novamente.");
        return;
      }

      onCredential(idToken);
    } catch (error) {
      setError(getNativeGoogleErrorMessage(error));
    } finally {
      setIsConfirming(false);
    }
  }

  const isButtonDisabled = disabled || isConfirming;

  return (
    <div className="space-y-3">
      <button
        type="button"
        onClick={handleConfirmWithGoogle}
        disabled={isButtonDisabled}
        style={{
          borderColor: "var(--app-border)",
          backgroundColor: "var(--app-surface)",
          color: "var(--app-text)",
        }}
        className="touch-button flex min-h-12 w-full items-center justify-center gap-3 rounded-2xl border px-4 py-3 text-sm font-black shadow-sm transition active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-60"
      >
        <span className="flex h-7 w-7 items-center justify-center rounded-full bg-white text-base shadow-sm">
          G
        </span>
        <span>{isConfirming || disabled ? "Confirmando..." : "Confirmar com Google"}</span>
      </button>

      <p className="app-muted texto-quebra text-center text-xs font-semibold leading-5">
        No app Android a confirmação usa o login Google nativo do aparelho.
      </p>

      {error ? (
        <p className="texto-quebra rounded-2xl border border-red-200 bg-red-50 p-3 text-sm font-semibold text-red-700 dark:border-red-500/25 dark:bg-red-500/10 dark:text-red-100">
          {error}
        </p>
      ) : null}
    </div>
  );
}

function WebGoogleDeleteButton({
  disabled,
  onCredential,
}: {
  disabled: boolean;
  onCredential: (credential: string) => void;
}) {
  const [error, setError] = useState<string | null>(null);
  const [container, setContainer] = useState<HTMLDivElement | null>(null);
  const renderedContainerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!container || disabled) {
      return;
    }

    const buttonContainer = container;

    if (renderedContainerRef.current === buttonContainer) {
      return;
    }

    let active = true;

    async function renderGoogleButton() {
      try {
        const googleClientId = getGoogleWebClientId();

        if (!googleClientId) {
          setError("NEXT_PUBLIC_GOOGLE_CLIENT_ID não está configurado.");
          return;
        }

        await loadGoogleScript();

        if (!active) {
          return;
        }

        const googleId = getGoogleIdentityService();

        if (!googleId) {
          setError("Login com Google não foi carregado.");
          return;
        }

        googleId.initialize({
          client_id: googleClientId,
          callback: (response: GoogleCredentialResponse) => {
            if (!response.credential) {
              setError("Não foi possível confirmar a conta Google.");
              return;
            }

            onCredential(response.credential);
          },
        });

        googleId.renderButton(buttonContainer, {
          theme: "outline",
          size: "large",
          text: "continue_with",
          shape: "pill",
          width: 320,
        });

        renderedContainerRef.current = buttonContainer;
      } catch (error) {
        setError(getErrorMessage(error));
      }
    }

    void renderGoogleButton();

    return () => {
      active = false;
    };
  }, [container, disabled, onCredential]);

  return (
    <div className="space-y-3">
      <div className="flex min-h-12 justify-center" ref={setContainer} />

      {disabled ? (
        <p className="app-muted text-center text-sm font-semibold">
          Confirmando...
        </p>
      ) : null}

      {error ? (
        <p className="texto-quebra rounded-2xl border border-red-200 bg-red-50 p-3 text-sm font-semibold text-red-700 dark:border-red-500/25 dark:bg-red-500/10 dark:text-red-100">
          {error}
        </p>
      ) : null}
    </div>
  );
}

async function initializeNativeGoogle() {
  if (nativeGoogleInitializePromise) {
    return nativeGoogleInitializePromise;
  }

  nativeGoogleInitializePromise = initializeNativeGoogleRequest();

  return nativeGoogleInitializePromise;
}

async function initializeNativeGoogleRequest() {
  const webClientId = getGoogleWebClientId();
  const iOSClientId = getGoogleIosClientId();
  const iOSServerClientId = getGoogleIosServerClientId();

  if (!webClientId) {
    throw new Error("NEXT_PUBLIC_GOOGLE_CLIENT_ID não configurado.");
  }

  const { SocialLogin } = await import("@capgo/capacitor-social-login");

  const googleConfig: {
    webClientId: string;
    iOSClientId?: string;
    iOSServerClientId?: string;
    mode: "online";
  } = {
    webClientId,
    mode: "online",
  };

  if (Capacitor.getPlatform() === "ios") {
    if (!iOSClientId) {
      throw new Error("NEXT_PUBLIC_GOOGLE_IOS_CLIENT_ID não configurado.");
    }

    googleConfig.iOSClientId = iOSClientId;
    googleConfig.iOSServerClientId = iOSServerClientId;
  }

  await SocialLogin.initialize({
    google: googleConfig,
  });
}

function getGoogleWebClientId() {
  return process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID?.trim() || "";
}

function getGoogleIosClientId() {
  return process.env.NEXT_PUBLIC_GOOGLE_IOS_CLIENT_ID?.trim() || "";
}

function getGoogleIosServerClientId() {
  return (
    process.env.NEXT_PUBLIC_GOOGLE_IOS_SERVER_CLIENT_ID?.trim() ||
    getGoogleWebClientId()
  );
}

function getNativeGoogleErrorMessage(error: unknown) {
  if (error instanceof Error) {
    const message = error.message.trim();
    const normalizedMessage = message.toLowerCase();

    if (
      normalizedMessage.includes("cancel") ||
      normalizedMessage.includes("canceled") ||
      normalizedMessage.includes("cancelado")
    ) {
      return "Confirmação com Google cancelada.";
    }

    return message || "Não foi possível confirmar com Google.";
  }

  return "Não foi possível confirmar com Google.";
}
