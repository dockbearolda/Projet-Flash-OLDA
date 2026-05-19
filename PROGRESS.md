# Progress — Devis Flash

Avancement séquentiel des 12 étapes (§31 du brief).

---

## Étape 1 — Setup monorepo

- **Fichiers créés** :
  - Racine : `package.json`, `pnpm-workspace.yaml`, `tsconfig.base.json`, `eslint.config.mjs`, `.prettierrc`, `.prettierignore`, `.editorconfig`, `.gitignore`, `.nvmrc`, `.npmrc`, `.dockerignore`, `Dockerfile`, `railway.json`, `.github/workflows/ci.yml`, `.husky/pre-commit`, `README.md`, `DECISIONS.md`, `PROGRESS.md`
  - `apps/web` : package, vite/vitest/playwright config, tsconfig app/node, `index.html`, `src/main.tsx`, `src/app/{globals.css,router.tsx,providers.tsx,PageFallback.tsx}`, pages stub `tablet/TabletPage.tsx` et `dev/DevComponentsPage.tsx`, `public/favicon.svg`, `src/test/setup.ts`
  - `apps/api` : package, tsconfig, `src/server.ts` (Hono `/api/health`), `prisma/schema.prisma` (stub Product), `prisma/seed.ts` stub, `.env.example`, `vitest.config.ts`
  - `packages/shared` : package, tsconfig, `src/{index.ts,catalog/index.ts,schemas/index.ts}` stubs, `vitest.config.ts`
- **Tests** : néant (tests réels arrivent en Étape 2+, vitest configuré avec `passWithNoTests: true`)
- **Décisions** : voir `DECISIONS.md` (Node 20 LTS, pnpm 10, git local, Tailwind v4 `@theme`, Geist via CDN, vite override v6)
- **Vérifs DoD** :
  - `pnpm typecheck` ✓ (3/3 workspaces)
  - `pnpm lint --max-warnings=0` ✓
  - `pnpm test` ✓
  - `pnpm build` ✓ — bundle initial JS gzip 75.15 kB (budget §22 : < 220 kB)
- **Commande pour tester** : `pnpm install && pnpm dev` puis http://localhost:5173
- **Statut** : ✓ Terminé

---
