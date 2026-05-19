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

## Étape 2 — Primitives UI

- **Fichiers créés** :
  - `apps/web/src/lib/cn.ts` (helper clsx)
  - `apps/web/src/lib/color.ts` (luminance + inkOn)
  - `apps/web/src/components/ui/` : `Button.tsx`, `Chip.tsx`, `Input.tsx`, `Swatch.tsx`, `SegToggle.tsx`, `Card.tsx`, `index.ts`
  - Tests : `Button.test.tsx`, `Chip.test.tsx`, `Input.test.tsx`, `Swatch.test.tsx`, `SegToggle.test.tsx`, `Card.test.tsx`, `color.test.ts`
  - `apps/web/src/pages/dev/DevComponentsPage.tsx` rempli avec galerie
- **Tests** : 40 tests passants (7 fichiers) — couverture confortable sur primitives
- **Décisions** : `Swatch` prop nommée `hex` (pas `color`) pour éviter collision avec attribut HTML natif. SegToggle générique sur `T extends string`.
- **Vérifs DoD** :
  - `pnpm typecheck` ✓
  - `pnpm lint` ✓
  - `pnpm test` ✓ (40 passing)
  - `pnpm build` ✓ — bundle initial 75.15 kB gzip (route /dev/components 3.83 kB)
- **Commande pour tester** : `pnpm dev` puis http://localhost:5173/dev/components
- **Statut** : ✓ Terminé

---
