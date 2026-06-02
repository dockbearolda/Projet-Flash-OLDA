import { describe, it, expect } from 'vitest';
import { groupProductsByFamily, defaultCatalogSnapshot } from './snapshot.js';
import type { CatalogFamily, CatalogProduct } from './snapshot.js';

const fam = (id: string, label: string): CatalogFamily => ({ id, label });
const prod = (ref: string, family: string): CatalogProduct => ({
  ref,
  supplierRef: '',
  name: ref,
  family,
  priceAchat: 1,
  sizes: [],
  colorIds: [],
  bestColorIds: [],
  chronopostPrice: null,
});

describe('groupProductsByFamily', () => {
  it("groupe dans l'ordre des familles", () => {
    const groups = groupProductsByFamily(
      [prod('B', 'femme'), prod('A', 'unisexe')],
      [fam('unisexe', 'Homme'), fam('femme', 'Femme')],
    );
    expect(groups.map((g) => g.family.id)).toEqual(['unisexe', 'femme']);
  });

  it('trie les items par ref (numérique)', () => {
    const groups = groupProductsByFamily(
      [prod('H-10', 'unisexe'), prod('H-2', 'unisexe')],
      [fam('unisexe', 'Homme')],
    );
    expect(groups[0]!.items.map((p) => p.ref)).toEqual(['H-2', 'H-10']);
  });

  it('place une famille inconnue dans « Autres » en dernier', () => {
    const groups = groupProductsByFamily(
      [prod('X', 'casquette'), prod('A', 'unisexe')],
      [fam('unisexe', 'Homme')],
    );
    expect(groups.map((g) => g.family.id)).toEqual(['unisexe', '_autres']);
    expect(groups[1]!.items.map((p) => p.ref)).toEqual(['X']);
  });

  it('inclut une famille vide (groupe sans items)', () => {
    const groups = groupProductsByFamily([], [fam('unisexe', 'Homme')]);
    expect(groups).toHaveLength(1);
    expect(groups[0]!.items).toEqual([]);
  });
});

describe('defaultCatalogSnapshot — families', () => {
  it("sème les 3 familles par défaut dans l'ordre", () => {
    expect(defaultCatalogSnapshot().families).toEqual([
      { id: 'unisexe', label: 'Homme' },
      { id: 'femme', label: 'Femme' },
      { id: 'enfant', label: 'Enfant' },
    ]);
  });
});
