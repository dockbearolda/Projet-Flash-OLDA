import { describe, it, expect } from 'vitest';
import type { QuoteLine } from '@df/shared';
import { quoteTotals } from '../quote/pricing';
import { eur } from '@/lib/format';
import { buildDevisDocDefinition } from './devisDoc';
import { OLDA_ISSUER, type DevisData } from './devisData';

function makeLine(over: Partial<QuoteLine> = {}): QuoteLine {
  return {
    id: 'L1',
    productRef: 'H-001',
    placementId: 'coeur-dos',
    textileColorId: 'noir',
    flockMode: 'multi',
    flockColorId: null,
    sizes: { xs: 0, s: 5, m: 10, l: 0, xl: 0, xxl: 0, autres: 0 },
    linked: true,
    code: 10,
    ...over,
  };
}

function makeData(over: Partial<DevisData> = {}): DevisData {
  const lines = over.lines ?? [makeLine()];
  const transport = over.transport ?? 'chronopost';
  const revente = over.revente ?? false;
  return {
    id: 'DEV-2026-0042',
    customer: { name: 'Jean Martin', company: 'Dupont SARL' },
    lines,
    transport,
    revente,
    totals: quoteTotals({ lines, transport, revente }),
    createdAt: '2026-05-21T10:00:00.000Z',
    ...over,
  };
}

describe('buildDevisDocDefinition', () => {
  it('produces an A4 document with the expected top-level sections', () => {
    const doc = buildDevisDocDefinition(makeData());
    expect(doc.pageSize).toBe('A4');
    expect(Array.isArray(doc.content)).toBe(true);
    // header, rule, parties, rule, lines table, totals
    expect(doc.content as unknown[]).toHaveLength(6);
    expect(typeof doc.footer).toBe('function');
  });

  it('renders one table row per quote line plus the header row', () => {
    const lines = [makeLine({ id: 'L1' }), makeLine({ id: 'L2' }), makeLine({ id: 'L3' })];
    const doc = buildDevisDocDefinition(makeData({ lines }));
    const content = doc.content as { table?: { body: unknown[] } }[];
    const table = content.find((c) => c.table);
    expect(table?.table?.body).toHaveLength(1 + lines.length);
  });

  it('includes the quote id, both parties and the TTC total', () => {
    const data = makeData();
    const json = JSON.stringify(buildDevisDocDefinition(data));
    expect(json).toContain(data.id);
    expect(json).toContain('Dupont SARL'); // client (raison sociale)
    expect(json).toContain(OLDA_ISSUER.name); // émetteur
    expect(json).toContain('Total TTC');
    expect(json).toContain(eur(data.totals.totalHT));
  });

  it('marks TGCA as exonerated when revente is on', () => {
    const json = JSON.stringify(buildDevisDocDefinition(makeData({ revente: true })));
    expect(json).toContain('Exonéré');
  });
});
