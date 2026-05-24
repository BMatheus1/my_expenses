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
          Última atualização: 24 de maio de 2026
        </p>

        <div className="mt-8 space-y-8 text-sm leading-7 text-stone-700">
          <section>
            <h2 className="text-xl font-black text-stone-950">
              1. Sobre o My Expenses
            </h2>

            <p className="mt-3">
              O My Expenses é uma aplicação para organização financeira pessoal,
              controle de ganhos, gastos, categorias, relatórios e pequenos
              controles de negócio.
            </p>

            <p className="mt-3">
              O aplicativo não substitui orientação financeira, contábil,
              jurídica, tributária ou profissional. As informações exibidas têm
              finalidade organizacional e dependem dos dados informados pelo
              próprio usuário.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-black text-stone-950">
              2. Cadastro e acesso
            </h2>

            <p className="mt-3">
              Para utilizar o My Expenses, o usuário deve criar uma conta,
              informar dados verdadeiros e manter suas credenciais em segurança.
              O acesso pode ocorrer por e-mail e senha ou por login Google,
              conforme o método escolhido.
            </p>

            <p className="mt-3">
              Contas criadas com Google devem ser acessadas pelo Google. Contas
              criadas com e-mail e senha devem ser acessadas pelo login normal.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-black text-stone-950">
              3. Responsabilidade do usuário
            </h2>

            <p className="mt-3">
              O usuário é responsável pelos dados financeiros que cadastra,
              pela conferência das informações, pela proteção de sua conta e pelo
              uso adequado da plataforma.
            </p>

            <p className="mt-3">
              É proibido tentar acessar, alterar, explorar, excluir ou visualizar
              dados de outros usuários, bem como tentar burlar mecanismos de
              segurança do sistema.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-black text-stone-950">
              4. Segurança da conta
            </h2>

            <p className="mt-3">
              O My Expenses utiliza medidas de segurança como autenticação,
              verificação de e-mail, isolamento de dados por usuário, tokens
              seguros, cookies HttpOnly, limitação de requisições e validações
              no backend.
            </p>

            <p className="mt-3">
              Mesmo com boas práticas de segurança, nenhum sistema é totalmente
              imune a falhas, indisponibilidades ou riscos técnicos.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-black text-stone-950">
              5. Disponibilidade do serviço
            </h2>

            <p className="mt-3">
              O serviço pode passar por manutenções, atualizações, correções,
              instabilidades ou interrupções temporárias. Faremos esforços
              razoáveis para manter a aplicação funcionando com segurança.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-black text-stone-950">
              6. Exclusão de conta
            </h2>

            <p className="mt-3">
              O usuário poderá solicitar ou realizar a exclusão da própria conta,
              quando a funcionalidade estiver disponível. A exclusão poderá
              remover dados pessoais, registros financeiros, categorias e demais
              dados vinculados à conta.
            </p>

            <p className="mt-3">
              A exclusão é uma ação sensível e pode ser irreversível.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-black text-stone-950">
              7. Alterações destes termos
            </h2>

            <p className="mt-3">
              Estes Termos de Uso podem ser atualizados para refletir mudanças
              técnicas, legais, operacionais ou melhorias no serviço. A versão
              vigente ficará disponível nesta página.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-black text-stone-950">
              8. Contato
            </h2>

            <p className="mt-3">
              Para dúvidas sobre estes termos, entre em contato pelo canal de
              suporte informado no aplicativo ou pelo e-mail oficial do serviço.
            </p>
          </section>
        </div>
      </section>
    </main>
  );
}