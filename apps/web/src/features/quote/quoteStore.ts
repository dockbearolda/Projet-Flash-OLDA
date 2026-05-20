import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { useMemo } from 'react';
import type { Customer, FlockMode, Sizes, Transport, QuoteLine } from '@df/shared';
import { createIdbStorage } from './idbStorage';
import { useCatalogStore } from '@/features/catalog/catalogStore';
import { nextQuoteId, newLineId } from './quoteId';
import { quoteTotals } from './pricing';
import type { QuoteTotals } from './pricing';

const EMPTY_SIZES: Sizes = { xs: 0, s: 0, m: 0, l: 0, xl: 0, xxl: 0, autres: 0 };

const EMPTY_CUSTOMER: Customer = { name: '' };

function makeLine(defaults?: { transport?: Transport; revente?: boolean }): QuoteLine {
  return {
    id: newLineId(),
    productRef: 'H-001',
    placementId: 'coeur-dos',
    textileColorId: 'noir',
    flockMode: 'multi',
    flockColorId: null,
    sizes: { ...EMPTY_SIZES },
    linked: true,
    code: 10,
    transport: defaults?.transport,
    revente: defaults?.revente,
  };
}

function makeCustomLine(defaults?: { transport?: Transport; revente?: boolean }): QuoteLine {
  return {
    ...makeLine(defaults),
    productRef: 'CUSTOM',
    custom: { name: 'Produit hors catalogue', priceAchat: 0 },
  };
}

export interface QuoteState {
  id: string;
  status: 'draft' | 'sent' | 'archived';
  customer: Customer;
  transport: Transport;
  revente: boolean;
  lines: QuoteLine[];
  activeLineId: string;
  createdAt: string;
  updatedAt: string;
  // actions
  addLine: () => void;
  addCustomLine: () => void;
  removeLine: (id: string) => void;
  updateLine: (id: string, patch: Partial<Omit<QuoteLine, 'id'>>) => void;
  setActive: (id: string) => void;
  setSizes: (id: string, sizes: Sizes) => void;
  setLinked: (id: string, linked: boolean) => void;
  setFlockMode: (id: string, mode: FlockMode) => void;
  setLineTransport: (id: string, t: Transport) => void;
  setLineRevente: (id: string, b: boolean) => void;
  setCustomer: (patch: Partial<Customer>) => void;
  /** Sets the quote-level default *and* cascades the value to every line. */
  setTransport: (t: Transport) => void;
  /** Sets the quote-level default *and* cascades the value to every line. */
  setRevente: (b: boolean) => void;
  newQuote: () => void;
  reset: () => void;
  /** Replace whole state — for tests and seeded fixtures. */
  __replace: (next: Partial<QuoteState>) => void;
}

function initialState(): Pick<
  QuoteState,
  | 'id'
  | 'status'
  | 'customer'
  | 'transport'
  | 'revente'
  | 'lines'
  | 'activeLineId'
  | 'createdAt'
  | 'updatedAt'
> {
  // Defer nextQuoteId() to avoid touching localStorage at module load time
  // when the store is reused in SSR or tests.
  const now = new Date().toISOString();
  const firstLine = makeLine({ transport: 'chronopost', revente: false });
  return {
    id: 'DEV-PENDING',
    status: 'draft',
    customer: EMPTY_CUSTOMER,
    transport: 'chronopost',
    revente: false,
    lines: [firstLine],
    activeLineId: firstLine.id,
    createdAt: now,
    updatedAt: now,
  };
}

export const useQuoteStore = create<QuoteState>()(
  persist(
    (set, get) => ({
      ...initialState(),
      addLine: () => {
        const { transport, revente } = get();
        const line = makeLine({ transport, revente });
        set((s) => ({
          lines: [...s.lines, line],
          activeLineId: line.id,
          updatedAt: new Date().toISOString(),
        }));
      },
      addCustomLine: () => {
        const { transport, revente } = get();
        const line = makeCustomLine({ transport, revente });
        set((s) => ({
          lines: [...s.lines, line],
          activeLineId: line.id,
          updatedAt: new Date().toISOString(),
        }));
      },
      removeLine: (id) => {
        const { lines, activeLineId } = get();
        if (lines.length <= 1) return; // toujours au moins 1 ligne
        const next = lines.filter((l) => l.id !== id);
        const nextActive = activeLineId === id ? (next[0]?.id ?? '') : activeLineId;
        set({
          lines: next,
          activeLineId: nextActive,
          updatedAt: new Date().toISOString(),
        });
      },
      updateLine: (id, patch) => {
        set((s) => ({
          lines: s.lines.map((l) => (l.id === id ? { ...l, ...patch } : l)),
          updatedAt: new Date().toISOString(),
        }));
      },
      setActive: (id) => {
        set({ activeLineId: id });
      },
      setSizes: (id, sizes) => {
        set((s) => ({
          lines: s.lines.map((l) => (l.id === id ? { ...l, sizes } : l)),
          updatedAt: new Date().toISOString(),
        }));
      },
      setLinked: (id, linked) => {
        set((s) => ({
          lines: s.lines.map((l) => (l.id === id ? { ...l, linked } : l)),
          updatedAt: new Date().toISOString(),
        }));
      },
      setFlockMode: (id, mode) => {
        set((s) => ({
          lines: s.lines.map((l) =>
            l.id === id
              ? { ...l, flockMode: mode, flockColorId: mode === 'multi' ? null : l.flockColorId }
              : l,
          ),
          updatedAt: new Date().toISOString(),
        }));
      },
      setCustomer: (patch) => {
        set((s) => ({
          customer: { ...s.customer, ...patch },
          updatedAt: new Date().toISOString(),
        }));
      },
      setLineTransport: (id, t) => {
        set((s) => ({
          lines: s.lines.map((l) => (l.id === id ? { ...l, transport: t } : l)),
          updatedAt: new Date().toISOString(),
        }));
      },
      setLineRevente: (id, b) => {
        set((s) => ({
          lines: s.lines.map((l) => (l.id === id ? { ...l, revente: b } : l)),
          updatedAt: new Date().toISOString(),
        }));
      },
      setTransport: (t) => {
        set((s) => ({
          transport: t,
          lines: s.lines.map((l) => ({ ...l, transport: t })),
          updatedAt: new Date().toISOString(),
        }));
      },
      setRevente: (b) => {
        set((s) => ({
          revente: b,
          lines: s.lines.map((l) => ({ ...l, revente: b })),
          updatedAt: new Date().toISOString(),
        }));
      },
      newQuote: () => {
        const init = initialState();
        set({ ...init, id: nextQuoteId() });
      },
      reset: () => {
        const init = initialState();
        set({ ...init, id: nextQuoteId() });
      },
      __replace: (next) => {
        set(next);
      },
    }),
    {
      name: 'df:current-quote',
      storage: createJSONStorage<QuoteState>(() => ({
        getItem: () => null,
        setItem: () => undefined,
        removeItem: () => undefined,
      })),
      // The real IDB storage is provided by `attachIdbStorage()` once the app
      // boots; tests use the no-op storage above.
    },
  ),
);

let idbAttached = false;

/**
 * Replace the no-op storage with the real IDB storage. Called once on app boot.
 */
export function attachIdbStorage(): void {
  if (idbAttached) return;
  useQuoteStore.persist.setOptions({ storage: createIdbStorage<QuoteState>() });
  // Trigger a rehydrate so any saved state is loaded.
  void useQuoteStore.persist.rehydrate();
  idbAttached = true;
}

export function useQuoteTotals(): QuoteTotals {
  const lines = useQuoteStore((s) => s.lines);
  const transport = useQuoteStore((s) => s.transport);
  const revente = useQuoteStore((s) => s.revente);
  // Recompute when the catalogue changes (prices/coefs edited or loaded).
  const catalogVersion = useCatalogStore((s) => s.version);
  return useMemo(
    () => {
      try {
        return quoteTotals({ lines, transport, revente });
      } catch {
        // A line may reference a product/placement the patron just removed.
        return { qtyTotal: 0, coef: 1, subtotalHT: 0, transportHT: 0, tgcaHT: 0, totalHT: 0 };
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [lines, transport, revente, catalogVersion],
  );
}
