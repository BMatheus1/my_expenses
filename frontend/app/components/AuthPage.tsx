"use client";

import type { FormEvent, ReactNode } from "react";
import { useState } from "react";

import { loginWithEmail, registerWithEmail, setAuthToken } from "../lib/api";
import type { User } from "../types/auth";
import { GoogleSignInButton } from "./GoogleSignInButton";

type AuthMode = "login" | "register";

type AuthPageProps = {
  onAuthenticated: (user: User) => void;
};

export function AuthPage({ onAuthenticated }: AuthPageProps) {
  const [mode, setMode] = useState<AuthMode>("login");

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [errorMessage, setErrorMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const isLoginMode = mode === "login";

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setErrorMessage("");

    const validationMessage = validateAuthForm();

    if (validationMessage) {
      setErrorMessage(validationMessage);
      return;
    }

    try {
      setIsSubmitting(true);

      const authResponse = isLoginMode
        ? await loginWithEmail({
            email: email.trim(),
            password,
          })
        : await registerWithEmail({
            name: name.trim(),
            email: email.trim(),
            password,
          });

      setAuthToken(authResponse.access_token);
      onAuthenticated(authResponse.user);
    } catch (error) {
      setErrorMessage(getAuthErrorMessage(error));
    } finally {
      setIsSubmitting(false);
    }
  }

  function validateAuthForm() {
    const trimmedName = name.trim();
    const trimmedEmail = email.trim();

    if (!isLoginMode && trimmedName.length < 2) {
      return "Informe seu nome.";
    }

    if (!trimmedEmail) {
      return "Informe seu e-mail.";
    }

    if (!isValidEmail(trimmedEmail)) {
      return "Formato de e-mail inválido. Verifique e tente novamente.";
    }

    if (!password.trim()) {
      return "Informe sua senha.";
    }

    if (password.length < 6) {
      return "A senha deve ter pelo menos 6 caracteres.";
    }

    return "";
  }

  function toggleMode() {
    setMode((currentMode) =>
      currentMode === "login" ? "register" : "login"
    );

    setName("");
    setEmail("");
    setPassword("");
    setErrorMessage("");
  }

  return (
    <main className="min-h-screen bg-stone-50 px-4 py-8 text-stone-900">
      <div className="mx-auto grid min-h-[calc(100vh-4rem)] max-w-6xl items-center gap-8 lg:grid-cols-[1.05fr_0.95fr]">
        <section className="rounded-3xl border border-stone-200 bg-white p-8 shadow-sm">
          <p className="text-sm font-semibold uppercase tracking-widest text-emerald-700">
            My Expenses
          </p>

          <h1 className="mt-4 text-4xl font-bold tracking-tight text-stone-950 lg:text-5xl">
            Controle seus gastos com clareza.
          </h1>

          <p className="mt-4 max-w-xl text-base leading-7 text-stone-600">
            Acesse sua conta para cadastrar despesas, filtrar gastos e acompanhar
            relatórios mensais.
          </p>

          <div className="mt-8 grid gap-3 sm:grid-cols-3">
            <FeatureCard title="Gastos" description="Cadastro e edição" />
            <FeatureCard title="Filtros" description="Busca por mês" />
            <FeatureCard title="Relatórios" description="Comparativo mensal" />
          </div>
        </section>

        <section className="rounded-3xl border border-stone-200 bg-white p-6 shadow-sm sm:p-8">
          <div>
            <h2 className="text-2xl font-bold text-stone-950">
              {isLoginMode ? "Entrar na conta" : "Criar conta"}
            </h2>

            <p className="mt-2 text-sm text-stone-500">
              {isLoginMode
                ? "Use seu e-mail e senha para acessar."
                : "Preencha os dados para começar."}
            </p>
          </div>

          <form onSubmit={handleSubmit} className="mt-6 space-y-4">
            {!isLoginMode && (
              <AuthField label="Nome">
                <input
                  type="text"
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  placeholder="Seu nome"
                  className="app-input"
                />
              </AuthField>
            )}

            <AuthField label="E-mail">
              <input
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="voce@email.com"
                className="app-input"
              />
            </AuthField>

            <AuthField label="Senha">
              <input
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder="Mínimo 6 caracteres"
                className="app-input"
              />
            </AuthField>

            {errorMessage && (
              <p className="rounded-2xl border border-red-100 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
                {errorMessage}
              </p>
            )}

            <button
              type="submit"
              disabled={isSubmitting}
              className="app-button-primary w-full"
            >
              {isSubmitting
                ? "Aguarde..."
                : isLoginMode
                  ? "Entrar"
                  : "Criar conta"}
            </button>
          </form>

          <div className="my-6 flex items-center gap-3">
            <div className="h-px flex-1 bg-stone-200" />

            <span className="text-xs font-bold uppercase tracking-widest text-stone-400">
              ou
            </span>

            <div className="h-px flex-1 bg-stone-200" />
          </div>

          <GoogleSignInButton
            onAuthenticated={onAuthenticated}
            onError={setErrorMessage}
          />

          <button
            type="button"
            onClick={toggleMode}
            className="mt-6 w-full rounded-full border border-stone-200 px-4 py-3 text-sm font-bold text-stone-700 transition hover:bg-stone-50"
          >
            {isLoginMode ? "Ainda não tenho conta" : "Já tenho conta"}
          </button>
        </section>
      </div>
    </main>
  );
}

type FeatureCardProps = {
  title: string;
  description: string;
};

function FeatureCard({ title, description }: FeatureCardProps) {
  return (
    <article className="rounded-3xl border border-stone-100 bg-stone-50 p-4">
      <h3 className="font-bold text-stone-950">{title}</h3>
      <p className="mt-1 text-sm text-stone-500">{description}</p>
    </article>
  );
}

type AuthFieldProps = {
  label: string;
  children: ReactNode;
};

function AuthField({ label, children }: AuthFieldProps) {
  return (
    <label className="space-y-2 text-sm font-bold text-stone-700">
      <span>{label}</span>
      {children}
    </label>
  );
}

function isValidEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function getAuthErrorMessage(error: unknown) {
  if (!(error instanceof Error)) {
    return "Não foi possível entrar na conta.";
  }

  const message = error.message.toLowerCase();

  if (
    message.includes("e-mail ou senha") ||
    message.includes("email ou senha") ||
    message.includes("senha inválidos") ||
    message.includes("senha invalidos") ||
    message.includes("401")
  ) {
    return "Usuário ou senha incorretos.";
  }

  if (
    message.includes("value is not a valid email address") ||
    message.includes("email") ||
    message.includes("e-mail")
  ) {
    return "Formato de e-mail inválido. Verifique e tente novamente.";
  }

  if (message.includes("já existe") || message.includes("already")) {
    return "Já existe uma conta com este e-mail.";
  }

  return error.message || "Não foi possível entrar na conta.";
}