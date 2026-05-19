import { useEffect, useState } from 'react';
import { cn } from '@/lib/cn';

type SyncState = 'online' | 'offline';

/**
 * Tiny pastille that toggles green/amber depending on navigator.onLine.
 * Hooks for real sync queue can replace this later (Étape 12+).
 */
export function SyncIndicator() {
  const [state, setState] = useState<SyncState>(navigator.onLine ? 'online' : 'offline');

  useEffect(() => {
    function up() {
      setState('online');
    }
    function down() {
      setState('offline');
    }
    window.addEventListener('online', up);
    window.addEventListener('offline', down);
    return () => {
      window.removeEventListener('online', up);
      window.removeEventListener('offline', down);
    };
  }, []);

  const label = state === 'online' ? 'En ligne · sync ok' : 'Hors-ligne · local';
  return (
    <div
      className="inline-flex items-center gap-1.5"
      role="status"
      aria-live="polite"
      aria-label={label}
    >
      <span
        className={cn(
          'inline-block w-1.5 h-1.5 rounded-full',
          state === 'online' ? 'bg-[var(--df-success)]' : 'bg-[var(--df-warning)]',
        )}
      />
      <span className="df-caps">{state === 'online' ? 'Sync' : 'Local'}</span>
    </div>
  );
}
