import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Card, CardHeader, CardBody } from './Card';

describe('Card', () => {
  it('renders children', () => {
    render(<Card>Contenu</Card>);
    expect(screen.getByText('Contenu')).toBeInTheDocument();
  });

  it('renders header and body', () => {
    render(
      <Card>
        <CardHeader>Titre</CardHeader>
        <CardBody>Corps</CardBody>
      </Card>,
    );
    expect(screen.getByText('Titre')).toBeInTheDocument();
    expect(screen.getByText('Corps')).toBeInTheDocument();
  });

  it('adds shadow when elevated', () => {
    const { container } = render(<Card elevated>X</Card>);
    expect(container.firstElementChild?.className).toContain('shadow-');
  });
});
