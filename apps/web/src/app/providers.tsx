import type { ReactNode } from 'react';
import { Toaster } from 'sonner';

export function Providers({ children }: { children: ReactNode }) {
  return (
    <>
      {children}
      <Toaster
        position="top-right"
        toastOptions={{
          style: {
            background: 'var(--df-surface)',
            color: 'var(--df-ink)',
            border: '1px solid var(--df-border)',
            fontFamily: 'var(--df-font-body)',
          },
        }}
      />
    </>
  );
}
