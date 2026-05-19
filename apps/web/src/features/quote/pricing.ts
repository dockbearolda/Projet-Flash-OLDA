import {
  COEFS,
  PLACEMENT_BY_ID,
  PRODUCT_BY_REF,
  TGCA_RATE,
  TRANSPORT_OPTIONS,
  SIZE_KEYS,
  zoneSalePriceForQty,
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
 * Sum the printable-zone sale prices for a placement at a given quantity tier.
 */
export function placementZonesPriceHT(placementId: string, qty: number): number {
  const placement = (PLACEMENT_BY_ID as Record<string, Placement | undefined>)[placementId];
  if (!placement) {
    throw new Error(`Unknown placement: ${placementId}`);
  }
  return placement.zones.reduce((acc, zoneId) => acc + zoneSalePriceForQty(zoneId, qty), 0);
}

/**
 * Round-half-up to 2 decimals, robust to floating point noise.
 */
export function round2(n: number): number {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}

/**
 * Round up to the next 0.10 €. Used to align with the patron's price grid
 * (vierge sale price is always rounded UP to next 10-cent step).
 */
export function roundUp10Cents(n: number): number {
  return Math.ceil((n - Number.EPSILON) * 10) / 10;
}

/**
 * Sale price of a blank garment at a given quantity tier.
 * vierge = ceil(priceAchat × coef × 10) / 10
 */
export function viergePriceHT(priceAchat: number, coef: number): number {
  return roundUp10Cents(priceAchat * coef);
}

/**
 * Sum the quantities across all sizes.
 */
export function lineQty(sizes: Sizes): number {
  return SIZE_KEYS.reduce((acc, k) => acc + sizes[k], 0);
}

/**
 * Unit HT price for a single garment of a given line.
 *
 *   base    = vierge(priceAchat, coef[qty]) + Σ zoneSalePrice(zone, qty)
 *   unitHT  = base + ceil(base × code/100 × 10) / 10
 *
 * `qty` is the *quote-wide* total quantity used to look up the coef and
 * the zone tier. `code` is the multi-couleurs surcharge (in %, default 10).
 */
export function unitPriceHT(args: {
  productRef: string;
  placementId: string;
  qty: number;
  code?: number;
}): number {
  const product = PRODUCT_BY_REF[args.productRef];
  if (!product) {
    throw new Error(`Unknown product ref: ${args.productRef}`);
  }
  const coef = coefFor(args.qty);
  const vierge = viergePriceHT(product.priceAchat, coef);
  const zones = placementZonesPriceHT(args.placementId, args.qty);
  const base = vierge + zones;
  const codePct = args.code ?? 10;
  const codeSurcharge = codePct > 0 ? roundUp10Cents(base * (codePct / 100)) : 0;
  return base + codeSurcharge;
}

export interface UnitPriceBreakdown {
  /** Sale price of the blank garment, rounded up to next 0.10 €. */
  vierge: number;
  /** Sum of zone sale prices for the placement, at the quote-wide qty tier. */
  zones: number;
  /** Multi-couleurs surcharge (ceil((vierge+zones) × code% × 10) / 10). */
  code: number;
  /** Transport surcharge per piece (0 if not chronopost). */
  transport: number;
  /** vierge + zones + code — matches the spreadsheet's "PRIX + CODE". */
  unitHT: number;
  /** unitHT + transport — matches the spreadsheet's "PRIX + CODE + transport". */
  unitWithTransportHT: number;
}

/**
 * Return the individual price components that make up the unit HT, so the UI
 * can show the same breakdown as the patron's pricing sheet.
 */
export function unitPriceBreakdown(args: {
  productRef: string;
  placementId: string;
  qty: number;
  code?: number;
  transportPerPiece?: number;
}): UnitPriceBreakdown {
  const product = PRODUCT_BY_REF[args.productRef];
  if (!product) {
    throw new Error(`Unknown product ref: ${args.productRef}`);
  }
  const coef = coefFor(args.qty);
  const vierge = viergePriceHT(product.priceAchat, coef);
  const zones = placementZonesPriceHT(args.placementId, args.qty);
  const base = vierge + zones;
  const codePct = args.code ?? 10;
  const code = codePct > 0 ? roundUp10Cents(base * (codePct / 100)) : 0;
  const transport = args.transportPerPiece ?? 0;
  const unit = base + code;
  return {
    vierge: round2(vierge),
    zones: round2(zones),
    code: round2(code),
    transport: round2(transport),
    unitHT: round2(unit),
    unitWithTransportHT: round2(unit + transport),
  };
}

export interface LineForPricing {
  productRef: string;
  placementId: string;
  sizes: Sizes;
  linked?: boolean;
  code?: number;
  /** Per-line transport override (falls back to quote-level transport). */
  transport?: Transport;
  /** Per-line revente override (falls back to quote-level revente). */
  revente?: boolean;
}

/**
 * Subtotal HT for one line, multiplied by that line's size-grid quantity.
 * Uses the *quote-wide* qty for tier lookup (coef & zone sale prices).
 */
export function lineSubtotalHT(line: LineForPricing, quoteQty: number): number {
  const unit = unitPriceHT({
    productRef: line.productRef,
    placementId: line.placementId,
    qty: quoteQty,
    code: line.code,
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

function transportSurcharge(t: Transport): number {
  const opt = TRANSPORT_OPTIONS.find((x) => x.id === t);
  if (!opt) {
    throw new Error(`Unknown transport: ${t}`);
  }
  return opt.surcharge;
}

/**
 * Compute all totals for a quote.
 *
 * Transport and revente are evaluated per-line: each line may override the
 * quote-wide defaults via `line.transport` and `line.revente`. This lets a
 * single quote mix resale (TGCA-exonerated) and end-use lines, or split
 * shipping methods between lines.
 *
 *   qtyTotal    Σ qty across all *billable* (linked) lines
 *   coef        coefFor(qtyTotal) — kept for display/back-compat
 *   subtotalHT  Σ (unit(line, qtyTotal) × qty(line))
 *   transportHT Σ (transportSurcharge(line) × qty(line))
 *   tgcaHT      Σ (line.revente ? 0 : (lineSubtotal + lineTransport) × 0.04)
 *   totalHT     subtotalHT + transportHT + tgcaHT
 *
 * Only the public-facing fields are rounded (2 decimals).
 * Internal multiplications stay unrounded.
 */
export function quoteTotals(quote: QuoteForPricing): QuoteTotals {
  // Validate the quote-level transport up-front so we throw even when no line
  // is billable (preserves prior behavior for the "unknown transport" guard).
  transportSurcharge(quote.transport);

  const billable = quote.lines.filter((l) => l.linked !== false);
  const qtyTotal = billable.reduce((acc, l) => acc + lineQty(l.sizes), 0);
  const coef = coefFor(qtyTotal);

  let subtotal = 0;
  let transport = 0;
  let tgca = 0;
  for (const line of billable) {
    const lineSub = lineSubtotalHT(line, qtyTotal);
    const eff = transportSurcharge(line.transport ?? quote.transport);
    const lineTr = eff * lineQty(line.sizes);
    const isRevente = line.revente ?? quote.revente;
    const lineTgca = isRevente ? 0 : (lineSub + lineTr) * TGCA_RATE;
    subtotal += lineSub;
    transport += lineTr;
    tgca += lineTgca;
  }

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
