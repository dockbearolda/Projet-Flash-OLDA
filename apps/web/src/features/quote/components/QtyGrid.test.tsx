import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QtyGrid } from './QtyGrid';
import type { Sizes } from '@df/shared';

const empty: Sizes = { xs: 0, s: 0, m: 0, l: 0, xl: 0, xxl: 0, autres: 0 };

describe('QtyGrid', () => {
  it('renders 7 size cells + total', () => {
    render(<QtyGrid sizes={empty} onChange={() => undefined} />);
    expect(screen.getByLabelText('Quantité XS')).toBeInTheDocument();
    expect(screen.getByLabelText('Quantité S')).toBeInTheDocument();
    expect(screen.getByLabelText('Quantité M')).toBeInTheDocument();
    expect(screen.getByLabelText('Quantité L')).toBeInTheDocument();
    expect(screen.getByLabelText('Quantité XL')).toBeInTheDocument();
    expect(screen.getByLabelText('Quantité 2XL')).toBeInTheDocument();
    expect(screen.getByLabelText('Quantité Autres')).toBeInTheDocument();
    expect(screen.getByRole('status')).toBeInTheDocument();
  });

  it('updates total live as inputs change', () => {
    const sizes: Sizes = { xs: 0, s: 0, m: 40, l: 40, xl: 0, xxl: 0, autres: 0 };
    render(<QtyGrid sizes={sizes} onChange={() => undefined} />);
    expect(screen.getByRole('status')).toHaveTextContent('80');
  });

  it('typing a number triggers onChange with merged sizes', async () => {
    const onChange = vi.fn();
    render(<QtyGrid sizes={empty} onChange={onChange} />);
    await userEvent.type(screen.getByLabelText('Quantité M'), '5');
    expect(onChange).toHaveBeenLastCalledWith({ ...empty, m: 5 });
  });

  it('clearing the input is treated as 0', () => {
    const onChange = vi.fn();
    render(<QtyGrid sizes={{ ...empty, m: 5 }} onChange={onChange} />);
    const m = screen.getByLabelText<HTMLInputElement>('Quantité M');
    fireEvent.change(m, { target: { value: '' } });
    expect(onChange).toHaveBeenCalled();
    const lastCall = onChange.mock.calls[onChange.mock.calls.length - 1]![0] as Sizes;
    expect(lastCall.m).toBe(0);
  });
});
