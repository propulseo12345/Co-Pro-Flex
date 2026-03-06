'use client';

import { CheckSquare, Square, FileDown, Eye, EyeOff, RefreshCw } from 'lucide-react';

interface PresenceActionsProps {
  showSignatures: boolean;
  isSaving: boolean;
  isLoading: boolean;
  onBulkPresent: () => void;
  onBulkAbsent: () => void;
  onExportPDF: () => void;
  onToggleSignatures: () => void;
  onRefresh: () => void;
}

export function PresenceActions({
  showSignatures,
  isSaving,
  isLoading,
  onBulkPresent,
  onBulkAbsent,
  onExportPDF,
  onToggleSignatures,
  onRefresh,
}: PresenceActionsProps) {
  return (
    <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '1rem' }}>
      <button onClick={onBulkPresent} className="btn btn-primary" disabled={isSaving}>
        <CheckSquare size={16} />
        Marquer tous présents
      </button>
      <button onClick={onBulkAbsent} className="btn btn-secondary" disabled={isSaving}>
        <Square size={16} />
        Marquer tous absents
      </button>
      <button onClick={onExportPDF} className="btn btn-secondary">
        <FileDown size={16} />
        Exporter PDF
      </button>
      <button onClick={onToggleSignatures} className="btn btn-secondary">
        {showSignatures ? <EyeOff size={16} /> : <Eye size={16} />}
        {showSignatures ? 'Masquer' : 'Afficher'} signatures
      </button>
      <button onClick={onRefresh} className="btn btn-secondary" disabled={isLoading}>
        <RefreshCw size={16} />
        Actualiser
      </button>
    </div>
  );
}
