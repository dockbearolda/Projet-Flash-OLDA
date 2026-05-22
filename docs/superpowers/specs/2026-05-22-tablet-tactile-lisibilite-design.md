# Écran vendeuse `/tablet` — passe tactile & lisibilité

- **Date** : 2026-05-22
- **Statut** : design validé (en attente de revue spec)
- **Approche** : « ciblé tactile + lisibilité » — on conserve le langage visuel existant (tokens, thèmes, Geist) et on l'optimise. Pas de refonte visuelle.

## Contexte & objectif

L'écran `/tablet` (interface vendeuse, Samsung Galaxy Tab A9+ 11" en paysage) est déjà très abouti : système de tokens complet, 10 thèmes, total TTC dominant, selects principaux à 48px. L'objectif de cette passe est strictement :

1. **Ergonomie tactile** — épaissir les zones de frappe trop petites pour un usage au doigt en boutique.
2. **Allègement / lisibilité** — réduire la densité de chaque carte de ligne en repliant le simulateur de revente.

Aucune nouvelle dépendance, aucun asset externe, aucune nouvelle couleur.

## Périmètre

**Dans le périmètre :**

- Agrandissement de cibles tactiles ciblées (section 1).
- Repli par défaut du simulateur de revente par ligne (section 3).

**Hors périmètre (décidé avec l'utilisateur) :**

- Aperçu / silhouette de vêtement, aperçu de placement DTF.
- Enrichissement ou agrandissement des pastilles de couleur textile.
- Montée en gamme identité OLDA (logo, typo éditoriale).
- Toute modification du PDF, des écrans admin, de l'API.

> La numérotation saute volontairement la « Section 2 » : c'était l'aperçu de placement (silhouette de vêtement), retiré du périmètre ci-dessus. On garde les numéros 1 et 3 pour rester cohérent avec la discussion de cadrage.

## Section 1 — Ergonomie tactile

Cibles mesurées dans le code et leurs valeurs visées. **Aucun changement de largeur ni de mise en page** — on n'épaissit que la hauteur des zones de frappe.

| #      | Élément                                      | Fichier                                                      | Actuel                               | Cible                                                                                                              |
| ------ | -------------------------------------------- | ------------------------------------------------------------ | ------------------------------------ | ------------------------------------------------------------------------------------------------------------------ |
| 1.1    | Tabs transport (récap)                       | `apps/web/src/features/quote/components/TransportPicker.tsx` | `h-9` (36px), icône 14               | `h-11` (44px), icône 16                                                                                            |
| 1.2    | Boutons WhatsApp / Email                     | `apps/web/src/features/quote/components/RecapDrawer.tsx`     | Button `default` = `h-10` (40px)     | 48px (voir 1.2bis)                                                                                                 |
| 1.2bis | Variante de taille Button                    | `apps/web/src/components/ui/Button.tsx`                      | tailles `default` (40) / `lg` (56)   | ajouter `md` = `h-12` (48px) ; WhatsApp/Email passent en `size="md"`. PDF reste `lg`.                              |
| 1.3    | Cellules grille de tailles + total           | `apps/web/src/features/quote/components/QtyGrid.tsx`         | `h-11` (44px)                        | `h-[52px]` (input + cellule total alignées)                                                                        |
| 1.4    | Méta ligne : transport inline + bascule TGCA | `apps/web/src/features/quote/components/LineRow.tsx`         | texte fin `text-xs` (~20px de cible) | petites **puces tappables** ~32px de hauteur de cible, visuellement secondaires (ce sont des surcharges par ligne) |

**Détails 1.4** : le `<select>` transport inline et le bouton bascule TGCA « Exonérée / Appliquée » conservent exactement leur logique et leurs données ; seul leur habillage devient une puce avec une hauteur de frappe d'au moins ~32px. Ils restent discrets (ce sont des overrides du défaut devis).

**Exclu explicitement** : la taille des options de couleur dans le popover (`SwatchOption`, 36px) reste inchangée — l'agrandissement des pastilles faisait partie de l'option « pastilles enrichies » déclinée par l'utilisateur.

## Section 3 — Allègement / lisibilité

### 3.1 — Repli du simulateur de revente

Le simulateur de revente par ligne (les 4 bulles « Prix conseillé / Coef / Marge / pièce / Marge totale », bloc `qty > 0 && (...grid-cols-4...)` dans `LineRow.tsx`) est **indicatif et hors devis**. Il alourdit chaque carte.

- Le bloc devient un **volet repliable**, **fermé par défaut**.
- Un en-tête tappable « Revente client » avec chevron (hauteur de frappe ≥ 44px) ouvre/ferme le volet.
- État local au composant (`useState`, défaut fermé), **par ligne**. Pas de persistance inter-lignes ni inter-sessions (on garde simple).
- Comme aujourd'hui, tout le bloc reste masqué tant que `qty === 0`.
- Accessibilité : bouton avec `aria-expanded` ; le contenu reste un région reliée au bouton.

### 3.2 — Rythme vertical

Une fois le simulateur replié, ajuster légèrement les paddings de la zone tailles/prix pour que la carte respire. **Ajustements d'espacement uniquement** — pas de changement de structure ni de réorganisation.

## Composants impactés

- `apps/web/src/features/quote/components/LineRow.tsx` — puces méta (1.4), volet revente (3.1), rythme (3.2).
- `apps/web/src/features/quote/components/QtyGrid.tsx` — hauteur des cellules (1.3).
- `apps/web/src/features/quote/components/TransportPicker.tsx` — hauteur/icône des tabs (1.1).
- `apps/web/src/features/quote/components/RecapDrawer.tsx` — taille des boutons d'envoi (1.2).
- `apps/web/src/components/ui/Button.tsx` — nouvelle taille `md` (1.2bis).

## Tests & vérification

- **Tests unitaires verts** : `pnpm --filter @df/web test` (QtyGrid, Button, SegToggle, Swatch, Chip, Input, Card, + pricing/share/store du quote).
- **Button** : étendre `Button.test.tsx` pour la taille `md` (présence de `h-12`).
- **Volet revente** : ajouter un test du comportement de repli (fermé par défaut → s'ouvre au clic). `LineRow` n'a pas de harnais de test aujourd'hui ; si le câblage catalogue/store est trop lourd, garder la logique du toggle triviale et couvrir par la vérif visuelle, en le notant.
- **Typecheck** : `pnpm --filter @df/web typecheck`.
- **Lint** : `pnpm lint` (`--max-warnings=0`).
- **Vérif visuelle** dans l'app qui tourne (port 5174), en paysage tablette :
  - cibles tactiles visiblement plus larges (transport, WhatsApp/Email, grille tailles, méta ligne) ;
  - simulateur de revente **fermé par défaut**, s'ouvre au tap ;
  - contrôle rapide sur 2 thèmes (Sable défaut + Nuit sombre).

## Non-objectifs

- Aucun dessin de vêtement / aperçu de placement.
- Aucun enrichissement visuel des pastilles de couleur.
- Aucune nouvelle dépendance, couleur ou token.
- Pas de modification du PDF, de l'admin, de l'API.
