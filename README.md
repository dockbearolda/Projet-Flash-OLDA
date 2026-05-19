# Devis Flash

Générateur de devis pour **OLDA** — atelier d'impression DTF sur textile à **Saint-Martin (SXM)**.

Deux contextes d'usage :

- **Tablette Samsung Galaxy Tab A9+ 11"** (1920×1200 paysage) — vendeuse en boutique.
- **Desktop Windows 20"** (≈ 1680×1050) — patron / admin.

---

## Stack

| Domaine       | Choix                                                |
| ------------- | ---------------------------------------------------- |
| Monorepo      | pnpm workspaces (Node 20 LTS)                        |
| Web           | Vite 6 + React 18 + TypeScript strict + Tailwind v4  |
| State         | Zustand + persist IndexedDB (idb-keyval)             |
| Routing       | React Router v6                                      |
| PDF           | @react-pdf/renderer (client-side, A4)                |
| Validation    | Zod                                                  |
| API           | Hono sur Node 20                                     |
| DB            | Prisma 6 + PostgreSQL                                |
| Auth          | Mot de passe partagé, cookie httpOnly signé HMAC     |
| PWA           | vite-plugin-pwa (manifest, service worker, sw cache) |
| Tests         | Vitest + Testing Library (103 tests)                 |
| E2E           | Playwright (configuré, scénarios non remplis en MVP) |
| Lint / format | ESLint flat strict-type-checked + Prettier           |
| Hooks         | Husky + lint-staged                                  |

---

## Démarrage

```bash
# 1. Installer
pnpm install

# 2. Variables d'env
cp apps/api/.env.example apps/api/.env
# → édite DATABASE_URL et APP_PASSWORD

# 3. DB
pnpm --filter @df/api db:migrate          # crée les tables
pnpm --filter @df/api db:seed             # peuple le catalogue

# 4. Lancer (deux terminaux)
pnpm dev                                  # SPA Vite sur :5173 (proxy /api → :3001)
pnpm dev:api                              # API Hono sur :3001
```

Ouvrir :

- http://localhost:5173/tablet — interface vendeuse
- http://localhost:5173/admin/quotes — admin desktop
- http://localhost:5173/login — login mot de passe partagé
- http://localhost:5173/dev/components — galerie composants (dev)

---

## Vérifications

```bash
pnpm typecheck        # 3 workspaces (shared, web, api)
pnpm lint             # ESLint strict-type-checked, --max-warnings=0
pnpm test             # 103 tests Vitest
pnpm build            # web + api
pnpm test:e2e         # Playwright
```

---

## Variables d'env

| Nom              | Description                                           |
| ---------------- | ----------------------------------------------------- |
| `DATABASE_URL`   | PostgreSQL connection string (Railway l'injecte)      |
| `APP_PASSWORD`   | Mot de passe partagé (login `/login`)                 |
| `SESSION_SECRET` | 32+ chars, signe le cookie httpOnly                   |
| `PUBLIC_APP_URL` | URL publique (ex: https://devis-flash.up.railway.app) |
| `NODE_ENV`       | `development` ou `production`                         |
| `PORT`           | API port (Railway override automatiquement)           |

---

## Déploiement Railway

```bash
# 1. Créer un projet Railway
# 2. Ajouter PostgreSQL (Railway injecte DATABASE_URL)
# 3. Lier le repo GitHub
# 4. Configurer APP_PASSWORD et SESSION_SECRET dans les vars d'env
# 5. Push : Railway build via Dockerfile multi-stage
```

Le `Dockerfile` :

- Stage **deps** : `pnpm install --frozen-lockfile`
- Stage **build** : `prisma generate`, `pnpm --filter @df/web build`, `pnpm --filter @df/api build`
- Stage **runner** : Node 20-slim, lance `prisma migrate deploy` puis `pnpm start`

Healthcheck : `GET /api/health` retourne `200 { status: 'ok', db: 'ok' }`.

---

## Structure

```
devis-flash/
├── apps/
│   ├── web/                            # SPA React (Vite)
│   │   ├── src/
│   │   │   ├── app/                    # router, providers, guards
│   │   │   ├── pages/
│   │   │   │   ├── tablet/             # interface vendeuse
│   │   │   │   ├── admin/              # admin (Layout, Quotes, Catalog, Coefs)
│   │   │   │   ├── login/              # login mot de passe
│   │   │   │   └── dev/                # galerie composants
│   │   │   ├── features/
│   │   │   │   ├── quote/              # store, pricing, components métier
│   │   │   │   ├── pdf/                # QuotePdf + helpers
│   │   │   │   └── auth/               # client API auth
│   │   │   ├── components/             # UI primitives + SyncIndicator
│   │   │   └── lib/                    # cn, color, format
│   │   ├── public/
│   │   └── vite.config.ts
│   └── api/
│       ├── src/
│       │   ├── routes/                 # health, auth, catalog, quotes
│       │   ├── auth.ts                 # middleware + sessions
│       │   ├── db.ts                   # Prisma singleton
│       │   └── server.ts
│       └── prisma/
│           ├── schema.prisma
│           └── seed.ts                 # upsert idempotent
├── packages/
│   └── shared/
│       └── src/
│           ├── catalog/                # PRODUCTS, ZONES, COEFS, COLORS, PLACEMENTS
│           └── schemas/                # Zod : Customer, QuoteLine, Quote
├── DECISIONS.md                        # journal des décisions autonomes
├── PROGRESS.md                         # log d'avancement par étape
└── README.md
```

---

## Logique métier (rappel)

**Formule du prix unitaire HT** :

```
unitHT = (priceAchat + Σ zones[placement]) × coef
```

- `coef` dépend de Σ quantité du devis (paliers 1→3.80 … 100+→1.27, voir §6.1 du brief)
- `Σ zones[placement]` = somme des PV par zone DTF (voir `packages/shared/src/catalog/zones.ts`)

**Totaux devis** :

```
subtotalHT  = Σ unitHT(line) × qty(line)
transportHT = chronopost ? 1.50 × qtyTotal : 0
tgcaHT      = revente ? 0 : (subtotalHT + transportHT) × 0.04
totalHT     = subtotalHT + transportHT + tgcaHT
```

Voir `apps/web/src/features/quote/pricing.ts` pour l'implémentation (39 tests).

---

## Pour le patron — points à valider

1. **Pricing par zone** — divergence détectée avec `Flash devis.xlsx` envoyé. Voir DECISIONS.md, section 2026-05-19.
2. **Logo OLDA** — placeholder texte "OLDA" en Helvetica-Bold dans le PDF (et dans l'app). Remplacer par SVG si un fichier est fourni.
3. **Geist self-hosted** — utilise Google Fonts en CDN, à passer en self-hosted si besoin d'offline complet sur les fonts.
4. **Sync API** — l'historique est local IDB pour MVP. Le code des routes /api/quotes est prêt pour brancher une vraie sync queue.
5. **Email / envoi** — bouton "Générer PDF" télécharge le fichier, pas d'envoi email automatique (à ajouter via Resend / SMTP si demandé).
6. **Multi-utilisateur** — pas en MVP (mot de passe partagé). Si besoin d'avoir un nom d'auteur par devis, ajouter une notion de user dans `Session` et `Quote`.

---

## Commandes pour tester (patron)

```bash
# Démarrage rapide
pnpm install
cp apps/api/.env.example apps/api/.env
# → renseigner DATABASE_URL et APP_PASSWORD
pnpm --filter @df/api db:migrate
pnpm --filter @df/api db:seed

# Tests automatisés
pnpm test                      # 103 tests passent
pnpm typecheck && pnpm lint    # 0 erreur

# Manuel
pnpm dev      # http://localhost:5173/tablet
pnpm dev:api  # API sur :3001
```

Scénarios manuels à valider :

1. **Tablette** : créer un devis 80 pcs T-shirt H-001 Coeur+Dos, Chronopost, non-revente → vérifier total ≈ 1441.32 €
2. **Admin** : ouvrir /admin/quotes après création → le brouillon doit apparaître dans l'historique
3. **Multi-ligne** : ajouter une deuxième ligne, le coef doit baisser au passage des paliers
4. **PDF** : cliquer "Générer le PDF" → fichier `DEV-2026-XXXX.pdf` doit être téléchargé
5. **Offline** : couper le wifi → la pastille passe ambre, on peut continuer à éditer
