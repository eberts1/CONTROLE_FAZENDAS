# Deploy da API no Railway + Vercel

Frontend: [controle-fazendas-web.vercel.app](https://controle-fazendas-web.vercel.app/login)

A API NestJS **não roda no Vercel**. Siga este guia para publicar a API e o PostgreSQL no [Railway](https://railway.app).

---

## Visão geral

```text
Vercel (apps/web)  ──NEXT_PUBLIC_API_URL──►  Railway (apps/api)
                                                    │
                                                    ▼
                                            PostgreSQL (Railway)
```

---

## Parte 1 — Conta e projeto no Railway

1. Acesse [railway.app](https://railway.app) e entre com GitHub.
2. **New Project** → **Deploy from GitHub repo**.
3. Escolha o repositório `eberts1/CONTROLE_FAZENDAS`.
4. O Railway cria um serviço. Renomeie para `api` (opcional).

---

## Parte 2 — Banco PostgreSQL

1. No mesmo projeto, clique **+ New** → **Database** → **PostgreSQL**.
2. Aguarde ficar **Active**.
3. Abra o Postgres → aba **Variables** → copie `DATABASE_URL` (só para conferência).

---

## Parte 3 — Variáveis da API

Abra o serviço **api** (não o Postgres) → **Variables** → **Raw Editor** e cole (ajuste os segredos JWT):

```env
DATABASE_URL=${{Postgres.DATABASE_URL}}
JWT_SECRET=COLOQUE_UMA_STRING_LONGA_ALEATORIA_AQUI
JWT_REFRESH_SECRET=COLOQUE_OUTRA_STRING_LONGA_ALEATORIA_AQUI
JWT_ACCESS_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d
CORS_ORIGIN=https://controle-fazendas-web.vercel.app
NODE_ENV=production
```

### Como gerar JWT_SECRET no PowerShell

```powershell
[Convert]::ToBase64String((1..32 | ForEach-Object { Get-Random -Maximum 256 }) -as [byte[]])
```

Execute duas vezes (uma para `JWT_SECRET`, outra para `JWT_REFRESH_SECRET`).

### Referência do banco

`${{Postgres.DATABASE_URL}}` só funciona se o serviço PostgreSQL se chama **Postgres** no Railway. Se o nome for outro, use o menu **Add Reference** na variável `DATABASE_URL` e selecione o Postgres.

---

## Parte 4 — Build (já no repositório)

O arquivo `railway.toml` na raiz define:

- **Build:** instala deps, gera Prisma, compila a API
- **Pre-deploy:** migrations + seed (cria admin e gerente)
- **Start:** sobe a API na porta do Railway

Confirme em **Settings** do serviço api:

| Campo | Valor |
|-------|-------|
| **Root Directory** | *(vazio — raiz do repo)* |
| **Watch Paths** | opcional: `apps/api`, `packages` |

Faça **Deploy** (ou push no GitHub dispara automaticamente).

---

## Parte 5 — URL pública da API

1. Serviço **api** → **Settings** → **Networking**.
2. **Generate Domain** (ex.: `controle-fazendas-api-production-xxxx.up.railway.app`).
3. Teste no navegador: `https://SEU-DOMINIO.up.railway.app/api/docs` (Swagger deve abrir).

### Testar login (PowerShell)

```powershell
$body = '{"email":"manager@controlefazendas.com","password":"manager123"}'
Invoke-RestMethod -Uri "https://SEU-DOMINIO.up.railway.app/api/v1/auth/login" -Method POST -ContentType "application/json" -Body $body
```

Se retornar `accessToken`, API + banco + seed estão OK.

---

## Parte 6 — Vercel (frontend)

1. [vercel.com](https://vercel.com) → projeto `controle-fazendas-web`.
2. **Settings** → **Environment Variables**:

| Nome | Valor |
|------|-------|
| `NEXT_PUBLIC_API_URL` | `https://SEU-DOMINIO.up.railway.app/api/v1` |

3. **Deployments** → último deploy → **⋯** → **Redeploy** (obrigatório após criar a variável).

---

## Credenciais demo (após seed)

| Perfil | E-mail | Senha |
|--------|--------|-------|
| Admin | admin@controlefazendas.com | admin123 |
| Gerente | manager@controlefazendas.com | manager123 |

---

## Problemas comuns

| Sintoma | Solução |
|---------|---------|
| Build falha: `Cannot find module '@controle-fazendas/shared'` ou `AnimalSex` no Prisma | Faça **git push** com a correção do `apps/api/package.json` e redeploy. O build precisa rodar `db:generate` antes do `nest build`. **Não** use só o serviço `@controle-fazendas/web` no Railway — remova-o; só a **API** + Postgres. |
| Login no Vercel falha / Network Error | Falta `NEXT_PUBLIC_API_URL` ou falta **Redeploy** no Vercel |
| CORS no console do navegador | `CORS_ORIGIN` deve ser exatamente `https://controle-fazendas-web.vercel.app` |
| 401 no login | Rodar seed: no Railway → serviço api → **Settings** → redeploy, ou terminal: `pnpm db:seed` com `DATABASE_URL` |
| Build falha no Railway | Ver logs; confirme Node 20 e `pnpm-lock.yaml` no repo |
| `/api/docs` não abre | Deploy da API ainda em andamento ou build com erro |

---

## Ordem resumida

1. Railway: Postgres + API + variáveis  
2. Deploy API → copiar domínio público  
3. Testar `/api/v1/auth/login`  
4. Vercel: `NEXT_PUBLIC_API_URL` + Redeploy  
5. Login em [controle-fazendas-web.vercel.app/login](https://controle-fazendas-web.vercel.app/login)
