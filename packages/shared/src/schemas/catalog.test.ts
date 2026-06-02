import { describe, it, expect } from 'vitest';
import { CatalogProductSchema } from './catalog.js';
import { defaultCatalogSnapshot } from '../catalog/snapshot.js';

const baseProduct = {
  ref: 'H-001',
  supplierRef: 'NS300',
  name: 'T-shirt léger Premium',
  family: 'unisexe',
  priceAchat: 4.05,
  sizes: [],
  colorIds: [],
  bestColorIds: [],
};

describe('CatalogProductSchema — chronopostPrice', () => {
  it('défaut null quand le champ est absent', () => {
    expect(CatalogProductSchema.parse(baseProduct).chronopostPrice).toBeNull();
  });

  it('conserve un prix numérique explicite', () => {
    expect(
      CatalogProductSchema.parse({ ...baseProduct, chronopostPrice: 2.5 }).chronopostPrice,
    ).toBe(2.5);
  });

  it('accepte 0 (Chronopost offert pour cette réf)', () => {
    expect(CatalogProductSchema.parse({ ...baseProduct, chronopostPrice: 0 }).chronopostPrice).toBe(
      0,
    );
  });

  it('accepte null explicite', () => {
    expect(
      CatalogProductSchema.parse({ ...baseProduct, chronopostPrice: null }).chronopostPrice,
    ).toBeNull();
  });

  it('refuse un prix négatif', () => {
    expect(() => CatalogProductSchema.parse({ ...baseProduct, chronopostPrice: -1 })).toThrow();
  });
});

describe('defaultCatalogSnapshot — chronopostPrice', () => {
  it('initialise chaque produit avec chronopostPrice null', () => {
    const snap = defaultCatalogSnapshot();
    expect(snap.products.length).toBeGreaterThan(0);
    for (const p of snap.products) expect(p.chronopostPrice).toBeNull();
  });
});
