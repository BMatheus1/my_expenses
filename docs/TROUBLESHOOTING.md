# Troubleshooting

## Mercado Pago nao redireciona

- Conferir `FRONTEND_URL`.
- Conferir `back_url` enviada na preapproval.
- Conferir credenciais sandbox vs producao.
- Conferir se o usuario concluiu o fluxo no Mercado Pago.

## Webhook atrasa

- Usar botao "Verificar assinatura" para chamar sync.
- Conferir logs do backend.
- Conferir se o webhook esta apontando para a URL de producao correta.
- Verificar idempotencia em `payment_events`.

## Usuario voltou para paywall apos pagar

- Chamar `/api/billing/sync`.
- Conferir `provider_subscription_id`.
- Conferir status retornado pelo Mercado Pago.
- Confirmar que o frontend nao esta liberando ou bloqueando por localStorage.

## Login Google falha localmente

- Conferir `NEXT_PUBLIC_GOOGLE_CLIENT_ID`.
- Conferir `GOOGLE_CLIENT_ID` no backend.
- Conferir origem local autorizada no console do Google.
- Confirmar que o frontend local aponta para a API local.

## Email nao verifica

- Conferir `RESEND_API_KEY`.
- Conferir remetente autorizado.
- Conferir expiracao do token.
- Conferir URL de frontend usada no link.

## Build falhando

- Frontend: rodar `npm run lint`, `npx tsc --noEmit` e `npm run build`.
- Backend: rodar `python -m compileall .` e `pytest`.
- Remover artefatos locais apenas se forem cache/build, nunca arquivos de codigo.

## CORS ou sessao no mobile

- Conferir dominio real usado no aparelho.
- Conferir `CORS_ORIGINS`.
- Conferir flags do cookie de refresh.
- Em producao, usar HTTPS.

## Banco Render

- Conferir `DATABASE_URL`.
- Conferir conexoes ativas.
- Conferir indices basicos por `user_id`.
- Nao rodar comandos destrutivos sem backup.
