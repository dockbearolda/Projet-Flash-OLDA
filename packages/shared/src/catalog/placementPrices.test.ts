import { describe, it, expect } from 'vitest';
import { placementSalePricesFromZones } from './index.js';
import type { CatalogSalePrices } from './index.js';

const zone = (id: string, salePrices: CatalogSalePrices) => ({ id, label: id, salePrices });

describe('placementSalePricesFromZones', () => {
  const coeur = zone('coeur', [
    [1, 9.5],
    [10, 5.1],
  ]);
  const dos = zone('dos', [
    [1, 16.2],
    [10, 10.8],
  ]);
  const zones = [coeur, dos];
  const seuils = [1, 10];

  it('somme les prix des zones du placement, palier par palier', () => {
    // coeur + dos : 9.5+16.2=25.7 ; 5.1+10.8=15.9
    expect(placementSalePricesFromZones(['coeur', 'dos'], zones, seuils)).toEqual([
      [1, 25.7],
      [10, 15.9],
    ]);
  });

  it('une seule zone ⇒ son prix tel quel', () => {
    expect(placementSalePricesFromZones(['dos'], zones, seuils)).toEqual([
      [1, 16.2],
      [10, 10.8],
    ]);
  });

  it('aucune zone (sans impression) ⇒ 0 à chaque palier', () => {
    expect(placementSalePricesFromZones([], zones, seuils)).toEqual([
      [1, 0],
      [10, 0],
    ]);
  });

  it('ignore les ids de zone inconnus (comptés 0)', () => {
    expect(placementSalePricesFromZones(['dos', 'inconnue'], zones, seuils)).toEqual([
      [1, 16.2],
      [10, 10.8],
    ]);
  });
});
