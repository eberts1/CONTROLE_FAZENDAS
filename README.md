# Controle Fazendas

Sistema SaaS multi-fazenda para gestão de áreas e processos operacionais.

## Stack

- **Monorepo:** Turborepo + pnpm
- **Frontend:** Next.js 15, Tailwind CSS 4, shadcn/ui, next-themes
- **Backend:** NestJS, Prisma, PostgreSQL
- **Auth:** JWT (access + refresh tokens)

## Pré-requisitos

- Node.js 20+
- pnpm 9+
- Docker (para PostgreSQL)

## Setup local

```bash
# 1. Instalar dependências
pnpm install

# 2. Subir PostgreSQL
docker compose up -d

# 3. Gerar client Prisma e rodar migrations
pnpm db:generate
pnpm db:migrate

# 4. Popular banco com dados demo
pnpm db:seed

# 5. Iniciar web + api
pnpm dev
```

## URLs

| Serviço | URL |
|---------|-----|
| Frontend | http://localhost:3000 |
| API | http://localhost:4000/api/v1 |
| Swagger | http://localhost:4000/api/docs |

## Credenciais demo

| Perfil | E-mail | Senha |
|--------|--------|-------|
| Admin | admin@controlefazendas.com | admin123 |
| Gerente | manager@controlefazendas.com | manager123 |

## Estrutura

```
apps/web      → Frontend Next.js
apps/api      → Backend NestJS
packages/database → Prisma schema + client
packages/shared   → Types e schemas Zod compartilhados
```

## Deploy em produção (Vercel + Railway)

O frontend está no Vercel; a API e o PostgreSQL ficam no Railway.

**Guia completo:** [docs/DEPLOY-RAILWAY.md](./docs/DEPLOY-RAILWAY.md)

Resumo:

1. Railway: Postgres + serviço da API com variáveis (`DATABASE_URL`, `JWT_*`, `CORS_ORIGIN`)
2. Domínio público da API → `NEXT_PUBLIC_API_URL=https://sua-api.up.railway.app/api/v1` no Vercel + **Redeploy**
3. Login: `manager@controlefazendas.com` / `manager123` (após seed)

## Scripts

| Comando | Descrição |
|---------|-----------|
| `pnpm dev` | Sobe web e api em paralelo |
| `pnpm build` | Build de todos os pacotes |
| `pnpm db:migrate` | Roda migrations Prisma |
| `pnpm db:seed` | Popula banco com dados demo |
| `pnpm db:studio` | Abre Prisma Studio |
| `pnpm railway:build` | Build da API para Railway |
