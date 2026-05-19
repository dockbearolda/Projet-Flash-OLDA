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
      const status = await checkAuth();
      // PWA spec : si API down (offline) ou si on est authentifié → on entre.
      // Seul un refus explicite (401) renvoie vers /login.
      setState(status === 'denied' ? 'denied' : 'ok');
    })();
  }, []);

  if (state === 'checking') return <PageFallback />;
  if (state === 'denied') {
    return <Navigate to="/login" state={{ from: location.pathname }} replace />;
  }
  return <>{children}</>;
}
