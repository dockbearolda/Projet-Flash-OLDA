import { Plus, X } from 'lucide-react';
import type { QuoteLine } from '@df/shared';
import { useCatalog } from '@/features/catalog/useCatalog';
import { cn } from '@/lib/cn';
import { lineQty } from '../pricing';

interface Props {
  lines: QuoteLine[];
  activeId: string;
  onSelect: (id: string) => void;
  onAdd: () => void;
  onRemove: (id: string) => void;
}

export function LineTabs({ lines, activeId, onSelect, onAdd, onRemove }: Props) {
  const { productByRef, placementById } = useCatalog();
  return (
    <div className="flex items-center gap-2 overflow-x-auto pb-1">
      {lines.map((l, i) => {
        const product = productByRef[l.productRef];
        const placement = placementById[l.placementId];
        const qty = lineQty(l.sizes);
        const active = activeId === l.id;
        return (
          <div
            key={l.id}
            className={cn(
              'group inline-flex items-center gap-2 px-3 h-10 rounded-[var(--df-radius)] border transition-colors',
              active
                ? 'bg-[var(--df-surface)] border-[var(--df-accent)] text-[var(--df-ink)] shadow-[var(--df-shadow-1)]'
                : 'bg-[var(--df-surface-2)] border-[var(--df-border)] text-[var(--df-ink-2)] hover:bg-[var(--df-bg-2)]',
            )}
          >
            <button
              type="button"
              onClick={() => {
                onSelect(l.id);
              }}
              className="flex items-center gap-2 text-left"
              aria-current={active}
            >
              <span className="df-caps">#{i + 1}</span>
              <span className="text-xs font-medium truncate max-w-[140px]">
                {product?.name ?? '—'}
              </span>
              <span className="text-[10px] text-[var(--df-ink-3)] truncate max-w-[100px]">
                {placement?.label ?? '—'}
              </span>
              <span className="df-mono text-[10px] text-[var(--df-ink-3)]">·</span>
              <span className="df-mono text-[10px] tabular-nums">{qty}</span>
            </button>
            {lines.length > 1 && (
              <button
                type="button"
                aria-label={`Supprimer la ligne #${String(i + 1)}`}
                onClick={(e) => {
                  e.stopPropagation();
                  onRemove(l.id);
                }}
                className="p-1 rounded hover:bg-[var(--df-bg-2)] text-[var(--df-ink-3)] hover:text-[var(--df-danger)]"
              >
                <X size={14} strokeWidth={1.8} aria-hidden />
              </button>
            )}
          </div>
        );
      })}
      <button
        type="button"
        onClick={onAdd}
        className="inline-flex items-center gap-1.5 px-3 h-10 rounded-[var(--df-radius)] bg-transparent border border-dashed border-[var(--df-border-strong)] text-[var(--df-ink-2)] text-xs font-medium hover:bg-[var(--df-surface-2)] hover:text-[var(--df-ink)]"
      >
        <Plus size={14} strokeWidth={1.8} aria-hidden />
        Ajouter une ligne
      </button>
    </div>
  );
}
