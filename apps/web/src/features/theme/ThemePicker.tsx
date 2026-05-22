import { Check } from 'lucide-react';
import { cn } from '@/lib/cn';
import { THEMES, useTheme, type ThemeMeta } from './themes';

export function ThemePicker() {
  const [current, select] = useTheme();
  return (
    <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-5 gap-2.5">
      {THEMES.map((t) => (
        <ThemeTile
          key={t.id}
          theme={t}
          selected={t.id === current}
          onSelect={() => {
            select(t.id);
          }}
        />
      ))}
    </div>
  );
}

function ThemeTile({
  theme,
  selected,
  onSelect,
}: {
  theme: ThemeMeta;
  selected: boolean;
  onSelect: () => void;
}) {
  const p = theme.preview;
  return (
    <button
      type="button"
      onClick={onSelect}
      aria-pressed={selected}
      aria-label={`Thème ${theme.name}`}
      title={theme.tagline}
      className={cn(
        'group text-left rounded-[var(--df-radius)] border p-1.5 transition-[border-color,box-shadow,transform] duration-150',
        'bg-[var(--df-surface)] hover:-translate-y-0.5',
        selected
          ? 'border-transparent'
          : 'border-[var(--df-border)] hover:border-[var(--df-border-strong)]',
      )}
      style={
        selected
          ? { boxShadow: '0 0 0 2px var(--df-surface), 0 0 0 3px var(--df-accent)' }
          : undefined
      }
    >
      {/* Aperçu vivant — couleurs littérales du thème, indépendantes du thème actif */}
      <div className="h-11 rounded-md p-1 flex gap-1 overflow-hidden" style={{ background: p.bg }}>
        <div
          className="w-1/4 rounded-sm border"
          style={{ background: p.surface, borderColor: p.border }}
        />
        <div
          className="flex-1 rounded-sm border px-1.5 flex flex-col justify-center gap-1"
          style={{ background: p.surface, borderColor: p.border }}
        >
          <div className="h-1.5 rounded-full" style={{ width: '55%', background: p.accent }} />
          <div
            className="h-1 rounded-full"
            style={{ width: '100%', background: p.ink, opacity: 0.75 }}
          />
          <div className="h-1 rounded-full" style={{ width: '68%', background: p.ink3 }} />
        </div>
      </div>

      <div className="mt-1.5 flex items-center justify-between gap-1">
        <span className="text-xs font-medium text-[var(--df-ink)] truncate">{theme.name}</span>
        <span
          aria-hidden
          className={cn(
            'shrink-0 inline-flex items-center justify-center w-4 h-4 rounded-full transition-colors',
            selected
              ? 'bg-[var(--df-accent)] text-[var(--df-accent-ink)]'
              : 'border border-[var(--df-border-strong)]',
          )}
        >
          {selected && <Check size={11} strokeWidth={2.6} />}
        </span>
      </div>
    </button>
  );
}
