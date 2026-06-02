import { describe, it, expect, afterEach } from 'vitest';
import {
  coefFor,
  placementZonesPriceHT,
  round2,
  roundUp10Cents,
  viergePriceHT,
  lineQty,
  unitPriceHT,
  lineSubtotalHT,
  lineTotals,
  quoteTotals,
} from './pricing';
import type { Sizes } from '@df/shared';
import { useCatalogStore } from '@/features/catalog/catalogStore';
import { defaultCatalogSnapshot } from '@df/shared';

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
  it('coeur-dos at qty 10 = 5.10 + 10.80 = 15.90', () => {
    expect(placementZonesPriceHT('coeur-dos', 10)).toBeCloseTo(15.9, 10);
  });

  it('dos only at qty 10 = 10.80', () => {
    expect(placementZonesPriceHT('dos', 10)).toBe(10.8);
  });

  it('coeur only at qty 10 = 5.10', () => {
    expect(placementZonesPriceHT('coeur', 10)).toBe(5.1);
  });

  it('coeur-dos-manche-dr-ga at qty 10 = 5.10+10.80+5.10+5.10 = 26.10', () => {
    expect(placementZonesPriceHT('coeur-dos-manche-dr-ga', 10)).toBeCloseTo(26.1, 10);
  });

  it('t-shirt-seul = 0 (at any qty)', () => {
    expect(placementZonesPriceHT('t-shirt-seul', 1)).toBe(0);
    expect(placementZonesPriceHT('t-shirt-seul', 100)).toBe(0);
  });

  it('poitrine-dos at qty 10 = 5.50 + 10.80 = 16.30', () => {
    expect(placementZonesPriceHT('poitrine-dos', 10)).toBeCloseTo(16.3, 10);
  });

  it('throws on unknown placement (defensive)', () => {
    expect(() => placementZonesPriceHT('bogus-placement', 10)).toThrow(/Unknown placement/);
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

describe('roundUp10Cents', () => {
  it('rounds 7.7355 up to 7.80', () => {
    expect(roundUp10Cents(7.7355)).toBe(7.8);
  });

  it('keeps exact 0.10 multiples', () => {
    expect(roundUp10Cents(5.2)).toBe(5.2);
  });

  it('rounds 5.913 up to 6.00 (patron grid h001 @ qty 70)', () => {
    expect(roundUp10Cents(5.913)).toBe(6.0);
  });
});

describe('viergePriceHT', () => {
  // Reference values from the patron's h001 sheet (priceAchat = 4.05€).
  it.each([
    [1, 3.8, 15.4],
    [5, 2.09, 8.5],
    [10, 1.91, 7.8],
    [20, 1.82, 7.4],
    [30, 1.73, 7.1],
    [40, 1.64, 6.7],
    [50, 1.55, 6.3],
    [60, 1.5, 6.1],
    [70, 1.46, 6.0],
    [80, 1.37, 5.6],
    [90, 1.32, 5.4],
    [100, 1.27, 5.2],
  ])('h001 at qty %i (coef %f) → vierge %f €', (_qty, coef, expected) => {
    expect(viergePriceHT(4.05, coef)).toBe(expected);
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

describe('unitPriceHT (patron grid h001, code=0 baseline)', () => {
  // PU HT = vierge + Σ zoneSalePrice[qty]. h001 priceAchat = 4.05.
  it('coeur+dos at qty 10 = 7.80 + 5.10 + 10.80 = 23.70', () => {
    const u = unitPriceHT({ productRef: 'H-001', placementId: 'coeur-dos', qty: 10, code: 0 });
    expect(round2(u)).toBe(23.7);
  });

  it('coeur+dos at qty 1 = 15.40 + 9.50 + 16.20 = 41.10', () => {
    const u = unitPriceHT({ productRef: 'H-001', placementId: 'coeur-dos', qty: 1, code: 0 });
    expect(round2(u)).toBe(41.1);
  });

  it('coeur+dos at qty 70 = 6.00 + 3.40 + 6.80 = 16.20', () => {
    const u = unitPriceHT({ productRef: 'H-001', placementId: 'coeur-dos', qty: 70, code: 0 });
    expect(round2(u)).toBe(16.2);
  });

  it('coeur+dos at qty 100 = 5.20 + 3.00 + 5.90 = 14.10', () => {
    const u = unitPriceHT({ productRef: 'H-001', placementId: 'coeur-dos', qty: 100, code: 0 });
    expect(round2(u)).toBe(14.1);
  });

  it('dos only at qty 10 = 7.80 + 10.80 = 18.60', () => {
    const u = unitPriceHT({ productRef: 'H-001', placementId: 'dos', qty: 10, code: 0 });
    expect(round2(u)).toBe(18.6);
  });

  it('coeur only at qty 10 = 7.80 + 5.10 = 12.90', () => {
    const u = unitPriceHT({ productRef: 'H-001', placementId: 'coeur', qty: 10, code: 0 });
    expect(round2(u)).toBe(12.9);
  });

  it('coeur+dos+manche at qty 10 = 7.80 + 5.10 + 10.80 + 5.10 = 28.80', () => {
    const u = unitPriceHT({
      productRef: 'H-001',
      placementId: 'coeur-dos-manche-dr',
      qty: 10,
      code: 0,
    });
    expect(round2(u)).toBe(28.8);
  });

  it('t-shirt-seul has zero zone price (= vierge)', () => {
    const u = unitPriceHT({ productRef: 'H-001', placementId: 't-shirt-seul', qty: 1, code: 0 });
    // vierge h001 @ qty 1 = ceil(4.05 × 3.8 × 10)/10 = 15.40
    expect(round2(u)).toBe(15.4);
  });

  it('throws on unknown product', () => {
    expect(() =>
      unitPriceHT({ productRef: 'XXX-999', placementId: 'dos', qty: 1, code: 0 }),
    ).toThrow(/Unknown product/);
  });
});

describe('unitPriceHT — CODE multi-couleurs surcharge (patron grid h001)', () => {
  // From the patron's "PRIX + CODE" column with CODE=10 (=+10%).
  // surcharge = ceil(base × code/100 × 10) / 10.
  it.each([
    [1, 45.3],
    [5, 29.7],
    [10, 26.1],
    [20, 23.6],
    [30, 21.3],
    [40, 20.1],
    [50, 19.0],
    [60, 18.3],
    [70, 17.9],
    [80, 16.9],
    [90, 16.2],
    [100, 15.6],
    [150, 15.1],
  ])('h001 coeur+dos @ qty %i with code=10 → %f €', (qty, expected) => {
    const u = unitPriceHT({ productRef: 'H-001', placementId: 'coeur-dos', qty, code: 10 });
    expect(round2(u)).toBe(expected);
  });

  it('coeur seul @ qty 10 with code=20 = 12.90 + ceil(12.90×0.20)/0.10 = 12.90 + 2.60 = 15.50', () => {
    const u = unitPriceHT({ productRef: 'H-001', placementId: 'coeur', qty: 10, code: 20 });
    expect(round2(u)).toBe(15.5);
  });

  it('coeur+dos+manche @ qty 10 with code=8 = 28.80 + ceil(28.80×0.08)/0.10 = 28.80 + 2.40 = 31.20', () => {
    const u = unitPriceHT({
      productRef: 'H-001',
      placementId: 'coeur-dos-manche-dr',
      qty: 10,
      code: 8,
    });
    expect(round2(u)).toBe(31.2);
  });

  it('defaults to code=10 when omitted', () => {
    const u = unitPriceHT({ productRef: 'H-001', placementId: 'coeur-dos', qty: 10 });
    expect(round2(u)).toBe(26.1);
  });

  it('code=0 disables the surcharge', () => {
    const u = unitPriceHT({ productRef: 'H-001', placementId: 'coeur-dos', qty: 10, code: 0 });
    expect(round2(u)).toBe(23.7);
  });
});

describe('lineSubtotalHT', () => {
  it('80 pcs × H-001 coeur-dos × code=0 = 80 × 15.30 = 1224', () => {
    // h001 @ qty 80: vierge = ceil(4.05 × 1.37 × 10)/10 = 5.60
    // coeur+dos @ qty 80 = 3.20 + 6.50 = 9.70. PU base = 15.30. × 80 = 1224
    const total = lineSubtotalHT({
      productRef: 'H-001',
      placementId: 'coeur-dos',
      sizes: sizes({ m: 40, l: 40 }),
      code: 0,
    });
    expect(round2(total)).toBe(1224);
  });

  it('80 pcs × H-001 coeur-dos × default code (10%) = 80 × 16.90 = 1352', () => {
    // PU base 15.30 + ceil(15.30×0.10×10)/10 = 15.30 + 1.60 = 16.90. × 80 = 1352
    const total = lineSubtotalHT({
      productRef: 'H-001',
      placementId: 'coeur-dos',
      sizes: sizes({ m: 40, l: 40 }),
    });
    expect(round2(total)).toBe(1352);
  });

  it('0 pieces yields 0', () => {
    const total = lineSubtotalHT({
      productRef: 'H-001',
      placementId: 'dos',
      sizes: emptySizes,
      code: 0,
    });
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
          code: 0,
        },
      ],
      transport: 'chronopost',
      revente: false,
    });
    expect(r.qtyTotal).toBe(80);
    expect(r.coef).toBe(1.37);
    expect(r.subtotalHT).toBe(1224); // 80 × 15.30
    expect(r.transportHT).toBe(120.0); // 80 × 1.50
    expect(r.tgcaHT).toBe(53.76); // (1224 + 120) × 0.04
    expect(r.totalHT).toBe(1397.76);
  });

  it('default code=10% adds the multi-couleurs surcharge to the subtotal', () => {
    const r = quoteTotals({
      lines: [
        {
          productRef: 'H-001',
          placementId: 'coeur-dos',
          sizes: sizes({ m: 40, l: 40 }),
          // code omitted → defaults to 10
        },
      ],
      transport: 'chronopost',
      revente: true,
    });
    // PU = 16.90, subtotal = 1352, transport = 120, total = 1472
    expect(r.subtotalHT).toBe(1352);
    expect(r.totalHT).toBe(1472);
  });

  it('exempts TGCA when revente=true', () => {
    const r = quoteTotals({
      lines: [
        {
          productRef: 'H-001',
          placementId: 'coeur-dos',
          sizes: sizes({ m: 40, l: 40 }),
          code: 0,
        },
      ],
      transport: 'chronopost',
      revente: true,
    });
    expect(r.tgcaHT).toBe(0);
    expect(r.totalHT).toBe(1344); // 1224 + 120
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

  it('prices each line on its own qty — adding a line never moves another', () => {
    const lineA = {
      productRef: 'H-001',
      placementId: 'coeur-dos',
      sizes: sizes({ m: 40 }),
      code: 0,
    };
    const lineB = {
      productRef: 'H-001',
      placementId: 'coeur-dos',
      sizes: sizes({ m: 40 }),
      code: 0,
    };
    const aAlone = quoteTotals({ lines: [lineA], transport: 'maritime', revente: true });
    const aPlusB = quoteTotals({ lines: [lineA, lineB], transport: 'maritime', revente: true });
    // Line A is priced on its own 40 pcs (tier 40), not the 80-pc quote total.
    expect(aAlone.subtotalHT).toBe(round2(lineSubtotalHT(lineA)));
    // Adding line B leaves line A's contribution untouched (pure addition).
    expect(aPlusB.subtotalHT).toBe(round2(lineSubtotalHT(lineA) + lineSubtotalHT(lineB)));
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

  it('qty 1 single piece honors qty=1 tier (patron grid)', () => {
    // h001 @ qty 1: vierge = ceil(4.05 × 3.8 × 10)/10 = 15.40
    // dos @ qty 1 = 16.20.  PU base = 31.60
    const r = quoteTotals({
      lines: [{ productRef: 'H-001', placementId: 'dos', sizes: sizes({ m: 1 }), code: 0 }],
      transport: 'maritime',
      revente: true,
    });
    expect(r.qtyTotal).toBe(1);
    expect(r.coef).toBe(3.8);
    expect(r.subtotalHT).toBe(31.6);
  });

  it('qty 150+ stays on 150 tier (1.27 coef, lowest zone prices)', () => {
    const r = quoteTotals({
      lines: [{ productRef: 'H-001', placementId: 'dos', sizes: sizes({ m: 200 }), code: 0 }],
      transport: 'maritime',
      revente: true,
    });
    expect(r.coef).toBe(1.27);
    // h001 vierge @ 1.27 = ceil(4.05 × 1.27 × 10)/10 = ceil(51.435)/10 = 5.20
    // dos @ qty 200 → tier 150 = 5.70.  PU = 10.90. × 200 = 2180.
    expect(r.subtotalHT).toBe(2180);
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
});

describe('quoteTotals — per-line transport + revente overrides', () => {
  it('mixed revente: only end-use line pays TGCA', () => {
    // Each line is priced on its OWN qty (5 pcs → tier 5), not the quote total.
    // PU @ qty 5, code 0 = 8.50 + 6.40 + 12.10 = 27.00. Each line × 5 = 135 → subtotal 270.
    // transport: chronopost 1.50 × 10 = 15 (7.50 per line).
    // line A revente → TGCA 0.
    // line B revente=false → (135 + 7.50) × 0.04 = 142.50 × 0.04 = 5.70.
    const r = quoteTotals({
      lines: [
        {
          productRef: 'H-001',
          placementId: 'coeur-dos',
          sizes: sizes({ m: 5 }),
          code: 0,
          revente: true,
        },
        {
          productRef: 'H-001',
          placementId: 'coeur-dos',
          sizes: sizes({ m: 5 }),
          code: 0,
          revente: false,
        },
      ],
      transport: 'chronopost',
      revente: false,
    });
    expect(r.qtyTotal).toBe(10);
    expect(r.subtotalHT).toBe(270);
    expect(r.transportHT).toBe(15);
    expect(r.tgcaHT).toBe(5.7);
    expect(r.totalHT).toBe(290.7);
  });

  it('mixed transport: only chronopost line pays shipping', () => {
    const r = quoteTotals({
      lines: [
        {
          productRef: 'H-001',
          placementId: 'coeur-dos',
          sizes: sizes({ m: 5 }),
          code: 0,
          transport: 'chronopost',
          revente: true,
        },
        {
          productRef: 'H-001',
          placementId: 'coeur-dos',
          sizes: sizes({ m: 5 }),
          code: 0,
          transport: 'maritime',
          revente: true,
        },
      ],
      transport: 'maritime',
      revente: true,
    });
    // chronopost line transport = 1.50 × 5 = 7.50, maritime = 0
    expect(r.transportHT).toBe(7.5);
    expect(r.tgcaHT).toBe(0);
  });

  it('line override wins over quote-level revente', () => {
    // Quote-level revente=false would charge TGCA, but the line opts out.
    const r = quoteTotals({
      lines: [
        {
          productRef: 'H-001',
          placementId: 'coeur-dos',
          sizes: sizes({ m: 5 }),
          code: 0,
          revente: true,
        },
      ],
      transport: 'maritime',
      revente: false,
    });
    expect(r.tgcaHT).toBe(0);
  });

  it('falls back to quote-level when line override is undefined', () => {
    // No per-line override: behaves like the legacy quote-level behavior.
    const r = quoteTotals({
      lines: [
        {
          productRef: 'H-001',
          placementId: 'coeur-dos',
          sizes: sizes({ m: 5 }),
          code: 0,
        },
      ],
      transport: 'chronopost',
      revente: false,
    });
    // PU @ qty 5, code 0 = 8.50 + 6.40 + 12.10 = 27. × 5 = 135.
    // transport 1.50 × 5 = 7.50. (135+7.50) × 0.04 = 5.70. total 148.20.
    expect(r.subtotalHT).toBe(135);
    expect(r.transportHT).toBe(7.5);
    expect(r.tgcaHT).toBe(5.7);
    expect(r.totalHT).toBe(148.2);
  });
});

describe('quoteTotals — prix Chronopost par référence', () => {
  // Injecte un catalogue par défaut où une réf porte un chronopostPrice donné.
  function withChronopostPrice(ref: string, price: number | null): void {
    const snap = defaultCatalogSnapshot();
    const p = snap.products.find((x) => x.ref === ref);
    if (!p) throw new Error(`setup test : réf ${ref} introuvable`);
    p.chronopostPrice = price;
    useCatalogStore.getState().setSnapshot(snap, { loaded: true });
  }

  afterEach(() => {
    // Restaure le catalogue par défaut pour ne pas contaminer les autres suites.
    useCatalogStore.getState().setSnapshot(defaultCatalogSnapshot(), { loaded: false });
  });

  const oneLine = (extra?: { transport?: 'maritime' | 'chronopost' | 'stock' }) => ({
    lines: [
      {
        productRef: 'H-001',
        placementId: 'coeur-dos',
        sizes: sizes({ m: 5 }),
        code: 0,
        ...(extra?.transport ? { transport: extra.transport } : {}),
      },
    ],
    revente: true as const,
  });

  it('utilise le prix Chronopost de la référence quand il est renseigné', () => {
    withChronopostPrice('H-001', 3);
    const r = quoteTotals({ ...oneLine(), transport: 'chronopost' });
    expect(r.subtotalHT).toBe(135); // PU base 27,00 × 5
    expect(r.transportHT).toBe(15); // 3,00 × 5 (et non 1,50 × 5)
    expect(r.totalHT).toBe(150);
  });

  it('chronopostPrice 0 ⇒ livraison Chronopost offerte pour la réf', () => {
    withChronopostPrice('H-001', 0);
    const r = quoteTotals({ ...oneLine(), transport: 'chronopost' });
    expect(r.transportHT).toBe(0);
    expect(r.totalHT).toBe(135);
  });

  it('null ⇒ tarif Chronopost global (1,50 €/pièce)', () => {
    withChronopostPrice('H-001', null);
    const r = quoteTotals({ ...oneLine(), transport: 'chronopost' });
    expect(r.transportHT).toBe(7.5); // 1,50 × 5
  });

  it('ignoré pour une ligne Maritime / Stock', () => {
    withChronopostPrice('H-001', 3);
    expect(quoteTotals({ ...oneLine(), transport: 'maritime' }).transportHT).toBe(0);
    expect(quoteTotals({ ...oneLine(), transport: 'stock' }).transportHT).toBe(0);
  });

  it('mélange une réf avec override et une réf sans', () => {
    withChronopostPrice('H-001', 3); // F-003 reste à null
    const r = quoteTotals({
      lines: [
        { productRef: 'H-001', placementId: 'coeur-dos', sizes: sizes({ m: 5 }), code: 0 },
        { productRef: 'F-003', placementId: 'coeur-dos', sizes: sizes({ m: 5 }), code: 0 },
      ],
      transport: 'chronopost',
      revente: true,
    });
    expect(r.transportHT).toBe(22.5); // 3×5 + 1,50×5
  });

  it("s'applique aussi via un override de mode chronopost par ligne", () => {
    withChronopostPrice('H-001', 3);
    const r = quoteTotals({ ...oneLine({ transport: 'chronopost' }), transport: 'maritime' });
    expect(r.transportHT).toBe(15);
  });

  it('lineTotals respecte le prix Chronopost de la référence', () => {
    withChronopostPrice('H-001', 3);
    const t = lineTotals(
      { productRef: 'H-001', placementId: 'coeur-dos', sizes: sizes({ m: 5 }), code: 0 },
      'chronopost',
      true,
    );
    expect(t.htWithTransport).toBe(150); // 135 + 3×5
  });

  it('ligne libre (hors catalogue) ⇒ tarif Chronopost global', () => {
    withChronopostPrice('H-001', 3); // override sur une AUTRE réf
    const r = quoteTotals({
      lines: [
        {
          productRef: 'CUSTOM',
          placementId: 'coeur-dos',
          sizes: sizes({ m: 5 }),
          code: 0,
          custom: { name: 'Produit libre', priceAchat: 4.05 },
        },
      ],
      transport: 'chronopost',
      revente: true,
    });
    expect(r.transportHT).toBe(7.5); // 1,50 × 5 — CUSTOM n'a pas d'override
  });
});
