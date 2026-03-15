'use client';

import { Plus } from 'lucide-react';
import { TravauxOverview, TravauxCard } from '@/components/features/finance/Budget';

interface TravauxTabProps {
  budgetsTravaux: any[];
  onOpenTravauxDetail: (travaux: any) => void;
  onOpenNewAppelFonds: (travaux: any) => void;
  onCreateBudget: () => void;
}

export function TravauxTab({
  budgetsTravaux,
  onOpenTravauxDetail,
  onOpenNewAppelFonds,
  onCreateBudget,
}: TravauxTabProps) {
  return (
    <div>
      <TravauxOverview budgetsTravaux={budgetsTravaux} />

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <h2 style={{ fontSize: 14, fontWeight: 600, color: '#94a3b8', textTransform: 'uppercase' as const, letterSpacing: '0.06em' }}>Projets de travaux</h2>
        <button style={{ padding: '8px 16px', borderRadius: 8, border: 'none', background: '#3b82f6', color: 'white', fontSize: 13, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }} onClick={onCreateBudget}>
          <Plus size={14} /> Nouveau budget travaux
        </button>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        {budgetsTravaux.map((travaux) => (
          <TravauxCard
            key={travaux.id}
            travaux={travaux}
            onOpenDetail={onOpenTravauxDetail}
            onNewAppelFonds={onOpenNewAppelFonds}
          />
        ))}
      </div>
    </div>
  );
}
