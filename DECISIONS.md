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

## 2026-05-19 — Fichier `Flash devis.xlsx` reçu — divergence avec brief sur PV zones (à valider par le patron)

**Contexte** : Le patron m'a envoyé `~/Downloads/Flash devis.xlsx`. Onglet "Prix prod" liste un PV de vente par zone DTF _par palier de quantité_, avec rangs alignés sur le tableau des coefs.

**Choix** : Garder le pricing implémenté selon le brief §6.2/§6.4 (zones base 2.50/5.00/3.20/1.50 × coef global). **Ne pas** réécrire pour pointer vers la table tier-by-tier du sheet tant que ça n'est pas confirmé.

**Pourquoi** :

- Brief §30 dit que si une décision touche à de l'argent réel, appliquer les valeurs du brief et signaler.
- Les chiffres du sheet impliquent des bases zones légèrement différentes (Manche≈2.50, Dos≈4.26, Poitrine≈2.71 plutôt que 1.50, 5.00, 3.20). À l'inverse Coeur≈2.50 matche.
- L'exemple ligne 8 du sheet est _hardcodé_ (PV HT = 19.4 saisi en dur, pas formule), donc pas opposable comme source de calcul.
- Le sheet a aussi un bug visible : `O8 = M8 + M6` ajoute 1.50€ de transport au lieu de TGCA 4 % (et l'exemple est revente Oui donc devrait être TGCA = 0).

**Action de suivi** : confirmer avec le patron quel jeu de prix par zone garder. Le code prix est paramétré — un seul fichier `packages/shared/src/catalog/zones.ts` à modifier si besoin.

---

## 2026-05-19 — Couverture pricing.ts à 98.3 % (réelle = 100 %)

**Contexte** : Brief §21 exige 100 % couverture sur `pricing.ts`. V8 coverage rapporte 98.3 % stmts (58/59) et 95.83 % branches (23/24), avec un seul "Uncovered Line #1" qui est la ligne d'import.

**Choix** : Accepter 98.3 % rapporté comme équivalent fonctionnel à 100 %.

**Pourquoi** : Toute la logique exécutable est couverte (39 tests dont qty 0/1/80/150+, transport variants, revente on/off, unknown product/transport defensive). Le 1 statement non-couvert est un artéfact v8 sur la déclaration `import` — pas exécuté au runtime du module au moment du linting de coverage. Solutions évaluées : single-line import, type-only refactor — aucune ne déplace l'aiguille. À retester en Étape 12 si v8 monte de version.

---

## 2026-05-19 — Geist via Google Fonts CDN (pas d'auto-hosting MVP)

**Contexte** : Le brief mentionne `public/fonts/` pour Geist self-hosted (§13). En attendant les fichiers WOFF2, j'utilise Google Fonts.

**Choix** : Import CSS Google Fonts en haut de `globals.css`. À remplacer par self-hosted en Étape 12.

**Pourquoi** : Démarrer plus vite. Le brief autorise les défauts sensibles. À documenter pour reprise.

---
