import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { StookwijzerBadge } from '../../components/StookwijzerBadge';
import { mockStookwijzer } from '../fixtures/mockData';

describe('StookwijzerBadge', () => {
  it('renders the label', () => {
    render(<StookwijzerBadge data={mockStookwijzer} />);
    expect(screen.getByText('Stoken mag')).toBeInTheDocument();
  });

  it('renders different advice labels', () => {
    render(
      <StookwijzerBadge
        data={{ ...mockStookwijzer, advice: 'code_red', label: 'Niet stoken' }}
      />
    );
    expect(screen.getByText('Niet stoken')).toBeInTheDocument();
  });
});
