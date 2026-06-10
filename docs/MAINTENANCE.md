# Maintenance Guide

Este guia resume como manter o My Expenses sem espalhar regra de negocio ou quebrar isolamento de dados.

## Principios

- Preserve comportamento antes de refatorar.
- Rode testes antes e depois de mudancas relevantes.
- Backend e a fonte da verdade para acesso pago.
- Nunca confie em `user_id` vindo do frontend.
- Prefira mudancas pequenas e verificaveis.

## Onde mexer

- Autenticacao: `backend/app/auth.py`, `backend/app/auth_service.py`, `backend/app/security.py`, `frontend/app/components/AuthGate.tsx`, `frontend/app/components/AuthPage.tsx`.
- Assinatura: `backend/app/billing_service.py`, `backend/app/billing_domain.py`, `backend/app/billing_repository.py`, `backend/app/billing_routes.py`, `frontend/app/lib/billing-api.ts`.
- Mercado Pago: `backend/app/mercado_pago_client.py` e `backend/app/billing_service.py`.
- Gastos, ganhos e categorias: `backend/app/routes.py`, `backend/app/services.py`, `backend/app/storage.py`, `frontend/app/components/*`.
- Negocios: arquivos `backend/app/business_*` e `frontend/app/components/business/*`.
- Preferencias por conta: rotas/configuracoes no backend e componentes de settings no frontend.

## Checklist antes de deploy

- `python -m compileall .` em `backend`.
- `pytest` em `backend`.
- `npm run lint` em `frontend`.
- `npm run build` em `frontend`.
- `npx tsc --noEmit` em `frontend`, quando aplicavel.
- Conferir variaveis de ambiente de producao.
- Conferir webhook Mercado Pago apontando para o backend correto.
- Conferir CORS, cookies e dominio final.

## Regras que nao devem ser duplicadas

- Acesso ao app: usar `/api/billing/me` e `require_paid_access`.
- Status de assinatura: manter centralizado no backend.
- Mensagens de billing vindas do backend: nao liberar acesso por `localStorage`, query param ou redirect.
- Isolamento por usuario: filtrar sempre por `current_user.id`.
