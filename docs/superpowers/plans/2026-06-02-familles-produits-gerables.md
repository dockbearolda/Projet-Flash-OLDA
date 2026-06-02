# Familles de produits gérables — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Permettre au patron de créer / renommer / supprimer des familles de produits (« Accessoire », « Casquette »…) en libre-service, au lieu de l'enum figé `unisexe | femme | enfant`.

**Architecture:** Les familles deviennent une collection éditable du catalogue (entité `Family` calquée sur `Transport`). `ProductFamily` passe d'un enum à une chaîne (le slug). Un helper pur unique `groupProductsByFamily(products, families)` remplace la logique de regroupement dupliquée 3×. Section admin CRUD ; route `PUT /api/catalog/families` qui **refuse** de supprimer une famille encore portée par des produits.

**Tech Stack:** pnpm monorepo · TypeScript strict (`exactOptionalPropertyTypes`, `noUncheckedIndexedAccess`, `noUnusedLocals`) · React + Zustand (web) · Hono + Prisma/PostgreSQL (api) · Zod · Vitest + RTL.

**Spec :** [`docs/superpowers/specs/2026-06-02-familles-produits-gerables-design.md`](../specs/2026-06-02-familles-produits-gerables-design.md)

---

## Notes transverses (à lire avant de commencer)

- **`@df/shared` se résout vers `packages/shared/dist`.** Après toute édition de la source shared : `pnpm --filter @df/shared build`. Sinon web/api voient l'ancien `dist`.
- **Schéma DB via `prisma db push`** (`pnpm --filter @df/api db:deploy`), pas de migrations. `pnpm --filter @df/api db:generate` met à jour les types du client (sans DB). DB de dev locale : `postgresql://…@localhost:5432/devis_flash`.
- **Affinement vs spec** : `CatalogFamily = { id, label }` (PAS de `sort` dans le schéma/type partagé) ; l'ordre = l'ordre du tableau ; la colonne DB `Family.sort` est assignée par **index** à la sauvegarde et sert à trier en lecture — exactement comme `Transport` aujourd'hui (`CatalogTransport` n'a pas de `sort`, la route fait `sort: i`).
- **Robustesse prod** : la prod existante a déjà des produits mais la table `Family` sera vide après déploiement. Le seed doit donc **backfiller** les familles depuis les valeurs `family` distinctes des produits existants (Task 2), et la route GET doit déclencher ce seed quand `families` est vide (pas seulement sur base totalement vide).
- **Ordre des commits / typecheck** : après Task 1 (shared), `apps/api` ne compile plus tant que Task 2 n'a pas ajouté `families` à `readSnapshot` (le littéral `CatalogSnapshot` y serait incomplet). C'est attendu : **le gate de Task 1 est shared uniquement** ; le typecheck repo entier repasse au vert dès Task 2. `apps/web` reste vert dès Task 1.
- **Branche** : `feat/familles-produits-gerables` (créée, spec commitée). Commits en français, terminés par `Co-Authored-By`. Hook pre-commit = eslint --fix + prettier.

## Fichiers touchés

| Fichier                                                    | Rôle                                                                                                   |
| ---------------------------------------------------------- | ------------------------------------------------------------------------------------------------------ |
| `packages/shared/src/catalog/products.ts`                  | `ProductFamily` → `string`                                                                             |
| `packages/shared/src/catalog/snapshot.ts`                  | `CatalogFamily` + `families` (interface + défaut) + helper `groupProductsByFamily`                     |
| `packages/shared/src/schemas/catalog.ts`                   | `ProductFamilySchema` → `z.string()` ; `CatalogFamilySchema` ; `families` dans `CatalogSnapshotSchema` |
| `packages/shared/src/catalog/grouping.test.ts`             | **Créé** — tests du helper + défaut familles                                                           |
| `packages/shared/src/schemas/catalog.test.ts`              | Étendu — schéma famille                                                                                |
| `apps/api/prisma/schema.prisma`                            | Modèle `Family`                                                                                        |
| `apps/api/src/catalogService.ts`                           | Lecture `families` + seed/backfill                                                                     |
| `apps/api/src/routes/catalog.ts`                           | `PUT /families` + garde-fou ; seed si familles vides                                                   |
| `apps/web/src/features/catalog/useCatalog.ts`              | Expose `families` dans la `CatalogView`                                                                |
| `apps/web/src/features/catalog/api.ts`                     | `saveFamilies`                                                                                         |
| `apps/web/src/features/quote/components/ProductPicker.tsx` | Utilise le helper                                                                                      |
| `apps/web/src/features/quote/components/LineRow.tsx`       | Utilise le helper                                                                                      |
| `apps/web/src/features/quote/components/PricingGrid.tsx`   | Utilise le helper                                                                                      |
| `apps/web/src/pages/admin/FamiliesPage.tsx`                | **Créé** — page CRUD                                                                                   |
| `apps/web/src/app/router.tsx`                              | Route `/admin/families`                                                                                |
| `apps/web/src/pages/admin/AdminLayout.tsx`                 | Lien de nav « Familles »                                                                               |
| `apps/web/src/pages/admin/CatalogPage.tsx`                 | `<select>` famille dynamique + défaut `add()`                                                          |

---

## Task 1 : Shared — type, entité, helper + tests

**Files:**

- Modify: `packages/shared/src/catalog/products.ts`
- Modify: `packages/shared/src/catalog/snapshot.ts`
- Modify: `packages/shared/src/schemas/catalog.ts`
- Test (create): `packages/shared/src/catalog/grouping.test.ts`
- Test (modify): `packages/shared/src/schemas/catalog.test.ts`

- [ ] **Step 1 : Écrire les tests qui échouent — helper + défaut**

Créer `packages/shared/src/catalog/grouping.test.ts` :

```ts
import { describe, it, expect } from 'vitest';
import { groupProductsByFamily, defaultCatalogSnapshot } from './snapshot.js';
import type { CatalogFamily, CatalogProduct } from './snapshot.js';

const fam = (id: string, label: string): CatalogFamily => ({ id, label });
const prod = (ref: string, family: string): CatalogProduct => ({
  ref,
  supplierRef: '',
  name: ref,
  family,
  priceAchat: 1,
  sizes: [],
  colorIds: [],
  bestColorIds: [],
  chronopostPrice: null,
});

describe('groupProductsByFamily', () => {
  it('groupe dans l’ordre des familles', () => {
    const groups = groupProductsByFamily(
      [prod('B', 'femme'), prod('A', 'unisexe')],
      [fam('unisexe', 'Homme'), fam('femme', 'Femme')],
    );
    expect(groups.map((g) => g.family.id)).toEqual(['unisexe', 'femme']);
  });

  it('trie les items par ref (numérique)', () => {
    const groups = groupProductsByFamily(
      [prod('H-10', 'unisexe'), prod('H-2', 'unisexe')],
      [fam('unisexe', 'Homme')],
    );
    expect(groups[0]!.items.map((p) => p.ref)).toEqual(['H-2', 'H-10']);
  });

  it('place une famille inconnue dans « Autres » en dernier', () => {
    const groups = groupProductsByFamily(
      [prod('X', 'casquette'), prod('A', 'unisexe')],
      [fam('unisexe', 'Homme')],
    );
    expect(groups.map((g) => g.family.id)).toEqual(['unisexe', '_autres']);
    expect(groups[1]!.items.map((p) => p.ref)).toEqual(['X']);
  });

  it('inclut une famille vide (groupe sans items)', () => {
    const groups = groupProductsByFamily([], [fam('unisexe', 'Homme')]);
    expect(groups).toHaveLength(1);
    expect(groups[0]!.items).toEqual([]);
  });
});

describe('defaultCatalogSnapshot — families', () => {
  it('sème les 3 familles par défaut dans l’ordre', () => {
    expect(defaultCatalogSnapshot().families).toEqual([
      { id: 'unisexe', label: 'Homme' },
      { id: 'femme', label: 'Femme' },
      { id: 'enfant', label: 'Enfant' },
    ]);
  });
});
```

- [ ] **Step 2 : Lancer — échoue**

Run: `pnpm --filter @df/shared test`
Expected: FAIL — `groupProductsByFamily` n'existe pas et `defaultCatalogSnapshot().families` est `undefined`.

- [ ] **Step 3 : `ProductFamily` → chaîne** (`packages/shared/src/catalog/products.ts`)

Remplacer la ligne 1 :

```ts
export type ProductFamily = 'unisexe' | 'femme' | 'enfant';
```

par :

```ts
/** Slug d'une famille de produits. Les familles sont éditables (catalogue). */
export type ProductFamily = string;
```

- [ ] **Step 4 : `CatalogFamily` + `families` + helper** (`packages/shared/src/catalog/snapshot.ts`)

(a) Après l'interface `CatalogTransport` (vers la ligne 76), ajouter :

```ts
export interface CatalogFamily {
  id: string;
  label: string;
}
```

(b) Dans `interface CatalogSnapshot`, après `transports: CatalogTransport[];`, ajouter :

```ts
  families: CatalogFamily[];
```

(c) Dans `defaultCatalogSnapshot()`, dans l'objet retourné, après le bloc `transports: …,` ajouter :

```ts
    families: [
      { id: 'unisexe', label: 'Homme' },
      { id: 'femme', label: 'Femme' },
      { id: 'enfant', label: 'Enfant' },
    ],
```

(d) À la fin du fichier, ajouter le helper pur :

```ts
export interface FamilyGroup {
  family: CatalogFamily;
  items: CatalogProduct[];
}

/**
 * Regroupe les produits par famille, dans l'ordre des `families` fournies,
 * chaque groupe trié par `ref` (numérique). Les produits dont le slug `family`
 * n'existe dans aucune famille sont placés en dernier sous une famille de repli
 * « Autres » (ils ne disparaissent jamais des sélecteurs). Les familles sans
 * produit sont conservées (groupe vide) — l'appelant décide de les afficher ou non.
 */
export function groupProductsByFamily(
  products: CatalogProduct[],
  families: CatalogFamily[],
): FamilyGroup[] {
  const OTHERS_ID = '_autres';
  const groups = new Map<string, FamilyGroup>();
  for (const f of families) groups.set(f.id, { family: f, items: [] });
  for (const p of products) {
    let g = groups.get(p.family);
    if (!g) {
      g = groups.get(OTHERS_ID);
      if (!g) {
        g = { family: { id: OTHERS_ID, label: 'Autres' }, items: [] };
        groups.set(OTHERS_ID, g);
      }
    }
    g.items.push(p);
  }
  for (const g of groups.values()) {
    g.items.sort((a, b) => a.ref.localeCompare(b.ref, undefined, { numeric: true }));
  }
  const ordered: FamilyGroup[] = families.map((f) => groups.get(f.id)!);
  const others = groups.get(OTHERS_ID);
  if (others) ordered.push(others);
  return ordered;
}
```

- [ ] **Step 5 : Schéma zod** (`packages/shared/src/schemas/catalog.ts`)

(a) Remplacer la ligne 4 :

```ts
export const ProductFamilySchema = z.enum(['unisexe', 'femme', 'enfant']);
```

par :

```ts
// Famille = slug d'une famille éditable du catalogue (plus un enum figé).
export const ProductFamilySchema = z.string().trim().min(1, 'Famille requise').max(40);
```

(b) Après `CatalogTransportSchema` (vers la ligne 65), ajouter :

```ts
export const CatalogFamilySchema = z.object({
  id: z.string().trim().min(1, 'Identifiant requis').max(40),
  label: z.string().trim().min(1, 'Nom requis').max(60),
});
```

(c) Dans `CatalogSnapshotSchema`, après `transports: z.array(CatalogTransportSchema),`, ajouter :

```ts
  families: z.array(CatalogFamilySchema),
```

- [ ] **Step 6 : Étendre le test de schéma** (`packages/shared/src/schemas/catalog.test.ts`)

Ajouter en fin de fichier :

```ts
import { CatalogFamilySchema, ProductFamilySchema } from './catalog.js';

describe('ProductFamilySchema (chaîne)', () => {
  it('accepte un slug quelconque non vide', () => {
    expect(ProductFamilySchema.parse('casquette')).toBe('casquette');
  });
  it('refuse une chaîne vide', () => {
    expect(() => ProductFamilySchema.parse('')).toThrow();
  });
});

describe('CatalogFamilySchema', () => {
  it('parse { id, label }', () => {
    expect(CatalogFamilySchema.parse({ id: 'accessoire', label: 'Accessoire' })).toEqual({
      id: 'accessoire',
      label: 'Accessoire',
    });
  });
  it('refuse un label vide', () => {
    expect(() => CatalogFamilySchema.parse({ id: 'x', label: '' })).toThrow();
  });
});
```

> `describe`/`it`/`expect` sont déjà importés en tête du fichier (ne pas redupliquer l'import vitest).

- [ ] **Step 7 : Lancer — passe + typecheck + build shared**

Run: `pnpm --filter @df/shared test && pnpm --filter @df/shared typecheck && pnpm --filter @df/shared build`
Expected: tous verts ; `dist` régénéré.

- [ ] **Step 8 : Commit**

```bash
git add packages/shared/src/catalog/products.ts packages/shared/src/catalog/snapshot.ts packages/shared/src/schemas/catalog.ts packages/shared/src/catalog/grouping.test.ts packages/shared/src/schemas/catalog.test.ts
git commit -m "$(cat <<'EOF'
feat(shared): familles éditables (entité + helper de regroupement)

ProductFamily devient une chaîne (slug) ; CatalogFamily {id,label} +
families dans le snapshot ; groupProductsByFamily centralise le
regroupement (familles ordonnées + repli « Autres »).

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 2 : API — Prisma, lecture, seed/backfill, route + garde-fou

**Files:**

- Modify: `apps/api/prisma/schema.prisma`
- Modify: `apps/api/src/catalogService.ts`
- Modify: `apps/api/src/routes/catalog.ts`

> Prérequis : Task 1 terminée et `shared` rebuildé.

- [ ] **Step 1 : Modèle Prisma** (`apps/api/prisma/schema.prisma`)

Après le modèle `Transport` (vers la ligne 78), ajouter :

```prisma
model Family {
  id        String   @id @default(cuid())
  slug      String   @unique
  label     String
  sort      Int      @default(0)
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
}
```

- [ ] **Step 2 : Régénérer le client Prisma** (types, sans DB)

Run: `pnpm --filter @df/api db:generate`
Expected: « Generated Prisma Client » ; `prisma.family` existe.

- [ ] **Step 3 : Lecture + seed/backfill** (`apps/api/src/catalogService.ts`)

(a) Importer le type : à la ligne 2, ajouter `CatalogFamily` aux types importés :

```ts
import type {
  CatalogSnapshot,
  CatalogProduct,
  CatalogZone,
  CatalogTransport,
  CatalogFamily,
} from '@df/shared';
```

(b) Dans `readSnapshot`, ajouter la lecture des familles au `Promise.all` (après `prisma.transport.findMany(...)`, avant `prisma.setting.findMany()`) :

```ts
      prisma.family.findMany({ orderBy: { sort: 'asc' } }),
```

et capter la nouvelle valeur dans la déstructuration du tuple :

```ts
  const [products, zones, coefs, textile, flock, placements, transports, families, settings] =
    await Promise.all([
```

(c) Dans l'objet retourné par `readSnapshot`, après le bloc `transports: …,` ajouter :

```ts
    families: families.map((f): CatalogFamily => ({ id: f.slug, label: f.label })),
```

(d) Dans `ensureCatalogSeeded`, ajouter un bloc de seed/backfill des familles (après le bloc `transportCount === 0`, avant le bloc `tgca`). Il sème depuis les familles distinctes des produits existants si présentes, sinon depuis les défauts :

```ts
const familyCount = await prisma.family.count();
if (familyCount === 0) {
  // Backfill : familles distinctes des produits existants (prod déjà peuplée),
  // sinon les familles par défaut (base neuve).
  const prods = await prisma.product.findMany({ select: { family: true } });
  const distinct = [...new Set(prods.map((p) => p.family).filter((s) => s.length > 0))];
  const order = def.families.map((f) => f.id);
  const slugs = distinct.length > 0 ? distinct : order;
  slugs.sort((a, b) => {
    const ia = order.indexOf(a);
    const ib = order.indexOf(b);
    if (ia !== -1 || ib !== -1) return (ia === -1 ? 999 : ia) - (ib === -1 ? 999 : ib);
    return a.localeCompare(b);
  });
  const labelFor = (slug: string) => def.families.find((f) => f.id === slug)?.label ?? slug;
  await prisma.family.createMany({
    data: slugs.map((slug, i) => ({ slug, label: labelFor(slug), sort: i })),
  });
}
```

> `def.families` provient de `defaultCatalogSnapshot()` (déjà appelé en tête de `ensureCatalogSeeded` : `const def = defaultCatalogSnapshot()`).

- [ ] **Step 4 : Route + garde-fou + seed si familles vides** (`apps/api/src/routes/catalog.ts`)

(a) Importer le schéma : ajouter `CatalogFamilySchema` à l'import depuis `@df/shared`.

(b) Dans le handler `GET '/'`, élargir le déclenchement du seed pour couvrir une base existante sans familles. Remplacer :

```ts
if (snapshot.products.length === 0 && snapshot.coefs.length === 0 && snapshot.zones.length === 0) {
  await ensureCatalogSeeded();
  snapshot = await readSnapshot();
}
```

par :

```ts
const dbEmpty =
  snapshot.products.length === 0 && snapshot.coefs.length === 0 && snapshot.zones.length === 0;
// Seed complet sur base neuve ; sinon backfill des familles si la table est vide
// (cas d'une base existante mise à jour). ensureCatalogSeeded est idempotent.
if (dbEmpty || snapshot.families.length === 0) {
  await ensureCatalogSeeded();
  snapshot = await readSnapshot();
}
```

(c) Ajouter la route `PUT /families` (après le handler `.put('/placements', …)`, avant `.put('/settings', …)`) :

```ts
  .put('/families', async (c) => {
    const body = (await c.req.json()) as unknown;
    const parsed = z.array(CatalogFamilySchema).safeParse(body);
    if (!parsed.success) {
      return c.json({ error: 'Familles invalides', issues: parsed.error.issues }, 400);
    }
    if (duplicates(parsed.data.map((f) => f.id))) {
      return c.json({ error: 'Identifiants de famille en double' }, 400);
    }
    // Garde-fou : refuser de retirer une famille encore portée par des produits.
    const existing = await prisma.family.findMany({ select: { slug: true, label: true } });
    const keptSlugs = new Set(parsed.data.map((f) => f.id));
    const removed = existing.filter((f) => !keptSlugs.has(f.slug));
    const details: string[] = [];
    for (const fam of removed) {
      const n = await prisma.product.count({ where: { family: fam.slug } });
      if (n > 0) details.push(`« ${fam.label} » (${String(n)} produit${n > 1 ? 's' : ''})`);
    }
    if (details.length > 0) {
      return c.json(
        { error: `Familles encore utilisées : ${details.join(', ')} — réaffectez ces produits d'abord.` },
        400,
      );
    }
    await prisma.$transaction([
      prisma.family.deleteMany({}),
      prisma.family.createMany({
        data: parsed.data.map((f, i) => ({ slug: f.id, label: f.label, sort: i })),
      }),
    ]);
    return c.json(await readSnapshot());
  })
```

- [ ] **Step 5 : Typecheck API + repo**

Run: `pnpm --filter @df/api typecheck && pnpm -r typecheck`
Expected: tout vert (le littéral `readSnapshot` contient désormais `families`).

- [ ] **Step 6 : Appliquer la colonne en local (si DB dispo)**

Run: `pnpm --filter @df/api db:deploy`
Expected: `prisma db push` crée la table `Family`. Si aucune DB n'est joignable, sauter (créée en prod au boot). Vérifier ensuite (DB dispo) que les familles se backfillent : démarrer l'API (`pnpm --filter @df/api dev`) et `curl -s localhost:3001/api/catalog | jq '.families'` → 3 familles (unisexe/femme/enfant).

- [ ] **Step 7 : Commit**

```bash
git add apps/api/prisma/schema.prisma apps/api/src/catalogService.ts apps/api/src/routes/catalog.ts
git commit -m "$(cat <<'EOF'
feat(api): familles en base (lecture, seed/backfill, PUT /families)

Modèle Family (slug/label/sort) ; readSnapshot expose families ;
seed backfille depuis les familles distinctes des produits existants ;
PUT /families refuse de supprimer une famille encore utilisée.

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 3 : Web — `families` dans la vue catalogue + 3 sélecteurs centralisés

**Files:**

- Modify: `apps/web/src/features/catalog/useCatalog.ts`
- Modify: `apps/web/src/features/quote/components/ProductPicker.tsx`
- Modify: `apps/web/src/features/quote/components/LineRow.tsx`
- Modify: `apps/web/src/features/quote/components/PricingGrid.tsx`

> `LineRow`/`PricingGrid`/`ProductPicker` n'ont pas de harnais de test unitaire ; couverture = typecheck + le test du helper (Task 1) + vérif visuelle (Task 5). Pas de test ajouté ici (noté, pas un oubli).

- [ ] **Step 1 : Exposer `families` dans la `CatalogView`** (`apps/web/src/features/catalog/useCatalog.ts`)

(a) Ajouter `CatalogFamily` aux types importés depuis `@df/shared`.

(b) Dans l'interface `CatalogView`, ajouter (près de `transports`) :

```ts
  families: CatalogFamily[];
```

(c) Dans `buildView(...)`, dans l'objet retourné, ajouter :

```ts
    families: snapshot.families,
```

- [ ] **Step 2 : `ProductPicker.tsx` — utiliser le helper**

Remplacer le haut du fichier (imports + constantes + `grouped`) :

```ts
import { useMemo } from 'react';
import { ChevronDown } from 'lucide-react';
import type { CatalogProduct, ProductFamily } from '@df/shared';
import { useCatalog } from '@/features/catalog/useCatalog';
import { fmtEUR } from '@/lib/format';

interface Props {
  value: string;
  onChange: (ref: string) => void;
}

const FAMILY_LABEL: Record<ProductFamily, string> = {
  unisexe: 'Homme',
  femme: 'Femme',
  enfant: 'Enfant',
};

const FAMILY_ORDER: ProductFamily[] = ['unisexe', 'femme', 'enfant'];

export function ProductPicker({ value, onChange }: Props) {
  const { products } = useCatalog();
  const grouped = useMemo(() => {
    const byFamily = new Map<ProductFamily, CatalogProduct[]>();
    for (const f of FAMILY_ORDER) byFamily.set(f, []);
    for (const p of products) {
      byFamily.get(p.family)?.push(p);
    }
    for (const list of byFamily.values()) {
      list.sort((a, b) => a.ref.localeCompare(b.ref, undefined, { numeric: true }));
    }
    return byFamily;
  }, [products]);
```

par :

```ts
import { useMemo } from 'react';
import { ChevronDown } from 'lucide-react';
import { groupProductsByFamily } from '@df/shared';
import { useCatalog } from '@/features/catalog/useCatalog';
import { fmtEUR } from '@/lib/format';

interface Props {
  value: string;
  onChange: (ref: string) => void;
}

export function ProductPicker({ value, onChange }: Props) {
  const { products, families } = useCatalog();
  const grouped = useMemo(() => groupProductsByFamily(products, families), [products, families]);
```

Puis remplacer le rendu des optgroups :

```tsx
{
  FAMILY_ORDER.map((family) => {
    const items = grouped.get(family) ?? [];
    if (items.length === 0) return null;
    return (
      <optgroup key={family} label={FAMILY_LABEL[family]}>
        {items.map((p) => (
          <option key={p.ref} value={p.ref}>
            {p.ref} — {p.name}
          </option>
        ))}
      </optgroup>
    );
  });
}
```

par :

```tsx
{
  grouped.map(({ family, items }) =>
    items.length === 0 ? null : (
      <optgroup key={family.id} label={family.label}>
        {items.map((p) => (
          <option key={p.ref} value={p.ref}>
            {p.ref} — {p.name}
          </option>
        ))}
      </optgroup>
    ),
  );
}
```

- [ ] **Step 3 : `LineRow.tsx` — utiliser le helper**

(a) Supprimer les constantes `FAMILY_LABEL` (lignes ~36-40) et `FAMILY_ORDER` (ligne ~42).

(b) Ajouter `groupProductsByFamily` à l'import depuis `@df/shared` (la ligne `import { SIZE_KEYS } from '@df/shared';` devient `import { SIZE_KEYS, groupProductsByFamily } from '@df/shared';`). Retirer `ProductFamily` de l'import de types `@df/shared` s'il n'est plus utilisé ailleurs dans le fichier.

(c) S'assurer que `families` est récupéré de `useCatalog()` : la déstructuration `const { products, productByRef, placements, textileColors, transports, tgcaRate, version } = useCatalog();` devient `const { products, productByRef, placements, textileColors, transports, tgcaRate, version, families } = useCatalog();`.

(d) Remplacer le `groupedProducts` (lignes ~184-191) :

```ts
const groupedProducts = useMemo(() => {
  const byFamily = new Map<ProductFamily, CatalogProduct[]>();
  for (const f of FAMILY_ORDER) byFamily.set(f, []);
  for (const p of products) byFamily.get(p.family)?.push(p);
  for (const list of byFamily.values())
    list.sort((a, b) => a.ref.localeCompare(b.ref, undefined, { numeric: true }));
  return byFamily;
}, [products]);
```

par :

```ts
const groupedProducts = useMemo(
  () => groupProductsByFamily(products, families),
  [products, families],
);
```

(e) Remplacer le rendu des optgroups (lignes ~404-416) :

```tsx
{
  FAMILY_ORDER.map((family) => {
    const items = groupedProducts.get(family) ?? [];
    if (items.length === 0) return null;
    return (
      <optgroup key={family} label={FAMILY_LABEL[family]}>
        {items.map((p) => (
          <option key={p.ref} value={p.ref}>
            {p.ref} — {p.name}
          </option>
        ))}
      </optgroup>
    );
  });
}
```

par :

```tsx
{
  groupedProducts.map(({ family, items }) =>
    items.length === 0 ? null : (
      <optgroup key={family.id} label={family.label}>
        {items.map((p) => (
          <option key={p.ref} value={p.ref}>
            {p.ref} — {p.name}
          </option>
        ))}
      </optgroup>
    ),
  );
}
```

> Si `CatalogProduct` n'est plus référencé dans `LineRow.tsx` après ce changement, le laisser tel quel s'il sert encore (ex. `productByRef`) ; sinon le typecheck (`noUnusedLocals`) le signalera — retirer alors l'import inutilisé.

- [ ] **Step 4 : `PricingGrid.tsx` — utiliser le helper**

(a) Supprimer `FAMILY_LABEL` (lignes ~8-12) et `FAMILY_ORDER` (ligne ~14). Retirer `ProductFamily` et `CatalogProduct` de l'import de types s'ils ne servent plus.

(b) Ajouter `groupProductsByFamily` à l'import : `import { groupProductsByFamily } from '@df/shared';` (nouvelle ligne près des autres imports `@df/shared`/pricing).

(c) Récupérer `families` : la déstructuration `const { products, productByRef, placements, placementById, coefs, zoneById, version } = useCatalog();` devient `… coefs, zoneById, version, families } = useCatalog();`.

(d) Remplacer `groupedProducts` (lignes ~54-61) :

```ts
const groupedProducts = useMemo(() => {
  const byFamily = new Map<ProductFamily, CatalogProduct[]>();
  for (const f of FAMILY_ORDER) byFamily.set(f, []);
  for (const p of products) byFamily.get(p.family)?.push(p);
  for (const list of byFamily.values())
    list.sort((a, b) => a.ref.localeCompare(b.ref, undefined, { numeric: true }));
  return byFamily;
}, [products]);
```

par :

```ts
const groupedProducts = useMemo(
  () => groupProductsByFamily(products, families),
  [products, families],
);
```

(e) Remplacer le rendu des optgroups (lignes ~101-113) :

```tsx
{
  FAMILY_ORDER.map((family) => {
    const items = groupedProducts.get(family) ?? [];
    if (items.length === 0) return null;
    return (
      <optgroup key={family} label={FAMILY_LABEL[family]}>
        {items.map((p) => (
          <option key={p.ref} value={p.ref}>
            {p.ref} — {p.name}
          </option>
        ))}
      </optgroup>
    );
  });
}
```

par :

```tsx
{
  groupedProducts.map(({ family, items }) =>
    items.length === 0 ? null : (
      <optgroup key={family.id} label={family.label}>
        {items.map((p) => (
          <option key={p.ref} value={p.ref}>
            {p.ref} — {p.name}
          </option>
        ))}
      </optgroup>
    ),
  );
}
```

- [ ] **Step 5 : Typecheck + tests web**

Run: `pnpm --filter @df/web typecheck && pnpm --filter @df/web test`
Expected: vert (aucun import inutilisé restant ; les 3 sélecteurs compilent avec le helper).

- [ ] **Step 6 : Commit**

```bash
git add apps/web/src/features/catalog/useCatalog.ts apps/web/src/features/quote/components/ProductPicker.tsx apps/web/src/features/quote/components/LineRow.tsx apps/web/src/features/quote/components/PricingGrid.tsx
git commit -m "$(cat <<'EOF'
refactor(devis): regroupement par famille centralisé (helper partagé)

useCatalog expose families ; ProductPicker/LineRow/PricingGrid
utilisent groupProductsByFamily — fin de la triple duplication
FAMILY_LABEL/FAMILY_ORDER.

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 4 : Admin — page Familles + sélecteur produit dynamique

**Files:**

- Modify: `apps/web/src/features/catalog/api.ts`
- Create: `apps/web/src/pages/admin/FamiliesPage.tsx`
- Modify: `apps/web/src/app/router.tsx`
- Modify: `apps/web/src/pages/admin/AdminLayout.tsx`
- Modify: `apps/web/src/pages/admin/CatalogPage.tsx`

- [ ] **Step 1 : `saveFamilies`** (`apps/web/src/features/catalog/api.ts`)

(a) Ajouter `CatalogFamily` aux types importés depuis `@df/shared`.

(b) À la fin du fichier, ajouter :

```ts
export const saveFamilies = (families: CatalogFamily[]): Promise<CatalogSnapshot> =>
  putSection('families', families);
```

- [ ] **Step 2 : Page Familles** — créer `apps/web/src/pages/admin/FamiliesPage.tsx`

```tsx
import type { CatalogFamily } from '@df/shared';
import { useCatalog } from '@/features/catalog/useCatalog';
import { saveFamilies } from '@/features/catalog/api';
import {
  PageHeader,
  TextField,
  DeleteRowButton,
  AddRowButton,
  SaveBar,
} from './components/adminUi';
import { useSection } from './components/useSection';

export default function FamiliesPage() {
  const cat = useCatalog();
  return <FamiliesEditor key={cat.version} initial={cat.families} />;
}

function FamiliesEditor({ initial }: { initial: CatalogFamily[] }) {
  const { draft, setDraft, dirty, saving, onSave, onCancel } = useSection(initial, saveFamilies);

  function update(i: number, patch: Partial<CatalogFamily>) {
    setDraft((d) => d.map((f, idx) => (idx === i ? { ...f, ...patch } : f)));
  }

  return (
    <div>
      <PageHeader
        title="Familles"
        subtitle="Catégories de produits (ex. Homme, Femme, Accessoire). L’ordre de la liste est l’ordre d’affichage dans les sélecteurs de produit. Une famille ne peut être supprimée tant que des produits y sont rattachés."
      />

      <div className="space-y-3">
        {draft.map((f, i) => (
          <div
            key={i}
            className="rounded-[var(--df-radius-lg)] bg-[var(--df-surface)] border border-[var(--df-border)] p-4 flex items-center gap-2"
          >
            <TextField
              value={f.label}
              onChange={(v) => {
                update(i, { label: v });
              }}
              placeholder="Nom affiché (ex. Accessoire)"
              ariaLabel={`Nom de la famille ${String(i + 1)}`}
              className="flex-1"
            />
            <TextField
              value={f.id}
              onChange={(v) => {
                update(i, { id: v });
              }}
              placeholder="identifiant"
              ariaLabel={`Identifiant de la famille ${String(i + 1)}`}
              className="df-mono w-56"
            />
            <DeleteRowButton
              onClick={() => {
                setDraft((d) => d.filter((_, idx) => idx !== i));
              }}
              label={`Supprimer la famille ${String(i + 1)}`}
            />
          </div>
        ))}
        {draft.length === 0 && (
          <p className="text-sm text-[var(--df-ink-3)]">
            Aucune famille. Ajoutez-en une ci-dessous.
          </p>
        )}
      </div>

      <div className="mt-4">
        <AddRowButton
          onClick={() => {
            setDraft((d) => [...d, { id: '', label: '' }]);
          }}
          label="Ajouter une famille"
        />
      </div>

      <SaveBar dirty={dirty} saving={saving} onSave={onSave} onCancel={onCancel} />
    </div>
  );
}
```

- [ ] **Step 3 : Route** (`apps/web/src/app/router.tsx`)

(a) Après la ligne `const CatalogPage = lazy(...)`, ajouter :

```ts
const FamiliesPage = lazy(() => import('@/pages/admin/FamiliesPage'));
```

(b) Dans les `children` de `/admin`, après le bloc `{ path: 'catalog', … }`, ajouter :

```tsx
      {
        path: 'families',
        element: (
          <Suspense fallback={<PageFallback />}>
            <FamiliesPage />
          </Suspense>
        ),
      },
```

- [ ] **Step 4 : Lien de nav** (`apps/web/src/pages/admin/AdminLayout.tsx`)

(a) Ajouter `Tags` à l'import `lucide-react` (icône de la section).

(b) Après le `<NavItem to="/admin/catalog" … />`, ajouter :

```tsx
<NavItem to="/admin/families" icon={<Tags size={16} strokeWidth={1.7} />} label="Familles" />
```

- [ ] **Step 5 : Sélecteur famille dynamique** (`apps/web/src/pages/admin/CatalogPage.tsx`)

(a) Supprimer la constante `FAMILIES` (lignes ~20-24). Retirer `ProductFamily` de l'import de types `@df/shared` (il ne sera plus utilisé).

(b) Ajouter `CatalogFamily` à l'import de types `@df/shared`.

(c) `CatalogPage` : passer les familles à l'éditeur. La fonction devient :

```tsx
export default function CatalogPage() {
  const cat = useCatalog();
  const chronopostDefault = cat.transportById.chronopost?.surcharge ?? null;
  return (
    <ProductsEditor
      key={cat.version}
      initial={cat.products}
      colors={cat.textileColors}
      families={cat.families}
      chronopostDefault={chronopostDefault}
    />
  );
}
```

(d) Étendre la signature de `ProductsEditor` :

```tsx
function ProductsEditor({
  initial,
  colors,
  families,
  chronopostDefault,
}: {
  initial: CatalogProduct[];
  colors: CatalogTextileColor[];
  families: CatalogFamily[];
  chronopostDefault: number | null;
}) {
```

(e) Dans `add()`, remplacer `family: 'unisexe',` par :

```tsx
        family: families[0]?.id ?? '',
```

(f) Remplacer le `<select>` famille (lignes ~219-232) :

```tsx
<select
  value={p.family}
  onChange={(e) => {
    update(i, { family: e.target.value as ProductFamily });
  }}
  aria-label={`Famille produit ${String(i + 1)}`}
  className="df-input h-9 text-sm cursor-pointer"
>
  {FAMILIES.map((f) => (
    <option key={f.value} value={f.value}>
      {f.label}
    </option>
  ))}
</select>
```

par :

```tsx
<select
  value={p.family}
  onChange={(e) => {
    update(i, { family: e.target.value });
  }}
  aria-label={`Famille produit ${String(i + 1)}`}
  className="df-input h-9 text-sm cursor-pointer"
>
  {families.map((f) => (
    <option key={f.id} value={f.id}>
      {f.label}
    </option>
  ))}
</select>
```

- [ ] **Step 6 : Typecheck + tests web**

Run: `pnpm --filter @df/web typecheck && pnpm --filter @df/web test`
Expected: vert.

- [ ] **Step 7 : Commit**

```bash
git add apps/web/src/features/catalog/api.ts apps/web/src/pages/admin/FamiliesPage.tsx apps/web/src/app/router.tsx apps/web/src/pages/admin/AdminLayout.tsx apps/web/src/pages/admin/CatalogPage.tsx
git commit -m "$(cat <<'EOF'
feat(admin): page Familles (CRUD) + sélecteur produit dynamique

Section admin Familles (ajouter/renommer/supprimer) + lien de nav +
route ; le select famille de Produits liste les familles du catalogue.

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 5 : Vérification globale

**Files:** aucune édition attendue (correctifs uniquement si un contrôle échoue).

- [ ] **Step 1 : Suite complète**

Run:

```bash
pnpm --filter @df/shared build
pnpm -r typecheck
pnpm -r test
pnpm lint
```

Expected: typecheck OK (shared/web/api) · tests verts (dont grouping.test + schémas) · lint exit 0.

- [ ] **Step 2 : Vérification visuelle (app + DB locale)**

1. **Admin › Familles** : la page liste Homme / Femme / Enfant. Ajouter « Casquette » (id `casquette`, libellé `Casquette`), **Enregistrer** (toast). Recharger → persiste.
2. **Admin › Produits** : le `<select>` famille propose désormais « Casquette ». Affecter un produit à « Casquette », enregistrer.
3. **Écran vendeuse (Devis + Grille) et ProductPicker** : « Casquette » apparaît comme groupe dans les 3 sélecteurs, avec le produit dedans.
4. **Garde-fou** : retourner dans Familles, supprimer « Casquette » (qui a 1 produit), Enregistrer → **refus** avec message « Familles encore utilisées : « Casquette » (1 produit) — réaffectez ces produits d'abord. ». Réaffecter le produit à une autre famille, puis supprimer « Casquette » → OK.

- [ ] **Step 3 : Statut spec → implémenté**

Dans `docs/superpowers/specs/2026-06-02-familles-produits-gerables-design.md`, passer `- **Statut** :` à `implémenté`.

```bash
git add docs/superpowers/specs/2026-06-02-familles-produits-gerables-design.md
git commit -m "$(cat <<'EOF'
docs(catalogue): spec familles gérables — implémenté

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>
EOF
)"
```

> Déploiement (push + merge Railway) proposé séparément, après revue.

---

## Self-review (couverture spec → tâches)

- `ProductFamily` → chaîne ; `ProductFamilySchema` → `z.string()` → **Task 1**.
- Entité `CatalogFamily {id,label}` + `families` (interface/défaut/schéma) → **Task 1** (+ affinement : pas de `sort` partagé, assigné par index — Notes + Task 2).
- Modèle Prisma `Family`, lecture, seed → **Task 2**. **Backfill** depuis produits existants (robustesse prod) + seed déclenché si familles vides → **Task 2** (Notes transverses).
- Route `PUT /families` + **garde-fou suppression** (bloquer si occupée) → **Task 2 Step 4**.
- Helper `groupProductsByFamily` centralisé + repli « Autres » → **Task 1** (helper + tests), **Task 3** (3 sélecteurs).
- `families` dans la `CatalogView` → **Task 3 Step 1**.
- Section admin « Familles » + nav + route → **Task 4**. `<select>` famille dynamique + défaut `add()` → **Task 4 Step 5**.
- Rétro-compat (aucune migration ; seed des 3 ; cache IDB) → Notes + **Task 2** (backfill).
- Tests : schéma (famille chaîne, CatalogFamilySchema), helper (ordre/tri/Autres/vide), défaut familles → **Task 1** ; garde-fou + backfill vérifiés en **Task 5** (visuel/manuel ; pas de harnais de test API dans ce repo).
- Hors périmètre (réordonnancement, attributs au-delà de id/label, PDF/tarif/devis) → respecté.
