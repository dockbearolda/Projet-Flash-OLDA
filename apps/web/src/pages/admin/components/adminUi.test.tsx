import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { NullableNumberField } from './adminUi';

describe('NullableNumberField', () => {
  it('affiche vide quand value est null', () => {
    render(<NullableNumberField value={null} onChange={vi.fn()} ariaLabel="px" />);
    expect(screen.getByLabelText('px')).toHaveValue('');
  });

  it('affiche le placeholder quand vide', () => {
    render(
      <NullableNumberField
        value={null}
        onChange={vi.fn()}
        ariaLabel="px"
        placeholder="1,50 € (défaut)"
      />,
    );
    expect(screen.getByLabelText('px')).toHaveAttribute('placeholder', '1,50 € (défaut)');
  });

  it('émet null quand on vide le champ', async () => {
    const onChange = vi.fn();
    render(<NullableNumberField value={2} onChange={onChange} ariaLabel="px" />);
    await userEvent.clear(screen.getByLabelText('px'));
    expect(onChange).toHaveBeenLastCalledWith(null);
  });

  it('émet un nombre quand on saisit', async () => {
    const onChange = vi.fn();
    render(<NullableNumberField value={null} onChange={onChange} ariaLabel="px" />);
    await userEvent.type(screen.getByLabelText('px'), '3');
    expect(onChange).toHaveBeenLastCalledWith(3);
  });
});
