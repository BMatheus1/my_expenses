"use client";

import type { FormEvent, ReactNode } from "react";
import { useEffect, useMemo, useState } from "react";

import {
  loginWithEmail,
  registerWithEmail,
  requestPasswordReset,
  resetPassword,
  setAuthToken,
} from "../lib/api";
import type { User } from "../types/auth";
import { GoogleSignInButton } from "./GoogleSignInButton";

type AuthMode = "login" | "register" | "forgot-password" | "reset-password";
type LegalModalType = "terms" | "privacy" | null;

type AuthPageProps = {
  onAuthenticated: (user: User) => void;
};

const TERMS_ITEMS = [
  "O My Expenses é uma ferramenta para organização financeira pessoal e pequenos controles de negócio.",
  "O usuário é responsável por informar dados corretos e manter sua senha segura.",
  "É proibido tentar acessar, alterar ou excluir dados de outros usuários.",
  "O app pode armazenar dados como nome, e-mail, ganhos, gastos, categorias, negócios e informações necessárias para funcionamento da conta.",
  "O usuário pode solicitar exclusão dos seus dados quando essa funcionalidade estiver disponível no app.",
  "O serviço pode passar por atualizações, manutenções ou instabilidades técnicas.",
  "O My Expenses não substitui consultoria contábil, financeira ou jurídica profissional.",
];

const PRIVACY_ITEMS = [
  "Coletamos apenas dados necessários para criar a conta e permitir o uso do app.",
  "Usamos o e-mail para login, recuperação de senha e comunicações importantes sobre a conta.",
  "Os dados financeiros cadastrados são vinculados ao usuário autenticado.",
  "Não vendemos dados pessoais dos usuários.",
  "Usamos autenticação, token seguro, rate limit e isolamento por usuário para proteger os dados.",
  "Mesmo com boas práticas de segurança, nenhum sistema é 100% imune a riscos.",
  "Em caso de dúvidas ou solicitação sobre dados, o usuário poderá entrar em contato pelo canal oficial definido pelo app.",
];

export function AuthPage({ onAuthenticated }: AuthPageProps) {
  const [mode, setMode] = useState<AuthMode>("login");
  const [legalModal, setLegalModal] = useState<LegalModalType>(null);

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [confirmPassword, setConfirmPassword] = useState("");
  const [termsAccepted, setTermsAccepted] = useState(false);

  const [resetToken, setResetToken] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const isLoginMode = mode === "login";
  const isRegisterMode = mode === "register";
  const isForgotPasswordMode = mode === "forgot-password";
  const isResetPasswordMode = mode === "reset-password";

  const passwordStrength = useMemo(() => getPasswordStrength(password), [password]);

  useEffect(() => {
    const tokenFromUrl = new URLSearchParams(window.location.search).get(
      "reset_token",
    );

    if (!tokenFromUrl) {
      return;
    }

    setResetToken(tokenFromUrl);
    setMode("reset-password");
    setPassword("");
    setConfirmPassword("");
    setErrorMessage("");
    setSuccessMessage("");
  }, []);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setErrorMessage("");
    setSuccessMessage("");

    const validationMessage = validateAuthForm();

    if (validationMessage) {
      setErrorMessage(validationMessage);
      return;
    }

    try {
      setIsSubmitting(true);

      if (isForgotPasswordMode) {
        const response = await requestPasswordReset({
          email: email.trim(),
        });

        setSuccessMessage(response.message);
        return;
      }

      if (isResetPasswordMode) {
        const response = await resetPassword({
          token: resetToken,
          password,
        });

        setSuccessMessage(response.message);
        setPassword("");
        setConfirmPassword("");
        setMode("login");
        clearResetTokenFromUrl();
        return;
      }

      const authResponse = isLoginMode
        ? await loginWithEmail({
            email: email.trim(),
            password,
          })
        : await registerWithEmail({
            name: normalizeName(name),
            email: email.trim(),
            password,
            confirm_password: confirmPassword,
            terms_accepted: termsAccepted,
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
    const trimmedName = normalizeName(name);
    const trimmedEmail = email.trim();

    if (isRegisterMode && trimmedName.length < 3) {
      return "Informe seu nome completo.";
    }

    if (!isResetPasswordMode && !trimmedEmail) {
      return "Informe seu e-mail.";
    }

    if (!isResetPasswordMode && !isValidEmail(trimmedEmail)) {
      return "Formato de e-mail inválido. Verifique e tente novamente.";
    }

    if (isForgotPasswordMode) {
      return "";
    }

    if (!password.trim()) {
      return "Informe sua senha.";
    }

    if (password.length < 8) {
      return "A senha deve ter pelo menos 8 caracteres.";
    }

    if (!hasLetterAndNumber(password)) {
      return "A senha precisa ter letras e números.";
    }

    if ((isRegisterMode || isResetPasswordMode) && password !== confirmPassword) {
      return "A confirmação de senha não confere.";
    }

    if (isRegisterMode && !termsAccepted) {
      return "Você precisa aceitar os termos e a política de privacidade para criar sua conta.";
    }

    if (isResetPasswordMode && !resetToken) {
      return "Link de recuperação inválido. Solicite um novo link.";
    }

    return "";
  }

  function switchMode(nextMode: AuthMode) {
    setMode(nextMode);
    setName("");
    setPassword("");
    setConfirmPassword("");
    setTermsAccepted(false);
    setErrorMessage("");
    setSuccessMessage("");

    if (nextMode !== "reset-password") {
      setResetToken("");
      clearResetTokenFromUrl();
    }
  }

  return (
    <main className="min-h-screen bg-stone-50 px-4 py-8 text-stone-900">
      <div className="mx-auto grid min-h-[calc(100vh-4rem)] max-w-6xl items-center gap-8 lg:grid-cols-[1.05fr_0.95fr]">
        <section className="rounded-3xl border border-stone-200 bg-white p-8 shadow-sm">
          <p className="text-sm font-semibold uppercase tracking-widest text-emerald-700">
            My Expenses
          </p>

          <h1 className="mt-4 text-4xl font-bold tracking-tight text-stone-950 lg:text-5xl">
            Controle seus gastos com clareza e segurança.
          </h1>

          <p className="mt-4 max-w-xl text-base leading-7 text-stone-600">
            Organize despesas, ganhos, relatórios e pequenos negócios em um só
            lugar, com autenticação segura e proteção por usuário.
          </p>

          <div className="mt-8 grid gap-3 sm:grid-cols-3">
            <FeatureCard title="Carteira" description="Ganhos e gastos" />
            <FeatureCard title="Relatórios" description="Resumo mensal" />
            <FeatureCard title="Segurança" description="Sessão protegida" />
          </div>
        </section>

        <section className="rounded-3xl border border-stone-200 bg-white p-6 shadow-sm sm:p-8">
          <div>
            <p className="text-xs font-bold uppercase tracking-widest text-emerald-700">
              Acesso seguro
            </p>

            <h2 className="mt-2 text-2xl font-bold text-stone-950">
              {getAuthTitle(mode)}
            </h2>

            <p className="mt-2 text-sm leading-6 text-stone-500">
              {getAuthDescription(mode)}
            </p>
          </div>

          <form onSubmit={handleSubmit} className="mt-6 space-y-4">
            {isRegisterMode ? (
              <AuthField
                label="Nome completo"
                hint="Use o nome que você quer ver dentro do app."
              >
                <input
                  type="text"
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  placeholder="Ex: Matheus Brito"
                  className="app-input"
                  autoComplete="name"
                />
              </AuthField>
            ) : null}

            {!isResetPasswordMode ? (
              <AuthField
                label="E-mail"
                hint="Usaremos para login e recuperação de senha."
              >
                <input
                  type="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  placeholder="voce@email.com"
                  className="app-input"
                  autoComplete="email"
                />
              </AuthField>
            ) : null}

            {!isForgotPasswordMode ? (
              <>
                <AuthField
                  label={isResetPasswordMode ? "Nova senha" : "Senha"}
                  hint="Mínimo 8 caracteres, com letras e números."
                >
                  <input
                    type="password"
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    placeholder="Digite uma senha segura"
                    className="app-input"
                    autoComplete={
                      isLoginMode ? "current-password" : "new-password"
                    }
                  />
                </AuthField>

                {(isRegisterMode || isResetPasswordMode) && password ? (
                  <PasswordStrengthIndicator strength={passwordStrength} />
                ) : null}
              </>
            ) : null}

            {isRegisterMode || isResetPasswordMode ? (
              <AuthField label="Confirmar senha">
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(event) => setConfirmPassword(event.target.value)}
                  placeholder="Repita a senha"
                  className="app-input"
                  autoComplete="new-password"
                />
              </AuthField>
            ) : null}

            {isRegisterMode ? (
              <div className="rounded-2xl border border-stone-200 bg-stone-50 p-4">
                <label className="flex items-start gap-3 text-sm text-stone-600">
                  <input
                    type="checkbox"
                    checked={termsAccepted}
                    onChange={(event) => setTermsAccepted(event.target.checked)}
                    className="mt-1 h-4 w-4 rounded border-stone-300 text-emerald-600"
                  />

                  <span className="leading-6">
                    Confirmo que li e aceito os{" "}
                    <button
                      type="button"
                      onClick={() => setLegalModal("terms")}
                      className="font-bold text-emerald-700 underline-offset-4 hover:underline"
                    >
                      Termos de Uso
                    </button>{" "}
                    e a{" "}
                    <button
                      type="button"
                      onClick={() => setLegalModal("privacy")}
                      className="font-bold text-emerald-700 underline-offset-4 hover:underline"
                    >
                      Política de Privacidade
                    </button>
                    .
                  </span>
                </label>
              </div>
            ) : null}

            {successMessage ? (
              <p className="rounded-2xl border border-emerald-100 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-700">
                {successMessage}
              </p>
            ) : null}

            {errorMessage ? (
              <p className="rounded-2xl border border-red-100 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
                {errorMessage}
              </p>
            ) : null}

            <button
              type="submit"
              disabled={isSubmitting}
              className="app-button-primary w-full"
            >
              {isSubmitting ? "Aguarde..." : getSubmitLabel(mode)}
            </button>
          </form>

          {!isForgotPasswordMode && !isResetPasswordMode ? (
            <>
              <button
                type="button"
                onClick={() => switchMode("forgot-password")}
                className="mt-4 w-full text-sm font-bold text-emerald-700 transition hover:text-emerald-800"
              >
                Esqueci minha senha
              </button>

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
            </>
          ) : null}

          <button
            type="button"
            onClick={() => switchMode(isLoginMode ? "register" : "login")}
            className="mt-6 w-full rounded-full border border-stone-200 px-4 py-3 text-sm font-bold text-stone-700 transition hover:bg-stone-50"
          >
            {getSecondaryActionLabel(mode)}
          </button>
        </section>
      </div>

      <LegalModal type={legalModal} onClose={() => setLegalModal(null)} />
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
  hint?: string;
  children: ReactNode;
};

function AuthField({ label, hint, children }: AuthFieldProps) {
  return (
    <label className="space-y-2 text-sm font-bold text-stone-700">
      <span>{label}</span>
      {children}
      {hint ? (
        <span className="block text-xs font-medium leading-5 text-stone-400">
          {hint}
        </span>
      ) : null}
    </label>
  );
}

function PasswordStrengthIndicator({
  strength,
}: {
  strength: PasswordStrength;
}) {
  return (
    <div className="rounded-2xl border border-stone-200 bg-stone-50 p-4">
      <div className="flex items-center justify-between gap-3">
        <p className="text-xs font-bold uppercase tracking-widest text-stone-500">
          Segurança da senha
        </p>

        <p className={`text-xs font-black ${strength.textColor}`}>
          {strength.label}
        </p>
      </div>

      <div className="mt-3 h-2 overflow-hidden rounded-full bg-stone-200">
        <div
          className={`h-full rounded-full transition-all ${strength.barColor}`}
          style={{ width: `${strength.percent}%` }}
        />
      </div>
    </div>
  );
}

function LegalModal({
  type,
  onClose,
}: {
  type: LegalModalType;
  onClose: () => void;
}) {
  if (!type) {
    return null;
  }

  const isTerms = type === "terms";
  const title = isTerms ? "Termos de Uso" : "Política de Privacidade";
  const description = isTerms
    ? "Condições básicas para uso do My Expenses."
    : "Como tratamos os dados usados no My Expenses.";
  const items = isTerms ? TERMS_ITEMS : PRIVACY_ITEMS;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4 py-6">
      <div className="max-h-[85vh] w-full max-w-2xl overflow-hidden rounded-3xl bg-white shadow-xl">
        <div className="border-b border-stone-200 p-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-xs font-bold uppercase tracking-widest text-emerald-700">
                My Expenses
              </p>

              <h2 className="mt-2 text-2xl font-black text-stone-950">
                {title}
              </h2>

              <p className="mt-1 text-sm leading-6 text-stone-500">
                {description}
              </p>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="rounded-2xl border border-stone-200 px-3 py-2 text-sm font-black text-stone-600 transition hover:bg-stone-50"
              aria-label="Fechar"
            >
              ✕
            </button>
          </div>
        </div>

        <div className="max-h-[55vh] overflow-y-auto p-6">
          <p className="text-sm leading-6 text-stone-600">
            Este texto é uma versão inicial para MVP e pode ser substituído por
            uma versão jurídica definitiva antes do lançamento público.
          </p>

          <ul className="mt-5 space-y-3">
            {items.map((item) => (
              <li
                key={item}
                className="rounded-2xl border border-stone-100 bg-stone-50 p-4 text-sm leading-6 text-stone-700"
              >
                {item}
              </li>
            ))}
          </ul>
        </div>

        <div className="border-t border-stone-200 p-6">
          <button
            type="button"
            onClick={onClose}
            className="app-button-primary w-full"
          >
            Entendi
          </button>
        </div>
      </div>
    </div>
  );
}

type PasswordStrength = {
  percent: number;
  label: string;
  barColor: string;
  textColor: string;
};

function getPasswordStrength(password: string): PasswordStrength {
  let score = 0;

  if (password.length >= 8) score += 1;
  if (password.length >= 12) score += 1;
  if (/[A-Za-zÀ-ÿ]/.test(password)) score += 1;
  if (/\d/.test(password)) score += 1;
  if (/[^A-Za-zÀ-ÿ0-9]/.test(password)) score += 1;

  if (score <= 2) {
    return {
      percent: 35,
      label: "Fraca",
      barColor: "bg-red-500",
      textColor: "text-red-600",
    };
  }

  if (score <= 4) {
    return {
      percent: 70,
      label: "Boa",
      barColor: "bg-amber-500",
      textColor: "text-amber-600",
    };
  }

  return {
    percent: 100,
    label: "Forte",
    barColor: "bg-emerald-600",
    textColor: "text-emerald-700",
  };
}

function getAuthTitle(mode: AuthMode) {
  const titles: Record<AuthMode, string> = {
    login: "Entrar na conta",
    register: "Criar conta",
    "forgot-password": "Recuperar senha",
    "reset-password": "Criar nova senha",
  };

  return titles[mode];
}

function getAuthDescription(mode: AuthMode) {
  const descriptions: Record<AuthMode, string> = {
    login: "Use seu e-mail e senha para acessar sua área financeira.",
    register:
      "Crie sua conta com os dados essenciais para proteger seu acesso.",
    "forgot-password":
      "Informe seu e-mail. Se existir uma conta, enviaremos o link de recuperação.",
    "reset-password": "Informe e confirme sua nova senha para recuperar o acesso.",
  };

  return descriptions[mode];
}

function getSubmitLabel(mode: AuthMode) {
  const labels: Record<AuthMode, string> = {
    login: "Entrar",
    register: "Criar conta segura",
    "forgot-password": "Enviar link de recuperação",
    "reset-password": "Salvar nova senha",
  };

  return labels[mode];
}

function getSecondaryActionLabel(mode: AuthMode) {
  if (mode === "login") {
    return "Ainda não tenho conta";
  }

  return "Voltar para login";
}

function clearResetTokenFromUrl() {
  window.history.replaceState({}, document.title, window.location.pathname);
}

function normalizeName(value: string) {
  return value.trim().replace(/\s+/g, " ");
}

function isValidEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function hasLetterAndNumber(value: string) {
  return /[A-Za-zÀ-ÿ]/.test(value) && /\d/.test(value);
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

  if (message.includes("confirmação de senha")) {
    return "A confirmação de senha não confere.";
  }

  if (message.includes("termos")) {
    return "Você precisa aceitar os termos para criar sua conta.";
  }

  if (message.includes("inválido ou expirado") || message.includes("expirado")) {
    return "Link de recuperação inválido ou expirado. Solicite um novo link.";
  }

  return error.message || "Não foi possível entrar na conta.";
}