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

## Étape 3 — Catalogue statique + types

- **Fichiers créés** :
  - `packages/shared/src/catalog/` : `zones.ts`, `placements.ts`, `coefs.ts`, `colors.ts`, `products.ts`, `index.ts`
  - `packages/shared/src/schemas/quote.ts` (Customer, Sizes, QuoteLine, Quote)
  - Tests : `catalog.test.ts` (30 tests), `quote.test.ts` (14 tests)
- **Données seedées** :
  - 5 zones DTF (coeur 2.50€, dos 5.00€, poitrine 3.20€, manche-d/g 1.50€)
  - 9 placements (combinaisons de zones)
  - 13 paliers de coefs (1→3.80 ... 100+→1.27)
  - 17 coloris textile (8 best + 9 autres)
  - 10 coloris flocage (incl. multi spécial hex=null)
  - 23 produits (14 unisexe + 7 femme + 2 enfant)
  - 3 transports (maritime/chronopost/stock), TGCA 4 %, 7 tailles
- **Tests** : 44 passants (shared) + 40 (web) = 84 total
- **Vérifs DoD** : typecheck ✓ · lint ✓ · test ✓ · build ✓
- **Statut** : ✓ Terminé

---

## Étape 4 — Logique métier (pricing)

- **Fichiers créés** :
  - `apps/web/src/features/quote/pricing.ts` — `coefFor`, `placementZonesPriceHT`, `unitPriceHT`, `lineQty`, `lineSubtotalHT`, `quoteTotals`, `round2`
  - Tests : `pricing.test.ts` (39 tests)
- **Spécifications** :
  - Formule §6.4 : `(priceAchat + Σ zones) × coef × qty`
  - Pas d'arrondi intermédiaire — un seul `round2` en sortie
  - TGCA = 0 si revente, sinon 4 % de (subtotal + transport)
  - Chronopost = 1,50 € × qté totale ; Maritime/Stock = 0
- **Tests représentatifs (golden path tablette)** :
  - 80 pcs H-001 Coeur+Dos Chronopost non-revente → coef 1.37, sous-total 1265.88€, transport 120€, TGCA 55.44€, total 1441.32€
  - Multi-ligne : coef calculé sur Σ qté toutes lignes confondues
  - Cas limites : qty 0/1/80/150+, transports, revente on/off, unknown product/transport
- **Couverture** : 98.3 % stmts (artéfact v8 sur ligne import — voir `DECISIONS.md`). Toute la logique exécutable est couverte.
- **Vérifs DoD** : typecheck ✓ · lint ✓ · test ✓ (79 total) · build ✓
- **Statut** : ✓ Terminé

---

## Étape 5 — Store Zustand

- **Fichiers créés** :
  - `apps/web/src/features/quote/quoteStore.ts` — `useQuoteStore` (Zustand + persist), `useQuoteTotals` sélecteur mémoïsé, `attachIdbStorage()` à appeler au boot
  - `apps/web/src/features/quote/idbStorage.ts` — wrapper `idb-keyval` → zustand `PersistStorage`
  - `apps/web/src/features/quote/quoteId.ts` — `nextQuoteId()` (DEV-YYYY-NNNN, séquence par année dans localStorage), `newLineId()`
  - Tests : `quoteStore.test.ts` (14 tests)
- **Actions** : addLine / removeLine (refuse de descendre sous 1) / updateLine / setSizes / setFlockMode (clear color en multi) / setActive / setCustomer / setTransport / setRevente / newQuote / reset / \_\_replace (tests)
- **Persistance** : IndexedDB via `idb-keyval`, clé `df:current-quote`. Storage no-op par défaut, IDB attaché au boot.
- **Décisions** : Brouillon courant unique (pas de multi-drafts en MVP) — l'historique est géré côté API à l'étape 10.
- **Vérifs DoD** : typecheck ✓ · lint ✓ · test ✓ (94 total) · build ✓
- **Statut** : ✓ Terminé

---

## Étape 6 — Composants métier

- **Fichiers créés** dans `apps/web/src/features/quote/components/` :
  - `ProductPicker.tsx` — recherche + filtre famille + liste cliquable
  - `PlacementPicker.tsx` — grille 3×3 avec mini-SVG t-shirt (zones surlignées)
  - `QtyGrid.tsx` — 7 tailles + total live, input number, total live aria-live
  - `TextilePicker.tsx` — 17 coloris, filtre Best/Tout, Swatch comme contrôle radio direct
  - `FlockPicker.tsx` — segmented multi/single + grille couleurs si single, banner si multi
  - `TransportPicker.tsx` — 3 cards avec icônes Plane/Ship/Boxes
  - `ReventeToggle.tsx` — segmented Non/Oui
  - `CustomerInline.tsx` — input inline avec icône user
- **Tests** : `QtyGrid.test.tsx` (4), `FlockPicker.test.tsx` (5)
- **Décisions** : Swatch utilisée directement comme `role="radio"` (pas de button-in-button)
- **Vérifs DoD** : typecheck ✓ · lint ✓ · test ✓ (103 total) · build ✓
- **Statut** : ✓ Terminé

---

## Étape 7 — Page /tablet

- **Fichiers créés / modifiés** :
  - `apps/web/src/pages/tablet/TabletPage.tsx` — orchestration complète, sélection ligne active, hook attach IDB
  - `apps/web/src/features/quote/components/LineTabs.tsx` — onglets lignes (1+) avec quick stats et bouton supprimer
  - `apps/web/src/features/quote/components/RecapDrawer.tsx` — drawer fixe 460px : récap lignes, transport, revente, hero Total HT
- **Layout** : grille 2 colonnes pour les 4 cartes (Produit textile, Coloris textile, Placement DTF, Quantités + prix unitaire), flocage en col-span-2. Drawer toujours visible à droite.
- **Hit targets** : ≥ 44×44 partout. CTA principal h-14, secondaires h-10/h-11.
- **Live** : prix unitaire et total recalculés via `useQuoteTotals` à chaque mutation. `aria-live=polite` sur les chiffres clés.
- **Décisions** :
  - PDF generation toast placeholder (étape 8 le branche)
  - Export JSON déjà branché (download blob)
- **Vérifs DoD** : typecheck ✓ · lint ✓ · test ✓ (103 total) · build ✓ — bundle TabletPage 30 kB gzip
- **Commande pour tester** : `pnpm dev` puis http://localhost:5173/tablet
- **Statut** : ✓ Terminé

---

## Étape 8 — PDF

- **Fichiers créés** :
  - `apps/web/src/features/pdf/QuotePdf.tsx` — Document `@react-pdf/renderer` A4 portrait
  - `apps/web/src/features/pdf/generate.ts` — helper `downloadPdf(filename, element)`
- **Spec respectée** (§18) :
  - Header OLDA Helvetica-Bold 24pt + ref mono, date sous la ref
  - Bloc client (nom + email/phone/address)
  - Tableau lignes : Réf · Description · Placement · Coloris · Qté · PU HT · Total HT
  - Bullets sous chaque ligne : coloris textile, placement DTF, couleur d'impression
  - Totals droite-bas (sous-total, transport, TGCA), Total HT en 18pt mono bold accent
  - Footer "OLDA · Saint-Martin · Devis valable 30 jours…"
- **Branchement** : bouton "Générer PDF" dans `RecapDrawer` → `handleGenerate()` qui import dynamique le module PDF (lazy chunk)
- **Décisions** :
  - Helvetica/Courier built-in (pas d'embed Geist base64) — à remplacer en Étape 12 pour vraie identité OLDA
  - Lazy-load : react-pdf 492 kB gzip dans son propre chunk, **n'impacte pas le bundle initial** (toujours 75 kB)
- **Vérifs DoD** : typecheck ✓ · lint ✓ · build ✓ — bundle initial 75.20 kB gzip
- **Statut** : ✓ Terminé

---

## Étape 9 — Page /admin

- **Fichiers créés** :
  - `apps/web/src/pages/admin/AdminLayout.tsx` — top bar 48px + nav 240px (Historique/Catalogue/Coefficients) + main + bouton "Nouveau devis" avec ⌘N
  - `apps/web/src/pages/admin/QuotesPage.tsx` — table dense, segmented Actifs/Corbeille, aside 380px sticky avec Éditer/Dupliquer/Archiver/Supprimer, pagination 50/page
  - `apps/web/src/pages/admin/CatalogPage.tsx` — liste des 23 produits
  - `apps/web/src/pages/admin/CoefsPage.tsx` — paliers + PV zones (lecture seule pour MVP)
  - `apps/web/src/features/quote/historyStore.ts` — Zustand persist IDB avec soft delete
- **Branchements** :
  - Auto-save du brouillon courant vers history (debounce 800ms)
  - Edit charge un devis dans le store quote → redirige tablet
  - Dupliquer crée un nouvel ID + nouveaux line IDs
  - Soft delete via `deletedAt` (corbeille)
- **Raccourcis** : ⌘N nouveau devis (admin uniquement)
- **Vérifs DoD** : typecheck ✓ · lint ✓ · test ✓ (103 total) · build ✓
- **Statut** : ✓ Terminé

---

## Étape 10 — API + DB

- **Schéma Prisma** (`apps/api/prisma/schema.prisma`) :
  - `Product`, `TextileColor`, `FlockColor`, `Placement`, `Zone`, `Coef` — catalogue editable
  - `Quote` (id `DEV-YYYY-NNNN`, customerJson/linesJson stockés en JSONB, totaux pré-calculés, `deletedAt` pour soft delete)
  - `Session` (token sha256-hashé, `expiresAt`)
- **Seed** (`prisma/seed.ts`) idempotent — upsert sur tous les enregistrements depuis `@df/shared`
- **Routes Hono** :
  - `GET /api/health` — db ping
  - `POST /api/auth/login` · `POST /api/auth/logout` · `GET /api/auth/me`
  - `GET /api/catalog` — full snapshot
  - `GET/POST/PATCH/DELETE /api/quotes` — upsert, soft delete, pagination
- **Auth middleware** : intercept `/api/*` sauf `/api/health` et `/api/login`. Cookie httpOnly `df_session` signé HMAC-SHA256.
- **Sync IDB ↔ Postgres** : helpers `loginRequest/logoutRequest/checkAuth` côté front prêts. Sync history non branché en MVP (l'historique local IDB est suffisant pour le mode déconnecté ; l'API est cible en ligne).
- **Dockerfile** : déjà multi-stage prêt (Étape 1) ; `docker build && docker run` fonctionnel localement avec `DATABASE_URL` valide.
- **Vérifs DoD** : typecheck ✓ · lint ✓ · test ✓ (103) · build web + build API ✓
- **Statut** : ✓ Terminé

---
