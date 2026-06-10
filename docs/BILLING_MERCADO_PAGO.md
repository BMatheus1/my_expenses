# Billing and Mercado Pago

O My Expenses e um SaaS pago:

- 1 mes gratis somente apos confirmacao da assinatura.
- Depois R$ 8,99 por mes.
- Nao existe plano gratis permanente.
- Autenticacao identifica o usuario; autorizacao vem de `/api/billing/me`.

## Fluxo principal

1. Usuario faz login com email/senha ou Google.
2. Frontend salva a sessao atual.
3. Frontend chama `GET /api/billing/me`.
4. Se `is_access_allowed` for `true`, renderiza o app.
5. Se `is_access_allowed` for `false`, renderiza paywall.

## Status internos

- `none`: usuario sem registro de assinatura.
- `pending`: assinatura criada, aguardando confirmacao.
- `trialing`: teste gratis valido.
- `active`: assinatura ativa.
- `past_due`: pagamento atrasado, dentro da regra de carencia atual.
- `blocked`: pagamento atrasado alem da carencia.
- `canceled`: assinatura cancelada.
- `expired`: trial vencido.
- `unknown`: status nao reconhecido.

## Atraso e bloqueio

A regra de atraso fica no backend. `past_due` pode liberar acesso enquanto estiver dentro da carencia configurada. Depois da carencia, a assinatura vira `blocked` e `is_access_allowed` fica `false`.

## Mercado Pago

- Criacao de assinatura/preapproval acontece somente no backend.
- `Access Token` e `Webhook Secret` nunca vao para o frontend.
- `Public Key` so deve ser publica se uma integracao frontend realmente usar.
- `back_url` deve apontar para `/pagamento/retorno`.
- Webhook deve atualizar assinatura por `provider_subscription_id` ou referencia externa segura.
- Sync manual deve consultar o Mercado Pago e atualizar a assinatura local.
- Cancelamento deve usar apenas a assinatura do usuario logado.

## Variaveis importantes

- `MERCADO_PAGO_ACCESS_TOKEN`
- `MERCADO_PAGO_WEBHOOK_SECRET`
- `MERCADO_PAGO_TEST_PAYER_EMAIL`
- `APP_PRICE_BRL`
- `APP_TRIAL_DAYS`
- `FRONTEND_URL`
- `APP_PUBLIC_URL`

## Teste vs producao

- Em testes, use credenciais de sandbox.
- Em producao, use token `APP_USR`.
- Nunca use e-mail pagador de teste em producao.
- Depois de trocar credenciais, validar checkout, webhook, retorno e sync.

## Como testar pagamento

1. Criar usuario novo.
2. Confirmar email, quando aplicavel.
3. Fazer login.
4. Ver paywall.
5. Clicar em comecar teste gratis.
6. Concluir Mercado Pago.
7. Voltar para `/pagamento/retorno`.
8. Verificar se sync libera `trialing` ou `active`.
