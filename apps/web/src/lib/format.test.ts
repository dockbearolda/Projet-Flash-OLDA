import { describe, it, expect } from 'vitest';
import { capitalizeWords } from './format';

describe('capitalizeWords', () => {
  it('met une majuscule à chaque mot', () => {
    expect(capitalizeWords('jean dupont')).toBe('Jean Dupont');
    expect(capitalizeWords('olda sxm')).toBe('Olda Sxm');
  });

  it('capitalise après un tiret (noms composés)', () => {
    expect(capitalizeWords('marie-claire')).toBe('Marie-Claire');
  });

  it('gère les accents', () => {
    expect(capitalizeWords('éric')).toBe('Éric');
  });

  it('préserve les capitales déjà saisies (sigles)', () => {
    expect(capitalizeWords('OLDA')).toBe('OLDA');
    expect(capitalizeWords('jean DUPONT')).toBe('Jean DUPONT');
  });

  it('renvoie une chaîne vide telle quelle', () => {
    expect(capitalizeWords('')).toBe('');
  });
});
