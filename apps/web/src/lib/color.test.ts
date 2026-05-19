import { describe, it, expect } from 'vitest';
import { luminance, inkOn } from './color';

describe('luminance', () => {
  it('returns ~1 for white', () => {
    expect(luminance('#ffffff')).toBeGreaterThan(0.99);
  });

  it('returns 0 for pure black', () => {
    expect(luminance('#000000')).toBe(0);
  });

  it('returns mid value for grey', () => {
    const l = luminance('#808080');
    expect(l).toBeGreaterThan(0.2);
    expect(l).toBeLessThan(0.4);
  });

  it('handles # prefix optionally', () => {
    expect(luminance('ffffff')).toBeGreaterThan(0.99);
  });

  it('falls back to 0.5 for invalid', () => {
    expect(luminance('bogus')).toBe(0.5);
  });
});

describe('inkOn', () => {
  it('returns dark on light surfaces', () => {
    expect(inkOn('#ffffff')).toBe('dark');
    expect(inkOn('#f1c63a')).toBe('dark');
  });

  it('returns light on dark surfaces', () => {
    expect(inkOn('#000000')).toBe('light');
    expect(inkOn('#1f3aa8')).toBe('light');
  });
});
