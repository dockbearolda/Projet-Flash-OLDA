import { Plane, Ship, Boxes } from 'lucide-react';
import type { Transport } from '@df/shared';
import { cn } from '@/lib/cn';
import { fmtEUR } from '@/lib/format';

interface Props {
  value: Transport;
  onChange: (t: Transport) => void;
}

const OPTIONS: readonly {
  id: Transport;
  label: string;
  detail: string;
  Icon: typeof Plane;
}[] = [
  { id: 'maritime', label: 'Maritime', detail: 'Gratuit · Livraison ≈ 1 mois', Icon: Ship },
  {
    id: 'chronopost',
    label: 'Chronopost',
    detail: `+${fmtEUR.format(1.5)} HT / pièce · Livraison ≈ 10 jours`,
    Icon: Plane,
  },
  { id: 'stock', label: 'Stock', detail: 'Gratuit · Disponible sur place', Icon: Boxes },
];

export function TransportPicker({ value, onChange }: Props) {
  return (
    <div className="grid grid-cols-1 gap-1.5" role="radiogroup" aria-label="Mode de transport">
      {OPTIONS.map((opt) => {
        const active = value === opt.id;
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
              'flex items-center gap-3 px-3 h-14 rounded-[var(--df-radius)] border text-left transition-colors',
              active
                ? 'bg-[var(--df-accent-soft)] border-[var(--df-accent)] text-[var(--df-accent)]'
                : 'bg-[var(--df-surface)] border-[var(--df-border)] hover:bg-[var(--df-surface-2)] text-[var(--df-ink)]',
            )}
          >
            <Icon size={20} strokeWidth={1.6} aria-hidden />
            <div className="flex-1">
              <div className="text-sm font-semibold leading-tight">{opt.label}</div>
              <div className="text-[11px] text-[var(--df-ink-3)] leading-tight">{opt.detail}</div>
            </div>
          </button>
        );
      })}
    </div>
  );
}
