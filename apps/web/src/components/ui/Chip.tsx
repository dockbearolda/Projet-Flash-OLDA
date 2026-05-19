import type { HTMLAttributes, ReactNode } from 'react';
import { cn } from '@/lib/cn';

export type ChipVariant = 'default' | 'accent' | 'success' | 'warning' | 'danger';

export interface ChipProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: ChipVariant;
  children: ReactNode;
}

const variantClasses: Record<ChipVariant, string> = {
  default: 'bg-[var(--df-surface-2)] text-[var(--df-ink-2)]',
  accent: 'bg-[var(--df-accent-soft)] text-[var(--df-accent)]',
  success: 'bg-[rgba(58,109,84,0.12)] text-[var(--df-success)]',
  warning: 'bg-[rgba(169,110,22,0.12)] text-[var(--df-warning)]',
  danger: 'bg-[rgba(162,59,42,0.12)] text-[var(--df-danger)]',
};

export function Chip({ variant = 'default', className, children, ...rest }: ChipProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium',
        variantClasses[variant],
        className,
      )}
      {...rest}
    >
      {children}
    </span>
  );
}
