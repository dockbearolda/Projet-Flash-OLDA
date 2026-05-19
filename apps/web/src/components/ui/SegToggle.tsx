import type { ReactNode } from 'react';
import { cn } from '@/lib/cn';

export interface SegToggleOption<T extends string> {
  value: T;
  label: ReactNode;
}

export interface SegToggleProps<T extends string> {
  value: T;
  onChange: (value: T) => void;
  options: readonly SegToggleOption<T>[];
  className?: string;
  ariaLabel?: string;
}

export function SegToggle<T extends string>({
  value,
  onChange,
  options,
  className,
  ariaLabel,
}: SegToggleProps<T>) {
  return (
    <div
      role="radiogroup"
      aria-label={ariaLabel}
      className={cn(
        'inline-flex items-center gap-0.5 p-[3px] rounded-[var(--df-radius)] bg-[var(--df-surface-2)] border border-[var(--df-border)]',
        className,
      )}
    >
      {options.map((opt) => {
        const active = opt.value === value;
        return (
          <button
            key={opt.value}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => {
              onChange(opt.value);
            }}
            className={cn(
              'inline-flex items-center justify-center px-3 h-8 text-xs font-medium rounded-[calc(var(--df-radius)-3px)] transition-colors',
              active
                ? 'bg-[var(--df-surface)] text-[var(--df-ink)] shadow-[var(--df-shadow-1)]'
                : 'bg-transparent text-[var(--df-ink-2)] hover:text-[var(--df-ink)]',
            )}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}
