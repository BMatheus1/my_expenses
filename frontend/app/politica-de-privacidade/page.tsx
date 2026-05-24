export default function PrivacyPolicyPage() {
  return (
    <main className="min-h-screen bg-stone-50 px-4 py-10 text-stone-900">
      <section className="mx-auto max-w-4xl rounded-3xl border border-stone-200 bg-white p-6 shadow-sm sm:p-10">
        <p className="text-sm font-bold uppercase tracking-widest text-emerald-700">
          My Expenses
        </p>

        <h1 className="mt-3 text-3xl font-black tracking-tight text-stone-950">
          Política de Privacidade
        </h1>

        <p className="mt-3 text-sm leading-6 text-stone-500">
          Última atualização: 24 de maio de 2026
        </p>

        <div className="mt-8 space-y-8 text-sm leading-7 text-stone-700">
          <section>
            <h2 className="text-xl font-black text-stone-950">
              1. Dados que coletamos
            </h2>

            <p className="mt-3">
              Podemos coletar dados necessários para funcionamento da conta,
              como nome, e-mail, método de autenticação, data de criação da
              conta, informações de sessão e dados cadastrados pelo usuário.
            </p>

            <p className="mt-3">
              Também podemos armazenar registros financeiros informados pelo
              usuário, como ganhos, gastos, categorias, datas, descrições,
              negócios, materiais, serviços e demais informações necessárias ao
              funcionamento do app.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-black text-stone-950">
              2. Como usamos os dados
            </h2>

            <p className="mt-3">
              Usamos os dados para criar e proteger a conta, autenticar o
              usuário, exibir informações financeiras, gerar resumos, recuperar
              senha, confirmar e-mail, prevenir abuso, manter a segurança e
              melhorar a estabilidade do serviço.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-black text-stone-950">
              3. E-mails transacionais
            </h2>

            <p className="mt-3">
              Podemos enviar e-mails necessários para funcionamento da conta,
              como confirmação de e-mail, recuperação de senha e avisos
              importantes de segurança.
            </p>

            <p className="mt-3">
              Esses e-mails são operacionais e não têm finalidade de spam.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-black text-stone-950">
              4. Compartilhamento com serviços terceiros
            </h2>

            <p className="mt-3">
              Não vendemos dados pessoais dos usuários. Podemos utilizar
              provedores necessários para operar o app, como hospedagem,
              banco de dados, autenticação, envio de e-mails, monitoramento e
              infraestrutura.
            </p>

            <p className="mt-3">
              Esses provedores devem ser usados apenas para possibilitar o
              funcionamento do serviço.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-black text-stone-950">
              5. Segurança
            </h2>

            <p className="mt-3">
              Aplicamos medidas de segurança como autenticação, verificação de
              e-mail, controle de acesso por usuário, tokens seguros, cookies
              HttpOnly, limitação de requisições, validação de dados e separação
              entre ambientes.
            </p>

            <p className="mt-3">
              Ainda assim, nenhum sistema é totalmente imune a riscos. Por isso,
              também recomendamos que o usuário utilize senha forte e não
              compartilhe suas credenciais.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-black text-stone-950">
              6. Direitos do usuário
            </h2>

            <p className="mt-3">
              O usuário pode solicitar informações, correção ou exclusão de seus
              dados conforme funcionalidades disponíveis no app ou por meio do
              canal oficial de contato.
            </p>

            <p className="mt-3">
              Algumas informações podem precisar ser mantidas temporariamente
              por obrigação legal, segurança, auditoria ou prevenção de fraude.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-black text-stone-950">
              7. Retenção e exclusão
            </h2>

            <p className="mt-3">
              Mantemos os dados enquanto a conta estiver ativa ou enquanto forem
              necessários para prestação do serviço, segurança, auditoria,
              cumprimento de obrigações legais ou resolução de problemas
              técnicos.
            </p>

            <p className="mt-3">
              Ao excluir a conta, os dados vinculados ao usuário poderão ser
              removidos do sistema, exceto quando houver necessidade legítima ou
              obrigação de retenção.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-black text-stone-950">
              8. Contato
            </h2>

            <p className="mt-3">
              Para solicitações relacionadas à privacidade, use o canal oficial
              informado no aplicativo ou o e-mail de suporte definido pelo
              responsável pelo serviço.
            </p>
          </section>
        </div>
      </section>
    </main>
  );
}