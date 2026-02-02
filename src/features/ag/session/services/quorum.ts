import type { Coproprietaire, PresenceData } from '../types';
import type { ProjectorQuorum } from '@/types/projector';

export interface QuorumCalculationResult {
  required: number;
  current: number;
  reached: boolean;
  percentagePresent: number;
  totalCoproprietaires: number;
  presentCount: number;
  representedCount: number;
  correspondanceCount: number;
}

export function calculateQuorum(
  presencesEnrichies: Record<string, PresenceData>,
  coproprietaires: Coproprietaire[],
  totalTantiemes: number
): ProjectorQuorum {
  let presentTantiemes = 0;
  let presentCount = 0;
  let representedCount = 0;
  let correspondanceCount = 0;

  coproprietaires.forEach(copro => {
    const presence = presencesEnrichies[copro.id];
    if (presence) {
      switch (presence.mode) {
        case 'present':
          presentTantiemes += copro.tantiemes;
          presentCount++;
          break;
        case 'represente':
          presentTantiemes += copro.tantiemes;
          representedCount++;
          break;
        case 'correspondance':
          if (!presence.voteCorrespondanceNeutralise) {
            presentTantiemes += copro.tantiemes;
            correspondanceCount++;
          }
          break;
      }
    }
  });

  const required = Math.floor(totalTantiemes / 2) + 1;
  const reached = presentTantiemes >= required;

  return {
    required,
    current: presentTantiemes,
    reached,
    percentagePresent: totalTantiemes > 0 ? (presentTantiemes / totalTantiemes) * 100 : 0,
    totalCoproprietaires: coproprietaires.length,
    presentCount,
    representedCount,
    correspondanceCount,
  };
}
