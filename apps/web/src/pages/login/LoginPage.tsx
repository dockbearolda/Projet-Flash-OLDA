import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Lock, ArrowRight } from 'lucide-react';
import { Button, Input } from '@/components/ui';
import { loginRequest, checkAuth } from '@/features/auth/api';
import { toast } from 'sonner';

export default function LoginPage() {
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState(true);
  const navigate = useNavigate();
  const location = useLocation();
  const from = (location.state as { from?: string } | null)?.from ?? '/tablet';

  useEffect(() => {
    void (async () => {
      const status = await checkAuth();
      if (status === 'authenticated' || status === 'offline') {
        // déjà authentifié OU API down → on laisse passer
        navigate(from, { replace: true });
        return;
      }
      setChecking(false);
    })();
  }, [navigate, from]);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    void (async () => {
      setLoading(true);
      try {
        const result = await loginRequest(password);
        if (result.ok) {
          toast.success('Connecté');
          navigate(from, { replace: true });
        } else {
          toast.error(result.error ?? 'Mot de passe incorrect');
        }
      } catch {
        toast.error('Réseau indisponible — connexion impossible');
      } finally {
        setLoading(false);
      }
    })();
  }

  if (checking) {
    return (
      <div className="min-h-screen flex items-center justify-center text-[var(--df-ink-3)] df-caps">
        Vérification…
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[var(--df-bg)] flex items-center justify-center px-6">
      <form
        onSubmit={handleSubmit}
        className="w-[400px] bg-[var(--df-surface)] border border-[var(--df-border)] rounded-[var(--df-radius-xl)] shadow-[var(--df-shadow-2)] p-8"
      >
        <div className="text-center mb-7">
          <div className="inline-flex w-12 h-12 items-center justify-center rounded-[var(--df-radius-lg)] bg-[var(--df-accent-soft)] text-[var(--df-accent)] mb-4">
            <Lock size={20} strokeWidth={1.7} aria-hidden />
          </div>
          <div className="df-caps">Devis Flash · OLDA</div>
          <h1 className="df-display text-3xl mt-1">Connexion</h1>
          <p className="text-sm text-[var(--df-ink-3)] mt-2">
            Mot de passe partagé de l&apos;atelier
          </p>
        </div>

        <div className="space-y-3">
          <Input
            type="password"
            value={password}
            placeholder="••••••••"
            onChange={(e) => {
              setPassword(e.target.value);
            }}
            autoFocus
            aria-label="Mot de passe"
          />
          <Button
            type="submit"
            variant="primary"
            size="lg"
            disabled={loading || password.length < 1}
            className="w-full"
          >
            {loading ? 'Connexion…' : 'Se connecter'}
            {!loading && <ArrowRight size={16} strokeWidth={1.8} />}
          </Button>
        </div>

        <p className="text-[11px] text-[var(--df-ink-4)] text-center mt-6">
          Si l&apos;API est indisponible, vous pouvez consulter les devis stockés localement.
        </p>
      </form>
    </div>
  );
}
