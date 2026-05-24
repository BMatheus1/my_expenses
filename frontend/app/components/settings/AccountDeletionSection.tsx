"use client";

import { useState } from "react";

import { deleteAccount } from "../../lib/api";

export function AccountDeletionSection() {
  const [confirmation, setConfirmation] = useState("");
  const [password, setPassword] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);

  async function handleDeleteAccount() {
    setSuccessMessage("");
    setErrorMessage("");

    if (confirmation.trim().toUpperCase() !== "EXCLUIR") {
      setErrorMessage("Digite EXCLUIR para confirmar.");
      return;
    }

    const confirmed = window.confirm(
      "Tem certeza que deseja excluir sua conta? Essa ação não pode ser desfeita.",
    );

    if (!confirmed) {
      return;
    }

    try {
      setIsDeleting(true);

      const response = await deleteAccount({
        confirmation,
        password: password || undefined,
      });

      setSuccessMessage(response.message);

      window.setTimeout(() => {
        window.location.assign("/");
      }, 1200);
    } catch (error) {
      setErrorMessage(getDeleteAccountErrorMessage(error));
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
            onChange={(event) => setConfirmation(event.target.value)}
            placeholder="EXCLUIR"
            className="mt-2 w-full rounded-2xl border border-red-200 bg-white px-4 py-3 text-sm text-stone-900 outline-none transition focus:border-red-400 focus:ring-4 focus:ring-red-100"
          />
        </label>

        <label className="block text-sm font-bold text-red-950">
          Senha da conta
          <input
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            placeholder="Obrigatória para contas criadas com e-mail e senha"
            className="mt-2 w-full rounded-2xl border border-red-200 bg-white px-4 py-3 text-sm text-stone-900 outline-none transition focus:border-red-400 focus:ring-4 focus:ring-red-100"
          />
          <span className="mt-2 block text-xs font-medium leading-5 text-red-700">
            Para contas Google, basta confirmar com EXCLUIR.
          </span>
        </label>

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
          onClick={handleDeleteAccount}
          disabled={isDeleting}
          className="rounded-full bg-red-600 px-5 py-3 text-sm font-black text-white transition hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isDeleting ? "Excluindo..." : "Excluir minha conta"}
        </button>
      </div>
    </section>
  );
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

  if (message.includes("digite excluir")) {
    return "Digite EXCLUIR para confirmar.";
  }

  if (message.includes("401")) {
    return "Sua sessão expirou. Faça login novamente.";
  }

  return error.message || "Não foi possível excluir a conta.";
}