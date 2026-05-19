import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { FlockPicker } from './FlockPicker';

describe('FlockPicker', () => {
  it('shows the multi banner when mode=multi', () => {
    render(
      <FlockPicker mode="multi" color={null} onMode={() => undefined} onColor={() => undefined} />,
    );
    expect(screen.getByText(/Impression multi-couleurs/i)).toBeInTheDocument();
  });

  it('shows the color grid when mode=single', () => {
    render(
      <FlockPicker mode="single" color={null} onMode={() => undefined} onColor={() => undefined} />,
    );
    // Color grid (9 colors) + mode toggle (2) = 11 total radios; scope to coloris flocage group.
    const group = screen.getByRole('radiogroup', { name: 'Coloris flocage' });
    expect(group.querySelectorAll('[role="radio"]')).toHaveLength(9);
  });

  it('clicking a color triggers onColor with its id', async () => {
    const onColor = vi.fn();
    render(<FlockPicker mode="single" color={null} onMode={() => undefined} onColor={onColor} />);
    const rouge = screen.getByRole('radio', { name: /Rouge/i });
    await userEvent.click(rouge);
    expect(onColor).toHaveBeenCalledWith('rouge');
  });

  it('clicking the mode toggle calls onMode', async () => {
    const onMode = vi.fn();
    render(<FlockPicker mode="multi" color={null} onMode={onMode} onColor={() => undefined} />);
    await userEvent.click(screen.getByRole('radio', { name: 'Couleur unique' }));
    expect(onMode).toHaveBeenCalledWith('single');
  });

  it('marks the selected color', () => {
    render(
      <FlockPicker mode="single" color="or" onMode={() => undefined} onColor={() => undefined} />,
    );
    expect(screen.getByRole('radio', { name: /Or/i })).toHaveAttribute('aria-checked', 'true');
  });
});
