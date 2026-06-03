import { type ReactNode } from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import {
  Plus,
  Search,
  History,
  Shirt,
  Sliders,
  FileText,
  Banknote,
  Palette,
  Settings,
  Tags,
} from 'lucide-react';
import { useHotkeys } from 'react-hotkeys-hook';
import { useNavigate } from 'react-router-dom';
import { useHistoryStore, attachHistoryIdb } from '@/features/quote/historyStore';
import { useQuoteStore, attachIdbStorage } from '@/features/quote/quoteStore';
import { useCatalog } from '@/features/catalog/useCatalog';
import { useCatalogBoot } from '@/features/catalog/boot';
import { Logo } from '@/components/ui';
import { fmtInt } from '@/lib/format';
import { cn } from '@/lib/cn';

attachIdbStorage();
attachHistoryIdb();

export default function AdminLayout() {
  useCatalogBoot();
  const entries = useHistoryStore((s) => s.entries);
  const activeCount = entries.filter((e) => !e.deletedAt).length;
  const { products } = useCatalog();
  const navigate = useNavigate();

  useHotkeys(
    'mod+n',
    (e) => {
      e.preventDefault();
      useQuoteStore.getState().newQuote();
      navigate('/tablet');
    },
    [navigate],
  );

  return (
    <div className="flex min-h-screen bg-[var(--df-bg)]">
      <aside className="w-[240px] shrink-0 h-screen bg-[var(--df-surface)] border-r border-[var(--df-border)] flex flex-col sticky top-0">
        <div className="px-5 py-5 border-b border-[var(--df-border)] flex items-center gap-3">
          <Logo className="w-9 h-9 shrink-0 text-[var(--df-accent)]" />
          <div>
            <div className="df-caps">Devis Flash · OLDA</div>
            <div className="df-display text-xl mt-0.5">Admin</div>
          </div>
        </div>
        <nav className="flex-1 px-3 py-4 space-y-0.5">
          <NavItem
            to="/admin/quotes"
            icon={<FileText size={16} strokeWidth={1.7} />}
            label="Historique"
            badge={fmtInt.format(activeCount)}
          />
          <div className="px-3 pt-4 pb-1 df-caps text-[var(--df-ink-4)]">Catalogue</div>
          <NavItem
            to="/admin/catalog"
            icon={<Shirt size={16} strokeWidth={1.7} />}
            label="Produits"
            badge={fmtInt.format(products.length)}
          />
          <NavItem
            to="/admin/families"
            icon={<Tags size={16} strokeWidth={1.7} />}
            label="Familles"
          />
          <NavItem
            to="/admin/impressions"
            icon={<Banknote size={16} strokeWidth={1.7} />}
            label="Impressions"
          />
          <NavItem
            to="/admin/coefs"
            icon={<Sliders size={16} strokeWidth={1.7} />}
            label="Coefficients"
          />
          <NavItem
            to="/admin/colors"
            icon={<Palette size={16} strokeWidth={1.7} />}
            label="Coloris"
          />
          <NavItem
            to="/admin/settings"
            icon={<Settings size={16} strokeWidth={1.7} />}
            label="Réglages"
          />
        </nav>
        <div className="px-3 py-3 border-t border-[var(--df-border)]">
          <button
            type="button"
            onClick={() => {
              useQuoteStore.getState().newQuote();
              navigate('/tablet');
            }}
            className="w-full inline-flex items-center justify-center gap-2 h-10 px-3 rounded-[var(--df-radius)] bg-[var(--df-accent)] text-[var(--df-accent-ink)] text-sm font-medium hover:bg-[var(--df-accent-2)]"
          >
            <Plus size={16} strokeWidth={1.8} />
            Nouveau devis
            <span className="df-mono text-[10px] opacity-70 ml-1">⌘N</span>
          </button>
        </div>
      </aside>
      <div className="flex-1 flex flex-col min-w-0">
        <TopBar />
        <main className="flex-1 px-8 py-6 min-w-0">
          <Outlet />
        </main>
      </div>
    </div>
  );
}

function NavItem({
  to,
  icon,
  label,
  badge,
}: {
  to: string;
  icon: ReactNode;
  label: string;
  badge?: string;
}) {
  return (
    <NavLink
      to={to}
      className={({ isActive }) =>
        cn(
          'flex items-center gap-2 px-3 h-10 rounded-[var(--df-radius)] text-sm font-medium transition-colors',
          isActive
            ? 'bg-[var(--df-accent-soft)] text-[var(--df-accent)]'
            : 'text-[var(--df-ink-2)] hover:bg-[var(--df-surface-2)] hover:text-[var(--df-ink)]',
        )
      }
    >
      {icon}
      <span className="flex-1">{label}</span>
      {badge && <span className="df-mono text-[11px] text-[var(--df-ink-3)]">{badge}</span>}
    </NavLink>
  );
}

function TopBar() {
  const navigate = useNavigate();
  return (
    <header className="h-12 px-6 border-b border-[var(--df-border)] bg-[var(--df-surface)] flex items-center justify-between gap-4 sticky top-0 z-10">
      <div className="flex items-center gap-3">
        <History size={16} strokeWidth={1.6} className="text-[var(--df-ink-3)]" aria-hidden />
        <span className="df-caps">Admin</span>
      </div>
      <div className="relative w-[360px]">
        <Search
          className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--df-ink-3)]"
          size={14}
          aria-hidden
        />
        <input
          placeholder="Rechercher… (⌘K)"
          className="df-input pl-8 h-9 text-sm"
          aria-label="Recherche globale"
        />
        <kbd className="absolute right-3 top-1/2 -translate-y-1/2 df-mono text-[10px] text-[var(--df-ink-4)] hidden md:inline">
          ⌘K
        </kbd>
      </div>
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => {
            useQuoteStore.getState().newQuote();
            navigate('/tablet');
          }}
          className="inline-flex items-center gap-1.5 px-3 h-8 rounded-[var(--df-radius)] bg-[var(--df-surface-2)] border border-[var(--df-border)] text-xs font-medium hover:bg-[var(--df-bg-2)]"
        >
          <Plus size={14} strokeWidth={1.8} />
          Nouveau
        </button>
        <div className="w-7 h-7 rounded-full bg-[var(--df-accent-soft)] text-[var(--df-accent)] flex items-center justify-center text-[11px] font-semibold">
          JO
        </div>
      </div>
    </header>
  );
}
