import { cn } from '@/lib/cn';

const DIGITS = ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9'];

export interface RollingNumberProps {
  /** Numeric value to display. */
  value: number;
  /** Formatter applied to `value` (e.g. `fmtEUR.format`). Defaults to `String`. */
  format?: (n: number) => string;
  /** Roll duration in ms. */
  durationMs?: number;
  className?: string;
}

/**
 * Odometer-style number: every digit sits in a clipped 1em window over a
 * vertical 0–9 strip, and a CSS transform rolls the strip to the right digit
 * whenever `value` changes. Non-digit characters (separators, €) render flat.
 */
export function RollingNumber({
  value,
  format = (n) => String(n),
  durationMs = 480,
  className,
}: RollingNumberProps) {
  const text = format(value);

  return (
    <span className={cn('inline-flex items-end leading-none tabular-nums', className)}>
      <span className="sr-only">{text}</span>
      <span aria-hidden className="inline-flex items-end">
        {Array.from(text).map((ch, i) => {
          const d = ch.charCodeAt(0) - 48;
          if (d >= 0 && d <= 9) {
            return (
              <span
                key={i}
                className="inline-block overflow-hidden"
                style={{ height: '1em', lineHeight: '1em' }}
              >
                <span
                  className="flex flex-col transition-transform ease-out motion-reduce:transition-none"
                  style={{
                    transform: `translateY(${-d * 10}%)`,
                    transitionDuration: `${durationMs}ms`,
                  }}
                >
                  {DIGITS.map((n) => (
                    <span key={n} style={{ height: '1em', lineHeight: '1em' }}>
                      {n}
                    </span>
                  ))}
                </span>
              </span>
            );
          }
          return (
            <span key={i} style={{ whiteSpace: 'pre' }}>
              {ch}
            </span>
          );
        })}
      </span>
    </span>
  );
}
