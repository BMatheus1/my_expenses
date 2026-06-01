"use client";

import Link from "next/link";
import { useEffect } from "react";

import { AuthGate } from "./components/AuthGate";

const BENEFITS = [
  {
    title: "Anote rápido",
    description: "Registre pequenos gastos em poucos segundos pelo celular.",
  },
  {
    title: "Feche o dia",
    description: "Recupere o que ficou faltando sem formulário longo.",
  },
  {
    title: "Entenda seu mês",
    description: "Veja para onde seu dinheiro está indo com clareza.",
  },
];

const SECURITY_ITEMS = [
  "Verificação de e-mail",
  "Login com Google",
  "Recuperação de senha",
  "Sessão protegida",
  "Exclusão de conta",
];

const IS_CAPACITOR_NATIVE_BUILD =
  process.env.NEXT_PUBLIC_CAPACITOR_BUILD === "true";

type CapacitorRuntime = {
  isNativePlatform?: () => boolean;
  getPlatform?: () => string;
};

declare global {
  interface Window {
    Capacitor?: CapacitorRuntime;
  }
}

function isNativeAppRuntime() {
  const capacitor = window.Capacitor;

  if (!capacitor) {
    return false;
  }

  if (typeof capacitor.isNativePlatform === "function") {
    return capacitor.isNativePlatform();
  }

  if (typeof capacitor.getPlatform === "function") {
    return ["android", "ios"].includes(capacitor.getPlatform());
  }

  return false;
}

export default function LandingPage() {
  if (IS_CAPACITOR_NATIVE_BUILD) {
    return <AuthGate />;
  }

  return <WebLandingPage />;
}

function WebLandingPage() {
  useEffect(() => {
    const searchParams = new URLSearchParams(window.location.search);
    const hasAuthActionToken =
      searchParams.has("verify_email_token") || searchParams.has("reset_token");

    if (!hasAuthActionToken && !isNativeAppRuntime()) {
      return;
    }

    const queryString = searchParams.toString();
    const destination = queryString ? `/app?${queryString}` : "/app/";

    window.location.replace(destination);
  }, []);

  return (
    <main className="min-h-screen bg-stone-50 text-stone-950">
      <header className="sticky top-0 z-40 border-b border-stone-200 bg-white/95 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4">
          <Link href="/" className="text-lg font-black tracking-tight">
            My Expenses
          </Link>

          <nav className="hidden items-center gap-6 text-sm font-bold text-stone-600 sm:flex">
            <a href="#beneficios" className="transition hover:text-emerald-700">
              Benefícios
            </a>

            <a href="#seguranca" className="transition hover:text-emerald-700">
              Segurança
            </a>

            <Link href="/contato" className="transition hover:text-emerald-700">
              Suporte
            </Link>
          </nav>

          <Link
            href="/app?auth=login&focus=auth"
            className="rounded-full bg-emerald-600 px-5 py-3 text-sm font-black text-white transition hover:bg-emerald-700"
          >
            Entrar
          </Link>
        </div>
      </header>

      <section className="mx-auto grid max-w-6xl gap-10 px-4 py-12 lg:grid-cols-2 lg:items-center lg:py-20">
        <div>
          <p className="text-sm font-black uppercase tracking-widest text-emerald-700">
            Controle financeiro para a vida real
          </p>

          <h1 className="mt-4 text-4xl font-black tracking-tight text-stone-950 sm:text-5xl lg:text-6xl">
            Anote rápido. Feche o dia. Entenda seu mês.
          </h1>

          <p className="mt-5 max-w-2xl text-base leading-8 text-stone-600 sm:text-lg">
            O My Expenses ajuda você a manter controle mesmo quando o dia está
            corrido: registre gastos em segundos, revise o que esqueceu e veja
            para onde seu dinheiro foi.
          </p>

          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Link
              href="/app?auth=register&focus=auth"
              className="rounded-full bg-emerald-600 px-6 py-4 text-center text-sm font-black text-white transition hover:bg-emerald-700"
            >
              Começar agora
            </Link>

            <Link
              href="/contato"
              className="rounded-full border border-stone-300 bg-white px-6 py-4 text-center text-sm font-black text-stone-700 transition hover:bg-stone-100"
            >
              Falar com suporte
            </Link>
          </div>

          <p className="mt-4 text-xs font-semibold text-stone-500">
            Sem anúncios. Com autenticação segura. Feito para uso diário.
          </p>
        </div>

        <div className="rounded-3xl border border-stone-200 bg-white p-5 shadow-sm">
          <div className="rounded-3xl bg-stone-950 p-4 text-white">
            <div className="flex items-center justify-between">
              <p className="text-sm font-black">Minha carteira</p>

              <p className="rounded-full bg-emerald-500/20 px-3 py-1 text-xs font-bold text-emerald-200">
                Hoje
              </p>
            </div>

            <div className="mt-6 rounded-3xl bg-white/10 p-5">
              <p className="text-sm text-stone-300">Registrado hoje</p>
              <p className="mt-2 text-3xl font-black">R$ 48,00</p>
            </div>

            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <div className="rounded-3xl bg-emerald-500/15 p-4">
                <p className="text-xs font-bold text-emerald-200">Gasto rápido</p>
                <p className="mt-1 text-xl font-black">R$ 10</p>
              </div>

              <div className="rounded-3xl bg-red-500/15 p-4">
                <p className="text-xs font-bold text-red-200">Miudezas</p>
                <p className="mt-1 text-xl font-black">R$ 18</p>
              </div>
            </div>

            <div className="mt-4 rounded-3xl bg-white p-4 text-stone-950">
              <p className="text-sm font-black">Para onde foi meu dinheiro?</p>

              <div className="mt-3 space-y-3">
                <FakeTransaction title="Alimentação" value="- R$ 120,40" />
                <FakeTransaction title="Transporte" value="- R$ 58,00" />
                <FakeTransaction title="Miudezas" value="- R$ 32,00" />
              </div>
            </div>
          </div>
        </div>
      </section>

      <section id="beneficios" className="border-y border-stone-200 bg-white">
        <div className="mx-auto max-w-6xl px-4 py-14">
          <div className="max-w-2xl">
            <p className="text-sm font-black uppercase tracking-widest text-emerald-700">
              Benefícios
            </p>

            <h2 className="mt-3 text-3xl font-black tracking-tight">
              Feito para o jeito real como o dia acontece.
            </h2>
          </div>

          <div className="mt-8 grid gap-4 md:grid-cols-3">
            {BENEFITS.map((benefit) => (
              <article
                key={benefit.title}
                className="rounded-3xl border border-stone-200 bg-stone-50 p-6"
              >
                <h3 className="text-lg font-black">{benefit.title}</h3>

                <p className="mt-3 text-sm leading-6 text-stone-600">
                  {benefit.description}
                </p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section id="seguranca" className="mx-auto max-w-6xl px-4 py-14">
        <div className="grid gap-8 rounded-3xl border border-stone-200 bg-white p-6 shadow-sm lg:grid-cols-2 lg:p-10">
          <div>
            <p className="text-sm font-black uppercase tracking-widest text-emerald-700">
              Segurança
            </p>

            <h2 className="mt-3 text-3xl font-black tracking-tight">
              Seus dados financeiros precisam de cuidado.
            </h2>

            <p className="mt-4 text-sm leading-7 text-stone-600">
              O app foi estruturado com autenticação, verificação de e-mail,
              sessões protegidas e isolamento dos dados por usuário.
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            {SECURITY_ITEMS.map((item) => (
              <div
                key={item}
                className="rounded-2xl border border-stone-200 bg-stone-50 px-4 py-3 text-sm font-bold text-stone-700"
              >
                {item}
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-stone-950 px-4 py-14 text-white">
        <div className="mx-auto flex max-w-6xl flex-col items-start justify-between gap-6 sm:flex-row sm:items-center">
          <div>
            <h2 className="text-3xl font-black tracking-tight">
              Controle financeiro sem cobrança e sem complicação.
            </h2>

            <p className="mt-2 text-sm leading-6 text-stone-300">
              Comece registrando um gasto rápido. No fim do dia, revise o que
              ficou faltando.
            </p>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row">
            <Link
              href="/app?auth=register&focus=auth"
              className="rounded-full bg-emerald-500 px-6 py-4 text-center text-sm font-black text-white transition hover:bg-emerald-600"
            >
              Criar conta
            </Link>

            <Link
              href="/contato"
              className="rounded-full border border-white/20 px-6 py-4 text-center text-sm font-black text-white transition hover:bg-white/10"
            >
              Preciso de ajuda
            </Link>
          </div>
        </div>
      </section>

      <footer className="bg-white px-4 py-8">
        <div className="mx-auto flex max-w-6xl flex-col gap-4 text-sm text-stone-500 sm:flex-row sm:items-center sm:justify-between">
          <p>© 2026 My Expenses. Todos os direitos reservados.</p>

          <div className="flex flex-wrap gap-4">
            <Link href="/app" className="hover:text-emerald-700">
              Acessar app
            </Link>

            <Link href="/contato" className="hover:text-emerald-700">
              Contato
            </Link>

            <Link href="/termos-de-uso" className="hover:text-emerald-700">
              Termos
            </Link>

            <Link
              href="/politica-de-privacidade"
              className="hover:text-emerald-700"
            >
              Privacidade
            </Link>
          </div>
        </div>
      </footer>
    </main>
  );
}

function FakeTransaction({
  title,
  value,
}: {
  title: string;
  value: string;
}) {
  const isPositive = value.startsWith("+");

  return (
    <div className="flex items-center justify-between rounded-2xl bg-stone-50 px-4 py-3">
      <p className="text-sm font-bold text-stone-700">{title}</p>

      <p
        className={`text-sm font-black ${
          isPositive ? "text-emerald-700" : "text-red-600"
        }`}
      >
        {value}
      </p>
    </div>
  );
}
