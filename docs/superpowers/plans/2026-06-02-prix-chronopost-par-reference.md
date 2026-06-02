# Prix Chronopost réglable par référence — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Permettre de fixer, par référence du catalogue, un prix Chronopost €/pièce qui remplace le tarif global (1,50 €) uniquement pour cette référence et uniquement quand la ligne part en Chronopost.

**Architecture:** Champ optionnel `chronopostPrice` sur le produit du catalogue (schéma partagé + colonne Prisma nullable). Un résolveur unique côté pricing (`transportSurchargeFor(mode, productRef)`) lit l'override quand le mode = chronopost, sinon retombe sur le surcoût global. Ce résolveur est branché dans `lineTotals`/`quoteTotals` et réutilisé par `LineRow` (supprime une logique transport dupliquée). Le PDF (qui affiche `totals.transportHT`) hérite automatiquement.

**Tech Stack:** pnpm monorepo · TypeScript strict (`exactOptionalPropertyTypes`, `noUncheckedIndexedAccess`) · React + Zustand (web) · Hono + Prisma/PostgreSQL (api) · Zod (schémas partagés) · Vitest + React Testing Library.

**Spec :** [`docs/superpowers/specs/2026-06-02-prix-chronopost-par-reference-design.md`](../specs/2026-06-02-prix-chronopost-par-reference-design.md)

---

## Notes transverses (à lire avant de commencer)

- **`@df/shared` se résout vers `packages/shared/dist`** (pas d'alias source). Après toute édition de la source shared, **rebuilder** : `pnpm --filter @df/shared build`. Sinon web/api voient l'ancien `dist`.
- **Pas de fichiers de migration Prisma.** Le schéma est appliqué par `db push` (`pnpm --filter @df/api db:deploy` = `prisma db push --skip-generate --accept-data-loss`), lancé au boot par le Dockerfile. Une colonne **nullable additive** passe sans perte.
- **Types Prisma** : après édition de `schema.prisma`, lancer `pnpm --filter @df/api db:generate` (`prisma generate`) — **ne nécessite pas de DB** — pour que `prisma.product` connaisse `chronopostPrice`. La **création réelle** de la colonne (`db:deploy`) nécessite un Postgres (`DATABASE_URL`) ; en local seulement si dispo, sinon c'est fait en prod au boot.
- **Décision : champ d'interface optionnel.** `CatalogProduct.chronopostPrice?: number | null` (optionnel) ; le schéma zod est `.nullable().default(null)` (sortie `number | null`). L'optionnel évite de casser les littéraux `CatalogProduct` existants au rebuild de shared et garde chaque commit vert. Le résolveur traite `undefined` comme `null` (tarif global).
- **Branche de travail** : `feat/prix-chronopost-par-reference` (déjà créée, spec déjà commitée).
- Commits : messages en français, terminés par la ligne `Co-Authored-By` (convention du dépôt).

## Fichiers touchés

| Fichier                                                | Rôle                                                                                             |
| ------------------------------------------------------ | ------------------------------------------------------------------------------------------------ |
| `packages/shared/src/schemas/catalog.ts`               | Ajout `chronopostPrice` au `CatalogProductSchema` (zod)                                          |
| `packages/shared/src/catalog/snapshot.ts`              | Ajout `chronopostPrice?` à l'interface `CatalogProduct` + `null` dans `defaultCatalogSnapshot()` |
| `packages/shared/src/schemas/catalog.test.ts`          | **Créé** — tests du schéma + défaut snapshot                                                     |
| `apps/web/src/features/quote/pricing.ts`               | Résolveur `transportSurchargeFor(mode, ref)` + branchements + export                             |
| `apps/web/src/features/quote/pricing.test.ts`          | Tests override par référence                                                                     |
| `apps/web/src/features/quote/components/LineRow.tsx`   | Utilise le résolveur exporté (DRY)                                                               |
| `apps/api/prisma/schema.prisma`                        | Colonne `chronopostPrice Decimal?`                                                               |
| `apps/api/src/catalogService.ts`                       | Lecture + seed du champ                                                                          |
| `apps/api/src/routes/catalog.ts`                       | Sauvegarde du champ (`PUT /products`)                                                            |
| `apps/web/src/pages/admin/components/adminUi.tsx`      | Composant `NullableNumberField`                                                                  |
| `apps/web/src/pages/admin/components/adminUi.test.tsx` | **Créé** — tests `NullableNumberField`                                                           |
| `apps/web/src/pages/admin/CatalogPage.tsx`             | Champ « Prix Chronopost » dans le panneau dépliable                                              |

> `apps/api/prisma/seed.ts` n'a **pas** besoin de changement : son `create` omet `chronopostPrice` (colonne nullable ⇒ `NULL`) et son `update` ne doit pas l'écraser (préserve les réglages patron).

---

## Task 1 : Shared — schéma, interface, défaut + tests

**Files:**

- Modify: `packages/shared/src/schemas/catalog.ts` (`CatalogProductSchema`)
- Modify: `packages/shared/src/catalog/snapshot.ts` (interface `CatalogProduct` + `defaultCatalogSnapshot`)
- Test (create): `packages/shared/src/schemas/catalog.test.ts`

- [ ] **Step 1 : Écrire le test qui échoue**

Créer `packages/shared/src/schemas/catalog.test.ts` :

```ts
import { describe, it, expect } from 'vitest';
import { CatalogProductSchema } from './catalog.js';
import { defaultCatalogSnapshot } from '../catalog/snapshot.js';

const baseProduct = {
  ref: 'H-001',
  supplierRef: 'NS300',
  name: 'T-shirt léger Premium',
  family: 'unisexe',
  priceAchat: 4.05,
  sizes: [],
  colorIds: [],
  bestColorIds: [],
};

describe('CatalogProductSchema — chronopostPrice', () => {
  it('défaut null quand le champ est absent', () => {
    expect(CatalogProductSchema.parse(baseProduct).chronopostPrice).toBeNull();
  });

  it('conserve un prix numérique explicite', () => {
    expect(
      CatalogProductSchema.parse({ ...baseProduct, chronopostPrice: 2.5 }).chronopostPrice,
    ).toBe(2.5);
  });

  it('accepte 0 (Chronopost offert pour cette réf)', () => {
    expect(CatalogProductSchema.parse({ ...baseProduct, chronopostPrice: 0 }).chronopostPrice).toBe(
      0,
    );
  });

  it('accepte null explicite', () => {
    expect(
      CatalogProductSchema.parse({ ...baseProduct, chronopostPrice: null }).chronopostPrice,
    ).toBeNull();
  });

  it('refuse un prix négatif', () => {
    expect(() => CatalogProductSchema.parse({ ...baseProduct, chronopostPrice: -1 })).toThrow();
  });
});

describe('defaultCatalogSnapshot — chronopostPrice', () => {
  it('initialise chaque produit avec chronopostPrice null', () => {
    const snap = defaultCatalogSnapshot();
    expect(snap.products.length).toBeGreaterThan(0);
    for (const p of snap.products) expect(p.chronopostPrice).toBeNull();
  });
});
```

- [ ] **Step 2 : Lancer le test pour vérifier qu'il échoue**

Run: `pnpm --filter @df/shared test -- catalog.test` (ou `pnpm --filter @df/shared test`)
Expected: FAIL — `chronopostPrice` est `undefined` après parse (pas dans le schéma) et `defaultCatalogSnapshot` ne le pose pas.

- [ ] **Step 3 : Ajouter le champ au schéma zod**

Dans `packages/shared/src/schemas/catalog.ts`, dans `CatalogProductSchema`, après la ligne `bestColorIds: z.array(...).default([]),` ajouter :

```ts
  // Prix Chronopost €/pièce propre à la référence. null/absent ⇒ tarif global.
  // 0 ⇒ Chronopost offert pour cette référence. Ne s'applique qu'au mode chronopost.
  chronopostPrice: z.number().min(0).nullable().default(null),
```

- [ ] **Step 4 : Ajouter le champ à l'interface + au défaut**

Dans `packages/shared/src/catalog/snapshot.ts`, dans `interface CatalogProduct`, après `bestColorIds: string[];` ajouter :

```ts
  /** Prix Chronopost €/pièce propre à la réf. null/absent ⇒ tarif global ; 0 ⇒ offert. */
  chronopostPrice?: number | null;
```

Puis dans `defaultCatalogSnapshot()`, dans le `PRODUCTS.map((p) => ({ ... }))`, après `bestColorIds: [...DEFAULT_PRODUCT_BEST_COLOR_IDS],` ajouter :

```ts
      chronopostPrice: null,
```

- [ ] **Step 5 : Lancer les tests shared pour vérifier qu'ils passent**

Run: `pnpm --filter @df/shared test`
Expected: PASS (nouveau fichier + suite catalogue existante verte).

- [ ] **Step 6 : Typecheck + build de shared (indispensable pour web/api)**

Run: `pnpm --filter @df/shared typecheck && pnpm --filter @df/shared build`
Expected: aucun message d'erreur ; `packages/shared/dist` régénéré avec le nouveau champ.

- [ ] **Step 7 : Commit**

```bash
git add packages/shared/src/schemas/catalog.ts packages/shared/src/catalog/snapshot.ts packages/shared/src/schemas/catalog.test.ts
git commit -m "$(cat <<'EOF'
feat(shared): champ chronopostPrice (nullable) par référence

null/absent = tarif Chronopost global, 0 = offert pour la réf.
Schéma zod + interface CatalogProduct + défaut snapshot.

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 2 : Pricing — résolveur par référence + tests

**Files:**

- Modify: `apps/web/src/features/quote/pricing.ts` (`transportSurcharge` → ajout `transportSurchargeFor`, branchements dans `lineTotals` et `quoteTotals`)
- Test: `apps/web/src/features/quote/pricing.test.ts` (nouveau bloc `describe`)

> Prérequis : Task 1 terminée et `shared` rebuildé (Step 6).

- [ ] **Step 1 : Écrire les tests qui échouent**

Dans `apps/web/src/features/quote/pricing.test.ts`, ajouter `afterEach` à l'import vitest et `lineTotals` à l'import de `./pricing`, puis ajouter les imports store/snapshot en tête :

```ts
import { describe, it, expect, afterEach } from 'vitest';
```

```ts
import {
  coefFor,
  placementZonesPriceHT,
  round2,
  roundUp10Cents,
  viergePriceHT,
  lineQty,
  unitPriceHT,
  lineSubtotalHT,
  lineTotals,
  quoteTotals,
} from './pricing';
import { useCatalogStore } from '@/features/catalog/catalogStore';
import { defaultCatalogSnapshot } from '@df/shared';
```

Puis, à la fin du fichier, ajouter :

```ts
describe('quoteTotals — prix Chronopost par référence', () => {
  // Injecte un catalogue par défaut où une réf porte un chronopostPrice donné.
  function withChronopostPrice(ref: string, price: number | null): void {
    const snap = defaultCatalogSnapshot();
    const p = snap.products.find((x) => x.ref === ref);
    if (!p) throw new Error(`setup test : réf ${ref} introuvable`);
    p.chronopostPrice = price;
    useCatalogStore.getState().setSnapshot(snap, { loaded: true });
  }

  afterEach(() => {
    // Restaure le catalogue par défaut pour ne pas contaminer les autres suites.
    useCatalogStore.getState().setSnapshot(defaultCatalogSnapshot(), { loaded: false });
  });

  const oneLine = (extra?: { transport?: 'maritime' | 'chronopost' | 'stock' }) => ({
    lines: [
      {
        productRef: 'H-001',
        placementId: 'coeur-dos',
        sizes: sizes({ m: 5 }),
        code: 0,
        ...(extra?.transport ? { transport: extra.transport } : {}),
      },
    ],
    revente: true as const,
  });

  it('utilise le prix Chronopost de la référence quand il est renseigné', () => {
    withChronopostPrice('H-001', 3);
    const r = quoteTotals({ ...oneLine(), transport: 'chronopost' });
    expect(r.subtotalHT).toBe(135); // PU base 27,00 × 5
    expect(r.transportHT).toBe(15); // 3,00 × 5 (et non 1,50 × 5)
    expect(r.totalHT).toBe(150);
  });

  it('chronopostPrice 0 ⇒ livraison Chronopost offerte pour la réf', () => {
    withChronopostPrice('H-001', 0);
    const r = quoteTotals({ ...oneLine(), transport: 'chronopost' });
    expect(r.transportHT).toBe(0);
    expect(r.totalHT).toBe(135);
  });

  it('null ⇒ tarif Chronopost global (1,50 €/pièce)', () => {
    withChronopostPrice('H-001', null);
    const r = quoteTotals({ ...oneLine(), transport: 'chronopost' });
    expect(r.transportHT).toBe(7.5); // 1,50 × 5
  });

  it('ignoré pour une ligne Maritime / Stock', () => {
    withChronopostPrice('H-001', 3);
    expect(quoteTotals({ ...oneLine(), transport: 'maritime' }).transportHT).toBe(0);
    expect(quoteTotals({ ...oneLine(), transport: 'stock' }).transportHT).toBe(0);
  });

  it('mélange une réf avec override et une réf sans', () => {
    withChronopostPrice('H-001', 3); // F-003 reste à null
    const r = quoteTotals({
      lines: [
        { productRef: 'H-001', placementId: 'coeur-dos', sizes: sizes({ m: 5 }), code: 0 },
        { productRef: 'F-003', placementId: 'coeur-dos', sizes: sizes({ m: 5 }), code: 0 },
      ],
      transport: 'chronopost',
      revente: true,
    });
    expect(r.transportHT).toBe(22.5); // 3×5 + 1,50×5
  });

  it("s'applique aussi via un override de mode chronopost par ligne", () => {
    withChronopostPrice('H-001', 3);
    const r = quoteTotals({ ...oneLine({ transport: 'chronopost' }), transport: 'maritime' });
    expect(r.transportHT).toBe(15);
  });

  it('lineTotals respecte le prix Chronopost de la référence', () => {
    withChronopostPrice('H-001', 3);
    const t = lineTotals(
      { productRef: 'H-001', placementId: 'coeur-dos', sizes: sizes({ m: 5 }), code: 0 },
      'chronopost',
      true,
    );
    expect(t.htWithTransport).toBe(150); // 135 + 3×5
  });

  it('ligne libre (hors catalogue) ⇒ tarif Chronopost global', () => {
    withChronopostPrice('H-001', 3); // override sur une AUTRE réf
    const r = quoteTotals({
      lines: [
        {
          productRef: 'CUSTOM',
          placementId: 'coeur-dos',
          sizes: sizes({ m: 5 }),
          code: 0,
          custom: { name: 'Produit libre', priceAchat: 4.05 },
        },
      ],
      transport: 'chronopost',
      revente: true,
    });
    expect(r.transportHT).toBe(7.5); // 1,50 × 5 — CUSTOM n'a pas d'override
  });
});
```

- [ ] **Step 2 : Lancer les tests pour vérifier qu'ils échouent**

Run: `pnpm --filter @df/web test -- pricing.test`
Expected: FAIL sur les cas override (le calcul utilise encore le surcoût global, donc `transportHT` = 7,5 partout).

- [ ] **Step 3 : Ajouter le résolveur et le brancher**

Dans `apps/web/src/features/quote/pricing.ts`, **remplacer** la fonction privée existante :

```ts
function transportSurcharge(t: Transport): number {
  const opt = getCatalog().transportById[t];
  if (!opt) {
    throw new Error(`Unknown transport: ${t}`);
  }
  return opt.surcharge;
}
```

par (on garde `transportSurcharge` comme lookup global défensif, et on ajoute le résolveur exporté) :

```ts
function transportSurcharge(t: Transport): number {
  const opt = getCatalog().transportById[t];
  if (!opt) {
    throw new Error(`Unknown transport: ${t}`);
  }
  return opt.surcharge;
}

/**
 * Surcoût transport par pièce d'une ligne, résolu par référence.
 *
 * Le surcoût global du mode s'applique, SAUF en chronopost : si la référence
 * porte un `chronopostPrice` non-null dans le catalogue, c'est lui qui prime
 * (y compris 0 € = Chronopost offert pour cette réf). Les lignes hors catalogue
 * (ref absente — ex. lignes libres `CUSTOM`) retombent sur le tarif global.
 */
export function transportSurchargeFor(t: Transport, productRef: string): number {
  const base = transportSurcharge(t); // lève si mode inconnu (garde défensive)
  if (t === 'chronopost') {
    const product = getCatalog().productByRef[productRef];
    if (product && product.chronopostPrice != null) {
      return product.chronopostPrice;
    }
  }
  return base;
}
```

Puis, dans `lineTotals`, remplacer :

```ts
const eff = transportSurcharge(line.transport ?? quoteTransport);
```

par :

```ts
const eff = transportSurchargeFor(line.transport ?? quoteTransport, line.productRef);
```

Et dans `quoteTotals`, dans la boucle `for (const line of billable) {`, remplacer :

```ts
const eff = transportSurcharge(line.transport ?? quote.transport);
```

par :

```ts
const eff = transportSurchargeFor(line.transport ?? quote.transport, line.productRef);
```

> Laisser la garde amont `transportSurcharge(quote.transport);` (au début de `quoteTotals`) **inchangée** : elle préserve le test « throws on unknown transport id ».

- [ ] **Step 4 : Lancer les tests pour vérifier qu'ils passent**

Run: `pnpm --filter @df/web test -- pricing.test`
Expected: PASS — nouveaux cas verts ET suite pricing existante toujours verte (golden path, overrides par ligne, garde « unknown transport »).

- [ ] **Step 5 : Typecheck web**

Run: `pnpm --filter @df/web typecheck`
Expected: aucune erreur.

- [ ] **Step 6 : Commit**

```bash
git add apps/web/src/features/quote/pricing.ts apps/web/src/features/quote/pricing.test.ts
git commit -m "$(cat <<'EOF'
feat(devis): résolution du surcoût Chronopost par référence

transportSurchargeFor(mode, ref) — l'override produit prime en
chronopost, sinon tarif global. Branché dans lineTotals/quoteTotals.

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 3 : LineRow — réutiliser le résolveur (DRY)

**Files:**

- Modify: `apps/web/src/features/quote/components/LineRow.tsx` (mémo `transportPerPiece`)

> `LineRow` n'a pas de harnais de test unitaire (cf. spec tablette). Couverture : typecheck + les tests pricing de la Task 2 + vérification visuelle (Task 6). Pas de test ajouté ici — noté explicitement, pas un oubli.

- [ ] **Step 1 : Importer le résolveur**

Dans `apps/web/src/features/quote/components/LineRow.tsx`, remplacer :

```ts
import { lineQty, unitPriceBreakdown, lineSubtotalHT } from '../pricing';
```

par :

```ts
import { lineQty, unitPriceBreakdown, lineSubtotalHT, transportSurchargeFor } from '../pricing';
```

- [ ] **Step 2 : Utiliser le résolveur dans le mémo**

Remplacer :

```ts
const transportPerPiece = useMemo(() => {
  return transports.find((t) => t.id === effectiveTransport)?.surcharge ?? 0;
}, [effectiveTransport, transports]);
```

par :

```ts
const transportPerPiece = useMemo(() => {
  return transportSurchargeFor(effectiveTransport, line.productRef);
  // `version` force le recalcul quand le catalogue change (lu via getCatalog).
  // eslint-disable-next-line react-hooks/exhaustive-deps
}, [effectiveTransport, line.productRef, version]);
```

> `transports` reste destructuré de `useCatalog()` (utilisé par le sélecteur de transport de la ligne) — ne pas le retirer.

- [ ] **Step 3 : Typecheck + lint web**

Run: `pnpm --filter @df/web typecheck`
Expected: aucune erreur (notamment `transports` toujours utilisé ailleurs → pas de `noUnusedLocals`).

- [ ] **Step 4 : Commit**

```bash
git add apps/web/src/features/quote/components/LineRow.tsx
git commit -m "$(cat <<'EOF'
refactor(devis): LineRow utilise transportSurchargeFor

Supprime le calcul de surcoût transport dupliqué ; le détail affiché
reflète l'override Chronopost par référence.

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 4 : API — Prisma, lecture, seed, sauvegarde

**Files:**

- Modify: `apps/api/prisma/schema.prisma` (`model Product`)
- Modify: `apps/api/src/catalogService.ts` (`readSnapshot`, `ensureCatalogSeeded`)
- Modify: `apps/api/src/routes/catalog.ts` (`PUT /products`)

> Prérequis : Task 1 terminée et `shared` rebuildé (l'API importe `defaultCatalogSnapshot` depuis `@df/shared`).

- [ ] **Step 1 : Ajouter la colonne nullable**

Dans `apps/api/prisma/schema.prisma`, dans `model Product`, après `priceAchat   Decimal  @db.Decimal(10, 2)` ajouter :

```prisma
  // Prix Chronopost €/pièce propre à la réf (null ⇒ tarif global ; 0 ⇒ offert).
  chronopostPrice Decimal? @db.Decimal(10, 2)
```

- [ ] **Step 2 : Régénérer le client Prisma (types) — sans DB**

Run: `pnpm --filter @df/api db:generate`
Expected: « Generated Prisma Client » ; `prisma.product` connaît désormais `chronopostPrice`.

- [ ] **Step 3 : Lire le champ dans le snapshot + le semer**

Dans `apps/api/src/catalogService.ts`, dans `readSnapshot`, dans le `products.map(...)`, après `priceAchat: Number(p.priceAchat),` ajouter :

```ts
        chronopostPrice: p.chronopostPrice == null ? null : Number(p.chronopostPrice),
```

Puis dans `ensureCatalogSeeded`, dans le `prisma.product.createMany({ data: def.products.map((p) => ({ ... })) })`, après `bestColorIds: p.bestColorIds,` ajouter :

```ts
        chronopostPrice: p.chronopostPrice ?? null,
```

- [ ] **Step 4 : Sauvegarder le champ sur PUT /products**

Dans `apps/api/src/routes/catalog.ts`, dans `.put('/products', ...)`, dans le `prisma.product.createMany({ data: parsed.data.map((p) => ({ ... })) })`, après `bestColorIds: p.bestColorIds,` ajouter :

```ts
          chronopostPrice: p.chronopostPrice ?? null,
```

- [ ] **Step 5 : Typecheck API**

Run: `pnpm --filter @df/api typecheck`
Expected: aucune erreur (le client Prisma régénéré accepte `chronopostPrice` ; `CatalogProduct.chronopostPrice` lu depuis `@df/shared`).

- [ ] **Step 6 : Appliquer la colonne en local (si Postgres dispo)**

Run: `pnpm --filter @df/api db:deploy`
Expected: `prisma db push` ajoute la colonne `chronopostPrice` (nullable, donc sans perte).

> Nécessite `DATABASE_URL` vers un Postgres de dev. Si indisponible en local, **sauter cette étape** : la colonne sera créée en prod au boot (`db:deploy` dans le Dockerfile). `prisma generate` (Step 2) suffit pour compiler.

- [ ] **Step 7 : Commit**

```bash
git add apps/api/prisma/schema.prisma apps/api/src/catalogService.ts apps/api/src/routes/catalog.ts
git commit -m "$(cat <<'EOF'
feat(api): persiste chronopostPrice par référence

Colonne Product.chronopostPrice (Decimal? nullable), lue dans le
snapshot, semée et sauvegardée via PUT /products.

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 5 : Admin — champ nombre nullable + saisie produit

**Files:**

- Modify: `apps/web/src/pages/admin/components/adminUi.tsx` (composant `NullableNumberField`)
- Test (create): `apps/web/src/pages/admin/components/adminUi.test.tsx`
- Modify: `apps/web/src/pages/admin/CatalogPage.tsx` (champ dans le panneau dépliable + `chronopostPrice: null` dans `add()`)

- [ ] **Step 1 : Écrire les tests qui échouent**

Créer `apps/web/src/pages/admin/components/adminUi.test.tsx` :

```tsx
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { NullableNumberField } from './adminUi';

describe('NullableNumberField', () => {
  it('affiche vide quand value est null', () => {
    render(<NullableNumberField value={null} onChange={() => {}} ariaLabel="px" />);
    expect(screen.getByLabelText('px')).toHaveValue('');
  });

  it('affiche le placeholder quand vide', () => {
    render(
      <NullableNumberField
        value={null}
        onChange={() => {}}
        ariaLabel="px"
        placeholder="1,50 € (défaut)"
      />,
    );
    expect(screen.getByLabelText('px')).toHaveAttribute('placeholder', '1,50 € (défaut)');
  });

  it('émet null quand on vide le champ', async () => {
    const onChange = vi.fn();
    render(<NullableNumberField value={2} onChange={onChange} ariaLabel="px" />);
    await userEvent.clear(screen.getByLabelText('px'));
    expect(onChange).toHaveBeenLastCalledWith(null);
  });

  it('émet un nombre quand on saisit', async () => {
    const onChange = vi.fn();
    render(<NullableNumberField value={null} onChange={onChange} ariaLabel="px" />);
    await userEvent.type(screen.getByLabelText('px'), '3');
    expect(onChange).toHaveBeenLastCalledWith(3);
  });
});
```

- [ ] **Step 2 : Lancer le test pour vérifier qu'il échoue**

Run: `pnpm --filter @df/web test -- adminUi.test`
Expected: FAIL — `NullableNumberField` n'est pas exporté.

- [ ] **Step 3 : Implémenter `NullableNumberField`**

Dans `apps/web/src/pages/admin/components/adminUi.tsx`, juste après la fonction `NumberField` (qui se termine par `}` avant `export function DeleteRowButton`), ajouter :

```tsx
/**
 * Variante de {@link NumberField} qui distingue « vide » (null) d'un nombre.
 * Champ vide ⇒ onChange(null) ; sinon onChange(nombre). Utilisé pour les
 * réglages optionnels (ex. prix Chronopost par référence).
 */
export function NullableNumberField({
  value,
  onChange,
  suffix,
  ariaLabel,
  placeholder,
  className,
}: {
  value: number | null;
  onChange: (v: number | null) => void;
  suffix?: string;
  ariaLabel?: string;
  placeholder?: string;
  className?: string;
}) {
  const [text, setText] = useState(() => (value == null ? '' : numToText(value)));

  // Re-seed depuis la prop quand elle change de l'extérieur (reset / cancel).
  useEffect(() => {
    const localNull = text.trim() === '';
    if (value == null) {
      if (!localNull) setText('');
    } else if (localNull || Math.abs(parseNum(text) - value) > 1e-9) {
      setText(numToText(value));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  return (
    <div className={cn('relative', className)}>
      <input
        type="text"
        inputMode="decimal"
        value={text}
        placeholder={placeholder}
        aria-label={ariaLabel}
        onChange={(e) => {
          let cleaned = e.target.value.replace(/[^\d.,]/g, '');
          const sep = cleaned.search(/[.,]/);
          if (sep !== -1) {
            cleaned = cleaned.slice(0, sep + 1) + cleaned.slice(sep + 1).replace(/[.,]/g, '');
          }
          setText(cleaned);
          onChange(cleaned.trim() === '' ? null : parseNum(cleaned));
        }}
        className={cn('df-input h-9 text-sm text-right tabular-nums df-mono', suffix ? 'pr-7' : '')}
      />
      {suffix && (
        <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-[var(--df-ink-3)] pointer-events-none">
          {suffix}
        </span>
      )}
    </div>
  );
}
```

> `useState`, `useEffect`, `cn`, `numToText`, `parseNum` sont déjà importés/définis dans ce fichier.

- [ ] **Step 4 : Lancer le test pour vérifier qu'il passe**

Run: `pnpm --filter @df/web test -- adminUi.test`
Expected: PASS.

- [ ] **Step 5 : Brancher le champ dans CatalogPage**

Dans `apps/web/src/pages/admin/CatalogPage.tsx` :

(a) Ajouter `NullableNumberField` à l'import depuis `./components/adminUi` :

```tsx
import {
  PageHeader,
  TextField,
  NumberField,
  NullableNumberField,
  DeleteRowButton,
  AddRowButton,
  SaveBar,
  Card,
} from './components/adminUi';
```

(b) Passer le tarif Chronopost global au composant éditeur. Remplacer le composant `CatalogPage` :

```tsx
export default function CatalogPage() {
  const cat = useCatalog();
  return <ProductsEditor key={cat.version} initial={cat.products} colors={cat.textileColors} />;
}
```

par :

```tsx
export default function CatalogPage() {
  const cat = useCatalog();
  const chronopostDefault = cat.transportById['chronopost']?.surcharge ?? null;
  return (
    <ProductsEditor
      key={cat.version}
      initial={cat.products}
      colors={cat.textileColors}
      chronopostDefault={chronopostDefault}
    />
  );
}
```

(c) Étendre la signature de `ProductsEditor` :

```tsx
function ProductsEditor({
  initial,
  colors,
  chronopostDefault,
}: {
  initial: CatalogProduct[];
  colors: CatalogTextileColor[];
  chronopostDefault: number | null;
}) {
```

(d) Dans `add()`, ajouter le champ au nouveau produit. Remplacer l'objet poussé :

```tsx
      {
        ref: '',
        supplierRef: '',
        name: '',
        family: 'unisexe',
        priceAchat: 0,
        sizes: [...SIZE_KEYS],
        colorIds: colors.map((c) => c.id),
        bestColorIds: colors.filter((c) => c.best).map((c) => c.id),
      },
```

par :

```tsx
      {
        ref: '',
        supplierRef: '',
        name: '',
        family: 'unisexe',
        priceAchat: 0,
        sizes: [...SIZE_KEYS],
        colorIds: colors.map((c) => c.id),
        bestColorIds: colors.filter((c) => c.best).map((c) => c.id),
        chronopostPrice: null,
      },
```

(e) Calculer le placeholder et ajouter la section dans le panneau dépliable. Juste avant le `return (` de `ProductsEditor`, ajouter :

```tsx
const chronopostPlaceholder =
  chronopostDefault != null
    ? `${chronopostDefault.toLocaleString('fr-FR', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      })} € (défaut)`
    : 'Tarif standard';
```

Puis, dans le bloc `{isOpen && ( ... )}`, après la `<section>` des coloris textile (juste avant le `</div>` qui ferme `flex flex-col gap-4`), ajouter une nouvelle section :

```tsx
<section>
  <span className="df-caps">Prix Chronopost (€/pièce)</span>
  <div className="mt-1.5 w-44">
    <NullableNumberField
      value={p.chronopostPrice ?? null}
      onChange={(v) => {
        update(i, { chronopostPrice: v });
      }}
      suffix="€"
      placeholder={chronopostPlaceholder}
      ariaLabel={`Prix Chronopost ${p.ref || `ligne ${String(i + 1)}`}`}
    />
  </div>
  <p className="text-xs text-[var(--df-ink-3)] mt-1.5">
    Laissez vide pour le tarif Chronopost standard. 0 € = livraison Chronopost offerte pour cette
    référence.
  </p>
</section>
```

- [ ] **Step 6 : Typecheck + lint web**

Run: `pnpm --filter @df/web typecheck`
Expected: aucune erreur (`update(i, { chronopostPrice: v })` est un `Partial<CatalogProduct>` valide).

- [ ] **Step 7 : Commit**

```bash
git add apps/web/src/pages/admin/components/adminUi.tsx apps/web/src/pages/admin/components/adminUi.test.tsx apps/web/src/pages/admin/CatalogPage.tsx
git commit -m "$(cat <<'EOF'
feat(admin): saisie du prix Chronopost par référence

NullableNumberField (vide = tarif standard) + champ dans le panneau
dépliable de chaque produit. 0 € = Chronopost offert.

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 6 : Vérification globale

**Files:** aucune édition attendue (correctifs uniquement si un contrôle échoue).

- [ ] **Step 1 : Rebuild shared (au cas où) + suite complète**

Run:

```bash
pnpm --filter @df/shared build
pnpm -r typecheck
pnpm -r test
pnpm lint
```

Expected: typecheck OK partout · tous les tests verts (shared catalog + web pricing/adminUi + existants) · lint `--max-warnings=0` propre.

- [ ] **Step 2 : Vérification visuelle dans l'app**

Démarrer l'app (api + web) et vérifier, dans l'ordre :

1. **Admin › Produits** : déplier une référence (ex. `H-004`), saisir `2,00` dans « Prix Chronopost », **Enregistrer** (toast « Modifications enregistrées »). Rouvrir la page : la valeur persiste.
2. **Écran vendeuse** : créer un devis Chronopost avec cette référence (ex. 10 pièces) → le surcoût/pièce du détail de ligne et le `transportHT` du récap utilisent **2,00 €/pièce** (et non 1,50 €).
3. Une **autre** référence sans override sur le même devis reste à **1,50 €/pièce**.
4. **PDF** : générer le PDF du devis → la ligne « Transport » reflète le total recalculé.
5. **Vider** le champ « Prix Chronopost » de `H-004`, enregistrer → retour au tarif standard (1,50 €).
6. Régler le champ à **0 €**, enregistrer → Chronopost **offert** pour cette réf (surcoût 0, ≠ champ vide).

- [ ] **Step 3 : Mettre à jour le statut de la spec**

Dans `docs/superpowers/specs/2026-06-02-prix-chronopost-par-reference-design.md`, passer la ligne `- **Statut** :` à `implémenté`.

```bash
git add docs/superpowers/specs/2026-06-02-prix-chronopost-par-reference-design.md
git commit -m "$(cat <<'EOF'
docs(devis): spec prix Chronopost par référence — implémenté

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>
EOF
)"
```

> Le déploiement (push + Railway) sera proposé séparément — pas inclus dans ce plan.

---

## Self-review (couverture spec → tâches)

- Schéma partagé `chronopostPrice` nullable + défaut null → **Task 1**.
- Rétro-compat cache IDB / snapshot ancien (`.default(null)` + interface optionnelle) → **Task 1** + Notes transverses.
- `null` ≠ `0` (vide = global, 0 = offert) → **Task 1** (schéma), **Task 2** (tests 0 et null), **Task 5** (UI + légende).
- Colonne DB nullable + lecture + seed + sauvegarde → **Task 4**.
- Résolveur par référence, mode chronopost uniquement, lignes libres = global → **Task 2** (résolveur + tests), branché `lineTotals`/`quoteTotals`.
- `LineRow` reflète l'override (DRY) → **Task 3**.
- PDF / route PDF serveur sans changement (hérite de `quoteTotals`) → vérifié spec §2.2 ; contrôlé en **Task 6** step 2.4.
- UI admin dans le panneau dépliable, champ nullable, placeholder défaut → **Task 5**.
- Tests : override pris/ignoré, 0, null, mixte, override de mode par ligne, ligne libre, schéma → **Task 2** + **Task 1** + **Task 5**.
- Historique devis inchangé → aucun code (spec §4) ; non régressé par les tâches.
