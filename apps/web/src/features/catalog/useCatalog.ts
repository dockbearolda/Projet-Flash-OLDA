import { useMemo } from 'react';
import { zoneSalePriceForQtyFrom } from '@df/shared';
import type {
  CatalogSnapshot,
  CatalogProduct,
  CatalogZone,
  CatalogCoef,
  CatalogTextileColor,
  CatalogFlockColor,
  CatalogPlacement,
  CatalogTransport,
} from '@df/shared';
import { useCatalogStore } from './catalogStore';

export interface CatalogView {
  snapshot: CatalogSnapshot;
  version: number;
  products: CatalogProduct[];
  productByRef: Record<string, CatalogProduct | undefined>;
  zones: CatalogZone[];
  zoneById: Record<string, CatalogZone | undefined>;
  coefs: CatalogCoef[];
  textileColors: CatalogTextileColor[];
  textileById: Record<string, CatalogTextileColor | undefined>;
  flockColors: CatalogFlockColor[];
  flockById: Record<string, CatalogFlockColor | undefined>;
  placements: CatalogPlacement[];
  placementById: Record<string, CatalogPlacement | undefined>;
  transports: CatalogTransport[];
  transportById: Record<string, CatalogTransport | undefined>;
  tgcaRate: number;
}

function byKey<T>(items: T[], key: (item: T) => string): Record<string, T | undefined> {
  const out: Record<string, T | undefined> = {};
  for (const item of items) out[key(item)] = item;
  return out;
}

function buildView(snapshot: CatalogSnapshot, version: number): CatalogView {
  return {
    snapshot,
    version,
    products: snapshot.products,
    productByRef: byKey(snapshot.products, (p) => p.ref),
    zones: snapshot.zones,
    zoneById: byKey(snapshot.zones, (z) => z.id),
    coefs: snapshot.coefs,
    textileColors: snapshot.textileColors,
    textileById: byKey(snapshot.textileColors, (c) => c.id),
    flockColors: snapshot.flockColors,
    flockById: byKey(snapshot.flockColors, (c) => c.id),
    placements: snapshot.placements,
    placementById: byKey(snapshot.placements, (p) => p.id),
    transports: snapshot.transports,
    transportById: byKey(snapshot.transports, (t) => t.id),
    tgcaRate: snapshot.tgcaRate,
  };
}

let cache: { version: number; view: CatalogView } | null = null;

/**
 * Synchronous catalogue accessor for non-React code (pricing engine, PDF).
 * Reads the current store state; rebuilds the derived maps only when the
 * snapshot version changes.
 */
export function getCatalog(): CatalogView {
  const { snapshot, version } = useCatalogStore.getState();
  if (cache?.version !== version) {
    cache = { version, view: buildView(snapshot, version) };
  }
  return cache.view;
}

/** Reactive catalogue accessor for components — re-renders on any edit. */
export function useCatalog(): CatalogView {
  const version = useCatalogStore((s) => s.version);
  // `version` is the intended trigger; getCatalog reads the matching snapshot.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  return useMemo(() => getCatalog(), [version]);
}

/** Sale price of a zone for a given quantity, against the current catalogue. */
export function zoneSalePriceForQty(zoneId: string, qty: number): number {
  const zone = getCatalog().zoneById[zoneId];
  return zone ? zoneSalePriceForQtyFrom(zone.salePrices, qty) : 0;
}
