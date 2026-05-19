import {
  COEFS,
  PLACEMENT_BY_ID,
  PRODUCT_BY_REF,
  TGCA_RATE,
  TRANSPORT_OPTIONS,
  ZONES,
  SIZE_KEYS,
} from '@df/shared/catalog';
import type { Sizes, Transport, Placement } from '@df/shared';

/**
 * Returns the margin coefficient for the given total quantity.
 * Coef is the value associated to the largest threshold ≤ totalQty.
 * For totalQty < 1, returns the first row's coef (no discount).
 */
export function coefFor(totalQty: number): number {
  let last: number = COEFS[0][1];
  for (const [threshold, c] of COEFS) {
    if (totalQty >= threshold) {
      last = c;
    } else {
      return last;
    }
  }
  return last;
}

/**
 * Sum the printable-zone prices for a given placement.
 * Uses the locked §6.2 prices.
 */
export function placementZonesPriceHT(placementId: string): number {
  const placement = (PLACEMENT_BY_ID as Record<string, Placement | undefined>)[placementId];
  if (!placement) {
    throw new Error(`Unknown placement: ${placementId}`);
  }
  return placement.zones.reduce((acc, zoneId) => acc + ZONES[zoneId].price, 0);
}

/**
 * Round-half-up to 2 decimals, robust to floating point noise.
 */
export function round2(n: number): number {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}

/**
 * Sum the quantities across all sizes.
 */
export function lineQty(sizes: Sizes): number {
  return SIZE_KEYS.reduce((acc, k) => acc + sizes[k], 0);
}

/**
 * Unit HT price for a single garment of a given line, with margin coef applied.
 *
 *   unitHT = (priceAchat + Σ zones[placement]) × coef
 *
 * No early rounding is applied (caller decides when to round for display).
 */
export function unitPriceHT(args: {
  productRef: string;
  placementId: string;
  coef: number;
}): number {
  const product = PRODUCT_BY_REF[args.productRef];
  if (!product) {
    throw new Error(`Unknown product ref: ${args.productRef}`);
  }
  const zonesSum = placementZonesPriceHT(args.placementId);
  return (product.priceAchat + zonesSum) * args.coef;
}

export interface LineForPricing {
  productRef: string;
  placementId: string;
  sizes: Sizes;
}

/**
 * Subtotal HT for one line. Uses the *quote-wide* coef computed from
 * the sum of all lines' quantities.
 */
export function lineSubtotalHT(line: LineForPricing, coef: number): number {
  const unit = unitPriceHT({
    productRef: line.productRef,
    placementId: line.placementId,
    coef,
  });
  return unit * lineQty(line.sizes);
}

export interface QuoteTotals {
  qtyTotal: number;
  coef: number;
  subtotalHT: number;
  transportHT: number;
  tgcaHT: number;
  totalHT: number;
}

export interface QuoteForPricing {
  lines: readonly LineForPricing[];
  transport: Transport;
  revente: boolean;
}

/**
 * Compute all totals for a quote.
 *
 *   coef        depends on Σ qty across all lines
 *   subtotalHT  Σ (unit(line, coef) × qty(line))
 *   transportHT chronopost: 1.50€ × qtyTotal, else 0
 *   tgcaHT      revente ? 0 : (subtotalHT + transportHT) × 0.04
 *   totalHT     subtotalHT + transportHT + tgcaHT
 *
 * Only the public-facing fields are rounded (2 decimals).
 * Internal multiplications stay unrounded.
 */
export function quoteTotals(quote: QuoteForPricing): QuoteTotals {
  const qtyTotal = quote.lines.reduce((acc, l) => acc + lineQty(l.sizes), 0);
  const coef = coefFor(qtyTotal);
  const subtotal = quote.lines.reduce((acc, l) => acc + lineSubtotalHT(l, coef), 0);

  const transportOpt = TRANSPORT_OPTIONS.find((t) => t.id === quote.transport);
  if (!transportOpt) {
    throw new Error(`Unknown transport: ${quote.transport}`);
  }
  const transport = transportOpt.surcharge * qtyTotal;

  const tgca = quote.revente ? 0 : (subtotal + transport) * TGCA_RATE;
  const total = subtotal + transport + tgca;

  return {
    qtyTotal,
    coef,
    subtotalHT: round2(subtotal),
    transportHT: round2(transport),
    tgcaHT: round2(tgca),
    totalHT: round2(total),
  };
}
