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
    expect(groups.map((g) => g.family.id)).toEqual(['unisexe', '']);
    expect(groups[1]!.family.label).toBe('Autres');
    expect(groups[1]!.items.map((p) => p.ref)).toEqual(['X']);
  });

  it("ne collisionne pas si une famille a l'id « _autres »", () => {
    const groups = groupProductsByFamily(
      [prod('X', 'inconnue'), prod('A', '_autres')],
      [fam('_autres', 'Autres utilisateur')],
    );
    // La vraie famille « _autres » reçoit A ; le produit orphelin X va dans un
    // groupe de repli distinct (id différent) — pas de doublon, pas de mélange.
    expect(groups).toHaveLength(2);
    expect(groups[0]!.family.id).toBe('_autres');
    expect(groups[0]!.items.map((p) => p.ref)).toEqual(['A']);
    expect(groups[1]!.items.map((p) => p.ref)).toEqual(['X']);
    expect(groups[1]!.family.id).not.toBe('_autres');
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
