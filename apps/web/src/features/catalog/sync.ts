import { loadCatalogFromServer } from './api';

/**
 * Keeps this device's catalogue in sync with the server in real time, so an
 * admin edit shows up on every tablet/PC immediately.
 *
 * Layers (belt and braces — no state where a device stays stale):
 *  1. SSE stream `/api/catalog/stream` → instant push on every change.
 *  2. Refresh on focus / tab-visible / network-reconnect.
 *  3. A slow poll as a safety net if the stream is silently dropped.
 *
 * `loadCatalogFromServer()` only bumps the store version when the snapshot
 * actually changed (see catalogStore), so a redundant refresh never remounts
 * the admin editor or disturbs an in-progress edit.
 */

const POLL_MS = 20_000;
const SSE_RETRY_MS = 5_000;

let started = false;
let source: EventSource | null = null;
let pollTimer: ReturnType<typeof setInterval> | null = null;
let retryTimer: ReturnType<typeof setTimeout> | null = null;
let refreshing = false;
let queued = false;

/** Reload the snapshot, coalescing overlapping calls into one in-flight fetch. */
async function refresh(): Promise<void> {
  if (refreshing) {
    queued = true;
    return;
  }
  refreshing = true;
  try {
    await loadCatalogFromServer();
  } catch {
    // offline / transient — the cached snapshot stays; next trigger retries.
  } finally {
    refreshing = false;
    if (queued) {
      queued = false;
      void refresh();
    }
  }
}

function clearRetry(): void {
  if (retryTimer) {
    clearTimeout(retryTimer);
    retryTimer = null;
  }
}

function scheduleReconnect(): void {
  if (retryTimer || !started) return;
  retryTimer = setTimeout(() => {
    retryTimer = null;
    openStream();
  }, SSE_RETRY_MS);
}

function openStream(): void {
  if (source || !started || typeof EventSource === 'undefined') return;
  let es: EventSource;
  try {
    es = new EventSource('/api/catalog/stream', { withCredentials: true });
  } catch {
    scheduleReconnect();
    return;
  }
  source = es;
  es.addEventListener('catalog', () => {
    void refresh();
  });
  es.addEventListener('open', () => {
    clearRetry();
    // Catch up on anything missed while disconnected.
    void refresh();
  });
  es.addEventListener('error', () => {
    // Covers transient drops and an expired session alike. Close and back off,
    // leaning on the poll meanwhile; reconnect picks up once auth/network return.
    es.close();
    if (source === es) source = null;
    scheduleReconnect();
  });
}

function onWake(): void {
  if (typeof document !== 'undefined' && document.visibilityState === 'hidden') return;
  void refresh();
}

/**
 * Start syncing. Idempotent. Returns a stop function (call on unmount).
 */
export function startCatalogSync(): () => void {
  if (started) return () => undefined;
  started = true;

  void refresh(); // immediate fresh load
  openStream();
  pollTimer = setInterval(() => {
    void refresh();
  }, POLL_MS);

  window.addEventListener('focus', onWake);
  window.addEventListener('online', onWake);
  document.addEventListener('visibilitychange', onWake);

  return () => {
    started = false;
    clearRetry();
    if (pollTimer) {
      clearInterval(pollTimer);
      pollTimer = null;
    }
    if (source) {
      source.close();
      source = null;
    }
    window.removeEventListener('focus', onWake);
    window.removeEventListener('online', onWake);
    document.removeEventListener('visibilitychange', onWake);
  };
}
