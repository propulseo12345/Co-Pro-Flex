import type { Resolution, VoteData, ResolutionResult, AGData, Signataire, PresenceData, PVStats } from './types';
import { MOCK_COPROPRIETAIRES } from '@/data/mock';
import jsPDF from 'jspdf';
import 'jspdf-autotable';

declare module 'jspdf' {
  interface jsPDF {
    autoTable: (options: {
      startY?: number;
      head?: string[][];
      body?: (string | number)[][];
      theme?: 'striped' | 'grid' | 'plain';
      styles?: { fontSize?: number };
      headStyles?: { fillColor?: number[] };
      margin?: { left?: number; right?: number };
    }) => jsPDF;
    lastAutoTable: { finalY: number };
  }
}

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
  const pourcentagePour = total > 0 ? (pour / total) * 100 : 0;

  return {
    pour,
    contre,
    abstention,
    total,
    adopte: pourcentagePour > 50,
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

  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 20;
  let yPos = 20;

  // En-tête
  doc.setFontSize(18);
  doc.setFont('helvetica', 'bold');
  doc.text(`PROCÈS-VERBAL`, pageWidth / 2, yPos, { align: 'center' });
  yPos += 8;
  doc.setFontSize(14);
  doc.text(`ASSEMBLÉE GÉNÉRALE ${agData.type}`, pageWidth / 2, yPos, { align: 'center' });
  yPos += 15;

  // Informations de l'AG
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');

  const dateFormatted = new Date(agData.date).toLocaleDateString('fr-FR', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  doc.text(`Date : ${dateFormatted}`, margin, yPos);
  yPos += 6;
  doc.text(`Heure : ${agData.heure}`, margin, yPos);
  yPos += 6;
  doc.text(`Lieu : ${agData.lieu || 'Salle de réunion'}`, margin, yPos);
  yPos += 6;
  if (agData.adresse) {
    doc.text(`Adresse : ${agData.adresse}`, margin, yPos);
    yPos += 10;
  }

  // Section Présences
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text('PRÉSENCES ET REPRÉSENTATIONS', margin, yPos);
  yPos += 8;

  const presentsData = presences
    .filter((p) => p.statut === 'PRESENT')
    .map((p) => {
      const copro = MOCK_COPROPRIETAIRES.find((c) => c.id === p.coproprietaireId);
      return [copro?.nom || '', copro?.lot || '', `${copro?.tantiemes || 0}`, 'Présent'];
    });

  const representesData = presences
    .filter((p) => p.statut === 'REPRESENTE')
    .map((p) => {
      const copro = MOCK_COPROPRIETAIRES.find((c) => c.id === p.coproprietaireId);
      let mandataire = p.mandataireManuel || '';
      if (p.mandataireId) {
        const mandataireCopro = MOCK_COPROPRIETAIRES.find((c) => c.id === p.mandataireId);
        mandataire = mandataireCopro?.nom || '';
      }
      return [copro?.nom || '', copro?.lot || '', `${copro?.tantiemes || 0}`, `Représenté par ${mandataire}`];
    });

  const allPresenceData = [...presentsData, ...representesData];

  if (allPresenceData.length > 0) {
    doc.autoTable({
      startY: yPos,
      head: [['Copropriétaire', 'Lot', 'Tantièmes', 'Statut']],
      body: allPresenceData,
      margin: { left: margin, right: margin },
      styles: { fontSize: 9 },
      headStyles: { fillColor: [16, 185, 129] },
    });
    yPos = doc.lastAutoTable.finalY + 10;
  }

  // Calcul des totaux
  const totalTantiemes = MOCK_COPROPRIETAIRES.reduce((sum, c) => sum + c.tantiemes, 0);
  const tantiemesPresents = presences
    .filter((p) => p.statut === 'PRESENT' || p.statut === 'REPRESENTE')
    .reduce((sum, p) => {
      const copro = MOCK_COPROPRIETAIRES.find((c) => c.id === p.coproprietaireId);
      return sum + (copro?.tantiemes || 0);
    }, 0);

  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text(`Total des tantièmes représentés : ${tantiemesPresents} / ${totalTantiemes}`, margin, yPos);
  yPos += 15;

  // Section Résolutions
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text('RÉSOLUTIONS VOTÉES', margin, yPos);
  yPos += 10;

  resolutions.forEach((resolution, index) => {
    if (yPos > 250) {
      doc.addPage();
      yPos = 20;
    }

    const result = getResolutionResult(resolution, votes);

    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.text(`Résolution ${index + 1} : ${resolution.titre}`, margin, yPos);
    yPos += 6;

    doc.setFontSize(9);
    doc.setFont('helvetica', 'italic');
    doc.text(`Majorité requise : ${resolution.majorite}`, margin, yPos);
    yPos += 6;

    doc.setFont('helvetica', 'normal');
    const resolutionText = replaceVariables(resolution.texte);
    const splitText = doc.splitTextToSize(resolutionText, pageWidth - 2 * margin);
    doc.text(splitText, margin, yPos);
    yPos += splitText.length * 5 + 5;

    if (result.passerelle) {
      doc.setFontSize(9);
      doc.setFont('helvetica', 'bold');
      doc.text('Vote initial (Article 25) :', margin, yPos);
      yPos += 5;
      doc.setFont('helvetica', 'normal');
      doc.text(
        `Pour: ${result.passerelle.voteInitial.pour} t. | Contre: ${result.passerelle.voteInitial.contre} t. | Abstention: ${result.passerelle.voteInitial.abstention} t.`,
        margin + 5,
        yPos
      );
      yPos += 5;

      if (result.passerelle.secondVote) {
        doc.setFont('helvetica', 'bold');
        doc.text('Second vote (Article 24) :', margin, yPos);
        yPos += 5;
        doc.setFont('helvetica', 'normal');
        doc.text(
          `Pour: ${result.passerelle.secondVote.pour} t. | Contre: ${result.passerelle.secondVote.contre} t. | Abstention: ${result.passerelle.secondVote.abstention} t.`,
          margin + 5,
          yPos
        );
        yPos += 5;
      }
    } else {
      doc.setFontSize(9);
      doc.text(`Pour: ${result.pour} t. | Contre: ${result.contre} t. | Abstention: ${result.abstention} t.`, margin, yPos);
      yPos += 5;
    }

    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    const status = result.adopte ? 'ADOPTÉE' : resolution.resultat === 'AJOURNEE' ? 'AJOURNÉE' : 'REJETÉE';
    doc.setTextColor(result.adopte ? 16 : 220, result.adopte ? 185 : 38, result.adopte ? 129 : 38);
    doc.text(`Résolution ${status}`, margin, yPos);
    doc.setTextColor(0, 0, 0);
    yPos += 12;
  });

  // Section Signatures
  if (yPos > 220) {
    doc.addPage();
    yPos = 20;
  }

  yPos += 10;
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text('SIGNATURES', margin, yPos);
  yPos += 15;

  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');

  signataires.forEach((sig) => {
    if (yPos > 260) {
      doc.addPage();
      yPos = 20;
    }

    doc.setFont('helvetica', 'bold');
    doc.text(sig.roleLabel, margin, yPos);
    yPos += 5;
    doc.setFont('helvetica', 'normal');
    const nomComplet = sig.prenom && sig.nom ? `${sig.prenom} ${sig.nom}` : '[À compléter]';
    doc.text(nomComplet, margin, yPos);
    yPos += 5;
    doc.line(margin, yPos + 10, margin + 80, yPos + 10);
    yPos += 20;
  });

  return doc;
}
