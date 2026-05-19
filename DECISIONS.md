# Journal de décisions — Devis Flash

Toutes les décisions prises en autonomie pendant l'implémentation. Cf. §30 du brief.

---

## 2026-05-19 — Node 24 disponible, brief demande Node 20 LTS

**Contexte** : L'environnement de dev tourne Node 24.14.0. Le brief demande Node 20 LTS (§12).

**Choix** : `.nvmrc` à `20`, `engines.node: ">=20"` dans `package.json`. CI utilise Node 20. Dev local autorise Node 24 (compatible).

**Pourquoi** : Cohérence avec la cible Railway (Node 20-slim). Node 24 reste compatible pour le dev.

---

## 2026-05-19 — pnpm 10 au lieu de pnpm 9

**Contexte** : L'environnement de dev tourne pnpm 10.33.4. Le brief demande pnpm 9 (§12).

**Choix** : `packageManager: "pnpm@10.33.4"` dans le package.json racine. Pas d'impact fonctionnel — pnpm 10 est rétrocompatible avec les workspaces pnpm 9.

**Pourquoi** : Éviter de forcer un downgrade de l'env user.

---

## 2026-05-19 — Git repo local, pas de remote configuré

**Contexte** : Le dossier `/Users/charlie/Desktop/DEVIS FLASH` est imbriqué dans le repo git parent `/Users/charlie/`. Le brief demande "push vers main" (§30).

**Choix** : Initialisation d'un git local dans `/Users/charlie/Desktop/DEVIS FLASH` (commit `main`). Pas de remote GitHub configuré — aucun token disponible. Les commits restent locaux jusqu'à ce que le patron ajoute un remote.

**Pourquoi** : Pas de credentials GitHub fournis. Le brief n'exige pas de PR (seul sur repo), donc des commits locaux suffisent pour la traçabilité.

---

## 2026-05-19 — Tailwind v4 via `@tailwindcss/vite` plugin + `@theme`

**Contexte** : Tailwind v4 supporte deux modes : `@theme` dans le CSS (recommandé v4) ou `tailwind.config.ts` (v3 style).

**Choix** : `@theme` directement dans `globals.css`, plus le plugin `@tailwindcss/vite`. Pas de `tailwind.config.ts`.

**Pourquoi** : Approche officielle v4, plus simple, pas de config TS à maintenir.

---

## 2026-05-19 — Geist via Google Fonts CDN (pas d'auto-hosting MVP)

**Contexte** : Le brief mentionne `public/fonts/` pour Geist self-hosted (§13). En attendant les fichiers WOFF2, j'utilise Google Fonts.

**Choix** : Import CSS Google Fonts en haut de `globals.css`. À remplacer par self-hosted en Étape 12.

**Pourquoi** : Démarrer plus vite. Le brief autorise les défauts sensibles. À documenter pour reprise.

---
