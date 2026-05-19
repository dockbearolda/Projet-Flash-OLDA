import { describe, it, expect } from 'vitest';
import {
  ZONES,
  ZONE_IDS,
  PLACEMENTS,
  PLACEMENT_BY_ID,
  COEFS,
  TEXTILE_COLORS,
  FLOCK_COLORS,
  PRODUCTS,
  PRODUCT_BY_REF,
  TRANSPORT_OPTIONS,
  TGCA_RATE,
  SIZE_KEYS,
  zoneSalePriceForQty,
} from './index.js';

describe('ZONES', () => {
  it('has the 5 print zones', () => {
    expect(ZONE_IDS).toHaveLength(5);
    expect(ZONE_IDS).toEqual(
      expect.arrayContaining(['coeur', 'dos', 'poitrine', 'manche-d', 'manche-g']),
    );
  });

  it('matches the patron grid at qty 10', () => {
    expect(zoneSalePriceForQty('coeur', 10)).toBe(5.1);
    expect(zoneSalePriceForQty('dos', 10)).toBe(10.8);
    expect(zoneSalePriceForQty('poitrine', 10)).toBe(5.5);
    expect(zoneSalePriceForQty('manche-d', 10)).toBe(5.1);
    expect(zoneSalePriceForQty('manche-g', 10)).toBe(5.1);
  });

  it('matches the patron grid at qty 1', () => {
    expect(zoneSalePriceForQty('coeur', 1)).toBe(9.5);
    expect(zoneSalePriceForQty('dos', 1)).toBe(16.2);
    expect(zoneSalePriceForQty('poitrine', 1)).toBe(10.3);
  });

  it('1 manche has the same grid as coeur', () => {
    for (const [threshold] of COEFS) {
      expect(zoneSalePriceForQty('manche-d', threshold)).toBe(
        zoneSalePriceForQty('coeur', threshold),
      );
      expect(zoneSalePriceForQty('manche-g', threshold)).toBe(
        zoneSalePriceForQty('coeur', threshold),
      );
    }
  });

  it('floors at 150+ tier', () => {
    expect(zoneSalePriceForQty('coeur', 999)).toBe(2.8);
    expect(zoneSalePriceForQty('dos', 999)).toBe(5.7);
  });

  it('all zones have positive prices at every tier', () => {
    for (const id of ZONE_IDS) {
      for (const [, price] of ZONES[id].salePrices) {
        expect(price).toBeGreaterThan(0);
      }
    }
  });
});

describe('PLACEMENTS', () => {
  it('has 9 placements per spec §6.3', () => {
    expect(PLACEMENTS).toHaveLength(9);
  });

  it('every placement references valid zones', () => {
    for (const p of PLACEMENTS) {
      for (const z of p.zones) {
        expect(ZONE_IDS).toContain(z);
      }
    }
  });

  it('t-shirt-seul has empty zones', () => {
    const seul = PLACEMENT_BY_ID['t-shirt-seul'];
    expect(seul.zones).toEqual([]);
  });

  it('coeur-dos combines exactly coeur + dos', () => {
    expect(PLACEMENT_BY_ID['coeur-dos'].zones).toEqual(['coeur', 'dos']);
  });

  it('quad placement has 4 zones', () => {
    expect(PLACEMENT_BY_ID['coeur-dos-manche-dr-ga'].zones).toEqual([
      'coeur',
      'dos',
      'manche-d',
      'manche-g',
    ]);
  });

  it('all placement ids are unique', () => {
    const ids = PLACEMENTS.map((p) => p.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});

describe('COEFS', () => {
  it('has 13 thresholds per spec §6.1', () => {
    expect(COEFS).toHaveLength(13);
  });

  it('starts at quantity 1 with coef 3.80', () => {
    expect(COEFS[0]).toEqual([1, 3.8]);
  });

  it('thresholds are strictly increasing', () => {
    for (let i = 1; i < COEFS.length; i++) {
      expect(COEFS[i]![0]).toBeGreaterThan(COEFS[i - 1]![0]);
    }
  });

  it('coefs are monotonically non-increasing', () => {
    for (let i = 1; i < COEFS.length; i++) {
      expect(COEFS[i]![1]).toBeLessThanOrEqual(COEFS[i - 1]![1]);
    }
  });

  it('100+ floor is 1.27', () => {
    expect(COEFS[COEFS.length - 1]![1]).toBe(1.27);
  });
});

describe('TEXTILE_COLORS', () => {
  it('has 17 colors per spec §9', () => {
    expect(TEXTILE_COLORS).toHaveLength(17);
  });

  it('has 8 best=true colors', () => {
    expect(TEXTILE_COLORS.filter((c) => c.best)).toHaveLength(8);
  });

  it('all hex are valid #RRGGBB', () => {
    for (const c of TEXTILE_COLORS) {
      expect(c.hex).toMatch(/^#[0-9a-f]{6}$/i);
    }
  });

  it('all ids are unique', () => {
    const ids = TEXTILE_COLORS.map((c) => c.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});

describe('FLOCK_COLORS', () => {
  it('has 10 entries per spec §10', () => {
    expect(FLOCK_COLORS).toHaveLength(10);
  });

  it('multi entry has hex=null and special=true', () => {
    const multi = FLOCK_COLORS[0]!;
    expect(multi.id).toBe('multi');
    expect(multi.hex).toBeNull();
    expect(multi.special).toBe(true);
  });

  it('non-multi colors have a valid hex', () => {
    for (const c of FLOCK_COLORS.filter((x) => x.id !== 'multi')) {
      expect(c.hex).toMatch(/^#[0-9a-f]{6}$/i);
    }
  });
});

describe('PRODUCTS', () => {
  it('has 23 products per spec §28', () => {
    expect(PRODUCTS).toHaveLength(23);
  });

  it('all have priceAchat > 0', () => {
    for (const p of PRODUCTS) {
      expect(p.priceAchat).toBeGreaterThan(0);
    }
  });

  it('all refs are unique', () => {
    const refs = PRODUCTS.map((p) => p.ref);
    expect(new Set(refs).size).toBe(refs.length);
  });

  it('has the three families', () => {
    const families = new Set(PRODUCTS.map((p) => p.family));
    expect(families).toEqual(new Set(['unisexe', 'femme', 'enfant']));
  });

  it('H-001 maps to NS300 (T-shirt léger Premium, 4.05€)', () => {
    const p = PRODUCT_BY_REF['H-001'];
    expect(p?.supplierRef).toBe('NS300');
    expect(p?.priceAchat).toBe(4.05);
  });
});

describe('TRANSPORT_OPTIONS', () => {
  it('has the three options §6.5', () => {
    expect(TRANSPORT_OPTIONS.map((t) => t.id)).toEqual(['maritime', 'chronopost', 'stock']);
  });

  it('only chronopost charges per piece (1.50€)', () => {
    expect(TRANSPORT_OPTIONS.find((t) => t.id === 'chronopost')!.surcharge).toBe(1.5);
    expect(TRANSPORT_OPTIONS.find((t) => t.id === 'maritime')!.surcharge).toBe(0);
    expect(TRANSPORT_OPTIONS.find((t) => t.id === 'stock')!.surcharge).toBe(0);
  });
});

describe('TGCA_RATE', () => {
  it('is 4% per spec §1', () => {
    expect(TGCA_RATE).toBe(0.04);
  });
});

describe('SIZE_KEYS', () => {
  it('has 7 sizes (XS..2XL + Autres)', () => {
    expect(SIZE_KEYS).toHaveLength(7);
    expect(SIZE_KEYS).toEqual(['xs', 's', 'm', 'l', 'xl', 'xxl', 'autres']);
  });
});
