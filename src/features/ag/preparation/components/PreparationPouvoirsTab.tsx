'use client';

import { PowersPanel } from '@/components/features/ag';
import type { IPouvoir, PouvoirsStats, QuorumPrevisionnel, PouvoirValidationResult } from '@/types/models/ag';
import type { CoproprietaireForPouvoir } from '@/hooks/modules/usePouvoirs';

interface PreparationPouvoirsTabProps {
  pouvoirs: IPouvoir[];
  coproprietaires: CoproprietaireForPouvoir[];
  stats: PouvoirsStats;
  quorumPrevisionnel: QuorumPrevisionnel;
  onAddPouvoir: (mandantId: string, mandataireId: string, signedAt?: string) => Promise<PouvoirValidationResult>;
  onRemovePouvoir: (pouvoirId: string) => Promise<void>;
  onUploadJustificatif: (pouvoirId: string, file: File) => Promise<void>;
  onRemoveJustificatif: (pouvoirId: string) => void;
  validatePouvoir: (mandantId: string, mandataireId: string) => PouvoirValidationResult;
}

export function PreparationPouvoirsTab({
  pouvoirs,
  coproprietaires,
  stats,
  quorumPrevisionnel,
  onAddPouvoir,
  onRemovePouvoir,
  onUploadJustificatif,
  onRemoveJustificatif,
  validatePouvoir,
}: PreparationPouvoirsTabProps) {
  return (
    <PowersPanel
      pouvoirs={pouvoirs}
      coproprietaires={coproprietaires}
      stats={stats}
      quorumPrevisionnel={quorumPrevisionnel}
      onAddPouvoir={onAddPouvoir}
      onRemovePouvoir={onRemovePouvoir}
      onUploadJustificatif={onUploadJustificatif}
      onRemoveJustificatif={onRemoveJustificatif}
      validatePouvoir={validatePouvoir}
    />
  );
}
