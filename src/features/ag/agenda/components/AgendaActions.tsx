'use client';

import { Plus, ListChecks } from 'lucide-react';

interface AgendaActionsProps {
  onPrefillObligatoires: () => void;
  onOpenBank: () => void;
  onOpenCustom: () => void;
  isSaving: boolean;
}

export function AgendaActions({
  onPrefillObligatoires,
  onOpenBank,
  onOpenCustom,
  isSaving,
}: AgendaActionsProps) {
  return (
    <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.5rem' }}>
      <button
        className="btn btn-primary"
        onClick={onPrefillObligatoires}
        disabled={isSaving}
      >
        <ListChecks size={16} />
        {isSaving ? 'Creation en cours...' : 'Pre-remplir les resolutions obligatoires'}
      </button>
      <button
        className="btn btn-secondary"
        onClick={onOpenBank}
        disabled={isSaving}
      >
        <Plus size={16} /> Ajouter une resolution
      </button>
      <button
        className="btn btn-secondary"
        onClick={onOpenCustom}
        disabled={isSaving}
      >
        <Plus size={16} /> Resolution personnalisee
      </button>
    </div>
  );
}
