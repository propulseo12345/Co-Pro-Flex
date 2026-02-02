import type { Coproprietaire, PresenceData, Resolution, VoteData } from '../types';
import { getResolutionStats, checkMajority } from '@/components/features/ag/Session/utils';
import { isResolutionInformation } from '@/lib/utils/ag-variables';

export function exportSessionToCSV(
  agId: string,
  coproprietaires: Coproprietaire[],
  presencesEnrichies: Record<string, PresenceData>,
  resolutions: Resolution[],
  votes: VoteData[],
  totalTantiemes: number
): void {
  const lines: string[] = [];
  lines.push('Type;Données');
  lines.push('');
  lines.push('=== FEUILLE DE PRESENCE ===');
  lines.push('Copropriétaire;Tantièmes;Mode participation');

  coproprietaires.forEach(copro => {
    const presence = presencesEnrichies[copro.id];
    const mode = presence?.mode || 'absent';
    const modeLabel = mode === 'present' ? 'Présent'
      : mode === 'correspondance' ? 'Vote par correspondance'
      : mode === 'represente' ? 'Représenté'
      : 'Absent';
    lines.push(`${copro.nom};${copro.tantiemes};${modeLabel}`);
  });

  lines.push('');
  lines.push('=== RESULTATS DES VOTES ===');

  resolutions.forEach((resolution, idx) => {
    const isInfo = isResolutionInformation(resolution);
    lines.push('');
    lines.push(`Résolution ${idx + 1}: ${resolution.titre}`);
    lines.push(`Majorité requise: ${resolution.majorite}`);

    if (isInfo) {
      lines.push('Type: Point d\'information (sans vote)');
    } else {
      const resStats = getResolutionStats(votes, resolution.id);
      const result = checkMajority(resolution, resStats, votes, {
        totalTantiemes,
        totalCoproprietaires: coproprietaires.length
      });
      lines.push(`Pour: ${resStats.pour} tantièmes`);
      lines.push(`Contre: ${resStats.contre} tantièmes`);
      lines.push(`Abstention: ${resStats.abstention} tantièmes`);
      lines.push(`Résultat: ${result.adopted ? 'ADOPTÉE' : 'REJETÉE'}`);
    }
  });

  const csvContent = lines.join('\n');
  const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `resultats-ag-${agId}-${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
