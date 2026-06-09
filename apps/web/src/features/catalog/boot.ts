import { useEffect } from 'react';
import { attachCatalogIdb } from './catalogStore';
import { startCatalogSync } from './sync';

// Attach IDB persistence (and rehydrate the cached snapshot) as soon as any
// catalogue-aware page is loaded — mirrors the quote/history store pattern.
attachCatalogIdb();

/**
 * Keep the catalogue live: an instant SSE push on every admin edit, plus
 * refresh-on-focus and a slow poll as a safety net. This guarantees every
 * tablet/PC converges on the server's values — no device stays stale.
 *
 * The cached (IDB) snapshot still drives the first paint and offline use; the
 * sync layer refreshes it from the server as soon as the network allows.
 */
export function useCatalogBoot(): void {
  useEffect(() => startCatalogSync(), []);
}
