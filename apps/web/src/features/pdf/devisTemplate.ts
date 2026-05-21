import {
  PRODUCT_BY_REF,
  PLACEMENT_BY_ID,
  TEXTILE_COLOR_BY_ID,
  FLOCK_COLOR_BY_ID,
  TRANSPORT_OPTIONS,
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
import { eur, fmtInt, fmtShortDate } from '@/lib/format';
import type { QuoteTotals } from '../quote/pricing';
import { lineQty, unitPriceHT } from '../quote/pricing';

/**
 * Coordonnées de l'émetteur affichées dans le bloc « Émis par ».
 * À COMPLÉTER avec les vraies coordonnées OLDA (adresse, email, téléphone) :
 * `contact` est masqué tant qu'il est vide.
 */
const OLDA_ISSUER: { name: string; tagline: string; address: string; contact: string } = {
  name: 'OLDA',
  tagline: 'Atelier d’impression DTF',
  address: 'Saint-Martin',
  contact: '', // ex. 'contact@olda.sx · +590 690 12 34 56'
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

/** Échappe le texte destiné à l'HTML (les champs client/notes sont libres). */
function esc(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

interface EnrichedLine {
  ref: string;
  name: string;
  sku: string;
  placementLabel: string;
  textileName: string;
  flockLabel: string;
  sizesText: string;
  note: string;
  qty: number;
  unitText: string;
  totalText: string;
}

function enrich(line: QuoteLine): EnrichedLine {
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

  const sizesText = SIZE_KEYS.filter((k) => line.sizes[k] > 0)
    .map((k) => `${SIZE_LABELS[k]} · ${fmtInt.format(line.sizes[k])}`)
    .join(' '); // em-space between size groups

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
    sizesText,
    note: line.note?.trim() ?? '',
    qty,
    unitText,
    totalText,
  };
}

function renderRow(e: EnrichedLine): string {
  const subParts = [e.sku, e.placementLabel, e.textileName].filter(Boolean).map(esc).join(' · ');
  const detailRows: [string, string][] = [
    ['Coloris textile', e.textileName],
    ['Impression DTF', e.placementLabel],
    ['Couleur de flocage', e.flockLabel],
  ];
  if (e.sizesText) detailRows.push(['Tailles', e.sizesText]);

  const details = detailRows
    .map(([k, v]) => `<dt>${esc(k)}</dt><dd>${esc(v)}</dd>`)
    .join('\n              ');

  const note = e.note ? `<div class="art-note">${esc(e.note)}</div>` : '';

  return `<tr>
            <td class="ref">${esc(e.ref)}</td>
            <td>
              <div class="art-name">${esc(e.name)}</div>
              ${subParts ? `<div class="art-sub">${subParts}</div>` : ''}
              <dl class="art-details">
              ${details}
              </dl>
              ${note}
            </td>
            <td class="qty r num">${fmtInt.format(e.qty)}</td>
            <td class="pu r num">${esc(e.unitText)}</td>
            <td class="tot r num">${esc(e.totalText)}</td>
          </tr>`;
}

/** Construit le document HTML complet, prêt à imprimer (A4 portrait). */
export function buildDevisHtml(data: DevisData): string {
  const { id, customer, lines, transport, totals, createdAt } = data;

  // Émetteur
  const issuerContact = OLDA_ISSUER.contact ? `<p>${esc(OLDA_ISSUER.contact)}</p>` : '';

  // Destinataire
  const company = customer.company?.trim() ?? '';
  const personName = customer.name.trim();
  const clientName = company || personName || 'Client';
  const attn = company && personName ? `<p>À l’attention de ${esc(personName)}</p>` : '';
  const address = customer.address?.trim() ? `<p>${esc(customer.address.trim())}</p>` : '';
  const contactBits = [customer.email?.trim(), customer.phone?.trim()].filter(Boolean) as string[];
  const clientContact = contactBits.length ? `<p>${contactBits.map(esc).join(' · ')}</p>` : '';

  // Lignes
  const rows = lines.map((l) => renderRow(enrich(l))).join('\n          ');

  // Totaux — le transport peut être réglé ligne par ligne : on n'affiche un
  // mode précis que si toutes les lignes facturables le partagent.
  const lineTransports = [...new Set(lines.map((l) => l.transport ?? transport))];
  const onlyTransport = lineTransports.length === 1 ? lineTransports[0] : null;
  const transportLabel = onlyTransport
    ? `Transport · ${TRANSPORT_OPTIONS.find((t) => t.id === onlyTransport)?.label ?? '—'}`
    : 'Transport';
  const transportValue = totals.transportHT > 0 ? eur(totals.transportHT) : 'Gratuit';
  const tgcaValue = totals.tgcaHT > 0 ? eur(totals.tgcaHT) : 'Exonéré — revente';

  return `<!doctype html>
<html lang="fr">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=794, initial-scale=1" />
    <title>Devis ${esc(id)} · OLDA</title>
    <style>
      :root {
        --duck-deep: #202930;
        --duck: #2f3b45;
        --duck-400: #556876;
        --duck-300: #6b8191;
        --duck-200: #8ba0af;
        --hairline: #dce3e8;
        --paper: #ffffff;
        --font-sys: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial,
          sans-serif;
        --font-mono: ui-monospace, "SF Mono", Menlo, monospace;
        --page-w: 794px;
        --page-h: 1123px;
      }
      * { box-sizing: border-box; margin: 0; padding: 0; }
      html {
        font-family: var(--font-sys);
        font-feature-settings: "tnum" 1;
        font-variant-numeric: tabular-nums;
        -webkit-font-smoothing: antialiased;
        -moz-osx-font-smoothing: grayscale;
        text-rendering: geometricPrecision;
      }
      @media screen {
        body { background: #eef1f3; padding: 40px 0; display: flex; justify-content: center; }
        .page { box-shadow: 0 1px 2px rgba(32, 41, 48, 0.08), 0 24px 60px rgba(32, 41, 48, 0.12); }
      }
      .page {
        position: relative;
        width: var(--page-w);
        min-height: var(--page-h);
        background: var(--paper);
        color: var(--duck);
        padding: 68px 72px 56px;
        font-size: 11.5px;
        line-height: 1.55;
      }
      .mono { font-family: var(--font-mono); font-variant-numeric: tabular-nums; }
      .num { font-variant-numeric: tabular-nums; font-feature-settings: "tnum" 1; }
      .caps {
        text-transform: uppercase;
        letter-spacing: 0.12em;
        font-size: 9.5px;
        font-weight: 700;
        color: var(--duck-deep);
      }
      .head { display: grid; grid-template-columns: 1fr auto; align-items: end; gap: 24px; }
      .wordmark {
        font-size: 44px;
        font-weight: 800;
        letter-spacing: -0.045em;
        line-height: 0.9;
        color: var(--duck-deep);
      }
      .tagline { margin-top: 8px; font-size: 11.5px; color: var(--duck-300); letter-spacing: 0.01em; }
      .meta {
        display: grid;
        grid-template-columns: auto auto;
        align-items: baseline;
        justify-content: end;
        column-gap: 18px;
        row-gap: 5px;
        text-align: right;
      }
      .meta dt {
        text-transform: uppercase;
        letter-spacing: 0.12em;
        font-size: 9px;
        font-weight: 700;
        color: var(--duck-200);
      }
      .meta dd { font-size: 11.5px; color: var(--duck-400); }
      .meta dd.ref {
        font-family: var(--font-mono);
        font-weight: 600;
        color: var(--duck-deep);
        font-size: 12px;
        letter-spacing: -0.01em;
      }
      .rule { height: 1px; background: var(--hairline); border: 0; margin: 18px 0; }
      .parties { display: grid; grid-template-columns: 1fr 1fr; gap: 48px; }
      .party-title { margin-bottom: 10px; }
      .party p { font-size: 11.5px; color: var(--duck-400); line-height: 1.5; }
      .party .org { font-size: 11.5px; color: var(--duck); font-weight: 600; }
      .party .client {
        font-size: 14px;
        font-weight: 800;
        color: var(--duck-deep);
        letter-spacing: -0.01em;
        margin-bottom: 3px;
      }
      table { width: 100%; border-collapse: collapse; }
      thead th {
        text-transform: uppercase;
        letter-spacing: 0.12em;
        font-size: 9.5px;
        font-weight: 700;
        color: var(--duck-deep);
        text-align: left;
        padding-bottom: 9px;
        border-bottom: 1px solid var(--duck-deep);
      }
      thead { display: table-header-group; }
      th.r, td.r { text-align: right; }
      tbody tr { page-break-inside: avoid; break-inside: avoid; }
      tbody td { padding: 13px 0; border-bottom: 1px solid var(--hairline); vertical-align: top; }
      td.ref { font-family: var(--font-mono); font-size: 11px; color: var(--duck-400); padding-right: 12px; }
      .art-name { font-size: 13px; font-weight: 700; color: var(--duck-deep); letter-spacing: -0.005em; }
      .art-sub { margin-top: 3px; font-size: 11px; line-height: 1.3; color: var(--duck-300); }
      .art-details {
        margin-top: 7px;
        display: grid;
        grid-template-columns: 130px 1fr;
        row-gap: 3px;
        column-gap: 10px;
        align-items: baseline;
        line-height: 1.3;
      }
      .art-details dt {
        text-transform: uppercase;
        letter-spacing: 0.1em;
        font-size: 9px;
        font-weight: 700;
        color: var(--duck-200);
      }
      .art-details dd { font-size: 10.5px; color: var(--duck); }
      .art-note {
        margin-top: 7px;
        padding-left: 11px;
        border-left: 1px solid var(--hairline);
        font-style: italic;
        font-size: 10.5px;
        line-height: 1.4;
        color: var(--duck-400);
      }
      td.qty, td.pu { font-size: 11.5px; color: var(--duck); padding-left: 8px; }
      td.tot { font-size: 11.5px; font-weight: 700; color: var(--duck-deep); padding-left: 8px; }
      .totals { width: 340px; margin-left: auto; margin-top: 22px; }
      .totals .trow { display: flex; justify-content: space-between; align-items: baseline; padding: 5px 0; }
      .totals .tlabel { font-size: 11.5px; color: var(--duck-400); }
      .totals .tval { font-size: 11.5px; color: var(--duck-deep); font-variant-numeric: tabular-nums; }
      .totals .tsep { height: 1px; background: var(--duck-deep); margin: 9px 0; }
      .totals .grand { display: flex; justify-content: space-between; align-items: baseline; padding-top: 2px; }
      .totals .grand .glabel { font-size: 18px; font-weight: 800; color: var(--duck-deep); letter-spacing: -0.015em; }
      .totals .grand .gval {
        font-size: 22px;
        font-weight: 800;
        color: var(--duck-deep);
        letter-spacing: -0.02em;
        font-variant-numeric: tabular-nums;
      }
      .foot {
        position: absolute;
        left: 72px;
        right: 72px;
        bottom: 40px;
        display: flex;
        justify-content: space-between;
        gap: 24px;
        padding-top: 12px;
        border-top: 1px solid var(--hairline);
        font-size: 10px;
        letter-spacing: 0.02em;
        color: var(--duck-200);
      }
      @page { size: A4 portrait; margin: 0; }
      @media print {
        html, body { background: #ffffff; }
        .page { width: 210mm; min-height: 297mm; margin: 0; box-shadow: none; }
        * { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
      }
    </style>
  </head>
  <body>
    <main class="page">
      <header class="head">
        <div>
          <div class="wordmark">${esc(OLDA_ISSUER.name)}</div>
          <div class="tagline">${esc(OLDA_ISSUER.tagline)} · ${esc(OLDA_ISSUER.address)}</div>
        </div>
        <dl class="meta">
          <dt>Devis</dt>
          <dd class="ref">${esc(id)}</dd>
          <dt>Établi le</dt>
          <dd>${esc(fmtShortDate(createdAt))}</dd>
          <dt>Validité</dt>
          <dd>30 jours</dd>
        </dl>
      </header>

      <hr class="rule" />

      <section class="parties">
        <div class="party">
          <div class="party-title caps">Émis par</div>
          <p class="org">${esc(OLDA_ISSUER.name)}</p>
          <p>${esc(OLDA_ISSUER.tagline)}</p>
          <p>${esc(OLDA_ISSUER.address)}</p>
          ${issuerContact}
        </div>
        <div class="party">
          <div class="party-title caps">Adressé à</div>
          <p class="client">${esc(clientName)}</p>
          ${attn}
          ${address}
          ${clientContact}
        </div>
      </section>

      <hr class="rule" />

      <table>
        <colgroup>
          <col style="width: 64px" />
          <col />
          <col style="width: 56px" />
          <col style="width: 80px" />
          <col style="width: 96px" />
        </colgroup>
        <thead>
          <tr>
            <th>Réf</th>
            <th>Article</th>
            <th class="r">Qté</th>
            <th class="r">PU HT</th>
            <th class="r">Total HT</th>
          </tr>
        </thead>
        <tbody>
          ${rows}
        </tbody>
      </table>

      <section class="totals">
        <div class="trow">
          <span class="tlabel">Sous-total HT</span>
          <span class="tval num">${esc(eur(totals.subtotalHT))}</span>
        </div>
        <div class="trow">
          <span class="tlabel">${esc(transportLabel)}</span>
          <span class="tval num">${esc(transportValue)}</span>
        </div>
        <div class="trow">
          <span class="tlabel">TGCA 4 %</span>
          <span class="tval num">${esc(tgcaValue)}</span>
        </div>
        <div class="tsep"></div>
        <div class="grand">
          <span class="glabel">Total TTC</span>
          <span class="gval num">${esc(eur(totals.totalHT))}</span>
        </div>
      </section>

      <footer class="foot">
        <span>OLDA · Atelier d’impression DTF · Saint-Martin</span>
        <span>Devis valable 30 jours · TGCA 4 % applicable hors revente</span>
      </footer>
    </main>
  </body>
</html>`;
}
