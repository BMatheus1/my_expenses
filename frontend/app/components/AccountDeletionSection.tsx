"use client";

import { Capacitor } from "@capacitor/core";
import { useRef, useState } from "react";

import { deleteAccount, getCurrentUser } from "../lib/api";
import {
  clearAppAppearancePreferences,
  clearUserAppAppearancePreferences,
} from "../lib/theme";
import type { User } from "../types/auth";

type GoogleCredentialResponse = {
  credential?: string;
};

type GoogleIdentityApi = {
  accounts: {
    id: {
      initialize: (config: {
        client_id: string;
        callback: (response: GoogleCredentialResponse) => void;
        auto_select?: boolean;
        cancel_on_tap_outside?: boolean;
      }) => void;
      prompt: () => void;
    };
  };
};

type WindowWithGoogle = Window & {
  google?: GoogleIdentityApi;
};

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

const GOOGLE_SCRIPT_SRC = "https://accounts.google.com/gsi/client";

let nativeGoogleInitializePromise: Promise<void> | null = null;

export function AccountDeletionSection() {
  const [currentUser, setCurrentUser] = useState<User | null>(null);

  const [confirmation, setConfirmation] = useState("");
  const [password, setPassword] = useState("");
  const [googleCredential, setGoogleCredential] = useState("");

  const [successMessage, setSuccessMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);
  const [isLoadingUser, setIsLoadingUser] = useState(false);
  const [isConfirmingGoogle, setIsConfirmingGoogle] = useState(false);
  const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);

  const googleInitializedRef = useRef(false);

  const isGoogleAccount = currentUser?.provider === "google";
  const isCredentialsAccount = currentUser?.provider === "credentials";

  async function loadCurrentUserIfNeeded() {
    if (currentUser) {
      return currentUser;
    }

    if (isLoadingUser) {
      return null;
    }

    try {
      setIsLoadingUser(true);

      const user = await getCurrentUser();

      setCurrentUser(user);

      return user;
    } catch {
      setErrorMessage("Não foi possível carregar os dados da sua conta.");
      return null;
    } finally {
      setIsLoadingUser(false);
    }
  }

  async function handleGoogleConfirmation() {
    setSuccessMessage("");
    setErrorMessage("");

    const user = await loadCurrentUserIfNeeded();

    if (!user) {
      return;
    }

    if (user.provider !== "google") {
      setErrorMessage("Essa conta não foi criada com Google.");
      return;
    }

    if (Capacitor.isNativePlatform()) {
      await handleNativeGoogleConfirmation();
      return;
    }

    await handleWebGoogleConfirmation();
  }

  async function handleNativeGoogleConfirmation() {
    try {
      setIsConfirmingGoogle(true);

      await initializeNativeGoogle();

      const { SocialLogin } = await import("@capgo/capacitor-social-login");

      const response = (await SocialLogin.login({
        provider: "google",
        options: {
          scopes: ["email", "profile"],
          autoSelectEnabled: false,
          filterByAuthorizedAccounts: false,
        },
      })) as NativeGoogleLoginResult;

      const idToken = response.result?.idToken;

      if (!idToken) {
        setErrorMessage("Não foi possível receber a confirmação do Google.");
        return;
      }

      setGoogleCredential(idToken);
      setErrorMessage("");
      setSuccessMessage("Conta Google confirmada para exclusão.");
    } catch (error) {
      console.error("Erro ao confirmar Google para exclusão:", error);

      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Não foi possível confirmar sua conta com Google.",
      );
    } finally {
      setIsConfirmingGoogle(false);
    }
  }

  async function handleWebGoogleConfirmation() {
    try {
      setIsConfirmingGoogle(true);

      await loadGoogleIdentityScript();
      initializeGoogleDeletionConfirmation();

      const googleIdentity = getGoogleIdentity();

      if (!googleIdentity) {
        setErrorMessage("Google ainda está carregando. Tente novamente.");
        return;
      }

      googleIdentity.accounts.id.prompt();
    } catch {
      setErrorMessage("Não foi possível carregar a confirmação com Google.");
    } finally {
      setIsConfirmingGoogle(false);
    }
  }

  function initializeGoogleDeletionConfirmation() {
    if (googleInitializedRef.current) {
      return;
    }

    const googleClientId = getGoogleWebClientId();

    if (!googleClientId) {
      setErrorMessage("Login Google não configurado corretamente.");
      return;
    }

    const googleIdentity = getGoogleIdentity();

    if (!googleIdentity) {
      setErrorMessage("Google ainda está carregando. Tente novamente.");
      return;
    }

    googleIdentity.accounts.id.initialize({
      client_id: googleClientId,
      callback: (response) => {
        if (!response.credential) {
          setErrorMessage("Não foi possível confirmar sua conta Google.");
          return;
        }

        setGoogleCredential(response.credential);
        setErrorMessage("");
        setSuccessMessage("Conta Google confirmada para exclusão.");
      },
      auto_select: false,
      cancel_on_tap_outside: true,
    });

    googleInitializedRef.current = true;
  }

  async function handleOpenConfirmModal() {
    setSuccessMessage("");
    setErrorMessage("");

    const user = await loadCurrentUserIfNeeded();

    if (!user) {
      return;
    }

    const isCurrentUserGoogleAccount = user.provider === "google";
    const isCurrentUserCredentialsAccount = user.provider === "credentials";

    if (confirmation.trim().toUpperCase() !== "EXCLUIR") {
      setErrorMessage("Digite EXCLUIR para confirmar.");
      return;
    }

    if (isCurrentUserCredentialsAccount && !password.trim()) {
      setErrorMessage("Informe sua senha para excluir a conta.");
      return;
    }

    if (isCurrentUserGoogleAccount && !googleCredential) {
      setErrorMessage("Confirme sua identidade com Google antes de excluir a conta.");
      return;
    }

    setIsConfirmModalOpen(true);
  }

  async function handleDeleteAccount() {
    setSuccessMessage("");
    setErrorMessage("");

    if (!currentUser) {
      setErrorMessage("Não foi possível identificar a conta atual.");
      setIsConfirmModalOpen(false);
      return;
    }

    try {
      setIsDeleting(true);

      const response = await deleteAccount({
        confirmation,
        password: isCredentialsAccount ? password : undefined,
        google_credential: isGoogleAccount ? googleCredential : undefined,
      });

      setSuccessMessage(response.message);
      setIsConfirmModalOpen(false);

      clearUserAppAppearancePreferences(currentUser.id);
      clearAppAppearancePreferences();

      window.setTimeout(() => {
        window.location.assign("/");
      }, 1200);
    } catch (error) {
      setErrorMessage(getDeleteAccountErrorMessage(error));
      setIsConfirmModalOpen(false);
    } finally {
      setIsDeleting(false);
    }
  }

  return (
    <section className="rounded-3xl border border-red-100 bg-red-50 p-5">
      <div>
        <p className="text-xs font-black uppercase tracking-widest text-red-700">
          Zona de perigo
        </p>

        <h3 className="mt-2 text-lg font-black text-red-950">
          Excluir conta
        </h3>

        <p className="mt-2 text-sm leading-6 text-red-800">
          Essa ação remove sua conta e os dados vinculados a ela, incluindo
          ganhos, gastos, categorias, negócios e sessões. Depois de confirmar,
          não será possível desfazer.
        </p>
      </div>

      <div className="mt-5 space-y-4">
        <label className="block text-sm font-bold text-red-950">
          Digite EXCLUIR para confirmar
          <input
            type="text"
            value={confirmation}
            onFocus={loadCurrentUserIfNeeded}
            onChange={(event) => setConfirmation(event.target.value)}
            placeholder="EXCLUIR"
            className="mt-2 w-full rounded-2xl border border-red-200 bg-white px-4 py-3 text-sm text-stone-900 outline-none transition focus:border-red-400 focus:ring-4 focus:ring-red-100"
          />
        </label>

        {isLoadingUser ? (
          <p className="rounded-2xl border border-red-100 bg-white px-4 py-3 text-sm font-bold text-red-700">
            Carregando dados da conta...
          </p>
        ) : null}

        {isCredentialsAccount ? (
          <label className="block text-sm font-bold text-red-950">
            Senha da conta
            <input
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="Informe sua senha"
              className="mt-2 w-full rounded-2xl border border-red-200 bg-white px-4 py-3 text-sm text-stone-900 outline-none transition focus:border-red-400 focus:ring-4 focus:ring-red-100"
            />
          </label>
        ) : null}

        {isGoogleAccount ? (
          <div className="rounded-2xl border border-red-100 bg-white p-4">
            <p className="text-sm font-bold text-red-950">
              Confirmação com Google
            </p>

            <p className="mt-2 text-sm leading-6 text-red-700">
              Para excluir uma conta criada com Google, confirme novamente sua
              identidade com o mesmo e-mail da conta atual.
            </p>

            <button
              type="button"
              onClick={handleGoogleConfirmation}
              disabled={isConfirmingGoogle || isDeleting}
              className="mt-4 rounded-full border border-red-200 bg-white px-5 py-3 text-sm font-black text-red-700 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isConfirmingGoogle
                ? "Confirmando..."
                : googleCredential
                  ? "Google confirmado"
                  : "Confirmar com Google"}
            </button>
          </div>
        ) : null}

        {!isLoadingUser && currentUser === null ? (
          <p className="rounded-2xl border border-red-100 bg-white px-4 py-3 text-sm font-bold text-red-700">
            Clique no campo de confirmação para carregar os dados da conta.
          </p>
        ) : null}

        {successMessage ? (
          <p className="rounded-2xl border border-emerald-100 bg-emerald-50 px-4 py-3 text-sm font-bold text-emerald-700">
            {successMessage}
          </p>
        ) : null}

        {errorMessage ? (
          <p className="rounded-2xl border border-red-200 bg-white px-4 py-3 text-sm font-bold text-red-700">
            {errorMessage}
          </p>
        ) : null}

        <button
          type="button"
          onClick={handleOpenConfirmModal}
          disabled={isDeleting || isLoadingUser}
          className="rounded-full bg-red-600 px-5 py-3 text-sm font-black text-white transition hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isDeleting ? "Excluindo..." : "Excluir minha conta"}
        </button>
      </div>

      {isConfirmModalOpen ? (
        <DeleteAccountConfirmationModal
          isDeleting={isDeleting}
          onCancel={() => setIsConfirmModalOpen(false)}
          onConfirm={handleDeleteAccount}
        />
      ) : null}
    </section>
  );
}

function DeleteAccountConfirmationModal({
  isDeleting,
  onCancel,
  onConfirm,
}: {
  isDeleting: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
      <div className="w-full max-w-md rounded-3xl bg-white p-6 shadow-xl">
        <p className="text-xs font-black uppercase tracking-widest text-red-700">
          Confirmação final
        </p>

        <h4 className="mt-2 text-xl font-black text-stone-950">
          Tem certeza que deseja excluir sua conta?
        </h4>

        <p className="mt-3 text-sm leading-6 text-stone-600">
          Essa ação vai excluir sua conta e seus dados vinculados. Depois de
          confirmar, não será possível desfazer.
        </p>

        <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={onCancel}
            disabled={isDeleting}
            className="rounded-full border border-stone-200 px-5 py-3 text-sm font-black text-stone-700 transition hover:bg-stone-50 disabled:cursor-not-allowed disabled:opacity-60"
          >
            Cancelar
          </button>

          <button
            type="button"
            onClick={onConfirm}
            disabled={isDeleting}
            className="rounded-full bg-red-600 px-5 py-3 text-sm font-black text-white transition hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isDeleting ? "Excluindo..." : "Sim, excluir conta"}
          </button>
        </div>
      </div>
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

function getGoogleIdentity() {
  if (typeof window === "undefined") {
    return undefined;
  }

  return (window as WindowWithGoogle).google;
}

function loadGoogleIdentityScript() {
  return new Promise<void>((resolve, reject) => {
    if (getGoogleIdentity()) {
      resolve();
      return;
    }

    const existingScript = document.querySelector<HTMLScriptElement>(
      `script[src="${GOOGLE_SCRIPT_SRC}"]`,
    );

    if (existingScript) {
      existingScript.addEventListener("load", () => resolve(), { once: true });
      existingScript.addEventListener("error", () => reject(), { once: true });
      return;
    }

    const script = document.createElement("script");

    script.src = GOOGLE_SCRIPT_SRC;
    script.async = true;
    script.defer = true;
    script.onload = () => resolve();
    script.onerror = () => reject();

    document.head.appendChild(script);
  });
}

function getDeleteAccountErrorMessage(error: unknown) {
  if (!(error instanceof Error)) {
    return "Não foi possível excluir a conta.";
  }

  return error.message || "Não foi possível excluir a conta.";
}