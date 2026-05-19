import { PLACEMENTS } from '@df/shared';
import type { Placement } from '@df/shared';
import { cn } from '@/lib/cn';

interface Props {
  value: string;
  onChange: (id: string) => void;
}

export function PlacementPicker({ value, onChange }: Props) {
  return (
    <div className="grid grid-cols-3 gap-2">
      {PLACEMENTS.map((p) => (
        <PlacementCard
          key={p.id}
          placement={p}
          selected={value === p.id}
          onClick={() => {
            onChange(p.id);
          }}
        />
      ))}
    </div>
  );
}

function PlacementCard({
  placement,
  selected,
  onClick,
}: {
  placement: Placement;
  selected: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={selected}
      className={cn(
        'flex flex-col gap-1.5 px-2.5 py-2.5 min-h-[78px] rounded-[var(--df-radius)] border transition-colors text-left',
        selected
          ? 'bg-[var(--df-accent-soft)] border-[var(--df-accent)] text-[var(--df-accent)]'
          : 'bg-[var(--df-surface)] border-[var(--df-border)] hover:bg-[var(--df-surface-2)] text-[var(--df-ink)]',
      )}
    >
      <div className="flex items-center gap-2">
        <TshirtMini zones={placement.zones} accent={selected} />
        <div className="text-[11px] leading-tight font-medium flex-1">{placement.label}</div>
      </div>
    </button>
  );
}

function TshirtMini({ zones, accent }: { zones: readonly string[]; accent: boolean }) {
  const accentColor = accent ? 'var(--df-accent)' : 'var(--df-ink-2)';
  const baseStroke = 'var(--df-ink-4)';
  const has = (id: string) => zones.includes(id);

  return (
    <svg viewBox="0 0 36 38" width="32" height="34" aria-hidden className="shrink-0">
      {/* T-shirt outline */}
      <path
        d="M9 4 L4 8 L4 14 L9 12 L9 34 L27 34 L27 12 L32 14 L32 8 L27 4 L22 4 C21 5.5 19.7 6 18 6 C16.3 6 15 5.5 14 4 Z"
        fill="var(--df-surface-2)"
        stroke={baseStroke}
        strokeWidth="0.6"
        strokeLinejoin="round"
      />
      {/* Coeur — small circle top left of body */}
      {has('coeur') && <circle cx="13" cy="14" r="1.8" fill={accentColor} />}
      {/* Poitrine — band across upper chest */}
      {has('poitrine') && <rect x="11" y="13" width="14" height="3" rx="0.6" fill={accentColor} />}
      {/* Dos — band lower (since we show front, we render it slightly translucent and lower) */}
      {has('dos') && (
        <rect x="11" y="21" width="14" height="4" rx="0.6" fill={accentColor} opacity="0.55" />
      )}
      {/* Manche droite (right shoulder from viewer = left of figure) */}
      {has('manche-d') && (
        <rect x="5" y="11" width="3.5" height="3.5" rx="0.5" fill={accentColor} />
      )}
      {/* Manche gauche */}
      {has('manche-g') && (
        <rect x="27.5" y="11" width="3.5" height="3.5" rx="0.5" fill={accentColor} />
      )}
    </svg>
  );
}
