import Link from "next/link";

const SUPPORT_EMAIL = "suporte@myexpensesfinance.com";
const PRIVACY_EMAIL = "privacidade@myexpensesfinance.com";

export default function ContactPage() {
  return (
    <main className="min-h-screen bg-stone-50 px-4 py-10 text-stone-900">
      <section className="mx-auto max-w-4xl rounded-3xl border border-stone-200 bg-white p-6 shadow-sm sm:p-10">
        <Link
          href="/"
          className="text-sm font-black uppercase tracking-widest text-emerald-700"
        >
          My Expenses
        </Link>

        <h1 className="mt-4 text-3xl font-black tracking-tight text-stone-950">
          Contato e suporte
        </h1>

        <p className="mt-3 max-w-2xl text-sm leading-7 text-stone-600">
          Precisa de ajuda com sua conta, acesso, verificação de e-mail,
          recuperação de senha ou exclusão de dados? Use os canais abaixo.
        </p>

        <div className="mt-8 grid gap-4 md:grid-cols-2">
          <ContactCard
            title="Suporte"
            description="Para dúvidas sobre uso do app, cadastro, login, gastos, ganhos e funcionamento geral."
            email={SUPPORT_EMAIL}
          />

          <ContactCard
            title="Privacidade"
            description="Para solicitações relacionadas a dados pessoais, privacidade, exclusão de conta e segurança."
            email={PRIVACY_EMAIL}
          />
        </div>

        <div className="mt-8 rounded-3xl border border-stone-200 bg-stone-50 p-5">
          <h2 className="text-lg font-black text-stone-950">
            Antes de entrar em contato
          </h2>

          <ul className="mt-4 space-y-3 text-sm leading-6 text-stone-600">
            <li>
              <strong>Não recebeu e-mail?</strong> Verifique a caixa de spam ou
              lixo eletrônico.
            </li>

            <li>
              <strong>Esqueceu a senha?</strong> Use a opção “Esqueci minha
              senha” na tela de login.
            </li>

            <li>
              <strong>Conta Google?</strong> Entre usando o botão “Entrar com
              Google”.
            </li>

            <li>
              <strong>Conta criada com senha?</strong> Use o login normal com
              e-mail e senha.
            </li>
          </ul>
        </div>

        <div className="mt-8 flex flex-col gap-3 sm:flex-row">
          <Link
            href="/app"
            className="rounded-full bg-emerald-600 px-6 py-4 text-center text-sm font-black text-white transition hover:bg-emerald-700"
          >
            Acessar minha conta
          </Link>

          <Link
            href="/"
            className="rounded-full border border-stone-300 bg-white px-6 py-4 text-center text-sm font-black text-stone-700 transition hover:bg-stone-100"
          >
            Voltar ao início
          </Link>
        </div>
      </section>
    </main>
  );
}

function ContactCard({
  title,
  description,
  email,
}: {
  title: string;
  description: string;
  email: string;
}) {
  return (
    <article className="rounded-3xl border border-stone-200 bg-stone-50 p-5">
      <h2 className="text-lg font-black text-stone-950">{title}</h2>

      <p className="mt-3 text-sm leading-6 text-stone-600">{description}</p>

      <a
        href={`mailto:${email}`}
        className="mt-5 inline-flex rounded-full bg-white px-5 py-3 text-sm font-black text-emerald-700 ring-1 ring-stone-200 transition hover:bg-emerald-50"
      >
        {email}
      </a>
    </article>
  );
}