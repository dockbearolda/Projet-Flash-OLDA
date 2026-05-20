import { SIZE_KEYS } from '@df/shared/catalog';
import type { Sizes, Transport } from '@df/shared';
import { getCatalog, zoneSalePriceForQty } from '@/features/catalog/useCatalog';

/**
 * Returns the margin coefficient for the given total quantity.
 * Coef is the value associated to the largest threshold ≤ totalQty.
 * For totalQty < 1, returns the first row's coef (no discount).
 */
export function coefFor(totalQty: number): number {
  const coefs = getCatalog().coefs;
  const first = coefs[0];
  if (!first) return 1;
  let last: number = first[1];
  for (const [threshold, c] of coefs) {
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
  const placement = getCatalog().placementById[placementId];
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
/**
 * Resolve the priceAchat for a line: explicit override (custom/free lines)
 * wins, otherwise look it up in the catalogue.
 */
function resolvePriceAchat(productRef: string, override: number | undefined): number {
  if (override !== undefined) return override;
  const product = getCatalog().productByRef[productRef];
  if (!product) {
    throw new Error(`Unknown product ref: ${productRef}`);
  }
  return product.priceAchat;
}

export function unitPriceHT(args: {
  productRef: string;
  placementId: string;
  qty: number;
  code?: number | undefined;
  /** Override the catalogue priceAchat — used by custom/free lines. */
  priceAchatOverride?: number | undefined;
}): number {
  const coef = coefFor(args.qty);
  const vierge = viergePriceHT(resolvePriceAchat(args.productRef, args.priceAchatOverride), coef);
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
  code?: number | undefined;
  transportPerPiece?: number | undefined;
  /** Override the catalogue priceAchat — used by custom/free lines. */
  priceAchatOverride?: number | undefined;
}): UnitPriceBreakdown {
  const coef = coefFor(args.qty);
  const vierge = viergePriceHT(resolvePriceAchat(args.productRef, args.priceAchatOverride), coef);
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
  linked?: boolean | undefined;
  code?: number | undefined;
  /** Per-line transport override (falls back to quote-level transport). */
  transport?: Transport | undefined;
  /** Per-line revente override (falls back to quote-level revente). */
  revente?: boolean | undefined;
  /** Free-line product (replaces the catalogue lookup for priceAchat + name). */
  custom?: { name: string; priceAchat: number } | undefined;
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
    priceAchatOverride: line.custom?.priceAchat,
  });
  return unit * lineQty(line.sizes);
}

export interface LineTotals {
  /** Σ qty across all sizes for this line. */
  qty: number;
  /** Line subtotal + per-piece transport surcharge (no TGCA). */
  htWithTransport: number;
  /** TGCA on (subtotal + transport), 0 when the line is revente-exonerated. */
  tgcaHT: number;
  /** htWithTransport + tgcaHT — the all-in price for the line. */
  ttc: number;
  /** htWithTransport / qty. */
  avgHT: number;
  /** ttc / qty. */
  avgTTC: number;
}

/**
 * Per-line HT/TTC totals, mirroring the per-line maths in {@link quoteTotals}.
 * Transport (chronopost +1.50 €/pièce) is folded into the HT figure so the
 * recap bubbles react to the transport toggle; TTC adds the 4 % TGCA unless
 * the line is exonerated for resale.
 */
export function lineTotals(
  line: LineForPricing,
  quoteQty: number,
  quoteTransport: Transport,
  quoteRevente: boolean,
): LineTotals {
  const qty = lineQty(line.sizes);
  const sub = lineSubtotalHT(line, quoteQty);
  const eff = transportSurcharge(line.transport ?? quoteTransport);
  const ht = sub + eff * qty;
  const isRevente = line.revente ?? quoteRevente;
  const tgca = isRevente ? 0 : ht * getCatalog().tgcaRate;
  const ttc = ht + tgca;
  return {
    qty,
    htWithTransport: round2(ht),
    tgcaHT: round2(tgca),
    ttc: round2(ttc),
    avgHT: qty > 0 ? round2(ht / qty) : 0,
    avgTTC: qty > 0 ? round2(ttc / qty) : 0,
  };
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
  const opt = getCatalog().transportById[t];
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

  const tgcaRate = getCatalog().tgcaRate;
  let subtotal = 0;
  let transport = 0;
  let tgca = 0;
  for (const line of billable) {
    const lineSub = lineSubtotalHT(line, qtyTotal);
    const eff = transportSurcharge(line.transport ?? quote.transport);
    const lineTr = eff * lineQty(line.sizes);
    const isRevente = line.revente ?? quote.revente;
    const lineTgca = isRevente ? 0 : (lineSub + lineTr) * tgcaRate;
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
