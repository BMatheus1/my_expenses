# Security Guide

Seguranca no My Expenses depende de autenticacao correta, isolamento por usuario e secrets fora do frontend.

## Isolamento por usuario

- Toda rota privada deve depender do usuario autenticado.
- Dados financeiros devem ser buscados com `current_user.id`.
- Endpoints nao devem aceitar `user_id` do frontend para decidir ownership.
- Atualizar ou excluir registros exige validar dono do recurso.
- Respostas nao devem vazar dados sensiveis ou registros de outro usuario.

## BOLA/IDOR

Risco principal: usuario alterar IDs manualmente na API. A protecao esperada e retornar `403`, `404` ou resposta vazia segura quando o recurso pertence a outra conta.

Areas criticas:

- Gastos.
- Ganhos.
- Cartoes.
- Negocios.
- Materiais, servicos e vendas.
- Preferencias.
- Assinatura e cancelamento.
- Relatorios e dashboards.

## Tokens, cookies e CORS

- Refresh token fica em cookie HttpOnly.
- Access token nao deve ser logado.
- CORS deve listar apenas origens confiaveis.
- Cookies em producao devem usar configuracao segura para HTTPS.

## Logs seguros

Nunca logar:

- Senhas.
- Refresh tokens.
- Access tokens.
- `SECRET_KEY`.
- `MERCADO_PAGO_ACCESS_TOKEN`.
- `MERCADO_PAGO_WEBHOOK_SECRET`.
- Dados completos de cartao.

## Mercado Pago

- Access Token somente no backend.
- Webhook Secret somente no backend.
- Webhook deve ser idempotente.
- Redirect ou query param nunca liberam acesso sozinho.
- Backend e a fonte da verdade para `is_access_allowed`.
