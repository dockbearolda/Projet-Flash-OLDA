import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Swatch } from './Swatch';

describe('Swatch', () => {
  it('renders with aria-label from name', () => {
    render(<Swatch hex="#1f3aa8" name="Bleu royal" />);
    expect(screen.getByRole('button', { name: 'Bleu royal' })).toBeInTheDocument();
  });

  it('falls back to generic label without name', () => {
    render(<Swatch hex="#000000" />);
    expect(screen.getByRole('button', { name: 'Coloris' })).toBeInTheDocument();
  });

  it('shows Check icon when selected', () => {
    const { container } = render(<Swatch hex="#1f3aa8" name="Bleu" selected />);
    expect(container.querySelector('svg')).toBeInTheDocument();
    expect(screen.getByRole('button')).toHaveAttribute('aria-pressed', 'true');
  });

  it('does not show Check when not selected', () => {
    const { container } = render(<Swatch hex="#1f3aa8" name="Bleu" />);
    expect(container.querySelector('svg')).not.toBeInTheDocument();
    expect(screen.getByRole('button')).toHaveAttribute('aria-pressed', 'false');
  });

  it('respects custom size', () => {
    render(<Swatch hex="#000" name="N" size={48} />);
    const el = screen.getByRole('button');
    expect(el.style.width).toBe('48px');
    expect(el.style.height).toBe('48px');
  });

  it('uses conic gradient when multi=true', () => {
    render(<Swatch hex={null} name="Multi" multi />);
    expect(screen.getByRole('button').style.background).toContain('conic-gradient');
  });

  it('handles click', async () => {
    const onClick = vi.fn();
    render(<Swatch hex="#1f3aa8" name="Bleu" onClick={onClick} />);
    await userEvent.click(screen.getByRole('button'));
    expect(onClick).toHaveBeenCalledTimes(1);
  });
});
