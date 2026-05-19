export const ZONES = {
  coeur: { id: 'coeur', label: 'Coeur', price: 2.5 },
  dos: { id: 'dos', label: 'Dos', price: 5.0 },
  poitrine: { id: 'poitrine', label: 'Poitrine', price: 3.2 },
  'manche-d': { id: 'manche-d', label: 'Manche DR', price: 1.5 },
  'manche-g': { id: 'manche-g', label: 'Manche GA', price: 1.5 },
} as const;

export type ZoneId = keyof typeof ZONES;

export const ZONE_IDS = Object.keys(ZONES) as readonly ZoneId[];
