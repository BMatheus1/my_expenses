# Database Guide

O banco principal e PostgreSQL. Nao aplicar alteracoes destrutivas sem backup e plano de rollback.

## Tabelas principais

- `users`: conta, email, status, role e dados de login.
- `user_settings`: preferencias e tema por usuario.
- `user_subscriptions`: assinatura, status interno, status de pagamento e datas de trial/cobranca.
- `payment_events`: eventos de webhook para idempotencia.
- `expenses`: gastos do usuario.
- `incomes`: ganhos do usuario.
- `credit_cards`: cartoes do usuario.
- `businesses`: negocios do usuario.

## Relacoes importantes

- Dados financeiros devem ter vinculo com `user_id`.
- Dados de negocios devem pertencer ao negocio e ao usuario correto.
- Preferencias devem ser por usuario.
- Assinatura deve ser consultada pelo usuario autenticado ou por identificador seguro do provedor no webhook.

## Indices uteis

- `users.email` unico.
- `user_subscriptions.user_id`.
- `user_subscriptions.provider_subscription_id` unico quando existir.
- Indices por `user_id` nas tabelas financeiras.
- Indice idempotente para eventos de pagamento.

## Status de assinatura

Status aceitos:

- `pending`
- `trialing`
- `active`
- `past_due`
- `blocked`
- `canceled`
- `expired`
- `unknown`

## Operacao manual de emergencia

Para liberar acesso manualmente em emergencia, prefira criar ou atualizar `user_subscriptions` com status coerente (`active` ou `trialing`) e datas explicitas. Registrar o motivo fora do banco operacional, quando possivel, e reverter assim que Mercado Pago estiver sincronizado.

Nunca apagar dados reais para "corrigir" status sem backup.
