import { jsPDF } from 'jspdf';
import type { ContratDetaille } from '@/types';

interface SyndicInfo {
  nom: string;
  representant: string;
  fonction: string;
  adresse: string;
  email: string;
  telephone: string;
}

interface CoproprieteInfo {
  nom: string;
  adresse: string;
  codePostal: string;
  ville: string;
}

interface GenerateResiliationPDFParams {
  contrat: ContratDetaille;
  dateEffet: string;
  courrierTexte: string;
  syndicInfo: SyndicInfo;
  copropriete: CoproprieteInfo;
  adressePrestataire?: string;
}

export function generateResiliationPDF({
  contrat,
  dateEffet,
  courrierTexte,
  syndicInfo,
  copropriete,
  adressePrestataire = '[Adresse du prestataire]'
}: GenerateResiliationPDFParams): void {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 20;
  let y = 20;

  const addText = (
    text: string,
    x: number,
    yPos: number,
    options?: { fontSize?: number; fontStyle?: string; color?: number[]; align?: 'left' | 'center' | 'right' }
  ) => {
    doc.setFontSize(options?.fontSize || 10);
    if (options?.fontStyle) {
      doc.setFont('helvetica', options.fontStyle);
    } else {
      doc.setFont('helvetica', 'normal');
    }
    if (options?.color) {
      doc.setTextColor(options.color[0], options.color[1], options.color[2]);
    } else {
      doc.setTextColor(0, 0, 0);
    }

    if (options?.align) {
      doc.text(text, x, yPos, { align: options.align });
    } else {
      doc.text(text, x, yPos);
    }
  };

  const checkNewPage = (neededSpace: number) => {
    if (y + neededSpace > pageHeight - 30) {
      doc.addPage();
      y = 20;
    }
  };

  // === EN-TÊTE EXPÉDITEUR (droite) ===
  addText(copropriete.nom, pageWidth - margin, y, { fontStyle: 'bold', fontSize: 11, align: 'right' });
  y += 5;
  addText(copropriete.adresse, pageWidth - margin, y, { fontSize: 9, align: 'right' });
  y += 4;
  addText(`${copropriete.codePostal} ${copropriete.ville}`, pageWidth - margin, y, { fontSize: 9, align: 'right' });
  y += 8;

  // Syndic
  addText(`Syndic : ${syndicInfo.nom}`, pageWidth - margin, y, { fontSize: 9, align: 'right' });
  y += 4;
  addText(syndicInfo.email, pageWidth - margin, y, { fontSize: 9, align: 'right' });
  y += 4;
  addText(syndicInfo.telephone, pageWidth - margin, y, { fontSize: 9, align: 'right' });
  y += 15;

  // === MENTION RAR (encadré rouge) ===
  doc.setFillColor(220, 38, 38);
  doc.rect(margin, y, pageWidth - margin * 2, 12, 'F');
  addText('LETTRE RECOMMANDÉE AVEC ACCUSÉ DE RÉCEPTION', pageWidth / 2, y + 8, {
    fontSize: 11,
    fontStyle: 'bold',
    color: [255, 255, 255],
    align: 'center'
  });
  y += 20;

  // === DESTINATAIRE (gauche) ===
  addText(contrat.fournisseur, margin, y, { fontStyle: 'bold', fontSize: 11 });
  y += 5;
  const adresseLines = adressePrestataire.split('\n');
  adresseLines.forEach(line => {
    addText(line, margin, y, { fontSize: 9 });
    y += 4;
  });
  y += 10;

  // === DATE ET LIEU (droite) ===
  const aujourdhui = new Date().toLocaleDateString('fr-FR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  });
  addText(`${copropriete.ville}, le ${aujourdhui}`, pageWidth - margin, y, { fontSize: 10, align: 'right' });
  y += 15;

  // === RÉFÉRENCES ===
  doc.setFillColor(241, 245, 249);
  doc.rect(margin, y, pageWidth - margin * 2, 16, 'F');
  y += 6;
  addText(`Réf. contrat : ${contrat.numeroContrat || contrat.id}`, margin + 4, y, { fontSize: 9, fontStyle: 'bold' });
  y += 5;
  const dateEffetFormatted = dateEffet
    ? new Date(dateEffet).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })
    : '[date à définir]';
  addText(`Date d'effet de la résiliation : ${dateEffetFormatted}`, margin + 4, y, { fontSize: 9 });
  y += 12;

  // === CORPS DE LA LETTRE ===
  y += 5;
  const lignes = courrierTexte.split('\n');
  const maxWidth = pageWidth - margin * 2;

  lignes.forEach(ligne => {
    checkNewPage(8);

    if (ligne.trim() === '') {
      y += 4;
      return;
    }

    // Détecter les lignes d'objet ou de titre
    if (ligne.startsWith('Objet :') || ligne.startsWith('Objet:')) {
      addText(ligne, margin, y, { fontStyle: 'bold', fontSize: 10 });
      y += 8;
      return;
    }

    // Gérer les tirets (liste)
    if (ligne.trim().startsWith('–') || ligne.trim().startsWith('-')) {
      const splitText = doc.splitTextToSize(ligne, maxWidth - 10);
      splitText.forEach((textLine: string) => {
        checkNewPage(6);
        addText(textLine, margin + 5, y, { fontSize: 10 });
        y += 5;
      });
      return;
    }

    // Texte normal avec gestion du retour à la ligne automatique
    const splitText = doc.splitTextToSize(ligne, maxWidth);
    splitText.forEach((textLine: string) => {
      checkNewPage(6);
      addText(textLine, margin, y, { fontSize: 10 });
      y += 5;
    });
  });

  // === SIGNATURE ===
  y += 15;
  checkNewPage(30);
  addText(syndicInfo.representant, margin, y, { fontStyle: 'bold', fontSize: 10 });
  y += 5;
  addText(syndicInfo.fonction, margin, y, { fontSize: 9 });
  y += 5;
  addText(`Pour le syndic : ${syndicInfo.nom}`, margin, y, { fontSize: 9 });

  // === FOOTER SUR TOUTES LES PAGES ===
  const totalPages = doc.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(156, 163, 175);

    // Ligne de séparation
    doc.setDrawColor(200, 200, 200);
    doc.line(margin, pageHeight - 18, pageWidth - margin, pageHeight - 18);

    // Page number
    doc.text(`Page ${i}/${totalPages}`, pageWidth - margin, pageHeight - 10, { align: 'right' });

    // Footer text
    doc.text('Document généré par CoProFlex - Courrier recommandé avec accusé de réception', margin, pageHeight - 10);
  }

  // === SAUVEGARDE ===
  const numeroContratSafe = (contrat.numeroContrat || contrat.id).replace(/[^a-zA-Z0-9]/g, '_');
  const dateStr = new Date().toISOString().split('T')[0];
  const fileName = `resiliation_RAR_${numeroContratSafe}_${dateStr}.pdf`;
  doc.save(fileName);
}
