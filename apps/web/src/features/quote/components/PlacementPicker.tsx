import { useMemo } from 'react';
import { ChevronDown } from 'lucide-react';
import { PLACEMENTS } from '@df/shared';

interface Props {
  value: string;
  onChange: (id: string) => void;
}

export function PlacementPicker({ value, onChange }: Props) {
  const selected = useMemo(() => PLACEMENTS.find((p) => p.id === value), [value]);

  return (
    <div className="space-y-3">
      <div className="relative">
        <select
          className="df-input appearance-none pr-9 cursor-pointer"
          value={value}
          onChange={(e) => {
            onChange(e.target.value);
          }}
          aria-label="Placement DTF"
        >
          {!selected && <option value="">Sélectionner un placement…</option>}
          {PLACEMENTS.map((p) => (
            <option key={p.id} value={p.id}>
              {p.label}
            </option>
          ))}
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
          <span className="flex-1 text-sm font-medium truncate text-[var(--df-ink)]">
            {selected.label}
          </span>
        </div>
      )}
    </div>
  );
}
