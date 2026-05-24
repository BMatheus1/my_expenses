"use client";

import { useRef, useState } from "react";

import { deleteAccount, getCurrentUser } from "../lib/api";
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

const GOOGLE_SCRIPT_SRC = "https://accounts.google.com/gsi/client";

export function AccountDeletionSection() {
  const [currentUser, setCurrentUser] = useState<User | null>(null);

  const [confirmation, setConfirmation] = useState("");
  const [password, setPassword] = useState("");
  const [googleCredential, setGoogleCredential] = useState("");

  const [successMessage, setSuccessMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);
  const [isLoadingUser, setIsLoadingUser] = useState(false);
  const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);

  const googleInitializedRef = useRef(false);

  const isGoogleAccount = currentUser?.provider === "google";
  const isCredentialsAccount = currentUser?.provider === "credentials";

  async function loadCurrentUserIfNeeded() {
    if (currentUser || isLoadingUser) {
      return;
    }

    try {
      setIsLoadingUser(true);

      const user = await getCurrentUser();

      setCurrentUser(user);
    } catch {
      setErrorMessage("Não foi possível carregar os dados da sua conta.");
    } finally {
      setIsLoadingUser(false);
    }
  }

  async function handleGoogleConfirmation() {
    setSuccessMessage("");
    setErrorMessage("");

    await loadCurrentUserIfNeeded();

    try {
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
    }
  }

  function initializeGoogleDeletionConfirmation() {
    if (googleInitializedRef.current) {
      return;
    }

    const googleClientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;

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

    await loadCurrentUserIfNeeded();

    if (confirmation.trim().toUpperCase() !== "EXCLUIR") {
      setErrorMessage("Digite EXCLUIR para confirmar.");
      return;
    }

    if (isCredentialsAccount && !password.trim()) {
      setErrorMessage("Informe sua senha para excluir a conta.");
      return;
    }

    if (isGoogleAccount && !googleCredential) {
      setErrorMessage("Confirme sua identidade com Google antes de excluir a conta.");
      return;
    }

    setIsConfirmModalOpen(true);
  }

  async function handleDeleteAccount() {
    setSuccessMessage("");
    setErrorMessage("");

    try {
      setIsDeleting(true);

      const response = await deleteAccount({
        confirmation,
        password: isCredentialsAccount ? password : undefined,
        google_credential: isGoogleAccount ? googleCredential : undefined,
      });

      setSuccessMessage(response.message);
      setIsConfirmModalOpen(false);

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
              className="mt-4 rounded-full border border-red-200 bg-white px-5 py-3 text-sm font-black text-red-700 transition hover:bg-red-50"
            >
              {googleCredential ? "Google confirmado" : "Confirmar com Google"}
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

  const message = error.message.toLowerCase();

  if (message.includes("senha incorreta")) {
    return "Senha incorreta.";
  }

  if (message.includes("informe sua senha")) {
    return "Informe sua senha para excluir a conta.";
  }

  if (message.includes("confirme sua identidade com google")) {
    return "Confirme sua identidade com Google para excluir a conta.";
  }

  if (message.includes("não corresponde")) {
    return "A conta Google confirmada não corresponde à conta atual.";
  }

  if (message.includes("digite excluir")) {
    return "Digite EXCLUIR para confirmar.";
  }

  if (message.includes("401")) {
    return "Sua sessão expirou. Faça login novamente.";
  }

  return error.message || "Não foi possível excluir a conta.";
}