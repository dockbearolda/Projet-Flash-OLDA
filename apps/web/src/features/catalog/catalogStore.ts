import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { CatalogSnapshotSchema, defaultCatalogSnapshot } from '@df/shared';
import type { CatalogSnapshot } from '@df/shared';
import { createIdbStorage } from '@/features/quote/idbStorage';

export interface CatalogState {
  snapshot: CatalogSnapshot;
  /** Bumped on every snapshot change — drives memo/cache invalidation. */
  version: number;
  /** True once a server snapshot has been applied (vs. defaults / cache). */
  loaded: boolean;
  setSnapshot: (snapshot: CatalogSnapshot, opts?: { loaded?: boolean }) => void;
}

export const useCatalogStore = create<CatalogState>()(
  persist(
    (set, get) => ({
      snapshot: defaultCatalogSnapshot(),
      version: 0,
      loaded: false,
      setSnapshot: (snapshot, opts) => {
        set({ snapshot, version: get().version + 1, loaded: opts?.loaded ?? get().loaded });
      },
    }),
    {
      name: 'df:catalog',
      // The real IDB storage is attached on boot via `attachCatalogIdb()`;
      // tests and SSR use this no-op storage so defaults stay in effect.
      storage: createJSONStorage<CatalogState>(() => ({
        getItem: () => null,
        setItem: () => undefined,
        removeItem: () => undefined,
      })),
      partialize: (s) => ({ snapshot: s.snapshot }) as CatalogState,
      // Keep only the cached snapshot; bump the version so derived caches refresh.
      // The snapshot is normalised through the schema so a cache predating the
      // per-reference config (sizes / colorIds / bestColorIds) is backfilled with
      // their defaults instead of leaving products with missing fields.
      merge: (persisted, current) => {
        const p = persisted as { snapshot?: unknown } | undefined;
        if (!p?.snapshot) return current;
        const parsed = CatalogSnapshotSchema.safeParse(p.snapshot);
        return parsed.success
          ? { ...current, snapshot: parsed.data, version: current.version + 1 }
          : current;
      },
    },
  ),
);

let idbAttached = false;

/** Replace the no-op storage with real IDB persistence. Called once on boot. */
export function attachCatalogIdb(): void {
  if (idbAttached) return;
  useCatalogStore.persist.setOptions({ storage: createIdbStorage<CatalogState>() });
  void useCatalogStore.persist.rehydrate();
  idbAttached = true;
}
