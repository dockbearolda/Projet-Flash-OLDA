export interface TextileColor {
  id: string;
  name: string;
  hex: string;
  best: boolean;
}

export const TEXTILE_COLORS: readonly TextileColor[] = [
  { id: 'blanc', name: 'Blanc', hex: '#f5f3ee', best: true },
  { id: 'beige', name: 'Beige', hex: '#d8c6a4', best: true },
  { id: 'vert-pastel', name: 'Vert pastel', hex: '#bcd4b3', best: true },
  { id: 'noir', name: 'Noir', hex: '#15161a', best: true },
  { id: 'menthe', name: 'Menthe', hex: '#a8d6c4', best: true },
  { id: 'bleu-clair', name: 'Bleu clair', hex: '#9cc6e0', best: true },
  { id: 'bleu-royal', name: 'Bleu royal', hex: '#1f3aa8', best: true },
  { id: 'bleu-marine', name: 'Bleu marine', hex: '#14213d', best: true },
  { id: 'lavande', name: 'Lavande', hex: '#c4b3df', best: false },
  { id: 'rose-bebe', name: 'Rose bébé', hex: '#f3c0cd', best: false },
  { id: 'corail', name: 'Corail', hex: '#ec6c54', best: false },
  { id: 'marron', name: 'Marron', hex: '#5b3b22', best: false },
  { id: 'orange', name: 'Orange', hex: '#ff8e3c', best: false },
  { id: 'rouge', name: 'Rouge', hex: '#c8261c', best: false },
  { id: 'kaki', name: 'Kaki', hex: '#787a44', best: false },
  { id: 'vert', name: 'Vert', hex: '#2c6041', best: false },
  { id: 'jaune', name: 'Jaune', hex: '#f1c63a', best: false },
] as const;

export type TextileColorId = (typeof TEXTILE_COLORS)[number]['id'];

export const TEXTILE_COLOR_BY_ID: Readonly<Record<TextileColorId, TextileColor>> =
  Object.fromEntries(TEXTILE_COLORS.map((c) => [c.id, c]));

export interface FlockColor {
  id: string;
  name: string;
  hex: string | null;
  special?: boolean;
}

export const FLOCK_COLORS: readonly FlockColor[] = [
  { id: 'multi', name: 'Multi couleurs', hex: null, special: true },
  { id: 'blanc', name: 'Blanc', hex: '#f5f3ee' },
  { id: 'noir', name: 'Noir', hex: '#15161a' },
  { id: 'or', name: 'Or', hex: '#c9a961' },
  { id: 'argent', name: 'Argent', hex: '#b8bcc4' },
  { id: 'rouge', name: 'Rouge', hex: '#c8261c' },
  { id: 'bleu', name: 'Bleu', hex: '#1f3aa8' },
  { id: 'vert', name: 'Vert', hex: '#2c6041' },
  { id: 'jaune', name: 'Jaune', hex: '#f1c63a' },
  { id: 'rose', name: 'Rose', hex: '#f3c0cd' },
] as const;

export type FlockColorId = (typeof FLOCK_COLORS)[number]['id'];

export const FLOCK_COLOR_BY_ID: Readonly<Record<FlockColorId, FlockColor>> = Object.fromEntries(
  FLOCK_COLORS.map((c) => [c.id, c]),
);
