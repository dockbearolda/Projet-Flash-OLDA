import { describe, it, expect, beforeEach } from 'vitest';
import { useQuoteStore } from './quoteStore';

function freshStore() {
  useQuoteStore.getState().__replace({
    id: 'DEV-TEST-0001',
    status: 'draft',
    customer: { name: '' },
    transport: 'chronopost',
    revente: false,
    lines: [],
    activeLineId: '',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  });
  useQuoteStore.getState().addLine();
}

describe('useQuoteStore', () => {
  beforeEach(() => {
    freshStore();
  });

  it('starts with exactly one line and that line is active', () => {
    const s = useQuoteStore.getState();
    expect(s.lines).toHaveLength(1);
    expect(s.activeLineId).toBe(s.lines[0]!.id);
  });

  it('addLine appends and activates the new line', () => {
    useQuoteStore.getState().addLine();
    const s = useQuoteStore.getState();
    expect(s.lines).toHaveLength(2);
    expect(s.activeLineId).toBe(s.lines[1]!.id);
  });

  it('removeLine drops the line and reassigns active when needed', () => {
    useQuoteStore.getState().addLine();
    useQuoteStore.getState().addLine();
    const before = useQuoteStore.getState();
    const idToRemove = before.activeLineId;
    useQuoteStore.getState().removeLine(idToRemove);
    const after = useQuoteStore.getState();
    expect(after.lines).toHaveLength(2);
    expect(after.lines.find((l) => l.id === idToRemove)).toBeUndefined();
    expect(after.activeLineId).not.toBe(idToRemove);
  });

  it('removeLine refuses to drop the last line', () => {
    const s = useQuoteStore.getState();
    const onlyId = s.lines[0]!.id;
    useQuoteStore.getState().removeLine(onlyId);
    expect(useQuoteStore.getState().lines).toHaveLength(1);
  });

  it('updateLine patches the targeted line only', () => {
    const id = useQuoteStore.getState().lines[0]!.id;
    useQuoteStore.getState().updateLine(id, { productRef: 'F-003' });
    expect(useQuoteStore.getState().lines[0]!.productRef).toBe('F-003');
  });

  it('setSizes replaces sizes for the targeted line', () => {
    const id = useQuoteStore.getState().lines[0]!.id;
    useQuoteStore.getState().setSizes(id, { xs: 0, s: 0, m: 30, l: 30, xl: 20, xxl: 0, autres: 0 });
    expect(useQuoteStore.getState().lines[0]!.sizes.m).toBe(30);
    expect(useQuoteStore.getState().lines[0]!.sizes.xl).toBe(20);
  });

  it('setFlockMode multi clears flockColorId', () => {
    const id = useQuoteStore.getState().lines[0]!.id;
    useQuoteStore.getState().updateLine(id, { flockMode: 'single', flockColorId: 'rouge' });
    useQuoteStore.getState().setFlockMode(id, 'multi');
    const l = useQuoteStore.getState().lines[0]!;
    expect(l.flockMode).toBe('multi');
    expect(l.flockColorId).toBeNull();
  });

  it('setFlockMode single keeps existing color', () => {
    const id = useQuoteStore.getState().lines[0]!.id;
    useQuoteStore.getState().updateLine(id, { flockMode: 'single', flockColorId: 'or' });
    useQuoteStore.getState().setFlockMode(id, 'single');
    expect(useQuoteStore.getState().lines[0]!.flockColorId).toBe('or');
  });

  it('setCustomer merges into existing customer', () => {
    useQuoteStore.getState().setCustomer({ name: 'OLDA Pro' });
    useQuoteStore.getState().setCustomer({ phone: '0590 12 34 56' });
    expect(useQuoteStore.getState().customer.name).toBe('OLDA Pro');
    expect(useQuoteStore.getState().customer.phone).toBe('0590 12 34 56');
  });

  it('setTransport / setRevente update the flags', () => {
    useQuoteStore.getState().setTransport('maritime');
    useQuoteStore.getState().setRevente(true);
    expect(useQuoteStore.getState().transport).toBe('maritime');
    expect(useQuoteStore.getState().revente).toBe(true);
  });

  it('setActive switches the active line', () => {
    useQuoteStore.getState().addLine();
    const firstId = useQuoteStore.getState().lines[0]!.id;
    useQuoteStore.getState().setActive(firstId);
    expect(useQuoteStore.getState().activeLineId).toBe(firstId);
  });

  it('reset clears everything and provides a new quote id', () => {
    useQuoteStore.getState().setCustomer({ name: 'X' });
    useQuoteStore.getState().reset();
    const s = useQuoteStore.getState();
    expect(s.customer.name).toBe('');
    expect(s.lines).toHaveLength(1);
    expect(s.id).toMatch(/^DEV-\d{4}-\d{4}$/);
  });

  it('newQuote behaves like reset', () => {
    useQuoteStore.getState().setRevente(true);
    useQuoteStore.getState().newQuote();
    expect(useQuoteStore.getState().revente).toBe(false);
  });

  it('updatedAt bumps after a mutation', async () => {
    const before = useQuoteStore.getState().updatedAt;
    await new Promise((r) => setTimeout(r, 5));
    useQuoteStore.getState().setRevente(true);
    expect(useQuoteStore.getState().updatedAt).not.toBe(before);
  });
});
