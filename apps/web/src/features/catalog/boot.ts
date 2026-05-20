import { useEffect } from 'react';
import { attachCatalogIdb } from './catalogStore';
import { loadCatalogFromServer } from './api';

// Attach IDB persistence (and rehydrate the cached snapshot) as soon as any
// catalogue-aware page is loaded — mirrors the quote/history store pattern.
attachCatalogIdb();

let serverFetchStarted = false;

/**
 * Refresh the catalogue from the server once per app session. Tolerant of
 * offline / un-seeded state: on failure the cached or default snapshot stays.
 */
export function useCatalogBoot(): void {
  useEffect(() => {
    if (serverFetchStarted) return;
    serverFetchStarted = true;
    void loadCatalogFromServer();
  }, []);
}
