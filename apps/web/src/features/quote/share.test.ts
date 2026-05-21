import { describe, it, expect } from 'vitest';
import { DIAL_OPTIONS, DEFAULT_DIAL, normalizePhone } from './share';

describe('DIAL_OPTIONS', () => {
  it('garde Saint-Martin +590 par défaut, avec +33 juste en dessous', () => {
    expect(DEFAULT_DIAL).toBe('590');
    expect(DIAL_OPTIONS[0].code).toBe('590');
    expect(DIAL_OPTIONS[1].code).toBe('33');
  });
});

describe('normalizePhone', () => {
  it('préfixe +590 (défaut) pour un numéro local Saint-Martin', () => {
    expect(normalizePhone('0690 12 34 56')).toBe('590690123456');
  });

  it('bascule un 06… français en +33 quand FR +33 est choisi', () => {
    expect(normalizePhone('06 12 34 56 78', '33')).toBe('33612345678');
  });

  it('préfixe +33 un numéro sans 0 initial', () => {
    expect(normalizePhone('612345678', '33')).toBe('33612345678');
  });

  it('respecte une forme internationale explicite', () => {
    expect(normalizePhone('+33 6 12 34 56 78')).toBe('33612345678');
    expect(normalizePhone('0033612345678')).toBe('33612345678');
  });

  it('ne double pas un indicatif déjà présent', () => {
    expect(normalizePhone('33612345678', '33')).toBe('33612345678');
  });

  it('renvoie une chaîne vide pour une saisie vide', () => {
    expect(normalizePhone('')).toBe('');
  });
});
