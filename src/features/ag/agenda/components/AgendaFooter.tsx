'use client';

import { ArrowRight } from 'lucide-react';

interface AgendaFooterProps {
  onGoBack: () => void;
  onContinue: () => void;
  canContinue: boolean;
}

export function AgendaFooter({ onGoBack, onContinue, canContinue }: AgendaFooterProps) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '2rem' }}>
      <button onClick={onGoBack} className="btn btn-secondary">Retour</button>
      <button
        onClick={onContinue}
        className="btn btn-primary"
        disabled={!canContinue}
      >
        Continuer <ArrowRight size={16} />
      </button>
    </div>
  );
}
