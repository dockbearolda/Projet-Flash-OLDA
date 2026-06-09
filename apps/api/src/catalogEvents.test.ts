import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { subscribeCatalog, notifyCatalogChanged, currentRevision } from './catalogEvents.js';

describe('catalogEvents', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it('coalesces a burst of changes into a single broadcast', () => {
    const spy = vi.fn();
    const unsub = subscribeCatalog(spy);
    const rev0 = currentRevision();

    notifyCatalogChanged();
    notifyCatalogChanged();
    notifyCatalogChanged();
    expect(spy).not.toHaveBeenCalled(); // debounced

    vi.advanceTimersByTime(200);
    expect(spy).toHaveBeenCalledTimes(1);
    expect(spy).toHaveBeenLastCalledWith(rev0 + 1);
    expect(currentRevision()).toBe(rev0 + 1);

    unsub();
  });

  it('fans out each broadcast to every subscriber and bumps the revision', () => {
    const a = vi.fn();
    const b = vi.fn();
    const unsubA = subscribeCatalog(a);
    const unsubB = subscribeCatalog(b);
    const rev0 = currentRevision();

    notifyCatalogChanged();
    vi.advanceTimersByTime(200);
    expect(a).toHaveBeenCalledWith(rev0 + 1);
    expect(b).toHaveBeenCalledWith(rev0 + 1);

    notifyCatalogChanged();
    vi.advanceTimersByTime(200);
    expect(a).toHaveBeenLastCalledWith(rev0 + 2);
    expect(b).toHaveBeenLastCalledWith(rev0 + 2);

    unsubA();
    unsubB();
  });

  it('stops delivering after unsubscribe', () => {
    const spy = vi.fn();
    const unsub = subscribeCatalog(spy);
    unsub();

    notifyCatalogChanged();
    vi.advanceTimersByTime(200);
    expect(spy).not.toHaveBeenCalled();
  });

  it('isolates a throwing subscriber from the others', () => {
    const bad = vi.fn(() => {
      throw new Error('boom');
    });
    const good = vi.fn();
    const unsubBad = subscribeCatalog(bad);
    const unsubGood = subscribeCatalog(good);

    notifyCatalogChanged();
    expect(() => {
      vi.advanceTimersByTime(200);
    }).not.toThrow();
    expect(good).toHaveBeenCalledTimes(1);

    unsubBad();
    unsubGood();
  });
});
