# Familles de produits gérables par le patron

- **Date** : 2026-06-02
- **Statut** : design validé (en attente de revue spec)
- **Approche** : les familles deviennent une **collection éditable du catalogue** (comme coloris, placements, transports). Section admin « Familles » (ajouter / renommer / supprimer) ; tous les regroupements lisent les familles du catalogue. `ProductFamily` passe d'un enum figé à une simple chaîne (le slug).

## Contexte & objectif

Aujourd'hui la famille est un **enum figé** :

- `packages/shared/src/catalog/products.ts` : `type ProductFamily = 'unisexe' | 'femme' | 'enfant'`.
- `packages/shared/src/schemas/catalog.ts` : `ProductFamilySchema = z.enum(['unisexe','femme','enfant'])`, utilisé par `CatalogProductSchema.family`.
- En base (`apps/api/prisma/schema.prisma`) : `Product.family` est **déjà un `String`** (aucune contrainte DB) — le verrou est uniquement dans le code partagé.
- Utilisée comme **clé de regroupement + libellé + ordre** dans 3 sélecteurs de produits (`LineRow`, `PricingGrid`, `ProductPicker`) via une logique `FAMILY_LABEL` / `FAMILY_ORDER` **dupliquée 3 fois**, et dans le `<select>` famille de l'admin Produits (`CatalogPage`).

**Objectif** : le patron crée/renomme/supprime des familles (« Accessoire », « Casquette »…) en libre-service, sans toucher au code. On en profite pour centraliser le regroupement (supprimer la triple duplication).

## Périmètre

**Dans le périmètre :**

- Nouvelle entité **Famille** (`id` slug, `label`, `sort`) : modèle partagé, schéma zod, base de données, seed des 3 familles existantes.
- `ProductFamily` → `string` ; `ProductFamilySchema` → `z.string().trim().min(1)`.
- Lecture/seed/sauvegarde côté API + **route `PUT /api/catalog/families`** avec garde-fou de suppression.
- Section admin « Familles » (CRUD) + lien de navigation ; `<select>` famille de l'admin Produits devient dynamique.
- Helper de regroupement centralisé, réutilisé par les 3 sélecteurs.

**Hors périmètre (décidé avec l'utilisateur) :**

- **Réordonnancement** des familles dans l'admin (drag / monter-descendre) : non inclus au départ, comme les autres sections. L'ordre = l'ordre de la liste. Ajoutable plus tard.
- Configuration par famille au-delà de `{id, label, sort}` (icône, couleur, etc.).
- Migration de données (inutile : la base stocke déjà `family` en chaîne).
- Toucher au PDF, à la tarification, ou aux devis enregistrés.

## Décision clé : suppression bloquée tant que la famille est occupée

À la sauvegarde des familles, si une famille retirée (ou dont le slug change) est encore portée par des produits, la sauvegarde est **refusée** avec un message clair indiquant combien de produits et lesquels. Aucun produit ne peut se retrouver sans famille. (Choix de l'utilisateur parmi : bloquer / réaffecter / groupe « Autres ».)

## Section 1 — Modèle de données

### 1.1 Type partagé (`packages/shared/src/catalog/products.ts`)

`ProductFamily` n'est plus un enum :

```ts
/** Slug d'une famille de produits. Les familles sont éditables (catalogue). */
export type ProductFamily = string;
```

Les `family: 'unisexe' | …` des `PRODUCTS` statiques restent des chaînes valides.

### 1.2 Interface + snapshot (`packages/shared/src/catalog/snapshot.ts`)

```ts
export interface CatalogFamily {
  id: string;
  label: string;
  sort: number;
}
```

Ajout `families: CatalogFamily[]` à `CatalogSnapshot`. `defaultCatalogSnapshot()` sème les 3 familles :

```ts
families: [
  { id: 'unisexe', label: 'Homme', sort: 0 },
  { id: 'femme', label: 'Femme', sort: 1 },
  { id: 'enfant', label: 'Enfant', sort: 2 },
],
```

> Un seul libellé par famille désormais. Aujourd'hui l'admin affiche « Homme / Unisexe » et le devis « Homme » ; on unifie sur **« Homme »** (renommable ensuite par le patron).

### 1.3 Schéma zod (`packages/shared/src/schemas/catalog.ts`)

- `ProductFamilySchema` : `z.string().trim().min(1, 'Famille requise').max(40)` (était `z.enum`).
- Nouveau `CatalogFamilySchema = z.object({ id: z.string().trim().min(1).max(40), label: z.string().trim().min(1).max(60), sort: z.number().int().min(0) })`.
- Ajout `families: z.array(CatalogFamilySchema)` au `CatalogSnapshotSchema`.

### 1.4 Base de données (`apps/api/prisma/schema.prisma`)

Nouveau modèle (calqué sur `Transport`) ; `Product.family` reste inchangé (String = slug) :

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

## Section 2 — API

- **`readSnapshot`** (`catalogService.ts`) : lit `prisma.family.findMany({ orderBy: { sort: 'asc' } })` → `families` du snapshot, en mappant `slug → CatalogFamily.id` (exactement comme `Transport.slug → CatalogTransport.id` aujourd'hui ; côté snapshot l'`id` est le slug stable, le `cuid` Prisma reste interne).
- **`ensureCatalogSeeded`** : si `family.count() === 0`, sème les familles par défaut (slug/label/sort).
- **Route `PUT /api/catalog/families`** (`routes/catalog.ts`) : valide `z.array(CatalogFamilySchema)`, refuse les slugs en double, puis applique le **garde-fou** ci-dessous avant le `deleteMany` + `createMany`.

### 2.1 Garde-fou de suppression

```
slugsRetirés = (slugs en base) − (slugs du payload)
pour chaque slug retiré : n = prisma.product.count({ where: { family: slug } })
si Σ n > 0 :
  400 { error: "Familles encore utilisées : « <label> » (N produits)…", refs } — aucune écriture
```

- Le `<select>` famille de l'admin (Section 4) restreint déjà les valeurs aux familles existantes, donc en usage normal un produit pointe toujours vers une famille valide.
- Renommer le **libellé** garde le slug → ce n'est pas une suppression. Changer un **slug** existant = retrait de l'ancien slug → bloqué s'il est utilisé (protège les références).

## Section 3 — Regroupement centralisé

Nouveau helper pur dans `packages/shared/src/catalog/` (testable indépendamment) :

```ts
export function groupProductsByFamily(
  products: CatalogProduct[],
  families: CatalogFamily[],
): { family: CatalogFamily; items: CatalogProduct[] }[];
```

- Groupes dans l'ordre des familles (`sort`), `items` triés par `ref` (`localeCompare` numérique, comme aujourd'hui).
- **Défensif** : les produits dont le slug `family` n'existe pas dans `families` sont regroupés en **dernier** sous une famille de repli `{ id: '_autres', label: 'Autres', sort: ∞ }` — ils ne disparaissent jamais du sélecteur. (En pratique, le garde-fou empêche cet état.)

Remplace les blocs `FAMILY_LABEL` / `FAMILY_ORDER` + `byFamily` dupliqués dans `LineRow.tsx`, `PricingGrid.tsx`, `ProductPicker.tsx` : chacun appelle `groupProductsByFamily(products, families)` (familles lues via `useCatalog()`).

## Section 4 — Admin « Familles »

- Nouvelle page `apps/web/src/pages/admin/FamiliesPage.tsx` calquée sur `ColorsPage`/`PlacementsPage` : tableau **Identifiant** (slug) + **Libellé**, boutons supprimer/ajouter, `SaveBar`. Sauvegarde via `saveFamilies` (→ `PUT /families`). En cas de refus (garde-fou), le message d'erreur s'affiche en toast (comportement `putSection` existant).
- Enregistrement de la page + lien de navigation dans l'`AdminLayout` (groupe « Catalogue », près de « Produits »).
- `CatalogPage` (Produits) : le `<select>` famille liste désormais les familles du catalogue (libellés) ; `add()` initialise `family` au slug de la **première** famille du catalogue.

## Section 5 — Rétro-compatibilité

- Aucune migration : `Product.family` est déjà une chaîne en base ; on sème les 3 familles si la table est vide.
- Cache IndexedDB antérieur sans `families` : ré-hydraté via le schéma. `defaultCatalogSnapshot()` fournit les 3 familles par défaut tant que le serveur n'a pas répondu.
- Produits existants : gardent leur slug (`unisexe`/`femme`/`enfant`), qui correspond aux familles semées.

## Section 6 — Tests & vérification

- **Schéma** : `ProductFamilySchema` accepte une chaîne quelconque non vide, refuse `''` ; `CatalogFamilySchema` parse `{id,label,sort}` ; `CatalogSnapshotSchema` inclut `families` ; `defaultCatalogSnapshot()` renvoie les 3 familles attendues.
- **`groupProductsByFamily`** : respecte l'ordre `sort` ; trie les items par `ref` ; place un produit de famille inconnue dans « Autres » en dernier ; familles vides présentes (groupe vide) ou omises — comportement explicite et testé.
- **Garde-fou API** : retirer une famille occupée → 400 sans écriture ; retirer une famille vide → OK ; slugs en double → 400 ; renommer un libellé (même slug) → OK même si occupée.
- **Seed** : `ensureCatalogSeeded` crée les 3 familles sur base vide ; ne les recrée pas si présentes.
- **Typecheck** : `pnpm -r typecheck`. **Lint** : `pnpm lint`. **Tests** : `pnpm -r test`.
- **Vérif visuelle** (app + DB) : créer « Casquette » dans l'admin Familles, l'affecter à un produit ; elle apparaît comme groupe dans les 3 sélecteurs (devis, grille, picker) ; tenter de la supprimer alors qu'un produit l'utilise → refus avec message ; réaffecter le produit puis supprimer → OK.

## Non-objectifs

- Pas de réordonnancement des familles dans l'admin (ordre = ordre de la liste).
- Pas d'attributs de famille au-delà de `{id, label, sort}`.
- Pas de migration de données ni de changement du PDF, de la tarification ou des devis enregistrés.
- Pas de réaffectation automatique à la suppression (on bloque).
