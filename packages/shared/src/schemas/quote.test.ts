import { describe, it, expect } from 'vitest';
import {
  CustomerSchema,
  SizesSchema,
  QuoteLineSchema,
  QuoteSchema,
  FlockModeSchema,
  TransportSchema,
} from './quote.js';

describe('CustomerSchema', () => {
  it('accepts a minimal valid customer', () => {
    const r = CustomerSchema.safeParse({ name: 'OLDA Pro Shop' });
    expect(r.success).toBe(true);
  });

  it('rejects empty name', () => {
    const r = CustomerSchema.safeParse({ name: '' });
    expect(r.success).toBe(false);
  });

  it('trims name', () => {
    const r = CustomerSchema.parse({ name: '  Hello  ' });
    expect(r.name).toBe('Hello');
  });

  it('rejects invalid email', () => {
    const r = CustomerSchema.safeParse({ name: 'X', email: 'not-an-email' });
    expect(r.success).toBe(false);
  });

  it('accepts empty email literal', () => {
    const r = CustomerSchema.safeParse({ name: 'X', email: '' });
    expect(r.success).toBe(true);
  });
});

describe('SizesSchema', () => {
  it('defaults all sizes to 0', () => {
    const r = SizesSchema.parse({});
    expect(r.xs).toBe(0);
    expect(r.autres).toBe(0);
  });

  it('rejects negative size', () => {
    const r = SizesSchema.safeParse({ xs: -1 });
    expect(r.success).toBe(false);
  });

  it('rejects non-integer', () => {
    const r = SizesSchema.safeParse({ m: 3.5 });
    expect(r.success).toBe(false);
  });

  it('accepts a full sizes object', () => {
    const r = SizesSchema.parse({ xs: 10, s: 20, m: 30, l: 20, xl: 10, xxl: 5, autres: 5 });
    expect(r.xs + r.s + r.m + r.l + r.xl + r.xxl + r.autres).toBe(100);
  });
});

describe('FlockModeSchema / TransportSchema', () => {
  it('flock mode is multi or single', () => {
    expect(FlockModeSchema.safeParse('multi').success).toBe(true);
    expect(FlockModeSchema.safeParse('single').success).toBe(true);
    expect(FlockModeSchema.safeParse('weird').success).toBe(false);
  });

  it('transport accepts maritime/chronopost/stock', () => {
    expect(TransportSchema.safeParse('maritime').success).toBe(true);
    expect(TransportSchema.safeParse('chronopost').success).toBe(true);
    expect(TransportSchema.safeParse('stock').success).toBe(true);
    expect(TransportSchema.safeParse('plane').success).toBe(false);
  });
});

describe('QuoteLineSchema', () => {
  it('accepts a valid line', () => {
    const r = QuoteLineSchema.safeParse({
      id: 'l1',
      productRef: 'H-001',
      placementId: 'coeur-dos',
      textileColorId: 'bleu-royal',
      flockMode: 'multi',
      flockColorId: null,
      sizes: { xs: 0, s: 0, m: 0, l: 0, xl: 0, xxl: 0, autres: 0 },
    });
    expect(r.success).toBe(true);
  });
});

describe('QuoteSchema', () => {
  it('accepts a full valid quote', () => {
    const r = QuoteSchema.safeParse({
      id: 'DEV-2026-0001',
      status: 'draft',
      customer: { name: 'OLDA' },
      transport: 'chronopost',
      revente: false,
      lines: [
        {
          id: 'l1',
          productRef: 'H-001',
          placementId: 'coeur-dos',
          textileColorId: 'bleu-royal',
          flockMode: 'multi',
          flockColorId: null,
          sizes: { xs: 0, s: 0, m: 0, l: 0, xl: 0, xxl: 0, autres: 0 },
        },
      ],
      activeLineId: 'l1',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
    expect(r.success).toBe(true);
  });

  it('rejects an empty lines array', () => {
    const r = QuoteSchema.safeParse({
      id: 'DEV-2026-0001',
      status: 'draft',
      customer: { name: 'OLDA' },
      transport: 'maritime',
      revente: true,
      lines: [],
      activeLineId: 'l1',
      createdAt: '',
      updatedAt: '',
    });
    expect(r.success).toBe(false);
  });
});
