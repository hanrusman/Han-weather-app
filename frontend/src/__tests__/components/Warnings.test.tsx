import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Warnings } from '../../components/Warnings';
import { mockWarnings, mockWarningsEmpty } from '../fixtures/mockData';

describe('Warnings', () => {
  it('renders nothing when no warnings', () => {
    const { container } = render(<Warnings data={mockWarningsEmpty} />);
    expect(container.firstChild).toBeNull();
  });

  it('renders warning area and description', () => {
    render(<Warnings data={mockWarnings} />);
    expect(screen.getByText('Noord-Holland')).toBeInTheDocument();
    expect(screen.getByText('Krachtige wind verwacht')).toBeInTheDocument();
  });

  it('renders section title', () => {
    render(<Warnings data={mockWarnings} />);
    expect(screen.getByText('KNMI Waarschuwingen')).toBeInTheDocument();
  });
});
