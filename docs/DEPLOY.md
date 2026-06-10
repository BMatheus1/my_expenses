# Deploy Guide

## Backend Render

- Aplicacao FastAPI.
- Configurar `DATABASE_URL`.
- Configurar secrets de autenticacao, email e Mercado Pago.
- Expor rota `/api/health` para verificacao.
- Garantir CORS apontando para dominios do frontend.

## Frontend Vercel

- Aplicacao Next.js.
- Configurar `NEXT_PUBLIC_API_URL`.
- Configurar `NEXT_PUBLIC_GOOGLE_CLIENT_ID`.
- Conferir dominio principal e `www`.
- Rodar build antes de promover para producao.

## Checklist de producao

- Backend com HTTPS.
- Frontend com HTTPS.
- Cookies configurados para o dominio correto.
- CORS sem origem aberta.
- Google Client ID com origins e redirects corretos.
- Mercado Pago usando token de producao `APP_USR`.
- Webhook Mercado Pago apontando para `/api/billing/webhook/mercado-pago`.
- Logs sem secrets.

## Rollback

1. Identificar se falha esta no frontend, backend, banco ou provedor.
2. Voltar deploy anterior na Vercel ou Render.
3. Nao executar migracao destrutiva durante incidente.
4. Validar login, billing, paywall e rotas principais depois do rollback.
