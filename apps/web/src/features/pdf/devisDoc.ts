import type { TDocumentDefinitions, Content, TableCell } from 'pdfmake/interfaces';
import { TRANSPORT_OPTIONS } from '@df/shared';
import { eur, fmtInt, fmtShortDate } from '@/lib/format';
import { lineQty } from '../quote/pricing';
import { OLDA_ISSUER, enrich, type DevisData, type EnrichedLine } from './devisData';

/** Palette « Duck » du devis écran, transposée au PDF. */
const C = {
  duckDeep: '#202930',
  duck: '#2f3b45',
  duck400: '#556876',
  duck300: '#6b8191',
  duck200: '#8ba0af',
  hairline: '#dce3e8',
};

/** Largeur utile (A4 595.28pt − marges latérales 2×40). */
const CONTENT_W = 515;

// `Intl.NumberFormat('fr-FR')` sépare les milliers (et précède « € ») par une
// espace fine insécable U+202F, absente de la police Roboto embarquée par
// pdfmake → glyphe manquant (carré) sur le PDF. On la remplace par l'espace
// insécable standard U+00A0, présente dans Roboto, ce qui garde les montants
// insécables. On normalise aussi tout U+00A0 par cohérence.
const fixSpaces = (s: string): string => s.replace(/[\u202f\u00a0]/g, '\u00a0');
const money = (n: number): string => fixSpaces(eur(n));
const int = (n: number): string => fixSpaces(fmtInt.format(n));

/**
 * Logo OLDA (mark vectoriel) pour l'en-tête. `fill` posé sur la racine SVG :
 * svg-to-pdfkit (utilisé par pdfmake) en hérite pour tous les tracés.
 */
const LOGO_SVG = `<svg viewBox="50 62 185 185" fill="${C.duckDeep}">
  <path d="M187.85,114.63h33.12c.82,0,1.48.66,1.48,1.48v34.05c0,.82-.66,1.48-1.48,1.48h-73.22c-.82,0-1.48-.66-1.48-1.48v-76.52c0-.82.66-1.48,1.48-1.48h37.15c.82,0,1.48.66,1.48,1.48v39.51c0,.82.66,1.48,1.48,1.48Z"/>
  <path d="M141.24,238.96l41.28-77.18c.58-1.05,2.09-1.05,2.67,0l41.39,77.18c.56,1.02-.18,2.26-1.34,2.26h-82.67c-1.16,0-1.89-1.24-1.34-2.26Z"/>
  <g><path d="M101.44,161.74h-2.56l.48,79.48h1.16c20.68,0,38.61-15.44,40.49-36.03,2.14-23.57-16.43-43.44-39.57-43.44Z"/><path d="M95.36,161.74h-32.71c-.82,0-1.48.66-1.48,1.48v76.52c0,.82.66,1.48,1.48,1.48h32.26l.45-79.48Z"/></g>
  <path d="M140.12,108.5c-1.61-20.24-18-36.63-38.24-38.24-25.72-2.04-47.09,19.32-45.05,45.04,1.6,20.24,18,36.64,38.24,38.25.12,0,.23,0,.34.02l.23-39.79v-.05l-11.32,11.07s-1.19-11.25,6.13-12.84h-13s4.12-7.32,14.54-4.85l-7.67-7.67s11.86-1.72,12.82,6.62c1.07-8.9,12.54-6.48,12.54-6.48l-7.92,8.04c8.81-3.63,14.91,4.33,14.91,4.33h-13.05c4.85,1.4,6.01,6.08,6.2,9.41.14,2.05-.12,3.59-.12,3.59l-3.54-3.59-7.55-7.62.24,39.91c24-.2,43.23-20.71,41.29-45.17Z"/>
</svg>`;

/** Trait fin pleine largeur (équivalent des `<hr class="rule">`). */
function rule(width = CONTENT_W, color = C.hairline, lineWidth = 0.5, vMargin = 14): Content {
  return {
    canvas: [{ type: 'line', x1: 0, y1: 0, x2: width, y2: 0, lineWidth, lineColor: color }],
    margin: [0, vMargin, 0, vMargin],
  };
}

/** En-tête : logo à gauche, bloc méta (réf / date / validité) à droite. */
function header(data: DevisData): Content {
  return {
    columns: [
      { svg: LOGO_SVG, width: 46 },
      {
        width: '*',
        alignment: 'right',
        stack: [
          { text: 'DEVIS', style: 'metaLabel' },
          { text: data.id, style: 'metaRef' },
          { text: 'ÉTABLI LE', style: 'metaLabel', margin: [0, 6, 0, 0] },
          { text: fmtShortDate(data.createdAt), style: 'metaValue' },
          { text: 'VALIDITÉ', style: 'metaLabel', margin: [0, 6, 0, 0] },
          { text: '30 jours', style: 'metaValue' },
        ],
      },
    ],
  };
}

/** Bloc « Émis par » / « Adressé à ». */
function parties(data: DevisData): Content {
  const c = data.customer;
  const company = c.company?.trim() ?? '';
  const personName = c.name.trim();
  const clientName = company || personName || 'Client';
  const address = c.address?.trim() ?? '';
  const contactBits = [c.email?.trim(), c.phone?.trim()].filter(Boolean) as string[];

  const recipient: Content[] = [
    { text: 'ADRESSÉ À', style: 'partyTitle' },
    { text: clientName, style: 'partyClient', margin: [0, 6, 0, 2] },
  ];
  if (company && personName) {
    recipient.push({ text: `À l’attention de ${personName}`, style: 'partyLine' });
  }
  if (address) recipient.push({ text: address, style: 'partyLine' });
  if (contactBits.length) recipient.push({ text: contactBits.join(' · '), style: 'partyLine' });

  return {
    columns: [
      {
        width: '*',
        stack: [
          { text: 'ÉMIS PAR', style: 'partyTitle' },
          { text: OLDA_ISSUER.name, style: 'partyOrg', margin: [0, 6, 0, 0] },
          { text: OLDA_ISSUER.address, style: 'partyLine' },
          { text: `${OLDA_ISSUER.phoneFixe} · ${OLDA_ISSUER.phoneMobile}`, style: 'partyLine' },
          { text: OLDA_ISSUER.email, style: 'partyLine' },
        ],
      },
      { width: '*', stack: recipient },
    ],
    columnGap: 36,
  };
}

/** Cellule « Article » : nom + code, détails (coloris/impression/print), tailles, note. */
function articleCell(e: EnrichedLine): Content {
  const detail = (label: string, value: string): Content => ({
    columns: [
      { text: label.toUpperCase(), width: 84, style: 'detailLabel' },
      { text: value, width: '*', style: 'detailValue' },
    ],
    columnGap: 8,
    margin: [0, 2, 0, 0],
  });

  const stack: Content[] = [
    {
      text: [
        { text: e.name, style: 'artName' },
        { text: `  ${e.codeTag}`, style: 'codeTag' },
      ],
      margin: [0, 0, 0, 3],
    },
    detail('Coloris textile', e.textileName),
    detail('Impression DTF', e.placementLabel),
    detail('Coloris print', e.flockLabel),
  ];
  if (e.sizes.length) {
    stack.push({
      columns: [
        { text: '', width: 84 },
        { text: e.sizes.join('     '), width: '*', style: 'detailValue' },
      ],
      columnGap: 8,
      margin: [0, 2, 0, 0],
    });
  }
  if (e.note) stack.push({ text: e.note, style: 'artNote', margin: [0, 5, 0, 0] });

  return { stack };
}

/** Une ligne du tableau des articles. */
function articleRow(e: EnrichedLine): TableCell[] {
  const refStack: Content[] = [{ text: e.ref, style: 'refId', alignment: 'center' }];
  if (e.sku) refStack.push({ text: e.sku, style: 'refSku', alignment: 'center' });
  return [
    { stack: refStack },
    articleCell(e),
    { text: int(e.qty), style: 'cellNum', alignment: 'right' },
    { text: fixSpaces(e.unitText), style: 'cellNum', alignment: 'right' },
    { text: fixSpaces(e.totalText), style: 'cellTot', alignment: 'right' },
  ];
}

/** Tableau des articles, bordures dessinées à la main (en-tête épais, lignes fines). */
function linesTable(data: DevisData): Content {
  const head: TableCell[] = [
    { text: 'Réf', style: 'th' },
    { text: 'Article', style: 'th' },
    { text: 'Qté', style: 'th', alignment: 'right' },
    { text: 'PU HT', style: 'th', alignment: 'right' },
    { text: 'Total HT', style: 'th', alignment: 'right' },
  ];
  const body: TableCell[][] = [head, ...data.lines.map((l) => articleRow(enrich(l)))];

  return {
    table: {
      headerRows: 1,
      widths: [58, '*', 26, 52, 62],
      body,
    },
    layout: {
      hLineWidth: (i: number) => (i === 0 ? 0 : i === 1 ? 1 : 0.5),
      hLineColor: (i: number) => (i === 1 ? C.duckDeep : C.hairline),
      vLineWidth: () => 0,
      paddingLeft: (i: number) => (i === 0 ? 0 : 6),
      paddingRight: (i: number, node) => (i === (node.table.widths?.length ?? 0) - 1 ? 0 : 6),
      paddingTop: () => 8,
      paddingBottom: () => 8,
    },
  };
}

/** Bloc totaux, aligné à droite (sous-total, transport, TGCA, total TTC). */
function totals(data: DevisData): Content {
  const { lines, transport, totals: t } = data;

  // Transport : on n'affiche un mode précis que si toutes les lignes le partagent.
  const lineTransports = [...new Set(lines.map((l) => l.transport ?? transport))];
  const onlyTransport = lineTransports.length === 1 ? lineTransports[0] : null;
  // Chronopost = seul mode payant : on compte les pièces réellement transportées.
  const transportQty = lines.reduce(
    (acc, l) => acc + ((l.transport ?? transport) === 'chronopost' ? lineQty(l.sizes) : 0),
    0,
  );
  const transportPieces =
    transportQty > 0 ? ` · ${int(transportQty)} pièce${transportQty > 1 ? 's' : ''}` : '';
  const transportLabel =
    (onlyTransport
      ? `Transport · ${TRANSPORT_OPTIONS.find((o) => o.id === onlyTransport)?.label ?? '—'}`
      : 'Transport') + transportPieces;
  const transportValue = t.transportHT > 0 ? money(t.transportHT) : 'Gratuit';
  const tgcaValue = t.tgcaHT > 0 ? money(t.tgcaHT) : 'Exonéré — revente';

  const W = 230;
  const tline = (label: string, value: string): Content => ({
    columns: [
      { text: label, style: 'tLabel' },
      { text: value, style: 'tVal', alignment: 'right' },
    ],
    margin: [0, 3, 0, 3],
  });

  return {
    columns: [
      { width: '*', text: '' },
      {
        width: W,
        stack: [
          tline('Sous-total HT', money(t.subtotalHT)),
          tline(transportLabel, transportValue),
          tline('TGCA 4 %', tgcaValue),
          {
            canvas: [
              { type: 'line', x1: 0, y1: 0, x2: W, y2: 0, lineWidth: 1, lineColor: C.duckDeep },
            ],
            margin: [0, 8, 0, 8],
          },
          {
            columns: [
              { text: 'Total TTC', style: 'grandLabel' },
              { text: money(t.totalHT), style: 'grandVal', alignment: 'right' },
            ],
          },
        ],
      },
    ],
    margin: [0, 18, 0, 0],
  };
}

/**
 * Construit la définition de document pdfmake du devis (A4 portrait).
 * Fonction pure : aucun accès réseau ni navigateur — testable et exécutable
 * 100 % côté client.
 */
export function buildDevisDocDefinition(data: DevisData): TDocumentDefinitions {
  const issuerLegal = `${OLDA_ISSUER.name} · ${OLDA_ISSUER.legal} · Siège social : ${OLDA_ISSUER.address}`;

  return {
    pageSize: 'A4',
    pageMargins: [40, 44, 40, 64],
    defaultStyle: { font: 'Roboto', fontSize: 9, color: C.duck, lineHeight: 1.25 },
    info: { title: `Devis ${data.id} — OLDA` },
    footer: (): Content => ({
      margin: [40, 0, 40, 0],
      stack: [
        {
          canvas: [
            {
              type: 'line',
              x1: 0,
              y1: 0,
              x2: CONTENT_W,
              y2: 0,
              lineWidth: 0.5,
              lineColor: C.hairline,
            },
          ],
        },
        { text: issuerLegal, style: 'footLegal', alignment: 'center', margin: [0, 8, 0, 0] },
        {
          text: 'Devis valable 30 jours · TGCA 4 % applicable hors revente',
          style: 'footNote',
          alignment: 'center',
          margin: [0, 3, 0, 0],
        },
      ],
    }),
    content: [header(data), rule(), parties(data), rule(), linesTable(data), totals(data)],
    styles: {
      metaLabel: { fontSize: 7, bold: true, color: C.duck200, characterSpacing: 1 },
      metaRef: { fontSize: 11, bold: true, color: C.duckDeep },
      metaValue: { fontSize: 9.5, color: C.duck400 },
      partyTitle: { fontSize: 8, bold: true, color: C.duckDeep, characterSpacing: 1.2 },
      partyOrg: { fontSize: 9.5, bold: true, color: C.duck },
      partyLine: { fontSize: 9.5, color: C.duck400 },
      partyClient: { fontSize: 12, bold: true, color: C.duckDeep },
      th: { fontSize: 7.5, bold: true, color: C.duckDeep, characterSpacing: 1 },
      refId: { fontSize: 9, color: C.duck400 },
      refSku: { fontSize: 8, color: C.duck300, margin: [0, 2, 0, 0] },
      artName: { fontSize: 10.5, bold: true, color: C.duckDeep },
      codeTag: { fontSize: 9, bold: true, color: C.duck300 },
      detailLabel: { fontSize: 7, bold: true, color: C.duck200, characterSpacing: 0.8 },
      detailValue: { fontSize: 8.5, color: C.duck },
      artNote: { fontSize: 8.5, italics: true, color: C.duck400 },
      cellNum: { fontSize: 9.5, color: C.duck },
      cellTot: { fontSize: 9.5, bold: true, color: C.duckDeep },
      tLabel: { fontSize: 9.5, color: C.duck400 },
      tVal: { fontSize: 9.5, color: C.duckDeep },
      grandLabel: { fontSize: 14, bold: true, color: C.duckDeep },
      grandVal: { fontSize: 16, bold: true, color: C.duckDeep },
      footLegal: { fontSize: 7, color: C.duck300 },
      footNote: { fontSize: 7, color: C.duck200 },
    },
  };
}
