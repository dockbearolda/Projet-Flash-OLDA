import { useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import { Plus, Trash2, Save, RotateCcw } from 'lucide-react';
import { cn } from '@/lib/cn';

export function PageHeader({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <div className="mb-6">
      <h1 className="df-display text-3xl mb-1">{title}</h1>
      {subtitle && <p className="text-sm text-[var(--df-ink-3)]">{subtitle}</p>}
    </div>
  );
}

export function TextField({
  value,
  onChange,
  placeholder,
  ariaLabel,
  className,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  ariaLabel?: string;
  className?: string;
}) {
  return (
    <input
      type="text"
      value={value}
      placeholder={placeholder}
      aria-label={ariaLabel}
      onChange={(e) => {
        onChange(e.target.value);
      }}
      className={cn('df-input h-9 text-sm', className)}
    />
  );
}

function numToText(n: number): string {
  return Number.isFinite(n) ? String(n).replace('.', ',') : '';
}

function parseNum(s: string): number {
  const n = Number(s.replace(',', '.'));
  return Number.isFinite(n) ? n : 0;
}

export function NumberField({
  value,
  onChange,
  suffix,
  ariaLabel,
  className,
  allowDecimal = true,
}: {
  value: number;
  onChange: (v: number) => void;
  suffix?: string;
  ariaLabel?: string;
  className?: string;
  allowDecimal?: boolean;
}) {
  const [text, setText] = useState(() => numToText(value));

  // Re-seed from the prop when it changes externally (reset / cancel).
  useEffect(() => {
    if (Math.abs(parseNum(text) - value) > 1e-9) {
      setText(numToText(value));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  return (
    <div className={cn('relative', className)}>
      <input
        type="text"
        inputMode={allowDecimal ? 'decimal' : 'numeric'}
        value={text}
        aria-label={ariaLabel}
        onChange={(e) => {
          let cleaned = e.target.value.replace(allowDecimal ? /[^\d.,]/g : /[^\d]/g, '');
          if (allowDecimal) {
            const sep = cleaned.search(/[.,]/);
            if (sep !== -1) {
              cleaned = cleaned.slice(0, sep + 1) + cleaned.slice(sep + 1).replace(/[.,]/g, '');
            }
          }
          setText(cleaned);
          onChange(parseNum(cleaned));
        }}
        className={cn('df-input h-9 text-sm text-right tabular-nums df-mono', suffix ? 'pr-7' : '')}
      />
      {suffix && (
        <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-[var(--df-ink-3)] pointer-events-none">
          {suffix}
        </span>
      )}
    </div>
  );
}

export function DeleteRowButton({ onClick, label }: { onClick: () => void; label: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      className="inline-flex items-center justify-center w-9 h-9 rounded-[var(--df-radius)] text-[var(--df-ink-3)] hover:bg-[var(--df-surface-2)] hover:text-[var(--df-danger)]"
    >
      <Trash2 size={16} strokeWidth={1.7} aria-hidden />
    </button>
  );
}

export function AddRowButton({ onClick, label }: { onClick: () => void; label: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex items-center gap-1.5 px-3 h-10 rounded-[var(--df-radius)] bg-transparent border border-dashed border-[var(--df-border-strong)] text-[var(--df-ink-2)] text-sm font-medium hover:bg-[var(--df-surface-2)] hover:text-[var(--df-ink)]"
    >
      <Plus size={16} strokeWidth={1.8} aria-hidden />
      {label}
    </button>
  );
}

export function Toggle({
  value,
  onChange,
  ariaLabel,
}: {
  value: boolean;
  onChange: (v: boolean) => void;
  ariaLabel: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={value}
      aria-label={ariaLabel}
      onClick={() => {
        onChange(!value);
      }}
      className={cn(
        'relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors',
        value ? 'bg-[var(--df-accent)]' : 'bg-[var(--df-border-strong)]',
      )}
    >
      <span
        className={cn(
          'inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform',
          value ? 'translate-x-5' : 'translate-x-0.5',
        )}
      />
    </button>
  );
}

/** Action bar shown while there are unsaved edits (sticky by default). */
export function SaveBar({
  dirty,
  saving,
  onSave,
  onCancel,
  sticky = true,
  label = 'Modifications non enregistrées',
}: {
  dirty: boolean;
  saving: boolean;
  onSave: () => void;
  onCancel: () => void;
  sticky?: boolean;
  label?: string;
}) {
  if (!dirty && !saving) return null;
  return (
    <div className={cn('mt-6 z-10', sticky ? 'sticky bottom-0 left-0 right-0' : '')}>
      <div className="flex items-center justify-between gap-4 px-5 py-3 rounded-[var(--df-radius-lg)] bg-[var(--df-surface)] border border-[var(--df-accent)] shadow-[var(--df-shadow-2)]">
        <span className="text-sm text-[var(--df-ink-2)]">{label}</span>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onCancel}
            disabled={saving}
            className="inline-flex items-center gap-1.5 px-3 h-10 rounded-[var(--df-radius)] bg-[var(--df-surface-2)] border border-[var(--df-border)] text-sm font-medium hover:bg-[var(--df-bg-2)] disabled:opacity-50"
          >
            <RotateCcw size={15} strokeWidth={1.8} aria-hidden />
            Annuler
          </button>
          <button
            type="button"
            onClick={onSave}
            disabled={saving}
            className="inline-flex items-center gap-1.5 px-4 h-10 rounded-[var(--df-radius)] bg-[var(--df-accent)] text-[var(--df-accent-ink)] text-sm font-medium hover:bg-[var(--df-accent-2)] disabled:opacity-60"
          >
            <Save size={15} strokeWidth={1.8} aria-hidden />
            {saving ? 'Enregistrement…' : 'Enregistrer'}
          </button>
        </div>
      </div>
    </div>
  );
}

export function Card({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div
      className={cn(
        'rounded-[var(--df-radius-lg)] bg-[var(--df-surface)] border border-[var(--df-border)] overflow-hidden',
        className,
      )}
    >
      {children}
    </div>
  );
}
