import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { SoldesParLotTable, type LotRow, type LotCol } from '@/components/features/onboarding/reprise/SoldesParLotTable';

const lots: LotRow[] = [
  { id: 'lot-1', ref: 'A-101', ownerName: 'Alice Martin' },
  { id: 'lot-2', ref: 'A-102', ownerName: 'Bob Durand' },
];

describe('SoldesParLotTable', () => {
  it('rend une ligne par lot avec les 4 colonnes (current/works/alur/avance)', () => {
    render(<SoldesParLotTable lots={lots} values={{}} onChange={() => {}} />);
    expect(screen.getByText('A-101')).toBeInTheDocument();
    expect(screen.getByText('A-102')).toBeInTheDocument();
    // 2 lots x 4 colonnes = 8 inputs
    expect(screen.getAllByRole('spinbutton')).toHaveLength(8);
  });

  it('remonte (lotId, col, valeur) à la saisie', () => {
    const onChange = vi.fn();
    render(<SoldesParLotTable lots={lots} values={{}} onChange={onChange} />);
    const firstInput = screen.getAllByRole('spinbutton')[0];
    fireEvent.change(firstInput, { target: { value: '500' } });
    const cols: LotCol[] = ['current', 'works', 'alur', 'avance'];
    expect(onChange).toHaveBeenCalledWith('lot-1', cols[0], '500');
  });
});
