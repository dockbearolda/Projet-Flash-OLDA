import { Plane, Ship, Boxes } from 'lucide-react';
import type { Transport } from '@df/shared';
import { cn } from '@/lib/cn';

interface Props {
  value: Transport;
  onChange: (t: Transport) => void;
}

const OPTIONS: readonly { id: Transport; label: string; Icon: typeof Plane }[] = [
  { id: 'maritime', label: 'Maritime', Icon: Ship },
  { id: 'chronopost', label: 'Chronopost', Icon: Plane },
  { id: 'stock', label: 'Stock', Icon: Boxes },
];

// Tabs compacts (icône + libellé) plutôt que trois grosses cartes empilées :
// le mode est choisi une fois par devis et tient sur une ligne.
export function TransportPicker({ value, onChange }: Props) {
  return (
    <div
      role="radiogroup"
      aria-label="Mode de transport"
      className="grid grid-cols-3 gap-0.5 p-[3px] rounded-[var(--df-radius)] bg-[var(--df-surface-2)] border border-[var(--df-border)]"
    >
      {OPTIONS.map((opt) => {
        const active = opt.id === value;
        const { Icon } = opt;
        return (
          <button
            key={opt.id}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => {
              onChange(opt.id);
            }}
            className={cn(
              'inline-flex items-center justify-center gap-1.5 h-11 px-1.5 text-xs font-medium rounded-[calc(var(--df-radius)-3px)] transition-colors duration-[var(--df-dur-fast)] ease-[var(--df-ease-out)]',
              active
                ? 'bg-[var(--df-surface)] text-[var(--df-ink)] shadow-[var(--df-shadow-2)]'
                : 'bg-transparent text-[var(--df-ink-2)] hover:text-[var(--df-ink)]',
            )}
          >
            <Icon size={16} strokeWidth={1.8} aria-hidden className="shrink-0" />
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}
