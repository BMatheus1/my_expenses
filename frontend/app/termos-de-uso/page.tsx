export default function TermsOfUsePage() {
  return (
    <main className="min-h-screen bg-stone-50 px-4 py-10 text-stone-900">
      <section className="mx-auto max-w-4xl rounded-3xl border border-stone-200 bg-white p-6 shadow-sm sm:p-10">
        <p className="text-sm font-bold uppercase tracking-widest text-emerald-700">
          My Expenses
        </p>

        <h1 className="mt-3 text-3xl font-black tracking-tight text-stone-950">
          Termos de Uso
        </h1>

        <p className="mt-3 text-sm leading-6 text-stone-500">
          Ultima atualizacao: 03 de junho de 2026
        </p>

        <div className="mt-8 space-y-8 text-sm leading-7 text-stone-700">
          <section>
            <h2 className="text-xl font-black text-stone-950">
              1. Sobre o My Expenses
            </h2>

            <p className="mt-3">
              O My Expenses e uma aplicacao para organizacao financeira pessoal,
              controle de ganhos, gastos, categorias, relatorios e pequenos
              controles de negocio.
            </p>

            <p className="mt-3">
              O aplicativo nao substitui orientacao financeira, contabil,
              juridica, tributaria ou profissional. As informacoes exibidas tem
              finalidade organizacional e dependem dos dados informados pelo
              proprio usuario.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-black text-stone-950">
              2. Cadastro e acesso
            </h2>

            <p className="mt-3">
              Para utilizar o My Expenses, o usuario deve criar uma conta,
              informar dados verdadeiros e manter suas credenciais em seguranca.
              O acesso pode ocorrer por e-mail e senha ou por login Google.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-black text-stone-950">
              3. Teste gratis, assinatura e pagamento
            </h2>

            <p className="mt-3">
              O My Expenses e um app pago. Novos usuarios podem ter acesso a 1
              mes gratis. Apos o periodo de teste, o uso completo depende de
              assinatura recorrente de R$ 8,99 por mes.
            </p>

            <p className="mt-3">
              Os pagamentos sao processados pelo Mercado Pago. O app nao coleta
              nem armazena dados completos de cartao. Se houver falha de
              pagamento, cancelamento, assinatura vencida ou ausencia de
              assinatura ativa, o acesso aos modulos principais podera ser
              bloqueado ate regularizacao.
            </p>

            <p className="mt-3">
              O usuario pode cancelar quando quiser. Alteracoes futuras de preco
              poderao ocorrer apenas com aviso previo adequado.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-black text-stone-950">
              4. Responsabilidade do usuario
            </h2>

            <p className="mt-3">
              O usuario e responsavel pelos dados financeiros que cadastra, pela
              conferencia das informacoes, pela protecao de sua conta e pelo uso
              adequado da plataforma.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-black text-stone-950">
              5. Seguranca da conta
            </h2>

            <p className="mt-3">
              O My Expenses utiliza autenticacao, verificacao de e-mail,
              isolamento de dados por usuario, tokens seguros, cookies HttpOnly,
              rate limit e validacoes no backend.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-black text-stone-950">
              6. Disponibilidade do servico
            </h2>

            <p className="mt-3">
              O servico pode passar por manutencoes, atualizacoes, correcoes,
              instabilidades ou interrupcoes temporarias.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-black text-stone-950">
              7. Exclusao de conta
            </h2>

            <p className="mt-3">
              O usuario podera solicitar ou realizar a exclusao da propria
              conta. A exclusao podera remover dados pessoais, registros
              financeiros, categorias e demais dados vinculados a conta.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-black text-stone-950">
              8. Alteracoes destes termos
            </h2>

            <p className="mt-3">
              Estes Termos de Uso podem ser atualizados para refletir mudancas
              tecnicas, legais, operacionais ou melhorias no servico.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-black text-stone-950">
              9. Contato
            </h2>

            <p className="mt-3">
              Para duvidas sobre estes termos, entre em contato pelo canal de
              suporte informado no aplicativo ou pelo e-mail oficial do servico.
            </p>
          </section>
        </div>
      </section>
    </main>
  );
}
