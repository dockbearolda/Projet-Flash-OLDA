/** Relative luminance of a #RRGGBB color (sRGB, 0..1). */
export function luminance(hex: string): number {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex);
  if (!m) return 0.5;
  const raw = m[1];
  if (!raw) return 0.5;
  const r = parseInt(raw.slice(0, 2), 16) / 255;
  const g = parseInt(raw.slice(2, 4), 16) / 255;
  const b = parseInt(raw.slice(4, 6), 16) / 255;
  const linearize = (c: number) => (c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4));
  return 0.2126 * linearize(r) + 0.7152 * linearize(g) + 0.0722 * linearize(b);
}

/** Returns 'light' or 'dark' label for the foreground ink on this background. */
export function inkOn(hex: string): 'light' | 'dark' {
  return luminance(hex) > 0.55 ? 'dark' : 'light';
}
