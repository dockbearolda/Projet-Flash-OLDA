import {
  PRODUCT_BY_REF,
  PLACEMENT_BY_ID,
  TEXTILE_COLOR_BY_ID,
  FLOCK_COLOR_BY_ID,
  SIZE_KEYS,
  SIZE_LABELS,
} from '@df/shared';
import type {
  Customer,
  QuoteLine,
  Transport,
  Placement,
  TextileColor,
  FlockColor,
} from '@df/shared';
import { eur, fmtInt, fmtFileDate } from '@/lib/format';
import type { QuoteTotals } from '../quote/pricing';
import { lineQty, unitPriceHT } from '../quote/pricing';

/**
 * Identité de l'émetteur (Atelier OLDA SARL) : en-tête, bloc « Émis par » et
 * mentions légales en pied de page. Coordonnées + mentions fiscales réelles
 * (fournies par le patron, cohérentes avec le site B2C `site-b2c`).
 */
export const OLDA_ISSUER: {
  brand: string;
  name: string;
  tagline: string;
  address: string;
  phoneFixe: string;
  phoneMobile: string;
  email: string;
  legal: string;
} = {
  brand: 'OLDA',
  name: 'Atelier OLDA SARL',
  tagline: 'Atelier d’impression textiles',
  address: '1 Rue Opale, Grand-Case, 97150 Saint-Martin',
  phoneFixe: '05 90 77 13 04',
  phoneMobile: '06 90 47 97 88',
  email: 'atelierolda@gmail.com',
  legal:
    'au capital de 500,00 € · SIRET 978 296 952 00028 · RCS Saint-Martin 978 296 952 · APE 1813Z · TVA FR86978296952',
};

export interface DevisData {
  id: string;
  customer: Customer;
  /** Lignes facturables (déjà filtrées sur `linked`). */
  lines: QuoteLine[];
  transport: Transport;
  revente: boolean;
  totals: QuoteTotals;
  createdAt: string;
}

/**
 * Nom du fichier PDF téléchargé : société du client (sinon son nom) + date
 * d'établissement, p. ex. « Dupont SARL - 2026-05-21.pdf ». On retire les
 * caractères interdits dans un nom de fichier.
 */
export function devisPdfFilename(customer: Customer, createdAt: string): string {
  const company = customer.company?.trim() ?? '';
  const who = (company || customer.name.trim() || 'Devis')
    .replace(/[\\/:*?"<>|]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 80);
  return `${who || 'Devis'} - ${fmtFileDate(createdAt)}.pdf`;
}

export interface EnrichedLine {
  ref: string;
  /** Marqueur interne du patron : « C » + le CODE (% de marge). Ex. « C15 ». */
  codeTag: string;
  name: string;
  /** Référence fournisseur (ex. « NS308 »), affichée en petit sous la réf interne. */
  sku: string;
  placementLabel: string;
  textileName: string;
  flockLabel: string;
  /** Tailles non nulles, déjà formatées (ex. « S · 5 »). */
  sizes: string[];
  note: string;
  qty: number;
  unitText: string;
  totalText: string;
}

/** Résout une ligne de devis en valeurs prêtes à afficher (libellés + prix). */
export function enrich(line: QuoteLine): EnrichedLine {
  const product = PRODUCT_BY_REF[line.productRef];
  const placement = (PLACEMENT_BY_ID as Record<string, Placement | undefined>)[line.placementId];
  const textile = (TEXTILE_COLOR_BY_ID as Record<string, TextileColor | undefined>)[
    line.textileColorId
  ];
  const flockTable = FLOCK_COLOR_BY_ID as Record<string, FlockColor | undefined>;
  const flockLabel =
    line.flockMode === 'multi'
      ? 'Multi couleurs'
      : line.flockColorId
        ? (flockTable[line.flockColorId]?.name ?? 'Flocage')
        : 'Couleur ?';

  const isCustom = line.custom !== undefined;
  const ref = isCustom ? 'Libre' : (product?.ref ?? '—');
  const name = line.custom?.name ?? product?.name ?? '—';
  const qty = lineQty(line.sizes);

  const sizes = SIZE_KEYS.filter((k) => line.sizes[k] > 0).map(
    (k) => `${SIZE_LABELS[k]} · ${fmtInt.format(line.sizes[k])}`,
  );

  let unitText = '—';
  let totalText = '—';
  if (qty > 0) {
    try {
      const pu = unitPriceHT({
        productRef: line.productRef,
        placementId: line.placementId,
        qty,
        code: line.code,
        priceAchatOverride: line.custom?.priceAchat,
      });
      unitText = eur(pu);
      totalText = eur(pu * qty);
    } catch {
      /* prix indisponible — on garde les tirets */
    }
  }

  return {
    ref,
    name,
    sku: isCustom ? '' : (product?.supplierRef ?? ''),
    placementLabel: placement?.label ?? '—',
    textileName: textile?.name ?? '—',
    flockLabel,
    sizes,
    codeTag: `C${line.code}`,
    note: line.note?.trim() ?? '',
    qty,
    unitText,
    totalText,
  };
}
