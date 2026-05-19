import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { SegToggle } from './SegToggle';

const options = [
  { value: 'a' as const, label: 'A' },
  { value: 'b' as const, label: 'B' },
];

describe('SegToggle', () => {
  it('renders all options', () => {
    render(<SegToggle value="a" onChange={() => undefined} options={options} />);
    expect(screen.getByRole('radio', { name: 'A' })).toBeInTheDocument();
    expect(screen.getByRole('radio', { name: 'B' })).toBeInTheDocument();
  });

  it('marks the active option as checked', () => {
    render(<SegToggle value="a" onChange={() => undefined} options={options} />);
    expect(screen.getByRole('radio', { name: 'A' })).toHaveAttribute('aria-checked', 'true');
    expect(screen.getByRole('radio', { name: 'B' })).toHaveAttribute('aria-checked', 'false');
  });

  it('calls onChange with new value', async () => {
    const onChange = vi.fn();
    render(<SegToggle value="a" onChange={onChange} options={options} />);
    await userEvent.click(screen.getByRole('radio', { name: 'B' }));
    expect(onChange).toHaveBeenCalledWith('b');
  });

  it('exposes aria-label on group', () => {
    render(<SegToggle value="a" onChange={() => undefined} options={options} ariaLabel="Choix" />);
    expect(screen.getByRole('radiogroup', { name: 'Choix' })).toBeInTheDocument();
  });
});
