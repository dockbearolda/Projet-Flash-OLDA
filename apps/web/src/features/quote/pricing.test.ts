import { describe, it, expect } from 'vitest';
import {
  coefFor,
  placementZonesPriceHT,
  round2,
  lineQty,
  unitPriceHT,
  lineSubtotalHT,
  quoteTotals,
} from './pricing';
import type { Sizes } from '@df/shared';

const emptySizes: Sizes = { xs: 0, s: 0, m: 0, l: 0, xl: 0, xxl: 0, autres: 0 };
const sizes = (qty: Partial<Sizes>): Sizes => ({ ...emptySizes, ...qty });

describe('coefFor', () => {
  it('returns 3.80 for qty 1', () => {
    expect(coefFor(1)).toBe(3.8);
  });

  it('returns 3.80 for qty 4 (below 5 threshold)', () => {
    expect(coefFor(4)).toBe(3.8);
  });

  it('returns 2.09 at threshold 5', () => {
    expect(coefFor(5)).toBe(2.09);
  });

  it('returns 1.91 at threshold 10', () => {
    expect(coefFor(10)).toBe(1.91);
  });

  it('returns 1.46 for qty 80 minus 1 (= 70 threshold)', () => {
    expect(coefFor(79)).toBe(1.46);
  });

  it('returns 1.37 at threshold 80', () => {
    expect(coefFor(80)).toBe(1.37);
  });

  it('returns 1.27 at threshold 100', () => {
    expect(coefFor(100)).toBe(1.27);
  });

  it('returns 1.27 at threshold 150', () => {
    expect(coefFor(150)).toBe(1.27);
  });

  it('returns 1.27 for any qty > 150', () => {
    expect(coefFor(999)).toBe(1.27);
  });

  it('returns first coef for qty 0', () => {
    expect(coefFor(0)).toBe(3.8);
  });

  it('returns first coef for negative qty (sanity)', () => {
    expect(coefFor(-5)).toBe(3.8);
  });
});

describe('placementZonesPriceHT', () => {
  it('coeur-dos = 2.50 + 5.00 = 7.50', () => {
    expect(placementZonesPriceHT('coeur-dos')).toBe(7.5);
  });

  it('dos only = 5.00', () => {
    expect(placementZonesPriceHT('dos')).toBe(5.0);
  });

  it('coeur only = 2.50', () => {
    expect(placementZonesPriceHT('coeur')).toBe(2.5);
  });

  it('coeur-dos-manche-dr-ga = 2.50+5.00+1.50+1.50 = 10.50', () => {
    expect(placementZonesPriceHT('coeur-dos-manche-dr-ga')).toBe(10.5);
  });

  it('t-shirt-seul = 0', () => {
    expect(placementZonesPriceHT('t-shirt-seul')).toBe(0);
  });

  it('poitrine-dos = 3.20 + 5.00 = 8.20', () => {
    expect(placementZonesPriceHT('poitrine-dos')).toBe(8.2);
  });
});

describe('round2', () => {
  it('rounds 1.005 to 1.01', () => {
    expect(round2(1.005)).toBe(1.01);
  });

  it('rounds 1.004 to 1.00', () => {
    expect(round2(1.004)).toBe(1.0);
  });

  it('keeps 0', () => {
    expect(round2(0)).toBe(0);
  });

  it('handles negatives', () => {
    expect(round2(-1.236)).toBe(-1.24);
  });
});

describe('lineQty', () => {
  it('sums all sizes', () => {
    expect(lineQty(sizes({ xs: 5, s: 10, m: 30, l: 30, xl: 10, xxl: 4, autres: 1 }))).toBe(90);
  });

  it('returns 0 for empty sizes', () => {
    expect(lineQty(emptySizes)).toBe(0);
  });
});

describe('unitPriceHT', () => {
  it('H-001 (4.05€) + coeur-dos (7.50€) × 1.46 (qty 70) = 16.863', () => {
    const u = unitPriceHT({ productRef: 'H-001', placementId: 'coeur-dos', coef: 1.46 });
    expect(round2(u)).toBe(16.86);
  });

  it('t-shirt-seul has zero zone price', () => {
    const u = unitPriceHT({ productRef: 'H-001', placementId: 't-shirt-seul', coef: 1.0 });
    expect(round2(u)).toBe(4.05);
  });

  it('throws on unknown product', () => {
    expect(() => unitPriceHT({ productRef: 'XXX-999', placementId: 'dos', coef: 1 })).toThrow(
      /Unknown product/,
    );
  });

  it('with full coef 3.80 on qty=1 case', () => {
    // F-008 (2.81) + dos (5.00) = 7.81 × 3.80 = 29.678
    const u = unitPriceHT({ productRef: 'F-008', placementId: 'dos', coef: 3.8 });
    expect(round2(u)).toBe(29.68);
  });
});

describe('lineSubtotalHT', () => {
  it('80 pieces × H-001 coeur-dos × coef 1.37 = 80 × 15.8235 = 1265.88', () => {
    // (4.05 + 7.50) × 1.37 = 15.8235  →  × 80 = 1265.88
    const total = lineSubtotalHT(
      {
        productRef: 'H-001',
        placementId: 'coeur-dos',
        sizes: sizes({ m: 40, l: 40 }),
      },
      1.37,
    );
    expect(round2(total)).toBe(1265.88);
  });

  it('0 pieces yields 0', () => {
    const total = lineSubtotalHT(
      { productRef: 'H-001', placementId: 'dos', sizes: emptySizes },
      1.27,
    );
    expect(total).toBe(0);
  });
});

describe('quoteTotals', () => {
  it('single line, 80 pcs Coeur+Dos H-001 Chronopost non-revente — golden path tablette', () => {
    const r = quoteTotals({
      lines: [
        {
          productRef: 'H-001',
          placementId: 'coeur-dos',
          sizes: sizes({ m: 40, l: 40 }),
        },
      ],
      transport: 'chronopost',
      revente: false,
    });
    expect(r.qtyTotal).toBe(80);
    expect(r.coef).toBe(1.37);
    expect(r.subtotalHT).toBe(1265.88);
    expect(r.transportHT).toBe(120.0); // 80 × 1.50
    expect(r.tgcaHT).toBe(55.44); // (1265.88 + 120) × 0.04 = 55.4352 → 55.44
    expect(r.totalHT).toBe(1441.32); // 1265.88 + 120 + 55.4352 = 1441.3152
  });

  it('exempts TGCA when revente=true', () => {
    const r = quoteTotals({
      lines: [
        {
          productRef: 'H-001',
          placementId: 'coeur-dos',
          sizes: sizes({ m: 40, l: 40 }),
        },
      ],
      transport: 'chronopost',
      revente: true,
    });
    expect(r.tgcaHT).toBe(0);
    expect(r.totalHT).toBe(round2(1265.88 + 120));
  });

  it('maritime has zero transport', () => {
    const r = quoteTotals({
      lines: [
        {
          productRef: 'H-001',
          placementId: 'coeur',
          sizes: sizes({ m: 100 }),
        },
      ],
      transport: 'maritime',
      revente: false,
    });
    expect(r.transportHT).toBe(0);
  });

  it('stock has zero transport', () => {
    const r = quoteTotals({
      lines: [
        {
          productRef: 'H-001',
          placementId: 'coeur',
          sizes: sizes({ m: 1 }),
        },
      ],
      transport: 'stock',
      revente: false,
    });
    expect(r.transportHT).toBe(0);
  });

  it('multi-line coef uses summed qty across lines', () => {
    // 30 + 30 + 30 = 90 → coef = 1.32
    const r = quoteTotals({
      lines: [
        { productRef: 'H-001', placementId: 'coeur', sizes: sizes({ m: 30 }) },
        { productRef: 'F-003', placementId: 'dos', sizes: sizes({ l: 30 }) },
        { productRef: 'E-001', placementId: 't-shirt-seul', sizes: sizes({ s: 30 }) },
      ],
      transport: 'maritime',
      revente: true,
    });
    expect(r.qtyTotal).toBe(90);
    expect(r.coef).toBe(1.32);
  });

  it('empty quote (0 qty) returns zeros and first coef', () => {
    const r = quoteTotals({
      lines: [{ productRef: 'H-001', placementId: 'coeur', sizes: emptySizes }],
      transport: 'maritime',
      revente: false,
    });
    expect(r.qtyTotal).toBe(0);
    expect(r.coef).toBe(3.8);
    expect(r.subtotalHT).toBe(0);
    expect(r.transportHT).toBe(0);
    expect(r.tgcaHT).toBe(0);
    expect(r.totalHT).toBe(0);
  });

  it('qty 1 single piece honors 3.80 coef', () => {
    // F-008 (2.81) + dos (5.00) = 7.81 × 3.80 = 29.678 → 1 piece
    const r = quoteTotals({
      lines: [{ productRef: 'F-008', placementId: 'dos', sizes: sizes({ m: 1 }) }],
      transport: 'maritime',
      revente: true,
    });
    expect(r.qtyTotal).toBe(1);
    expect(r.coef).toBe(3.8);
    expect(r.subtotalHT).toBe(29.68);
  });

  it('qty 150+ stays on 1.27 coef floor', () => {
    const r = quoteTotals({
      lines: [{ productRef: 'H-001', placementId: 'dos', sizes: sizes({ m: 200 }) }],
      transport: 'maritime',
      revente: true,
    });
    expect(r.coef).toBe(1.27);
  });

  it('throws on unknown transport id (defensive)', () => {
    expect(() =>
      quoteTotals({
        lines: [{ productRef: 'H-001', placementId: 'dos', sizes: sizes({ m: 1 }) }],
        // Force-cast an invalid transport to exercise the throw branch
        transport: 'plane' as unknown as 'maritime',
        revente: false,
      }),
    ).toThrow(/Unknown transport/);
  });

  it('does not double-round between transport and TGCA', () => {
    // Forces fractional intermediate (3 pcs × 1.50 = 4.50€ transport)
    const r = quoteTotals({
      lines: [{ productRef: 'H-019', placementId: 'coeur', sizes: sizes({ m: 3 }) }],
      transport: 'chronopost',
      revente: false,
    });
    expect(r.transportHT).toBe(4.5);
    // 3 × (2.09 + 2.50) × 3.80 = 3 × 4.59 × 3.80 = 52.326
    expect(r.subtotalHT).toBe(52.33);
    // (52.326 + 4.50) × 0.04 = 2.27304 → 2.27
    expect(r.tgcaHT).toBe(2.27);
  });
});
