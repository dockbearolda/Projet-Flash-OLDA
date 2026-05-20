import { CatalogSnapshotSchema } from '@df/shared';
import type {
  CatalogSnapshot,
  CatalogProduct,
  CatalogZone,
  CatalogCoef,
  CatalogTextileColor,
  CatalogFlockColor,
  CatalogPlacement,
  CatalogSettings,
} from '@df/shared';
import { useCatalogStore } from './catalogStore';

/**
 * Fetch the catalogue from the API. Returns null on any failure (offline,
 * 401, malformed, or an un-seeded/empty catalogue) so callers fall back to the
 * cached / default snapshot instead of breaking the app.
 */
export async function fetchCatalog(): Promise<CatalogSnapshot | null> {
  try {
    const res = await fetch('/api/catalog', { credentials: 'include' });
    if (!res.ok) return null;
    const data: unknown = await res.json();
    const parsed = CatalogSnapshotSchema.safeParse(data);
    if (!parsed.success) return null;
    if (parsed.data.products.length === 0 || parsed.data.coefs.length === 0) return null;
    return parsed.data;
  } catch {
    return null;
  }
}

/** Load the server snapshot into the store. Returns true if applied. */
export async function loadCatalogFromServer(): Promise<boolean> {
  const snap = await fetchCatalog();
  if (!snap) return false;
  useCatalogStore.getState().setSnapshot(snap, { loaded: true });
  return true;
}

async function putSection(path: string, body: unknown): Promise<CatalogSnapshot> {
  const res = await fetch(`/api/catalog/${path}`, {
    method: 'PUT',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    let message = 'Enregistrement impossible';
    try {
      const err = (await res.json()) as { error?: string };
      if (err.error) message = err.error;
    } catch {
      // keep default message
    }
    if (res.status === 401) message = 'Session expirée — reconnectez-vous';
    throw new Error(message);
  }
  const data: unknown = await res.json();
  const parsed = CatalogSnapshotSchema.safeParse(data);
  if (!parsed.success) throw new Error('Réponse serveur invalide');
  useCatalogStore.getState().setSnapshot(parsed.data, { loaded: true });
  return parsed.data;
}

export const saveProducts = (products: CatalogProduct[]): Promise<CatalogSnapshot> =>
  putSection('products', products);
export const saveCoefs = (coefs: CatalogCoef[]): Promise<CatalogSnapshot> =>
  putSection('coefs', coefs);
export const saveZones = (zones: CatalogZone[]): Promise<CatalogSnapshot> =>
  putSection('zones', zones);
export const saveTextileColors = (colors: CatalogTextileColor[]): Promise<CatalogSnapshot> =>
  putSection('textile-colors', colors);
export const saveFlockColors = (colors: CatalogFlockColor[]): Promise<CatalogSnapshot> =>
  putSection('flock-colors', colors);
export const savePlacements = (placements: CatalogPlacement[]): Promise<CatalogSnapshot> =>
  putSection('placements', placements);
export const saveSettings = (settings: CatalogSettings): Promise<CatalogSnapshot> =>
  putSection('settings', settings);
