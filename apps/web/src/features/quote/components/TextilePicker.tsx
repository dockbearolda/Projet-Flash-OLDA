import { useMemo, useState } from 'react';
import { TEXTILE_COLORS } from '@df/shared';
import { Swatch } from '@/components/ui/Swatch';
import { SegToggle } from '@/components/ui/SegToggle';

interface Props {
  value: string;
  onChange: (id: string) => void;
}

const FILTERS = [
  { value: 'best' as const, label: 'Best' },
  { value: 'all' as const, label: 'Tout' },
];

export function TextilePicker({ value, onChange }: Props) {
  const [filter, setFilter] = useState<'best' | 'all'>('best');

  const visible = useMemo(
    () => (filter === 'best' ? TEXTILE_COLORS.filter((c) => c.best) : TEXTILE_COLORS),
    [filter],
  );

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-2">
        <SegToggle
          value={filter}
          onChange={setFilter}
          options={FILTERS}
          ariaLabel="Filtre coloris"
        />
        <span className="df-caps">{visible.length} coloris</span>
      </div>
      <div
        className="grid gap-2"
        style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(72px, 1fr))' }}
        role="radiogroup"
        aria-label="Coloris textile"
      >
        {visible.map((c) => (
          <div key={c.id} className="flex flex-col items-center gap-1.5">
            <Swatch
              hex={c.hex}
              name={c.name}
              size={44}
              selected={value === c.id}
              role="radio"
              aria-checked={value === c.id}
              onClick={() => {
                onChange(c.id);
              }}
            />
            <span className="text-[11px] text-center truncate w-full text-[var(--df-ink-2)]">
              {c.name}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
