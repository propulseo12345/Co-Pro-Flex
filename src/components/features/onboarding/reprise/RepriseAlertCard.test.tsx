import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { RepriseAlertCard } from '@/components/features/onboarding/reprise/RepriseAlertCard';

describe('RepriseAlertCard', () => {
  it('affiche le montant à imputer et le nom de la copro', () => {
    render(<RepriseAlertCard coproName="Le Clos" residual={423.5} onOpen={() => {}} />);
    expect(screen.getByText(/Reprise à terminer/i)).toBeInTheDocument();
    expect(screen.getByText(/Le Clos/)).toBeInTheDocument();
  });

  it('appelle onOpen au clic', () => {
    const onOpen = vi.fn();
    render(<RepriseAlertCard coproName="Le Clos" residual={423.5} onOpen={onOpen} />);
    fireEvent.click(screen.getByRole('button'));
    expect(onOpen).toHaveBeenCalled();
  });
});
