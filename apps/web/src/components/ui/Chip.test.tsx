import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Chip } from './Chip';

describe('Chip', () => {
  it('renders children', () => {
    render(<Chip>110 pièces</Chip>);
    expect(screen.getByText('110 pièces')).toBeInTheDocument();
  });

  it('applies default variant', () => {
    render(<Chip>Default</Chip>);
    const el = screen.getByText('Default');
    expect(el.className).toContain('--df-surface-2');
  });

  it('applies accent variant', () => {
    render(<Chip variant="accent">Accent</Chip>);
    expect(screen.getByText('Accent').className).toContain('--df-accent-soft');
  });

  it('forwards rest props', () => {
    render(<Chip data-testid="my-chip">X</Chip>);
    expect(screen.getByTestId('my-chip')).toBeInTheDocument();
  });

  it('renders all semantic variants', () => {
    const variants = ['default', 'accent', 'success', 'warning', 'danger'] as const;
    for (const v of variants) {
      const { unmount } = render(<Chip variant={v}>{v}</Chip>);
      expect(screen.getByText(v)).toBeInTheDocument();
      unmount();
    }
  });
});
