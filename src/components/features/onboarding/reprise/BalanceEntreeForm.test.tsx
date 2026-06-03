import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { BalanceEntreeForm, type BalanceFormState } from '@/components/features/onboarding/reprise/BalanceEntreeForm';

const baseState: BalanceFormState = {
  bankBalances: {},            // accountId -> texte
  fondsAlur: '',
  fournisseurs: '',
  report110: '',
  report120: '',
  autres: {},                  // accountId -> texte
  midYear: false,
  asOfDate: '',
  produits: {},                // accountId(7xx) -> texte
  charges: {},                 // accountId(6xx) -> texte
};

const bankAccounts = [
  { id: 'acc-512', name: 'Compte courant', code: '512000' },
  { id: 'acc-502', name: 'Fonds travaux', code: '512100' },
];
const planAccounts = [
  { id: 'acc-601', code: '601', name: 'Eau' },
  { id: 'acc-701', code: '701', name: 'Provisions courantes' },
];

describe('BalanceEntreeForm', () => {
  it('pré-remplit un champ par compte bancaire de l\'étape 4', () => {
    render(
      <BalanceEntreeForm
        state={baseState}
        bankAccounts={bankAccounts}
        planAccounts={planAccounts}
        onChange={() => {}}
      />
    );
    expect(screen.getByText(/Compte courant/)).toBeInTheDocument();
    expect(screen.getByText(/Fonds travaux/)).toBeInTheDocument();
  });

  it('révèle la date et la saisie 6/7 quand "reprise en cours d\'année" est activée', () => {
    const onChange = vi.fn();
    const { rerender } = render(
      <BalanceEntreeForm
        state={baseState}
        bankAccounts={bankAccounts}
        planAccounts={planAccounts}
        onChange={onChange}
      />
    );
    // pas de date visible tant que midYear=false
    expect(screen.queryByLabelText(/Date de reprise/i)).not.toBeInTheDocument();

    // activer la bascule
    fireEvent.click(screen.getByRole('checkbox', { name: /reprise en cours d.année/i }));
    expect(onChange).toHaveBeenCalled();

    // rerender avec midYear=true -> date + bloc 6/7 visibles
    rerender(
      <BalanceEntreeForm
        state={{ ...baseState, midYear: true }}
        bankAccounts={bankAccounts}
        planAccounts={planAccounts}
        onChange={onChange}
      />
    );
    expect(screen.getByLabelText(/Date de reprise/i)).toBeInTheDocument();
    expect(screen.getByText(/Charges et produits de l.exercice/i)).toBeInTheDocument();
  });
});
