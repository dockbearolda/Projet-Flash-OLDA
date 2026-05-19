import type { ButtonHTMLAttributes } from 'react';
import { Check } from 'lucide-react';
import { cn } from '@/lib/cn';
import { inkOn } from '@/lib/color';

export type SwatchSize = 24 | 28 | 32 | 36 | 40 | 44 | 48;

export interface SwatchProps extends Omit<
  ButtonHTMLAttributes<HTMLButtonElement>,
  'children' | 'color'
> {
  hex: string | null;
  name?: string;
  size?: SwatchSize;
  selected?: boolean;
  multi?: boolean;
}

export function Swatch({
  hex,
  name,
  size = 36,
  selected = false,
  multi = false,
  className,
  ...rest
}: SwatchProps) {
  const dimension = `${String(size)}px`;
  const checkColor = hex === null ? '#0e1116' : inkOn(hex) === 'light' ? '#f7f8f9' : '#0e1116';

  const background = multi
    ? 'conic-gradient(from 0deg, #c8261c, #f1c63a, #2c6041, #1f3aa8, #c8261c)'
    : (hex ?? '#a4adb6');

  return (
    <button
      type="button"
      aria-label={name ?? 'Coloris'}
      aria-pressed={selected}
      className={cn(
        'relative inline-flex items-center justify-center rounded-full transition-transform duration-150',
        'hover:scale-105 disabled:cursor-not-allowed disabled:opacity-50',
        selected
          ? 'shadow-[0_0_0_2px_var(--df-bg),0_0_0_4px_var(--df-accent)]'
          : 'shadow-[inset_0_0_0_1px_rgba(14,17,22,0.08)]',
        className,
      )}
      style={{ width: dimension, height: dimension, background }}
      {...rest}
    >
      {selected ? (
        <Check aria-hidden size={Math.round(size * 0.42)} strokeWidth={2} color={checkColor} />
      ) : null}
    </button>
  );
}
