import { describe, it, expect } from 'vitest';
import { placementsForFamily } from './index.js';

interface P {
  id: string;
  label: string;
  zones: string[];
  families: string[];
}

const make = (id: string, families: string[]): P => ({ id, label: id, zones: [], families });

describe('placementsForFamily', () => {
  const dosAdulte = make('dos', ['unisexe', 'femme']);
  const dosEnfant = make('dos-enfant', ['enfant']);
  const sacFaceA = make('sac-1-face-a', ['sac']);
  const universel = make('t-shirt-seul', []); // familles vide ⇒ toutes familles

  const all = [dosAdulte, dosEnfant, sacFaceA, universel];

  it('garde les placements dont la famille correspond au produit', () => {
    expect(placementsForFamily(all, 'enfant')).toEqual([dosEnfant, universel]);
  });

  it('traite une liste de familles vide comme « toutes familles »', () => {
    expect(placementsForFamily([universel], 'enfant')).toEqual([universel]);
    expect(placementsForFamily([universel], 'sac')).toEqual([universel]);
  });

  it('exclut les placements réservés à une autre famille', () => {
    const res = placementsForFamily(all, 'sac');
    expect(res).toEqual([sacFaceA, universel]);
    expect(res).not.toContain(dosAdulte);
  });

  it('renvoie tous les placements quand la famille est inconnue (ligne libre)', () => {
    expect(placementsForFamily(all, undefined)).toEqual(all);
    expect(placementsForFamily(all, '')).toEqual(all);
  });

  it('conserve l’ordre d’origine', () => {
    expect(placementsForFamily(all, 'unisexe')).toEqual([dosAdulte, universel]);
  });
});
