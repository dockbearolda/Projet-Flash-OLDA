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
  zones: string[];
}

export interface CatalogTransport {
  id: string;
  label: string;
  surcharge: number;
  delay: string;
}

export interface CatalogSnapshot {
  products: CatalogProduct[];
  zones: CatalogZone[];
  coefs: CatalogCoef[];
  textileColors: CatalogTextileColor[];
  flockColors: CatalogFlockColor[];
  placements: CatalogPlacement[];
  transports: CatalogTransport[];
  tgcaRate: number;
}

/**
 * Build the default catalogue snapshot from the static seed values.
 * Used as the initial state of the client store, and as the server seed.
 */
export function defaultCatalogSnapshot(): CatalogSnapshot {
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
    zones: ZONE_IDS.map((id) => ({
      id: ZONES[id].id,
      label: ZONES[id].label,
      salePrices: ZONES[id].salePrices.map(([t, v]) => [t, v] as [number, number]),
    })),
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
    placements: PLACEMENTS.map((p) => ({ id: p.id, label: p.label, zones: [...p.zones] })),
    transports: TRANSPORT_OPTIONS.map((t) => ({
      id: t.id,
      label: t.label,
      surcharge: t.surcharge,
      delay: t.delay,
    })),
    tgcaRate: TGCA_RATE,
  };
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
