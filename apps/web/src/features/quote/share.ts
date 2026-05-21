import { PRODUCT_BY_REF, PLACEMENT_BY_ID } from '@df/shared';
import type { Customer, QuoteLine, Transport, Placement } from '@df/shared';
import { eur, fmtInt, fmtShortDate } from '@/lib/format';
import { lineQty, lineTotals } from './pricing';
import type { QuoteTotals } from './pricing';

interface BuildArgs {
  id: string;
  customer: Customer;
  /** Linked lines only — the billable ones shown in the recap. */
  lines: QuoteLine[];
  transport: Transport;
  revente: boolean;
  totals: QuoteTotals;
  createdAt: string;
}

/** Build the client-facing devis summary shared by WhatsApp and email. */
export function buildQuoteMessage({
  id,
  customer,
  lines,
  transport,
  revente,
  totals,
  createdAt,
}: BuildArgs): { subject: string; body: string } {
  const name = customer.name.trim() || (customer.company?.trim() ?? '') || 'client';
  const subject = `Devis OLDA ${id}`;

  const lineStrs = lines.map((l, i) => {
    const product = PRODUCT_BY_REF[l.productRef];
    const pname = l.custom?.name ?? product?.name ?? 'Produit';
    const placement = (PLACEMENT_BY_ID as Record<string, Placement | undefined>)[l.placementId];
    const qty = lineQty(l.sizes);
    let priceStr = '';
    if (totals.qtyTotal > 0) {
      try {
        priceStr = ` : ${eur(lineTotals(l, totals.qtyTotal, transport, revente).ttc)}`;
      } catch {
        /* prix indisponible — on garde la ligne sans montant */
      }
    }
    const placeStr = placement?.label ? ` — ${placement.label}` : '';
    return `${i + 1}. ${pname}${placeStr} · ×${fmtInt.format(qty)}${priceStr}`;
  });

  const totalHTOnly = totals.subtotalHT + totals.transportHT;

  const body = [
    `Bonjour ${name},`,
    '',
    `Voici votre devis OLDA (réf. ${id}) du ${fmtShortDate(createdAt)} :`,
    '',
    ...lineStrs,
    '',
    `Total HT : ${eur(totalHTOnly)}`,
    revente ? 'TGCA : exonéré (revente)' : `TGCA 4 % : ${eur(totals.tgcaHT)}`,
    `Total TTC : ${eur(totals.totalHT)} · ${fmtInt.format(totals.qtyTotal)} pièces`,
    '',
    'Le détail complet est dans le PDF joint.',
    '',
    'OLDA · SXM',
  ].join('\n');

  return { subject, body };
}

/** Indicatifs proposés à côté du téléphone — Saint-Martin (FR) par défaut. */
export const DIAL_OPTIONS = [
  { code: '590', label: 'FR +590', hint: 'Saint-Martin / Antilles françaises' },
  { code: '33', label: 'FR +33', hint: 'France métropolitaine' },
  { code: '1721', label: 'NL +1721', hint: 'Sint Maarten (côté hollandais)' },
  { code: '1', label: 'US +1', hint: 'États-Unis' },
] as const;

export const DEFAULT_DIAL = '590';

/**
 * wa.me needs digits only in international format — no '+', no spaces.
 * Resolution order:
 *  - an explicit international form ('+…' or '00…') is respected as-is ;
 *  - a leading '0' is the trunk prefix → on le remplace par l'indicatif choisi
 *    (`defaultDial`), ainsi un 06… français bascule en +33 quand FR +33 est
 *    sélectionné, et reste en +590 pour Saint-Martin (le défaut) ;
 *  - sinon on préfixe avec `defaultDial`, l'indicatif choisi à côté du champ
 *    téléphone (St-Martin +590 par défaut, France +33, Sint Maarten +1721, USA +1).
 * Un numéro déjà préfixé par l'indicatif choisi n'est pas doublé.
 */
export function normalizePhone(phone: string, defaultDial: string = DEFAULT_DIAL): string {
  const raw = phone.trim();
  const digits = raw.replace(/\D/g, '');
  if (!digits) return '';
  if (raw.startsWith('+')) return digits;
  if (digits.startsWith('00')) return digits.slice(2);
  if (digits.startsWith('0')) return `${defaultDial}${digits.slice(1)}`;
  if (digits.startsWith(defaultDial)) return digits;
  return `${defaultDial}${digits}`;
}

export function whatsappUrl(
  phone: string,
  text: string,
  defaultDial: string = DEFAULT_DIAL,
): string {
  const num = normalizePhone(phone, defaultDial);
  const base = num ? `https://wa.me/${num}` : 'https://wa.me/';
  return `${base}?text=${encodeURIComponent(text)}`;
}

export function mailtoUrl(email: string, subject: string, body: string): string {
  return `mailto:${email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
}
