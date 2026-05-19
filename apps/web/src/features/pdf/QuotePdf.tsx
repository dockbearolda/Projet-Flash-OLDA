import { Document, Page, Text, View, StyleSheet } from '@react-pdf/renderer';
import {
  PRODUCT_BY_REF,
  PLACEMENT_BY_ID,
  TEXTILE_COLOR_BY_ID,
  FLOCK_COLOR_BY_ID,
  TRANSPORT_OPTIONS,
} from '@df/shared';
import type {
  Customer,
  QuoteLine,
  Transport,
  Placement,
  TextileColor,
  FlockColor,
} from '@df/shared';
import { fmtEUR, fmtInt, fmtShortDate } from '@/lib/format';
import type { QuoteTotals } from '../quote/pricing';
import { lineQty, unitPriceHT } from '../quote/pricing';

const COLORS = {
  ink: '#0e1116',
  ink2: '#36404a',
  ink3: '#6b7480',
  ink4: '#a4adb6',
  accent: '#2f5a7a',
  accentSoft: '#e6edf3',
  border: '#dde2e6',
  surface: '#f7f8f9',
  bg: '#ebeef0',
};

const styles = StyleSheet.create({
  page: {
    padding: 40,
    fontSize: 9,
    fontFamily: 'Helvetica',
    color: COLORS.ink,
    backgroundColor: '#ffffff',
  },
  brandRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    marginBottom: 24,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  brand: { fontSize: 24, fontFamily: 'Helvetica-Bold', color: COLORS.ink, letterSpacing: -1 },
  brandSub: { fontSize: 9, color: COLORS.ink3, marginTop: 2 },
  meta: { alignItems: 'flex-end' },
  metaRef: {
    fontSize: 12,
    fontFamily: 'Courier-Bold',
    color: COLORS.ink,
  },
  metaDate: { fontSize: 9, color: COLORS.ink3, marginTop: 2 },
  section: { marginBottom: 18 },
  sectionTitle: {
    fontSize: 8,
    fontFamily: 'Helvetica-Bold',
    color: COLORS.ink3,
    textTransform: 'uppercase',
    letterSpacing: 1.2,
    marginBottom: 6,
  },
  customerBox: {
    padding: 10,
    backgroundColor: COLORS.surface,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  customerName: { fontSize: 13, fontFamily: 'Helvetica-Bold', marginBottom: 2 },
  customerLine: { fontSize: 9, color: COLORS.ink2 },
  table: { width: '100%', marginTop: 4 },
  thead: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: COLORS.ink4,
    paddingBottom: 4,
    marginBottom: 4,
  },
  th: {
    fontSize: 7.5,
    fontFamily: 'Helvetica-Bold',
    color: COLORS.ink3,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  td: { fontSize: 9, color: COLORS.ink },
  row: {
    flexDirection: 'row',
    paddingVertical: 6,
    borderBottomWidth: 0.5,
    borderBottomColor: COLORS.border,
  },
  colRef: { width: '10%' },
  colDesc: { width: '34%' },
  colPlace: { width: '16%' },
  colColor: { width: '12%' },
  colQty: { width: '8%', textAlign: 'right' },
  colPU: { width: '10%', textAlign: 'right' },
  colTot: { width: '10%', textAlign: 'right' },
  bullets: {
    marginTop: 4,
    paddingLeft: 8,
  },
  bullet: { fontSize: 8.5, color: COLORS.ink2, marginTop: 2 },
  mono: { fontFamily: 'Courier' },
  monoBold: { fontFamily: 'Courier-Bold' },
  totals: {
    marginTop: 16,
    alignSelf: 'flex-end',
    width: '46%',
    padding: 12,
    backgroundColor: COLORS.surface,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  totalsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 4,
  },
  totalsLabel: { fontSize: 9, color: COLORS.ink2 },
  totalsValue: { fontSize: 10, fontFamily: 'Courier', color: COLORS.ink },
  grandRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: COLORS.ink4,
    alignItems: 'baseline',
  },
  grandLabel: {
    fontSize: 9,
    fontFamily: 'Helvetica-Bold',
    color: COLORS.ink,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  grandValue: {
    fontSize: 18,
    fontFamily: 'Courier-Bold',
    color: COLORS.accent,
  },
  footer: {
    position: 'absolute',
    bottom: 24,
    left: 40,
    right: 40,
    fontSize: 8,
    color: COLORS.ink3,
    textAlign: 'center',
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    paddingTop: 8,
  },
});

interface Props {
  id: string;
  customer: Customer;
  lines: QuoteLine[];
  transport: Transport;
  revente: boolean;
  totals: QuoteTotals;
  createdAt: string;
}

function enrich(line: QuoteLine, coef: number) {
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
  const qty = lineQty(line.sizes);
  const pu = product
    ? unitPriceHT({ productRef: line.productRef, placementId: line.placementId, coef })
    : 0;
  return { line, product, placement, textile, flockLabel, qty, pu, total: pu * qty };
}

export function QuotePdf({ id, customer, lines, transport, revente, totals, createdAt }: Props) {
  const transportOpt = TRANSPORT_OPTIONS.find((t) => t.id === transport);
  const enriched = lines.map((l) => enrich(l, totals.coef));

  return (
    <Document
      title={`Devis ${id}`}
      author="OLDA"
      subject={`Devis Flash ${id}`}
      creator="Devis Flash · OLDA"
    >
      <Page size="A4" style={styles.page}>
        {/* Header brand */}
        <View style={styles.brandRow}>
          <View>
            <Text style={styles.brand}>OLDA</Text>
            <Text style={styles.brandSub}>Atelier d&apos;impression DTF · Saint-Martin</Text>
          </View>
          <View style={styles.meta}>
            <Text style={styles.metaRef}>{id}</Text>
            <Text style={styles.metaDate}>Établi le {fmtShortDate(createdAt)}</Text>
          </View>
        </View>

        {/* Customer */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Client</Text>
          <View style={styles.customerBox}>
            <Text style={styles.customerName}>{customer.name || 'Client non renseigné'}</Text>
            {customer.email ? <Text style={styles.customerLine}>{customer.email}</Text> : null}
            {customer.phone ? <Text style={styles.customerLine}>{customer.phone}</Text> : null}
            {customer.address ? <Text style={styles.customerLine}>{customer.address}</Text> : null}
          </View>
        </View>

        {/* Lines */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Lignes du devis</Text>
          <View style={styles.table}>
            <View style={styles.thead}>
              <Text style={[styles.th, styles.colRef]}>Réf</Text>
              <Text style={[styles.th, styles.colDesc]}>Description</Text>
              <Text style={[styles.th, styles.colPlace]}>Placement</Text>
              <Text style={[styles.th, styles.colColor]}>Coloris</Text>
              <Text style={[styles.th, styles.colQty]}>Qté</Text>
              <Text style={[styles.th, styles.colPU]}>PU HT</Text>
              <Text style={[styles.th, styles.colTot]}>Total HT</Text>
            </View>
            {enriched.map((e) => (
              <View key={e.line.id}>
                <View style={styles.row}>
                  <Text style={[styles.td, styles.colRef, styles.mono]}>
                    {e.product?.ref ?? '—'}
                  </Text>
                  <View style={styles.colDesc}>
                    <Text style={styles.td}>{e.product?.name ?? '—'}</Text>
                    <Text style={[styles.td, { color: COLORS.ink3 }]}>
                      {e.product?.supplierRef ?? ''}
                    </Text>
                  </View>
                  <Text style={[styles.td, styles.colPlace]}>{e.placement?.label ?? '—'}</Text>
                  <Text style={[styles.td, styles.colColor]}>{e.textile?.name ?? '—'}</Text>
                  <Text style={[styles.td, styles.colQty, styles.mono]}>
                    {fmtInt.format(e.qty)}
                  </Text>
                  <Text style={[styles.td, styles.colPU, styles.mono]}>{fmtEUR.format(e.pu)}</Text>
                  <Text style={[styles.td, styles.colTot, styles.monoBold]}>
                    {fmtEUR.format(e.total)}
                  </Text>
                </View>
                <View style={styles.bullets}>
                  <Text style={styles.bullet}>• Coloris textile : {e.textile?.name ?? '—'}</Text>
                  <Text style={styles.bullet}>• Impression DTF : {e.placement?.label ?? '—'}</Text>
                  <Text style={styles.bullet}>• Couleur d&apos;impression : {e.flockLabel}</Text>
                </View>
              </View>
            ))}
          </View>
        </View>

        {/* Totals */}
        <View style={styles.totals}>
          <View style={styles.totalsRow}>
            <Text style={styles.totalsLabel}>Sous-total HT</Text>
            <Text style={styles.totalsValue}>{fmtEUR.format(totals.subtotalHT)}</Text>
          </View>
          <View style={styles.totalsRow}>
            <Text style={styles.totalsLabel}>Transport · {transportOpt?.label ?? '—'}</Text>
            <Text style={styles.totalsValue}>
              {totals.transportHT > 0 ? fmtEUR.format(totals.transportHT) : 'Gratuit'}
            </Text>
          </View>
          <View style={styles.totalsRow}>
            <Text style={styles.totalsLabel}>TGCA 4 %</Text>
            <Text style={styles.totalsValue}>
              {revente ? 'Exonéré — revente' : fmtEUR.format(totals.tgcaHT)}
            </Text>
          </View>
          <View style={styles.grandRow}>
            <Text style={styles.grandLabel}>Total HT</Text>
            <Text style={styles.grandValue}>{fmtEUR.format(totals.totalHT)}</Text>
          </View>
        </View>

        <Text style={styles.footer}>
          OLDA · Saint-Martin · Devis valable 30 jours · TGCA 4 % applicable hors revente.
        </Text>
      </Page>
    </Document>
  );
}
