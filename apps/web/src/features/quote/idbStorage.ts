import { get, set, del } from 'idb-keyval';
import type { PersistStorage, StorageValue } from 'zustand/middleware';

/**
 * Thin wrapper to use `idb-keyval` as zustand persist storage.
 * The whole store state is serialized to a single IndexedDB key per name.
 */
export function createIdbStorage<T>(): PersistStorage<T> {
  return {
    getItem: async (name: string): Promise<StorageValue<T> | null> => {
      const raw = await get<string>(name);
      if (!raw) return null;
      try {
        return JSON.parse(raw) as StorageValue<T>;
      } catch {
        // Cache corrompu (écriture interrompue, quota dépassé…) : on repart sur
        // l'état par défaut plutôt que de bloquer le chargement de l'app.
        return null;
      }
    },
    setItem: async (name: string, value: StorageValue<T>): Promise<void> => {
      await set(name, JSON.stringify(value));
    },
    removeItem: async (name: string): Promise<void> => {
      await del(name);
    },
  };
}
