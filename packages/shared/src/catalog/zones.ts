/**
 * Grille tarifaire par zone d'impression.
 * Pour chaque zone, le prix de vente est défini par palier de quantité
 * (lookup : on prend le prix du plus grand seuil ≤ qté totale du devis).
 *
 * Source : grille du patron (Google Sheet) — onglets "Calcul coeur",
 * "Calcul dos", etc. Manche = Cœur (grille identique). Poitrine a
 * sa propre grille (légèrement plus chère que cœur).
 */

export type ZoneSalePriceTable = readonly (readonly [number, number])[];

const COEUR_SALE_PRICES: ZoneSalePriceTable = [
  [1, 9.5],
  [5, 6.4],
  [10, 5.1],
  [20, 4.5],
  [30, 4.1],
  [40, 3.9],
  [50, 3.6],
  [60, 3.5],
  [70, 3.4],
  [80, 3.2],
  [90, 3.1],
  [100, 3.0],
  [150, 2.8],
];

const DOS_SALE_PRICES: ZoneSalePriceTable = [
  [1, 16.2],
  [5, 12.1],
  [10, 10.8],
  [20, 9.5],
  [30, 8.1],
  [40, 7.6],
  [50, 7.3],
  [60, 7.0],
  [70, 6.8],
  [80, 6.5],
  [90, 6.2],
  [100, 5.9],
  [150, 5.7],
];

const POITRINE_SALE_PRICES: ZoneSalePriceTable = [
  [1, 10.3],
  [5, 6.9],
  [10, 5.5],
  [20, 4.9],
  [30, 4.5],
  [40, 4.2],
  [50, 3.9],
  [60, 3.8],
  [70, 3.7],
  [80, 3.5],
  [90, 3.4],
  [100, 3.3],
  [150, 3.1],
];

export interface Zone {
  id: string;
  label: string;
  salePrices: ZoneSalePriceTable;
}

export const ZONES = {
  coeur: { id: 'coeur', label: 'Coeur', salePrices: COEUR_SALE_PRICES },
  dos: { id: 'dos', label: 'Dos', salePrices: DOS_SALE_PRICES },
  poitrine: { id: 'poitrine', label: 'Poitrine', salePrices: POITRINE_SALE_PRICES },
  'manche-d': { id: 'manche-d', label: 'Manche DR', salePrices: COEUR_SALE_PRICES },
  'manche-g': { id: 'manche-g', label: 'Manche GA', salePrices: COEUR_SALE_PRICES },
} as const satisfies Record<string, Zone>;

export type ZoneId = keyof typeof ZONES;

export const ZONE_IDS = Object.keys(ZONES) as readonly ZoneId[];

/**
 * Prix de vente d'une zone pour une quantité totale donnée.
 * Lookup sur le plus grand seuil ≤ qty (en dessous du 1er seuil → 1er prix).
 */
export function zoneSalePriceForQty(zoneId: ZoneId, qty: number): number {
  const table = ZONES[zoneId].salePrices;
  const first = table[0];
  if (!first) return 0;
  let last = first[1];
  for (const [threshold, price] of table) {
    if (qty >= threshold) {
      last = price;
    } else {
      return last;
    }
  }
  return last;
}
