import { describe, it, expect } from 'vitest';
import { unifiedSeuils, normalizeZonesToSharedSeuils, zoneSalePriceForQtyFrom } from './index.js';
import type { CatalogSalePrices } from './index.js';

const zone = (id: string, salePrices: CatalogSalePrices) => ({ id, label: id, salePrices });

describe('unifiedSeuils', () => {
  it('fusionne les seuils de toutes les zones, triés et dédupliqués', () => {
    const zones = [
      zone('a', [
        [1, 9],
        [10, 5],
      ]),
      zone('b', [
        [1, 4],
        [5, 3],
        [10, 2],
      ]),
      zone('c', [[50, 1]]),
    ];
    expect(unifiedSeuils(zones)).toEqual([1, 5, 10, 50]);
  });

  it('renvoie [] pour aucune zone', () => {
    expect(unifiedSeuils([])).toEqual([]);
  });
});

describe('normalizeZonesToSharedSeuils', () => {
  // Reproduit l'écran admin : « Manche GA » a l'échelle complète, « xxxtest »
  // n'a que 1 / 50 / 100. Après fusion, les deux partagent la MÊME échelle.
  const mancheGA = zone('manche-g', [
    [1, 9.5],
    [10, 5.1],
    [50, 3.6],
    [100, 3],
  ]);
  const xxxtest = zone('xxxtest', [
    [1, 50],
    [50, 100],
    [100, 1500],
  ]);
  const zones = [mancheGA, xxxtest];

  it('aligne toutes les zones sur les mêmes seuils (l’union)', () => {
    const out = normalizeZonesToSharedSeuils(zones);
    const seuils = unifiedSeuils(zones); // [1, 10, 50, 100]
    for (const z of out) {
      expect(z.salePrices.map(([s]) => s)).toEqual(seuils);
    }
  });

  it('ne change AUCUN prix effectif (report du palier inférieur)', () => {
    const out = normalizeZonesToSharedSeuils(zones);
    const quantities = [1, 2, 9, 10, 25, 49, 50, 99, 100, 250];
    for (let i = 0; i < zones.length; i++) {
      for (const q of quantities) {
        expect(zoneSalePriceForQtyFrom(out[i]!.salePrices, q)).toBe(
          zoneSalePriceForQtyFrom(zones[i]!.salePrices, q),
        );
      }
    }
  });

  it('préserve id et label de chaque zone', () => {
    const out = normalizeZonesToSharedSeuils(zones);
    expect(out.map((z) => z.id)).toEqual(['manche-g', 'xxxtest']);
    expect(out.map((z) => z.label)).toEqual(['manche-g', 'xxxtest']);
  });
});
