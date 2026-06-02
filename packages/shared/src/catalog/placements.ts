import type { ZoneId } from './zones.js';

export const PLACEMENTS = [
  {
    id: 'coeur-dos',
    label: 'Coeur + Dos',
    zones: ['coeur', 'dos'] as const,
  },
  {
    id: 'dos',
    label: 'Dos',
    zones: ['dos'] as const,
  },
  {
    id: 'coeur',
    label: 'Coeur',
    zones: ['coeur'] as const,
  },
  {
    id: 'coeur-dos-manche-dr-ga',
    label: 'Coeur + Dos + Manche DR + Manche GA',
    zones: ['coeur', 'dos', 'manche-d', 'manche-g'] as const,
  },
  {
    id: 'coeur-dos-manche-dr',
    label: 'Coeur + Dos + Manche DR',
    zones: ['coeur', 'dos', 'manche-d'] as const,
  },
  {
    id: 'coeur-dos-manche-ga',
    label: 'Coeur + Dos + Manche GA',
    zones: ['coeur', 'dos', 'manche-g'] as const,
  },
  {
    id: 't-shirt-seul',
    label: 'T-shirt seul (sans impression)',
    zones: [] as const,
  },
  {
    id: 'poitrine',
    label: 'Poitrine',
    zones: ['poitrine'] as const,
  },
  {
    id: 'poitrine-dos',
    label: 'Poitrine + Dos',
    zones: ['poitrine', 'dos'] as const,
  },
] as const;

export type PlacementId = (typeof PLACEMENTS)[number]['id'];

export interface Placement {
  id: PlacementId;
  label: string;
  zones: readonly ZoneId[];
}

export const PLACEMENT_BY_ID = Object.fromEntries(
  PLACEMENTS.map((p) => [p.id, p as Placement]),
) as Record<PlacementId, Placement>;

/**
 * Placements proposés pour une famille de produit donnée.
 *
 * Un placement dont la liste `families` est vide est « toutes familles » et
 * apparaît partout. Sinon, il n'apparaît que pour les familles listées. Quand
 * la famille est inconnue (ligne libre hors catalogue), tous les placements
 * sont renvoyés. L'ordre d'origine est préservé.
 */
export function placementsForFamily<T extends { families: string[] }>(
  placements: readonly T[],
  familyId: string | undefined,
): T[] {
  if (!familyId) return [...placements];
  return placements.filter((p) => p.families.length === 0 || p.families.includes(familyId));
}
