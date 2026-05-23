import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Button } from './Button';

describe('Button', () => {
  it('renders children', () => {
    render(<Button>Cliquer</Button>);
    expect(screen.getByRole('button', { name: 'Cliquer' })).toBeInTheDocument();
  });

  it('defaults to type=button', () => {
    render(<Button>Test</Button>);
    expect(screen.getByRole('button')).toHaveAttribute('type', 'button');
  });

  it('respects explicit type=submit', () => {
    render(<Button type="submit">Envoyer</Button>);
    expect(screen.getByRole('button')).toHaveAttribute('type', 'submit');
  });

  it('calls onClick when clicked', async () => {
    const onClick = vi.fn();
    render(<Button onClick={onClick}>Clic</Button>);
    await userEvent.click(screen.getByRole('button'));
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it('does not call onClick when disabled', async () => {
    const onClick = vi.fn();
    render(
      <Button onClick={onClick} disabled>
        Clic
      </Button>,
    );
    await userEvent.click(screen.getByRole('button'));
    expect(onClick).not.toHaveBeenCalled();
  });

  it('applies primary variant classes', () => {
    render(<Button variant="primary">P</Button>);
    expect(screen.getByRole('button').className).toContain('--df-accent');
  });

  it('applies lg size classes (h-14)', () => {
    render(
      <Button size="lg" variant="primary">
        Big
      </Button>,
    );
    expect(screen.getByRole('button').className).toContain('h-14');
  });

  it('applies default size classes (h-10)', () => {
    render(<Button>S</Button>);
    expect(screen.getByRole('button').className).toContain('h-10');
  });

  it('applies md size classes (h-12)', () => {
    render(<Button size="md">M</Button>);
    expect(screen.getByRole('button').className).toContain('h-12');
  });

  it('merges custom className', () => {
    render(<Button className="my-extra">X</Button>);
    expect(screen.getByRole('button').className).toContain('my-extra');
  });
});
