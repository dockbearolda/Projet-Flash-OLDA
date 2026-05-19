import type { HTMLAttributes, ReactNode } from 'react';
import { cn } from '@/lib/cn';

export interface CardProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
  elevated?: boolean;
}

export function Card({ children, className, elevated = false, ...rest }: CardProps) {
  return (
    <div
      className={cn(
        'rounded-[var(--df-radius-lg)] bg-[var(--df-surface)] border border-[var(--df-border)]',
        elevated && 'shadow-[var(--df-shadow-2)]',
        className,
      )}
      {...rest}
    >
      {children}
    </div>
  );
}

export interface CardHeaderProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
}

export function CardHeader({ children, className, ...rest }: CardHeaderProps) {
  return (
    <div className={cn('px-5 pt-5 pb-3 border-b border-[var(--df-border)]', className)} {...rest}>
      {children}
    </div>
  );
}

export interface CardBodyProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
}

export function CardBody({ children, className, ...rest }: CardBodyProps) {
  return (
    <div className={cn('p-5', className)} {...rest}>
      {children}
    </div>
  );
}
