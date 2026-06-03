/**
 * Runtime, editable view of the whole catalogue.
 *
 * The static `PRODUCTS`, `ZONES`, … exports are the *defaults* (seed values).
 * At runtime the catalogue is editable by the patron via /admin and persisted
 * server-side, so the app reads a {@link CatalogSnapshot} (loosely typed with
 * string ids) instead of the frozen `as const` literals.
 */
import { PRODUCTS, TRANSPORT_OPTIONS, TGCA_RATE, SIZE_KEYS } from './products.js';
import type { ProductFamily, SizeKey } from './products.js';
import { ZONES, ZONE_IDS } from './zones.js';
import { COEFS } from './coefs.js';
import { TEXTILE_COLORS, FLOCK_COLORS } from './colors.js';
import { PLACEMENTS } from './placements.js';

export interface CatalogProduct {
  ref: string;
  supplierRef: string;
  name: string;
  family: ProductFamily;
  priceAchat: number;
  /** Tailles proposées pour cette réf. Vide ⇒ toutes les tailles. */
  sizes: SizeKey[];
  /** Coloris textile disponibles pour cette réf (ids). Vide ⇒ tous les coloris. */
  colorIds: string[];
  /** Sous-ensemble de `colorIds` mis en avant (best-sellers), dans l'ordre d'affichage. */
  bestColorIds: string[];
  /** Prix Chronopost €/pièce propre à la réf. null/absent ⇒ tarif global ; 0 ⇒ offert. */
  chronopostPrice?: number | null;
}

/** Défauts d'une réf sans configuration explicite (toutes tailles / tous coloris). */
export const DEFAULT_PRODUCT_SIZES: readonly SizeKey[] = [...SIZE_KEYS];
export const DEFAULT_PRODUCT_COLOR_IDS: readonly string[] = TEXTILE_COLORS.map((c) => c.id);
export const DEFAULT_PRODUCT_BEST_COLOR_IDS: readonly string[] = TEXTILE_COLORS.filter(
  (c) => c.best,
).map((c) => c.id);

/** Tiered sale price table: `[qtyThreshold, priceHT]` rows, ascending. */
export type CatalogSalePrices = [number, number][];

export interface CatalogZone {
  id: string;
  label: string;
  salePrices: CatalogSalePrices;
}

/** `[qtyThreshold, coef]` margin row. */
export type CatalogCoef = [number, number];

export interface CatalogTextileColor {
  id: string;
  name: string;
  hex: string;
  best: boolean;
}

export interface CatalogFlockColor {
  id: string;
  name: string;
  hex: string | null;
  special: boolean;
}

export interface CatalogPlacement {
  id: string;
  label: string;
  /** Zones historiques (rétro-compat des clients en cache). Le prix vient de salePrices. */
  zones: string[];
  /** Familles de produit où ce placement est proposé. Vide ⇒ toutes familles. */
  families: string[];
  /** Barème de prix propre à l'option (tiered). Source du prix dans le devis. */
  salePrices: CatalogSalePrices;
}

export interface CatalogTransport {
  id: string;
  label: string;
  surcharge: number;
  delay: string;
}

export interface CatalogFamily {
  id: string;
  label: string;
}

export interface CatalogSnapshot {
  products: CatalogProduct[];
  zones: CatalogZone[];
  coefs: CatalogCoef[];
  textileColors: CatalogTextileColor[];
  flockColors: CatalogFlockColor[];
  placements: CatalogPlacement[];
  transports: CatalogTransport[];
  families: CatalogFamily[];
  tgcaRate: number;
}

/**
 * Build the default catalogue snapshot from the static seed values.
 * Used as the initial state of the client store, and as the server seed.
 */
export function defaultCatalogSnapshot(): CatalogSnapshot {
  const defaultZones: CatalogZone[] = ZONE_IDS.map((id) => ({
    id: ZONES[id].id,
    label: ZONES[id].label,
    salePrices: ZONES[id].salePrices.map(([t, v]) => [t, v] as [number, number]),
  }));
  const defaultSeuils = unifiedSeuils(defaultZones);
  return {
    products: PRODUCTS.map((p) => ({
      ref: p.ref,
      supplierRef: p.supplierRef,
      name: p.name,
      family: p.family,
      priceAchat: p.priceAchat,
      sizes: [...DEFAULT_PRODUCT_SIZES],
      colorIds: [...DEFAULT_PRODUCT_COLOR_IDS],
      bestColorIds: [...DEFAULT_PRODUCT_BEST_COLOR_IDS],
      chronopostPrice: null,
    })),
    zones: defaultZones,
    coefs: COEFS.map(([t, c]) => [t, c] as [number, number]),
    textileColors: TEXTILE_COLORS.map((c) => ({
      id: c.id,
      name: c.name,
      hex: c.hex,
      best: c.best,
    })),
    flockColors: FLOCK_COLORS.map((c) => ({
      id: c.id,
      name: c.name,
      hex: c.hex,
      special: c.special ?? false,
    })),
    // Les placements par défaut sont « toutes familles » (families: []) : ils
    // restent visibles partout tant que le patron ne les restreint pas.
    placements: PLACEMENTS.map((p) => ({
      id: p.id,
      label: p.label,
      zones: [...p.zones],
      families: [],
      salePrices: placementSalePricesFromZones([...p.zones], defaultZones, defaultSeuils),
    })),
    transports: TRANSPORT_OPTIONS.map((t) => ({
      id: t.id,
      label: t.label,
      surcharge: t.surcharge,
      delay: t.delay,
    })),
    families: [
      { id: 'unisexe', label: 'Homme' },
      { id: 'femme', label: 'Femme' },
      { id: 'enfant', label: 'Enfant' },
    ],
    tgcaRate: TGCA_RATE,
  };
}

export interface FamilyGroup {
  family: CatalogFamily;
  items: CatalogProduct[];
}

/**
 * Regroupe les produits par famille, dans l'ordre des `families` fournies,
 * chaque groupe trié par `ref` (numérique). Les produits dont le slug `family`
 * n'existe dans aucune famille sont placés en dernier sous une famille de repli
 * « Autres » (ils ne disparaissent jamais des sélecteurs). Les familles sans
 * produit sont conservées (groupe vide) — l'appelant décide de les afficher.
 */
export function groupProductsByFamily(
  products: CatalogProduct[],
  families: CatalogFamily[],
): FamilyGroup[] {
  // Chaîne vide : jamais un id de famille valide (schéma min 1), donc le groupe
  // de repli ne peut pas entrer en collision avec une vraie famille.
  const OTHERS_ID = '';
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
  // groups.get(f.id) est toujours défini (semé ci-dessus) ; ternaire défensif pour le strict TS.
  const ordered: FamilyGroup[] = families.flatMap((f) => {
    const g = groups.get(f.id);
    return g ? [g] : [];
  });
  const others = groups.get(OTHERS_ID);
  if (others) ordered.push(others);
  return ordered;
}

/**
 * Sale price of a tiered table for a given quantity: the price of the largest
 * threshold ≤ qty (below the first threshold → first price).
 */
export function zoneSalePriceForQtyFrom(
  salePrices: readonly (readonly [number, number])[],
  qty: number,
): number {
  const first = salePrices[0];
  if (!first) return 0;
  let last = first[1];
  for (const [threshold, price] of salePrices) {
    if (qty >= threshold) last = price;
    else return last;
  }
  return last;
}

/** Union triée (croissante) des seuils de quantité présents dans les zones. */
export function unifiedSeuils(zones: readonly { salePrices: CatalogSalePrices }[]): number[] {
  const set = new Set<number>();
  for (const z of zones) for (const [threshold] of z.salePrices) set.add(threshold);
  return [...set].sort((a, b) => a - b);
}

/**
 * Aligne toutes les zones sur une échelle de seuils commune (l'union de leurs
 * seuils). Le prix d'une zone à un seuil donné est celui de son palier inférieur
 * (règle {@link zoneSalePriceForQtyFrom}) : on ne fait que combler les lignes
 * manquantes, donc AUCUN prix effectif ne change. Sert à présenter « Prix
 * d'impression » sous forme d'une grille à seuils partagés sans toucher aux tarifs.
 */
export function normalizeZonesToSharedSeuils<T extends { salePrices: CatalogSalePrices }>(
  zones: readonly T[],
): T[] {
  const seuils = unifiedSeuils(zones);
  return zones.map((z) => ({
    ...z,
    salePrices: seuils.map(
      (s) => [s, zoneSalePriceForQtyFrom(z.salePrices, s)] as [number, number],
    ),
  }));
}

/**
 * Prix dégressifs d'une nouvelle zone à partir de son seul prix unité (la
 * quantité du 1er seuil). On suit la courbe MOYENNE des zones de référence :
 * pour chaque seuil, ratio = moyenne(prix(seuil) ÷ prix(1er seuil)) sur les
 * zones ayant un prix unité > 0 ; puis prix = unité × ratio, arrondi à 0,10 €.
 * Sans référence exploitable, on remplit à plat (le prix unité partout). Sert à
 * l'auto-remplissage d'une colonne dans « Prix d'impression ».
 */
export function degressivePricesFromUnit(
  unitPrice: number,
  seuils: readonly number[],
  referenceZones: readonly { salePrices: CatalogSalePrices }[],
): number[] {
  const first = seuils[0];
  if (first === undefined) return [];
  const round1 = (x: number): number => Math.round(x * 10) / 10;
  const refs = referenceZones.filter((z) => zoneSalePriceForQtyFrom(z.salePrices, first) > 0);
  return seuils.map((s) => {
    if (refs.length === 0) return round1(unitPrice);
    const avgRatio =
      refs.reduce(
        (sum, z) =>
          sum +
          zoneSalePriceForQtyFrom(z.salePrices, s) / zoneSalePriceForQtyFrom(z.salePrices, first),
        0,
      ) / refs.length;
    return round1(unitPrice * avgRatio);
  });
}

/**
 * Prix d'un placement = somme des prix de ses zones, palier par palier. Sert à
 * la migration « zones → option » : chaque placement reçoit son propre barème
 * (= ce que la somme des zones donnait), donc les prix restent identiques.
 * Arrondi à 0,01 € pour neutraliser le bruit des flottants.
 */
export function placementSalePricesFromZones(
  zoneIds: readonly string[],
  zones: readonly { id: string; salePrices: CatalogSalePrices }[],
  seuils: readonly number[],
): CatalogSalePrices {
  const byId = new Map(zones.map((z) => [z.id, z]));
  const round2 = (x: number): number => Math.round((x + Number.EPSILON) * 100) / 100;
  return seuils.map((s) => {
    const sum = zoneIds.reduce(
      (acc, zid) => acc + zoneSalePriceForQtyFrom(byId.get(zid)?.salePrices ?? [], s),
      0,
    );
    return [s, round2(sum)];
  });
}
