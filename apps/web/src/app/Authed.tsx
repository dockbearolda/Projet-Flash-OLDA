import { useEffect, useState, type ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { checkAuth } from '@/features/auth/api';
import { PageFallback } from './PageFallback';

/**
 * Auth guard.
 * - In production : requires a valid session cookie (verified via /api/auth/me)
 * - Offline / network fail : allow access (PWA spec — vendeuse ne doit jamais
 *   perdre la main, brouillons restent locaux)
 */
export function Authed({ children }: { children: ReactNode }) {
  const [state, setState] = useState<'checking' | 'ok' | 'denied'>('checking');
  const location = useLocation();

  useEffect(() => {
    void (async () => {
      try {
        const ok = await checkAuth();
        setState(ok ? 'ok' : 'denied');
      } catch {
        // offline — allow optimistically
        setState('ok');
      }
    })();
  }, []);

  if (state === 'checking') return <PageFallback />;
  if (state === 'denied') {
    return <Navigate to="/login" state={{ from: location.pathname }} replace />;
  }
  return <>{children}</>;
}
