# My Expenses

**My Expenses** é uma aplicação web para controle financeiro pessoal e organização de ganhos, gastos, categorias, relatórios e pequenos controles de negócio.

O projeto foi desenvolvido com foco em praticidade, segurança, organização financeira e experiência simples para o usuário final.

## Acesso

Aplicação web:

```txt
https://myexpensesfinance.com
```

API:

```txt
https://api.myexpensesfinance.com/api/health
```

---

## Visão geral

O My Expenses permite que usuários organizem sua vida financeira de forma simples, com cadastro seguro, autenticação por e-mail e senha ou Google, verificação de e-mail, recuperação de senha e isolamento dos dados por usuário.

Cada usuário acessa apenas os próprios dados. O sistema foi estruturado para evitar que uma conta visualize, edite ou exclua informações pertencentes a outra conta.

---

## Principais funcionalidades

- Cadastro com nome, e-mail, senha e aceite dos termos;
- Verificação de e-mail por link;
- Login com e-mail e senha;
- Login com Google;
- Recuperação de senha por e-mail;
- Refresh token em cookie HttpOnly;
- Sessão protegida;
- Cadastro de gastos;
- Cadastro de ganhos;
- Categorias personalizadas;
- Assinatura Mercado Pago com teste gratis de 1 mes e mensalidade de R$ 8,99;
- Paywall baseado em `/api/billing/me`;
- Sincronizacao e cancelamento de assinatura;
- Edição e exclusão de registros;
- Resumo financeiro;
- Configurações de aparência e segurança;
- Exclusão de conta e dados;
- Termos de Uso e Política de Privacidade;
- API protegida com autenticação;
- Isolamento de dados por usuário.

---

## Segurança

O projeto possui medidas de segurança importantes para uso com dados financeiros:

- Autenticação com access token;
- Refresh token armazenado em cookie HttpOnly;
- Separação entre conta Google e conta com e-mail/senha;
- Verificação de e-mail obrigatória para contas criadas com e-mail e senha;
- Recuperação de senha com token seguro e expiração;
- Tokens sensíveis armazenados como hash no banco;
- Rate limit para rotas sensíveis;
- Headers de segurança;
- CORS controlado;
- Validação de dados no backend;
- Testes de autorização por usuário;
- Proteção contra acesso indevido a dados de outros usuários;
- Exclusão de conta com confirmação;
- Para contas Google, exclusão exige nova confirmação com Google.

---

## Tecnologias utilizadas

### Frontend

- Next.js;
- React;
- TypeScript;
- Tailwind CSS;
- Vercel.

### Backend

- Python;
- FastAPI;
- Pydantic;
- PostgreSQL;
- Uvicorn;
- Render.

### Autenticação e e-mail

- Google OAuth;
- JWT;
- Cookies HttpOnly;
- Resend API para e-mails transacionais.

### Banco de dados

- PostgreSQL.

---

## Estrutura geral do projeto

```txt
my_expenses/
├── backend/
│   ├── app/
│   │   ├── auth.py
│   │   ├── auth_service.py
│   │   ├── config.py
│   │   ├── email_service.py
│   │   ├── routes.py
│   │   ├── schemas.py
│   │   ├── security.py
│   │   ├── storage.py
│   │   └── ...
│   ├── tests/
│   ├── scripts/
│   └── requirements.txt
│
├── frontend/
│   ├── app/
│   │   ├── components/
│   │   ├── lib/
│   │   ├── types/
│   │   ├── termos-de-uso/
│   │   └── politica-de-privacidade/
│   └── package.json
│
├── LICENSE.md
└── README.md
```

---

## Variáveis de ambiente

> Nunca envie arquivos `.env` reais para o GitHub. Use apenas arquivos `.env.example` sem segredos.

### Backend

Exemplo de variáveis necessárias no backend:

```env
APP_ENV=production
APP_DEBUG=false

DATABASE_URL=postgresql://usuario:senha@host:porta/banco

SECRET_KEY=sua_chave_secreta_com_mais_de_32_caracteres

ACCESS_TOKEN_EXPIRE_MINUTES=15
REFRESH_TOKEN_EXPIRE_DAYS=30
REFRESH_COOKIE_NAME=my_expenses_refresh_token
REFRESH_COOKIE_PATH=/api/auth
REFRESH_COOKIE_SECURE=true
REFRESH_COOKIE_SAMESITE=none

FRONTEND_URL=https://myexpensesfinance.com
CORS_ORIGINS=https://myexpensesfinance.com,https://www.myexpensesfinance.com

GOOGLE_CLIENT_ID=seu_google_client_id

RESEND_API_KEY=sua_api_key_da_resend
SMTP_FROM_EMAIL=no-reply@myexpensesfinance.com
SMTP_FROM_NAME=My Expenses

PASSWORD_RESET_TOKEN_EXPIRE_MINUTES=30
EMAIL_VERIFICATION_TOKEN_EXPIRE_MINUTES=1440

RATE_LIMIT_ENABLED=true
SECURITY_HEADERS_ENABLED=true
```

### Frontend

Exemplo de variáveis necessárias no frontend:

```env
NEXT_PUBLIC_API_URL=https://api.myexpensesfinance.com/api
NEXT_PUBLIC_GOOGLE_CLIENT_ID=seu_google_client_id
```

---

## Como rodar localmente

### Backend

Entre na pasta do backend:

```bash
cd backend
```

Crie e ative o ambiente virtual:

```bash
python -m venv .venv
```

No Windows PowerShell:

```powershell
.\.venv\Scripts\Activate.ps1
```

Instale as dependências:

```bash
pip install -r requirements.txt
```

Rode a API:

```bash
uvicorn app.main:app --reload
```

API local:

```txt
http://127.0.0.1:8000
```

Health check local:

```txt
http://127.0.0.1:8000/api/health
```

### Frontend

Entre na pasta do frontend:

```bash
cd frontend
```

Instale as dependências:

```bash
npm install
```

Rode o projeto:

```bash
npm run dev
```

Frontend local:

```txt
http://127.0.0.1:3000
```

---

## Testes

### Backend

```bash
cd backend
python -m compileall .
pytest -q
```

### Frontend

```bash
cd frontend
npm run lint
npm run build
npx tsc --noEmit
```

---

## Documentacao de manutencao

Guias operacionais criados para evoluir o projeto com seguranca:

- `docs/MAINTENANCE.md`: manutencao, responsabilidades e checklist antes de deploy;
- `docs/BILLING_MERCADO_PAGO.md`: assinatura, trial, status internos, sync, webhook e cancelamento;
- `docs/SECURITY.md`: isolamento por usuario, tokens, cookies, CORS e logs seguros;
- `docs/DATABASE.md`: tabelas principais, indices e status de assinatura;
- `docs/DEPLOY.md`: Render, Vercel, variaveis e rollback;
- `docs/TROUBLESHOOTING.md`: problemas comuns e passos de diagnostico.

---

## Testes de segurança realizados

O projeto possui testes cobrindo pontos críticos como:

- Usuário sem autenticação não acessa rotas protegidas;
- Usuário não acessa gastos de outro usuário;
- Usuário não edita gastos de outro usuário;
- Usuário não exclui gastos de outro usuário;
- Usuário não acessa ganhos de outro usuário;
- Conta normal não entra antes de verificar e-mail;
- Conta normal exige senha para exclusão;
- Conta Google exige nova confirmação Google para exclusão;
- Conta Google não pode ser excluída com outro e-mail Google;
- Exclusão de conta remove o acesso posterior.

---

## Deploy

### Frontend

Hospedado na Vercel:

```txt
https://myexpensesfinance.com
```

### Backend

Hospedado na Render:

```txt
https://api.myexpensesfinance.com
```

### E-mails transacionais

Envio realizado via Resend API:

- Confirmação de e-mail;
- Recuperação de senha;
- E-mails operacionais de segurança.

---

## Domínios

Estrutura utilizada:

```txt
myexpensesfinance.com        → Frontend
www.myexpensesfinance.com    → Frontend
api.myexpensesfinance.com    → Backend/API
```

---

## Status do projeto

Versão atual:

```txt
v1.0.0-beta
```

O projeto está em fase beta, com foco em validação, testes controlados, ajustes de segurança, melhoria da experiência do usuário e preparação para lançamento público.

---

## Próximos passos planejados

- Backup automático do banco de dados;
- Página de contato e suporte;
- Melhorias na landing page;
- Monitoramento de erros;
- Página de preços;
- Integração com pagamento;
- Painel administrativo básico para acompanhamento do produto.

---

## Licença

Este projeto é proprietário.

Nenhuma permissão é concedida para copiar, modificar, distribuir, sublicenciar, vender, publicar, hospedar, reproduzir ou criar trabalhos derivados sem autorização prévia e expressa do proprietário.

Consulte o arquivo:

```txt
LICENSE.md
```

---

## Autor

Desenvolvido por **Matheus Brito da Silva**.

Projeto criado com foco em organização financeira, segurança, aprendizado em desenvolvimento full stack e lançamento de produto digital real.
