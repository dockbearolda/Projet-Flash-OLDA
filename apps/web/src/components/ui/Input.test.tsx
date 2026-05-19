import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Input } from './Input';

describe('Input', () => {
  it('renders with placeholder', () => {
    render(<Input placeholder="Nom" />);
    expect(screen.getByPlaceholderText('Nom')).toBeInTheDocument();
  });

  it('accepts typed value', async () => {
    render(<Input placeholder="Test" />);
    const el = screen.getByPlaceholderText<HTMLInputElement>('Test');
    await userEvent.type(el, 'Hello');
    expect(el.value).toBe('Hello');
  });

  it('applies df-input class', () => {
    render(<Input placeholder="X" />);
    expect(screen.getByPlaceholderText('X').className).toContain('df-input');
  });

  it('defaults to type=text', () => {
    render(<Input placeholder="X" />);
    expect(screen.getByPlaceholderText('X')).toHaveAttribute('type', 'text');
  });

  it('respects type=number', () => {
    render(<Input type="number" placeholder="X" />);
    expect(screen.getByPlaceholderText('X')).toHaveAttribute('type', 'number');
  });
});
