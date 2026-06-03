import { describe, it, expect } from 'vitest';
import { degressivePricesFromUnit } from './index.js';
import type { CatalogSalePrices } from './index.js';

const zone = (salePrices: CatalogSalePrices) => ({ salePrices });

describe('degressivePricesFromUnit', () => {
  it('applique la courbe d’une zone de référence au prix unité', () => {
    // ratios de la réf : 1, 0.5, 0.2 → prix unité 20 ⇒ 20, 10, 4
    const ref = zone([
      [1, 10],
      [10, 5],
      [100, 2],
    ]);
    expect(degressivePricesFromUnit(20, [1, 10, 100], [ref])).toEqual([20, 10, 4]);
  });

  it('fait la moyenne des courbes de plusieurs zones de référence', () => {
    const a = zone([
      [1, 10],
      [10, 4],
    ]); // ratio@10 = 0.4
    const b = zone([
      [1, 10],
      [10, 6],
    ]); // ratio@10 = 0.6
    // moyenne ratio@10 = 0.5 → unité 20 ⇒ 10
    expect(degressivePricesFromUnit(20, [1, 10], [a, b])).toEqual([20, 10]);
  });

  it('arrondit à 0,10 €', () => {
    const ref = zone([
      [1, 9.5],
      [10, 5.1],
    ]); // ratio@10 = 0.5368…
    // 8 × 0.5368 = 4.294… → 4,3
    expect(degressivePricesFromUnit(8, [1, 10], [ref])).toEqual([8, 4.3]);
  });

  it('ignore les zones de référence sans prix unité (>0)', () => {
    const real = zone([
      [1, 10],
      [10, 5],
    ]);
    const empty = zone([
      [1, 0],
      [10, 0],
    ]);
    expect(degressivePricesFromUnit(20, [1, 10], [real, empty])).toEqual([20, 10]);
  });

  it('sans référence exploitable : prix unité à plat', () => {
    expect(degressivePricesFromUnit(8, [1, 10, 50], [])).toEqual([8, 8, 8]);
  });

  it('prix unité 0 ⇒ tout à 0', () => {
    const ref = zone([
      [1, 10],
      [10, 5],
    ]);
    expect(degressivePricesFromUnit(0, [1, 10], [ref])).toEqual([0, 0]);
  });
});
