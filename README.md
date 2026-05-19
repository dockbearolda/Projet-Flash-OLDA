# Devis Flash

Générateur de devis pour **OLDA** — atelier d'impression DTF sur textile à Saint-Martin (SXM).

## Stack

- **Monorepo** pnpm workspaces (Node 20 LTS)
- **Web** : Vite 6 + React 18 + TypeScript strict + Tailwind v4 + Zustand
- **API** : Hono + Prisma 6 + PostgreSQL
- **PDF** : @react-pdf/renderer (client-side)
- **Auth** : mot de passe partagé, cookie httpOnly
- **PWA** : offline-first via service worker, persistance IndexedDB

## Commandes

```bash
# Install
pnpm install

# Dev (web + api en parallèle dans deux terminaux)
pnpm dev               # SPA Vite sur :5173 (proxy /api → :3001)
pnpm dev:api           # API Hono sur :3001

# Vérifs
pnpm lint
pnpm typecheck
pnpm test
pnpm test:e2e

# Build
pnpm build

# DB
pnpm --filter @df/api db:migrate
pnpm --filter @df/api db:seed
```

## Variables d'env

Voir `apps/api/.env.example`.

- `DATABASE_URL` — PostgreSQL Railway
- `APP_PASSWORD` — mot de passe partagé (login `/login`)
- `SESSION_SECRET` — 32 caractères min, signe le cookie httpOnly
- `PUBLIC_APP_URL` — URL publique
- `NODE_ENV`, `PORT`

## Déploiement Railway

Le `Dockerfile` multistage build SPA + API, puis sert tout depuis Node 20 + Hono.
Au démarrage : `prisma migrate deploy`. Healthcheck `/api/health`.

## Structure

```
devis-flash/
├── apps/
│   ├── web/        # SPA React (Vite)
│   └── api/        # Hono + Prisma
├── packages/
│   └── shared/     # Zod schemas, catalogue, types
├── DECISIONS.md
├── PROGRESS.md
└── README.md
```

Voir `DECISIONS.md` pour les choix techniques et `PROGRESS.md` pour l'avancement.
