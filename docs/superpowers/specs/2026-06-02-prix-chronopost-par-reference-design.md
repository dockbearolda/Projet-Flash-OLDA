# Prix Chronopost réglable par référence

- **Date** : 2026-06-02
- **Statut** : design validé (en attente de revue spec)
- **Approche** : override par référence sur le produit du catalogue (approche A). Chronopost reste le mode par défaut ; on ajoute, par référence, un prix Chronopost €/pièce optionnel qui remplace le tarif global quand il est renseigné.

## Contexte & objectif

Aujourd'hui le surcoût transport ne dépend **que du mode** :

- Trois modes en base (`Transport`) : `maritime` (0 €), `chronopost` (1,50 €/pièce), `stock` (0 €).
- Le surcoût est **par pièce** : `transportSurcharge(mode) × quantité` (dans `lineTotals` et `quoteTotals`).
- Chronopost est le **mode par défaut** d'un nouveau devis et d'une nouvelle ligne (`quoteStore.ts:86,91`). **Inchangé.**
- Un override de _mode_ par ligne existe déjà (`line.transport`), mais le _prix_ d'un mode vient toujours du global.
- Les produits (`Product`) n'ont aucun prix transport propre.

**Objectif** : pouvoir fixer, **par référence**, un prix Chronopost €/pièce différent du tarif global. Exemple : la réf `H-004` part à 2,00 €/pièce en Chronopost alors que le reste du catalogue reste à 1,50 €.

Le prix par référence est **par pièce** (décidé avec l'utilisateur), cohérent avec tout le calcul existant : il remplace simplement le 1,50 €/pièce pour cette référence, multiplié par la quantité.

## Périmètre

**Dans le périmètre :**

- Champ `chronopostPrice` (€/pièce, _nullable_) par produit du catalogue : modèle partagé, schéma, base de données, seed.
- Résolution du surcoût/pièce devenant dépendante de la référence quand le mode = chronopost (source unique réutilisée par le récap, le partage texte et le PDF).
- Édition du champ dans l'admin **Produits**, dans le panneau dépliable de chaque ligne.

**Hors périmètre (décidé avec l'utilisateur) :**

- Prix par référence pour `maritime` / `stock` (toujours 0 ; rien n'indique qu'ils varient). Le champ ne concerne que Chronopost.
- Prix Chronopost par référence sur les **lignes libres** (hors catalogue) : elles gardent le tarif global. Extension possible plus tard.
- Override ponctuel par ligne de devis (approche C écartée : on veut un réglage qui « colle » à la référence, pas à ressaisir par devis).
- Toute migration des devis déjà enregistrés.

## Décision clé : `null` ≠ `0`

Le champ est **nullable**, et la distinction est porteuse de sens :

- `null` / vide ⇒ **tarif Chronopost standard** (le surcoût global, 1,50 € aujourd'hui).
- `0` ⇒ **Chronopost gratuit pour cette référence** (choix explicite du patron).

Toute la conception (schéma, colonne DB, champ de saisie) doit préserver cette distinction — on ne peut donc pas réutiliser tel quel `NumberField` (`value: number`, vide → 0).

## Section 1 — Modèle de données

### 1.1 Schéma partagé (`packages/shared/src/schemas/catalog.ts`)

Ajout au `CatalogProductSchema` :

```ts
chronopostPrice: z.number().min(0).nullable().default(null),
```

- `.default(null)` assure la rétro-compatibilité : un snapshot ou un cache IDB antérieur sans le champ est ré-hydraté à `null` (le `merge()` de `catalogStore` reparse via le schéma).
- Le type `CatalogProduct` gagne `chronopostPrice: number | null`.

### 1.2 Base de données (`apps/api/prisma/schema.prisma`)

Sur `model Product`, colonne nullable + migration :

```prisma
chronopostPrice Decimal? @db.Decimal(10, 2)
```

### 1.3 Lecture / seed (`apps/api/src/catalogService.ts`)

- `readSnapshot` mappe `chronopostPrice: p.chronopostPrice == null ? null : Number(p.chronopostPrice)`.
- `ensureCatalogSeeded` + `defaultCatalogSnapshot()` (`packages/shared/src/catalog/snapshot.ts`) : produits par défaut avec `chronopostPrice: null` (aucun override pré-rempli).

### 1.4 Sauvegarde (`apps/api/src/routes/catalog.ts`, `PUT /products`)

Le `createMany` inclut `chronopostPrice: p.chronopostPrice`. La route remplace déjà tous les produits (`deleteMany` + `createMany`) ; aucune nouvelle route nécessaire. La validation passe par `CatalogProductSchema` (déjà branché).

## Section 2 — Calcul (source unique de vérité)

### 2.1 Résolveur

Dans `apps/web/src/features/quote/pricing.ts`, remplacer le `transportSurcharge(mode)` interne par une résolution dépendante de la référence :

```
transportPerPiece(mode, productRef):
  base = getCatalog().transportById[mode].surcharge   // inchangé, lève si mode inconnu
  if mode === 'chronopost':
    p = getCatalog().productByRef[productRef]
    if p?.chronopostPrice != null: return p.chronopostPrice
  return base
```

- Lignes libres (ref absente du catalogue) ⇒ `productByRef` indéfini ⇒ tarif global. Conforme au hors-périmètre.
- Le garde « mode inconnu » de `quoteTotals` (validation amont de `quote.transport`) est conservé en validant l'existence du mode global.

### 2.2 Points d'appel à brancher

| Fichier                                          | Changement                                                                                                                                                                   |
| ------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `pricing.ts` `lineTotals` (≈211)                 | `transportPerPiece(line.transport ?? quoteTransport, line.productRef)`                                                                                                       |
| `pricing.ts` `quoteTotals` (≈283)                | idem, avec `line.productRef`                                                                                                                                                 |
| `LineRow.tsx:94`                                 | utiliser le **résolveur exporté** au lieu du `transports.find(...).surcharge` local (supprime la logique dupliquée ; le détail affiché reflète alors l'override)             |
| `share.ts:39`                                    | aucun changement direct — passe par `lineTotals`, hérite automatiquement                                                                                                     |
| PDF (`devisTemplate.ts`)                         | **aucun changement** — il affiche `totals.transportHT` (issu de `quoteTotals`) et les PU via `unitPriceHT` (hors transport) ; corriger `quoteTotals` propage automatiquement |
| Route PDF serveur (`apps/api/src/routes/pdf.ts`) | **aucun changement** — ne fait que rendre le HTML fourni par le client, aucune logique de prix côté API                                                                      |

`unitPriceBreakdown` accepte déjà `transportPerPiece` en argument : on lui passe la valeur résolue, sa signature ne change pas. Les `totals` du PDF sont calculés côté client (`quoteTotals` dans `TabletPage.tsx` et `QuotesPage.tsx`) avant d'appeler `buildDevisHtml`.

## Section 3 — UI admin (page Produits)

- Champ « Prix Chronopost (€/pièce) » ajouté dans le **panneau dépliable** de chaque produit (`CatalogPage.tsx`, là où sont déjà tailles et coloris) — **pas** une colonne permanente, pour garder le tableau dense lisible (réglage rare).
- Comportement _nullable_ :
  - Vide ⇒ `null` ⇒ tarif standard. Placeholder « 1,50 € (défaut) » (afficher le surcoût Chronopost global courant si dispo, sinon le libellé « défaut »).
  - Légende courte : « Laissez vide pour le tarif Chronopost standard. »
- **Champ nombre nullable** : `NumberField` actuel ne convient pas (`value: number`, vide → 0). Deux options pour le plan :
  1. variante opt-in de `NumberField` (`nullable`/`allowEmpty`) : `value: number | null`, `onChange(v: number | null)`, vide ⇄ `null` ;
  2. petit composant dédié (ex. `PriceOverrideField`).
     Recommandation : option 1 (opt-in) si elle n'impacte pas les appels existants, sinon option 2. À trancher dans le plan.
- Cohérent avec la préférence UI (changement ciblé, fonctionnel, sans ajout décoratif).

## Section 4 — Historique / persistance

- Les **brouillons** ouverts se recalculent en direct depuis le catalogue (déjà le cas quand le surcoût global ou un coef change) ⇒ ils prennent l'override immédiatement.
- Les colonnes de totaux stockées sur `Quote` (`subtotalHT`, `transportHT`, `tgcaHT`, `totalHT`, `coef`) restent le **cliché historique** affiché dans la liste admin.
- **Comportement existant inchangé** : le récap live et la **ré-génération du PDF** d'un devis enregistré (`QuotesPage.tsx` recalcule via `quoteTotals` depuis les lignes + le catalogue courant) reflètent le catalogue actuel — donc, comme aujourd'hui pour un coef ou le surcoût global, modifier le prix Chronopost d'une référence se répercute sur une ré-impression ultérieure. Ce point n'est pas modifié par cette fonctionnalité.
- Aucune migration de devis existants.

## Section 5 — Tests & vérification

- **`pricing.test.ts`** :
  - réf avec `chronopostPrice` renseigné + ligne Chronopost ⇒ `lineTotals`/`quoteTotals` utilisent l'override (et non 1,50 €) ;
  - devis mêlant une réf avec override et une réf sans ⇒ chaque ligne au bon tarif ;
  - override **ignoré** quand la ligne est `maritime` / `stock` ;
  - `chronopostPrice: 0` ⇒ surcoût Chronopost nul pour cette réf ;
  - `null` ⇒ tarif global ;
  - ligne libre ⇒ tarif global.
- **Schéma catalogue** : parse OK avec et sans `chronopostPrice` ; défaut `null` ; refuse `< 0`.
- **Typecheck** : `pnpm -r typecheck`.
- **Lint** : `pnpm lint` (`--max-warnings=0`).
- **Vérif visuelle** (app qui tourne) : dans l'admin Produits, déplier une réf, saisir un prix Chronopost, enregistrer ; créer un devis Chronopost sur cette réf et vérifier le surcoût/pièce dans le récap + le PDF ; vider le champ ⇒ retour au tarif standard.

## Non-objectifs

- Pas de prix par référence pour maritime / stock.
- Pas d'override Chronopost sur les lignes libres.
- Pas d'override ponctuel par ligne de devis.
- Pas de nouvelle route API ni de migration des devis enregistrés.
- Pas de changement du mode par défaut (Chronopost reste le défaut).
