export default function PrivacyPolicyPage() {
  return (
    <main className="min-h-screen bg-stone-50 px-4 py-10 text-stone-900">
      <section className="mx-auto max-w-4xl rounded-3xl border border-stone-200 bg-white p-6 shadow-sm sm:p-10">
        <p className="text-sm font-bold uppercase tracking-widest text-emerald-700">
          My Expenses
        </p>

        <h1 className="mt-3 text-3xl font-black tracking-tight text-stone-950">
          Politica de Privacidade
        </h1>

        <p className="mt-3 text-sm leading-6 text-stone-500">
          Ultima atualizacao: 03 de junho de 2026
        </p>

        <div className="mt-8 space-y-8 text-sm leading-7 text-stone-700">
          <section>
            <h2 className="text-xl font-black text-stone-950">
              1. Dados que coletamos
            </h2>

            <p className="mt-3">
              Podemos coletar dados necessarios para funcionamento da conta,
              como nome, e-mail, metodo de autenticacao, data de criacao da
              conta, informacoes de sessao e dados cadastrados pelo usuario.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-black text-stone-950">
              2. Dados financeiros do app
            </h2>

            <p className="mt-3">
              Armazenamos registros financeiros informados pelo usuario, como
              ganhos, gastos, categorias, datas, descricoes, negocios, materiais
              e servicos necessarios ao funcionamento do app.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-black text-stone-950">
              3. Como usamos os dados
            </h2>

            <p className="mt-3">
              Usamos os dados para criar e proteger a conta, autenticar o
              usuario, exibir informacoes financeiras, gerar resumos, recuperar
              senha, confirmar e-mail, prevenir abuso e manter a seguranca.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-black text-stone-950">
              4. Compartilhamento com terceiros
            </h2>

            <p className="mt-3">
              Nao vendemos dados pessoais. Podemos utilizar provedores
              necessarios para operar o app, como hospedagem, banco de dados,
              autenticacao, envio de e-mails, monitoramento e infraestrutura.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-black text-stone-950">
              5. Pagamentos e Mercado Pago
            </h2>

            <p className="mt-3">
              O Mercado Pago e utilizado como processador de pagamento da
              assinatura do My Expenses. Podemos armazenar identificadores de
              assinatura, status de pagamento, datas de periodo, eventos de
              cobranca e informacoes necessarias para liberar ou bloquear acesso.
            </p>

            <p className="mt-3">
              O My Expenses nao armazena dados completos de cartao. Os dados
              financeiros cadastrados no app ficam separados dos dados de
              pagamento processados pelo Mercado Pago.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-black text-stone-950">
              6. Seguranca
            </h2>

            <p className="mt-3">
              Aplicamos autenticacao, verificacao de e-mail, controle de acesso
              por usuario, tokens seguros, cookies HttpOnly, rate limit,
              validacao de dados e separacao entre ambientes.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-black text-stone-950">
              7. Direitos do usuario
            </h2>

            <p className="mt-3">
              O usuario pode solicitar informacoes, correcao ou exclusao de seus
              dados conforme funcionalidades disponiveis no app ou por meio do
              canal oficial de contato.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-black text-stone-950">
              8. Retencao e exclusao
            </h2>

            <p className="mt-3">
              Mantemos os dados enquanto a conta estiver ativa ou enquanto forem
              necessarios para prestacao do servico, seguranca, auditoria,
              cumprimento de obrigacoes legais ou resolucao de problemas.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-black text-stone-950">
              9. Contato
            </h2>

            <p className="mt-3">
              Para solicitacoes relacionadas a privacidade, use o canal oficial
              informado no aplicativo ou o e-mail de suporte definido pelo
              responsavel pelo servico.
            </p>
          </section>
        </div>
      </section>
    </main>
  );
}
