import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { createIdbStorage } from './idbStorage';
import type { Customer, QuoteLine, Transport } from '@df/shared';

export interface HistoryEntry {
  id: string;
  status: 'draft' | 'sent' | 'archived';
  customer: Customer;
  transport: Transport;
  revente: boolean;
  lines: QuoteLine[];
  totalHT: number;
  qtyTotal: number;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
}

interface HistoryState {
  entries: HistoryEntry[];
  upsert: (entry: HistoryEntry) => void;
  archive: (id: string) => void;
  markSent: (id: string) => void;
  remove: (id: string) => void; // soft delete
  restore: (id: string) => void;
  clearAll: () => void;
}

export const useHistoryStore = create<HistoryState>()(
  persist(
    (set) => ({
      entries: [],
      upsert: (entry) => {
        set((s) => {
          const existing = s.entries.findIndex((e) => e.id === entry.id);
          if (existing >= 0) {
            const next = [...s.entries];
            next[existing] = entry;
            return { entries: next };
          }
          return { entries: [entry, ...s.entries] };
        });
      },
      archive: (id) => {
        set((s) => ({
          entries: s.entries.map((e) => (e.id === id ? { ...e, status: 'archived' as const } : e)),
        }));
      },
      markSent: (id) => {
        set((s) => ({
          entries: s.entries.map((e) => (e.id === id ? { ...e, status: 'sent' as const } : e)),
        }));
      },
      remove: (id) => {
        const now = new Date().toISOString();
        set((s) => ({
          entries: s.entries.map((e) => (e.id === id ? { ...e, deletedAt: now } : e)),
        }));
      },
      restore: (id) => {
        set((s) => ({
          entries: s.entries.map((e) => (e.id === id ? { ...e, deletedAt: null } : e)),
        }));
      },
      clearAll: () => {
        set({ entries: [] });
      },
    }),
    {
      name: 'df:history',
      storage: createJSONStorage<HistoryState>(() => ({
        getItem: () => null,
        setItem: () => undefined,
        removeItem: () => undefined,
      })),
    },
  ),
);

let attached = false;
export function attachHistoryIdb(): void {
  if (attached) return;
  useHistoryStore.persist.setOptions({ storage: createIdbStorage<HistoryState>() });
  void useHistoryStore.persist.rehydrate();
  attached = true;
}
