import { SIZE_KEYS, SIZE_LABELS } from '@df/shared';
import type { Sizes, SizeKey } from '@df/shared';
import { fmtInt } from '@/lib/format';

interface Props {
  sizes: Sizes;
  onChange: (sizes: Sizes) => void;
  /** Tailles proposées par la référence. Vide / non fourni ⇒ toutes les tailles. */
  availableSizes?: readonly SizeKey[] | undefined;
}

export function QtyGrid({ sizes, onChange, availableSizes }: Props) {
  const keys: readonly SizeKey[] =
    availableSizes && availableSizes.length > 0
      ? SIZE_KEYS.filter((k) => availableSizes.includes(k))
      : SIZE_KEYS;
  const total = keys.reduce((acc, k) => acc + sizes[k], 0);

  function set(k: SizeKey, raw: string) {
    const n = parseInt(raw, 10);
    const v = Number.isFinite(n) && n >= 0 ? n : 0;
    onChange({ ...sizes, [k]: v });
  }

  return (
    <div className="flex flex-col gap-1.5">
      <span className="text-[11px] text-[var(--df-ink-4)]">Répartition de la quantité totale</span>
      <div
        className="grid gap-1.5"
        style={{ gridTemplateColumns: `repeat(${String(keys.length + 1)}, minmax(0, 1fr))` }}
      >
        {keys.map((k) => (
          <SizeCell
            key={k}
            label={SIZE_LABELS[k]}
            value={sizes[k]}
            onChange={(v) => {
              set(k, v);
            }}
          />
        ))}
        <TotalCell value={total} />
      </div>
    </div>
  );
}

function SizeCell({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number;
  onChange: (raw: string) => void;
}) {
  return (
    <label className="flex flex-col gap-1">
      <span className="df-caps text-center">{label}</span>
      <input
        type="text"
        inputMode="numeric"
        pattern="[0-9]*"
        value={value === 0 ? '' : value}
        onChange={(e) => {
          const cleaned = e.target.value.replace(/[^\d]/g, '');
          onChange(cleaned || '0');
        }}
        className="h-[52px] px-2 text-center text-base font-semibold bg-[var(--df-surface)] border border-[var(--df-border)] rounded-[var(--df-radius-sm)] focus:border-[var(--df-accent)] focus:shadow-[0_0_0_3px_var(--df-accent-soft)] outline-none transition-colors tabular-nums"
        aria-label={`Quantité ${label}`}
      />
    </label>
  );
}

function TotalCell({ value }: { value: number }) {
  return (
    <div className="flex flex-col gap-1">
      <span className="df-caps text-center">Total</span>
      <div
        role="status"
        aria-live="polite"
        className="h-[52px] px-2 flex items-center justify-center text-lg font-bold rounded-[var(--df-radius-sm)] bg-[var(--df-accent)] text-[var(--df-accent-ink)] shadow-[var(--df-shadow-1)] tabular-nums"
      >
        {fmtInt.format(value)}
      </div>
    </div>
  );
}
