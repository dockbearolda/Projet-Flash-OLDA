import { useMemo } from 'react';
import { ChevronDown } from 'lucide-react';
import type { CatalogProduct, ProductFamily } from '@df/shared';
import { useCatalog } from '@/features/catalog/useCatalog';
import { fmtEUR } from '@/lib/format';

interface Props {
  value: string;
  onChange: (ref: string) => void;
}

const FAMILY_LABEL: Record<ProductFamily, string> = {
  unisexe: 'Homme',
  femme: 'Femme',
  enfant: 'Enfant',
};

const FAMILY_ORDER: ProductFamily[] = ['unisexe', 'femme', 'enfant'];

export function ProductPicker({ value, onChange }: Props) {
  const { products } = useCatalog();
  const grouped = useMemo(() => {
    const byFamily = new Map<ProductFamily, CatalogProduct[]>();
    for (const f of FAMILY_ORDER) byFamily.set(f, []);
    for (const p of products) {
      byFamily.get(p.family)?.push(p);
    }
    for (const list of byFamily.values()) {
      list.sort((a, b) => a.ref.localeCompare(b.ref, undefined, { numeric: true }));
    }
    return byFamily;
  }, [products]);

  const selected = useMemo(() => products.find((p) => p.ref === value), [products, value]);

  return (
    <div className="space-y-3">
      <div className="relative">
        <select
          className="df-input appearance-none pr-9 cursor-pointer"
          value={value}
          onChange={(e) => {
            onChange(e.target.value);
          }}
          aria-label="Produit textile"
        >
          {!selected && <option value="">Sélectionner un produit…</option>}
          {FAMILY_ORDER.map((family) => {
            const items = grouped.get(family) ?? [];
            if (items.length === 0) return null;
            return (
              <optgroup key={family} label={FAMILY_LABEL[family]}>
                {items.map((p) => (
                  <option key={p.ref} value={p.ref}>
                    {p.ref} — {p.name}
                  </option>
                ))}
              </optgroup>
            );
          })}
        </select>
        <ChevronDown
          className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--df-ink-3)] pointer-events-none"
          size={16}
          strokeWidth={1.8}
          aria-hidden
        />
      </div>

      {selected && (
        <div className="flex items-center gap-3 px-3 h-12 rounded-[var(--df-radius)] border border-[var(--df-border)] bg-[var(--df-surface-2)]">
          <span className="df-mono text-xs w-14 shrink-0 text-[var(--df-ink-3)]">
            {selected.ref}
          </span>
          <span className="flex-1 text-sm font-medium truncate text-[var(--df-ink)]">
            {selected.name}
          </span>
          <span className="df-mono text-xs text-[var(--df-ink-3)]">{selected.supplierRef}</span>
          <span className="df-mono text-xs ml-2 tabular-nums text-[var(--df-ink)]">
            {fmtEUR.format(selected.priceAchat)}
          </span>
        </div>
      )}
    </div>
  );
}
