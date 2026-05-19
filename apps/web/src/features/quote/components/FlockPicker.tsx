import { FLOCK_COLORS } from '@df/shared';
import type { FlockMode } from '@df/shared';
import { Swatch } from '@/components/ui/Swatch';
import { SegToggle } from '@/components/ui/SegToggle';

interface Props {
  mode: FlockMode;
  color: string | null;
  onMode: (m: FlockMode) => void;
  onColor: (id: string) => void;
}

const MODES = [
  { value: 'multi' as const, label: 'Multi couleurs' },
  { value: 'single' as const, label: 'Couleur unique' },
];

export function FlockPicker({ mode, color, onMode, onColor }: Props) {
  const colors = FLOCK_COLORS.filter((c) => !c.special);

  return (
    <div className="space-y-3">
      <SegToggle value={mode} onChange={onMode} options={MODES} ariaLabel="Mode flocage" />
      {mode === 'single' && (
        <div
          className="grid gap-2"
          style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(72px, 1fr))' }}
          role="radiogroup"
          aria-label="Coloris flocage"
        >
          {colors.map((c) => (
            <div key={c.id} className="flex flex-col items-center gap-1.5">
              <Swatch
                hex={c.hex}
                name={c.name}
                size={44}
                selected={color === c.id}
                role="radio"
                aria-checked={color === c.id}
                onClick={() => {
                  onColor(c.id);
                }}
              />
              <span className="text-[11px] text-center truncate w-full text-[var(--df-ink-2)]">
                {c.name}
              </span>
            </div>
          ))}
        </div>
      )}
      {mode === 'multi' && (
        <div className="flex items-center gap-3 px-4 py-3 rounded-[var(--df-radius)] bg-[var(--df-surface-2)] border border-[var(--df-border)]">
          <Swatch hex={null} multi name="Multi" size={36} selected />
          <p className="text-sm text-[var(--df-ink-2)] leading-tight">
            Impression multi-couleurs — toutes les nuances du visuel client seront reproduites
            fidèlement.
          </p>
        </div>
      )}
    </div>
  );
}
