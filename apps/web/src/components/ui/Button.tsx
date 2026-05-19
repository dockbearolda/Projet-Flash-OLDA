import { forwardRef } from 'react';
import type { ButtonHTMLAttributes } from 'react';
import { cn } from '@/lib/cn';

export type ButtonVariant = 'primary' | 'default' | 'ghost';
export type ButtonSize = 'default' | 'lg';

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
}

const variantClasses: Record<ButtonVariant, string> = {
  primary:
    'bg-[var(--df-accent)] text-[var(--df-accent-ink)] hover:bg-[var(--df-accent-2)] disabled:opacity-50',
  default:
    'bg-[var(--df-surface-2)] text-[var(--df-ink)] border border-[var(--df-border)] hover:bg-[var(--df-bg-2)] disabled:opacity-50',
  ghost: 'bg-transparent text-[var(--df-ink-2)] hover:bg-[var(--df-surface-2)] disabled:opacity-50',
};

const sizeClasses: Record<ButtonSize, string> = {
  default: 'h-10 px-4 text-sm rounded-[var(--df-radius)]',
  lg: 'h-14 px-6 text-base rounded-[var(--df-radius-lg)]',
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant = 'default', size = 'default', className, type = 'button', ...rest },
  ref,
) {
  return (
    <button
      ref={ref}
      type={type}
      className={cn(
        'inline-flex items-center justify-center gap-2 font-medium transition-colors select-none',
        'disabled:cursor-not-allowed',
        variantClasses[variant],
        sizeClasses[size],
        className,
      )}
      {...rest}
    />
  );
});
