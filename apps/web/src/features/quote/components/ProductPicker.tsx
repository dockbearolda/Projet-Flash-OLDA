import { useMemo, useState } from 'react';
import { Search } from 'lucide-react';
import { PRODUCTS } from '@df/shared';
import type { Product, ProductFamily } from '@df/shared';
import { fmtEUR } from '@/lib/format';
import { cn } from '@/lib/cn';

interface Props {
  value: string;
  onChange: (ref: string) => void;
}

const FAMILY_LABEL: Record<ProductFamily | 'all', string> = {
  all: 'Tous',
  unisexe: 'Unisexe',
  femme: 'Femme',
  enfant: 'Enfant',
};

export function ProductPicker({ value, onChange }: Props) {
  const [filter, setFilter] = useState<ProductFamily | 'all'>('all');
  const [search, setSearch] = useState('');

  const visible = useMemo(() => {
    const term = search.trim().toLowerCase();
    return PRODUCTS.filter((p) => {
      if (filter !== 'all' && p.family !== filter) return false;
      if (!term) return true;
      return (
        p.ref.toLowerCase().includes(term) ||
        p.supplierRef.toLowerCase().includes(term) ||
        p.name.toLowerCase().includes(term)
      );
    });
  }, [filter, search]);

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <Search
            className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--df-ink-3)]"
            size={16}
            strokeWidth={1.8}
            aria-hidden
          />
          <input
            className="df-input pl-9"
            placeholder="Rechercher ref, NS, nom…"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
            }}
            aria-label="Recherche produit"
          />
        </div>
        <div className="inline-flex p-[3px] rounded-[var(--df-radius)] bg-[var(--df-surface-2)] border border-[var(--df-border)]">
          {(['all', 'unisexe', 'femme', 'enfant'] as const).map((f) => (
            <button
              key={f}
              type="button"
              onClick={() => {
                setFilter(f);
              }}
              aria-pressed={filter === f}
              className={cn(
                'px-3 h-8 text-xs font-medium rounded-[calc(var(--df-radius)-3px)] transition-colors',
                filter === f
                  ? 'bg-[var(--df-surface)] text-[var(--df-ink)] shadow-[var(--df-shadow-1)]'
                  : 'bg-transparent text-[var(--df-ink-2)] hover:text-[var(--df-ink)]',
              )}
            >
              {FAMILY_LABEL[f]}
            </button>
          ))}
        </div>
      </div>

      <div
        role="listbox"
        aria-label="Liste produits"
        className="grid grid-cols-1 gap-1.5 max-h-[280px] overflow-y-auto pr-1"
      >
        {visible.map((p) => (
          <ProductRow
            key={p.ref}
            product={p}
            selected={value === p.ref}
            onClick={() => {
              onChange(p.ref);
            }}
          />
        ))}
        {visible.length === 0 && (
          <div className="text-sm text-[var(--df-ink-3)] py-6 text-center">
            Aucun produit ne correspond.
          </div>
        )}
      </div>
    </div>
  );
}

function ProductRow({
  product,
  selected,
  onClick,
}: {
  product: Product;
  selected: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      role="option"
      aria-selected={selected}
      onClick={onClick}
      className={cn(
        'flex items-center gap-3 px-3 h-12 rounded-[var(--df-radius)] border text-left transition-colors',
        selected
          ? 'bg-[var(--df-accent-soft)] border-[var(--df-accent)] text-[var(--df-accent)]'
          : 'bg-[var(--df-surface)] border-[var(--df-border)] hover:bg-[var(--df-surface-2)] text-[var(--df-ink)]',
      )}
    >
      <span className="df-mono text-xs w-14 shrink-0 text-[var(--df-ink-3)]">{product.ref}</span>
      <span className="flex-1 text-sm font-medium truncate">{product.name}</span>
      <span className="df-mono text-xs text-[var(--df-ink-3)]">{product.supplierRef}</span>
      <span className="df-mono text-xs ml-2 tabular-nums">{fmtEUR.format(product.priceAchat)}</span>
    </button>
  );
}
