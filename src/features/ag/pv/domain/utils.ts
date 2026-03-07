import type { Resolution, VoteData, ResolutionResult, AGData, Signataire, PresenceData, PVStats } from './types';
import { MOCK_COPROPRIETAIRES } from '@/data/mock';
import type jsPDF from 'jspdf';
import { generatePVPDF } from '@/lib/pdf/generatePVPDF';
import type { ResolutionForPV, ParticipantForPV } from '@/lib/services/pv-generation.service';

export function getResolutionResult(resolution: Resolution, votes: VoteData[]): ResolutionResult {
  if (resolution.passerelle) {
    const secondVoteData = resolution.passerelle.secondVote;
    const voteData = secondVoteData || resolution.passerelle.voteInitial;

    return {
      pour: voteData.pour,
      contre: voteData.contre,
      abstention: voteData.abstention,
      total: voteData.pour + voteData.contre + voteData.abstention,
      adopte: resolution.resultat === 'ADOPTEE',
      passerelle: resolution.passerelle,
    };
  }

  const resolutionVotes = votes.filter((v) => v.resolutionId === resolution.id);

  let pour = 0;
  let contre = 0;
  let abstention = 0;

  resolutionVotes.forEach((v) => {
    if (v.vote === 'POUR') pour += v.tantiemes;
    else if (v.vote === 'CONTRE') contre += v.tantiemes;
    else if (v.vote === 'ABSTENTION') abstention += v.tantiemes;
  });

  const total = pour + contre + abstention;

  // Use is_approved from DB when available (set during session),
  // otherwise calculate from votes
  let adopte: boolean;
  if (resolution.resultat === 'ADOPTEE' || resolution.resultat === 'REJETEE') {
    adopte = resolution.resultat === 'ADOPTEE';
  } else if (total > 0) {
    adopte = (pour / total) * 100 > 50;
  } else {
    adopte = false;
  }

  return {
    pour,
    contre,
    abstention,
    total,
    adopte,
  };
}

export function calculatePVStats(resolutions: Resolution[], votes: VoteData[]): PVStats {
  const adoptedCount = resolutions.filter((r) => getResolutionResult(r, votes).adopte).length;
  return {
    adoptedCount,
    rejectedCount: resolutions.length - adoptedCount,
    totalCount: resolutions.length,
  };
}

export function generatePVText(
  agData: AGData,
  resolutions: Resolution[],
  votes: VoteData[],
  signataires: Signataire[]
): string {
  const dateFormatted = new Date(agData.date).toLocaleDateString('fr-FR', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  let text = `PROCÈS-VERBAL DE L'ASSEMBLÉE GÉNÉRALE ${agData.type}\n\n`;
  text += `Date : ${dateFormatted}\n`;
  text += `Heure : ${agData.heure}\n`;
  text += `Lieu : ${agData.lieu || "Lieu de l'assemblée"}\n`;
  text += `${agData.adresse}\n\n`;

  text += `PRÉSENTS ET REPRÉSENTÉS\n\n`;
  const totalTantiemes = MOCK_COPROPRIETAIRES.reduce((sum, c) => sum + c.tantiemes, 0);
  text += `Total des tantièmes : ${totalTantiemes}\n\n`;

  text += `ORDRE DU JOUR ET VOTES\n\n`;

  resolutions.forEach((resolution, index) => {
    const result = getResolutionResult(resolution, votes);

    text += `${index + 1}. ${resolution.titre}\n\n`;
    text += `${resolution.texte}\n\n`;
    text += `Type de majorité requise : ${resolution.majorite}\n\n`;

    if (result.passerelle) {
      text += `--- PASSERELLE ARTICLE 25-1 ---\n\n`;
      text += `Vote initial (Article 25) :\n`;
      text += `- Pour : ${result.passerelle.voteInitial.pour} tantièmes\n`;
      text += `- Contre : ${result.passerelle.voteInitial.contre} tantièmes\n`;
      text += `- Abstention : ${result.passerelle.voteInitial.abstention} tantièmes\n\n`;

      if (result.passerelle.secondVote) {
        text += `Second vote (Article 24 - Majorité simple) :\n`;
        text += `- Pour : ${result.passerelle.secondVote.pour} tantièmes\n`;
        text += `- Contre : ${result.passerelle.secondVote.contre} tantièmes\n`;
        text += `- Abstention : ${result.passerelle.secondVote.abstention} tantièmes\n\n`;
      }

      text += `${result.passerelle.mentionPV}\n\n`;
      text += `Résolution ${result.adopte ? 'ADOPTÉE' : result.passerelle.secondVote ? 'REJETÉE' : 'AJOURNÉE'}\n\n`;
    } else {
      text += `Résultat du vote :\n`;
      text += `- Pour : ${result.pour} tantièmes\n`;
      text += `- Contre : ${result.contre} tantièmes\n`;
      text += `- Abstention : ${result.abstention} tantièmes\n`;
      text += `- Total : ${result.total} tantièmes\n\n`;
      text += `Résolution ${result.adopte ? 'ADOPTÉE' : 'REJETÉE'}\n\n`;
    }

    text += `${'─'.repeat(80)}\n\n`;
  });

  text += `Fin de la séance à [heure de fin]\n\n`;

  signataires.forEach((sig) => {
    const nomComplet = sig.prenom && sig.nom ? `${sig.prenom} ${sig.nom}` : '[À compléter]';
    text += `${sig.roleLabel} : ${nomComplet}\n`;
  });

  return text;
}

export function generatePDFDocument(
  agData: AGData,
  resolutions: Resolution[],
  votes: VoteData[],
  presences: PresenceData[],
  signataires: Signataire[],
  replaceVariables: (text: string) => string
): jsPDF | null {
  if (!agData) return null;

  // Convert domain types to PV PDF types
  const pvResolutions: ResolutionForPV[] = resolutions.map((r, index) => {
    const result = getResolutionResult(r, votes);
    return {
      id: r.id,
      numero: index + 1,
      titre: r.titre,
      texte: replaceVariables(r.texte),
      majorite: r.majorite,
      resultat: result.adopte ? 'ADOPTEE' as const
        : r.resultat === 'AJOURNEE' ? 'AJOURNEE' as const
        : 'REJETEE' as const,
      votes: {
        pour: result.pour,
        contre: result.contre,
        abstention: result.abstention,
        total: result.total,
      },
      passerelle: result.passerelle ? {
        type: result.passerelle.type || 'ART_25_1',
        voteInitial: result.passerelle.voteInitial,
        secondVote: result.passerelle.secondVote,
        mentionPV: result.passerelle.mentionPV,
      } : undefined,
    };
  });

  const pvParticipants: ParticipantForPV[] = presences.map((p) => {
    const copro = MOCK_COPROPRIETAIRES.find((c) => c.id === p.coproprietaireId);
    let mandataire: string | undefined;
    if (p.statut === 'REPRESENTE') {
      if (p.mandataireId) {
        const m = MOCK_COPROPRIETAIRES.find((c) => c.id === p.mandataireId);
        mandataire = m?.nom;
      } else {
        mandataire = p.mandataireManuel;
      }
    }

    return {
      id: p.coproprietaireId,
      nom: copro?.nom || '',
      lot: copro?.lot,
      tantiemes: copro?.tantiemes || 0,
      mode: p.statut === 'PRESENT' ? 'present' as const
        : p.statut === 'REPRESENTE' ? 'represente' as const
        : 'absent' as const,
      mandataire,
    };
  });

  return generatePVPDF({
    agData: {
      id: '',
      type: agData.type as 'ORDINAIRE' | 'EXTRAORDINAIRE' | 'URGENTE',
      date: agData.date,
      heure: agData.heure,
      lieu: agData.lieu || '',
      adresse: agData.adresse || '',
    },
    resolutions: pvResolutions,
    participants: pvParticipants,
    signataires: signataires.map((s) => ({
      id: s.id,
      role: s.role as 'president' | 'secretaire' | 'scrutateur',
      roleLabel: s.roleLabel,
      nom: s.nom,
      prenom: s.prenom,
      signature: s.signature,
    })),
  });
}
