import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { EquilibreIndicator } from '@/features/onboarding/reprise/EquilibreIndicator';

describe('EquilibreIndicator', () => {
  it('affiche le reste à imputer et le nudge quand residual != 0', () => {
    render(<EquilibreIndicator residual={423.5} />);
    expect(screen.getByText(/Reste à imputer/i)).toBeInTheDocument();
    expect(screen.getByText(/cherchez la cause/i)).toBeInTheDocument();
  });

  it('affiche l\'état équilibré quand residual == 0', () => {
    render(<EquilibreIndicator residual={0} />);
    expect(screen.getByText(/équilibré/i)).toBeInTheDocument();
    expect(screen.queryByText(/cherchez la cause/i)).not.toBeInTheDocument();
  });

  it('considère un micro-résidu (< 0.01) comme équilibré', () => {
    render(<EquilibreIndicator residual={0.004} />);
    expect(screen.getByText(/équilibré/i)).toBeInTheDocument();
  });
});
