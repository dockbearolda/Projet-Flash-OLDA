/**
 * In-process bus that notifies every connected client when the catalogue
 * changes, so an admin edit propagates instantly to all tablets/PCs.
 *
 * The service runs as a single replica (see auth.ts), so an in-memory fan-out
 * is sufficient — no Redis/pub-sub needed. Subscribers receive a monotonically
 * increasing revision number; they react by re-reading `/api/catalog`.
 */

type Subscriber = (revision: number) => void;

const subscribers = new Set<Subscriber>();

let revision = 0;
let pending: ReturnType<typeof setTimeout> | null = null;

/** Coalesce window: a save that fires several PUTs (e.g. zones + placements)
 *  triggers a single broadcast instead of one per write. */
const COALESCE_MS = 120;

/** Current catalogue revision — bumped on every (coalesced) change. */
export function currentRevision(): number {
  return revision;
}

/**
 * Subscribe to catalogue changes. Returns an unsubscribe function.
 * A throwing subscriber never affects the others.
 */
export function subscribeCatalog(fn: Subscriber): () => void {
  subscribers.add(fn);
  return () => {
    subscribers.delete(fn);
  };
}

/**
 * Signal that the catalogue changed. Debounced: rapid successive calls collapse
 * into one broadcast carrying the new revision.
 */
export function notifyCatalogChanged(): void {
  if (pending) return;
  pending = setTimeout(() => {
    pending = null;
    revision += 1;
    for (const fn of subscribers) {
      try {
        fn(revision);
      } catch {
        // A broken subscriber (e.g. an aborted stream) must not break the rest.
      }
    }
  }, COALESCE_MS);
  // Don't keep the event loop alive just for a pending broadcast.
  if (typeof pending.unref === 'function') pending.unref();
}
