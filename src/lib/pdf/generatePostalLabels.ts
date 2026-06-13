/**
 * Générateur de PDF d'étiquettes postales pour les convocations
 *
 * Génère un PDF avec une étiquette par page (format standard)
 * Compatible avec les planches d'étiquettes Avery ou similaires
 */

import jsPDF from 'jspdf';
import { PostalSendType } from '@/types/enums';

export interface PostalRecipient {
  id: string;
  nom: string;
  adresse: {
    rue: string;
    codePostal: string;
    ville: string;
  };
}

export interface PostalLabelsParams {
  recipients: PostalRecipient[];
  sender: {
    nom: string;
    adresse: string;
    codePostal: string;
    ville: string;
  };
  sendType: PostalSendType;
  agTitle?: string;
}

export interface PostalLabelsResult {
  blob: Blob;
  url: string;
  filename: string;
  count: number;
}

const LABEL_WIDTH = 99; // mm (standard)
const LABEL_HEIGHT = 67; // mm (standard)
const MARGIN = 10; // mm

export function generatePostalLabels(params: PostalLabelsParams): PostalLabelsResult {
  const { recipients, sender, sendType, agTitle } = params;

  const doc = new jsPDF({
    orientation: 'landscape',
    unit: 'mm',
    format: [LABEL_WIDTH, LABEL_HEIGHT],
  });

  recipients.forEach((recipient, index) => {
    if (index > 0) {
      doc.addPage([LABEL_WIDTH, LABEL_HEIGHT], 'landscape');
    }

    // Zone expéditeur (en haut à gauche)
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.text('Exp.:', MARGIN, MARGIN);
    doc.text(sender.nom, MARGIN, MARGIN + 4);
    doc.text(sender.adresse, MARGIN, MARGIN + 8);
    doc.text(`${sender.codePostal} ${sender.ville}`, MARGIN, MARGIN + 12);

    // Mention LRAR si courrier recommandé
    if (sendType === PostalSendType.LRAR) {
      doc.setFontSize(10);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(200, 0, 0);
      doc.text('LETTRE RECOMMANDÉE AVEC AR', LABEL_WIDTH - MARGIN - 60, MARGIN + 6);
      doc.setTextColor(0, 0, 0);
    }

    // Zone destinataire (centrée en bas)
    const destY = LABEL_HEIGHT / 2 + 5;
    const destX = LABEL_WIDTH / 2;

    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text(recipient.nom, destX, destY, { align: 'center' });

    doc.setFontSize(11);
    doc.setFont('helvetica', 'normal');
    doc.text(recipient.adresse.rue, destX, destY + 7, { align: 'center' });
    doc.text(
      `${recipient.adresse.codePostal} ${recipient.adresse.ville.toUpperCase()}`,
      destX,
      destY + 14,
      { align: 'center' }
    );

    // Référence AG en petit (optionnel)
    if (agTitle) {
      doc.setFontSize(7);
      doc.setTextColor(128, 128, 128);
      doc.text(`Réf: ${agTitle}`, MARGIN, LABEL_HEIGHT - MARGIN);
      doc.setTextColor(0, 0, 0);
    }
  });

  const blob = doc.output('blob');
  const url = URL.createObjectURL(blob);
  const date = new Date().toISOString().split('T')[0];
  const filename = `etiquettes-postales-${date}.pdf`;

  return {
    blob,
    url,
    filename,
    count: recipients.length,
  };
}

/**
 * Génère un A4 avec plusieurs étiquettes par page (grille 2x4)
 */
export function generatePostalLabelsSheet(params: PostalLabelsParams): PostalLabelsResult {
  const { recipients, sender, sendType } = params;

  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = 210;
  const pageHeight = 297;
  const labelsPerRow = 2;
  const labelsPerCol = 4;
  const labelWidth = 99;
  const labelHeight = 67;
  const marginX = (pageWidth - labelsPerRow * labelWidth) / 2;
  const marginY = (pageHeight - labelsPerCol * labelHeight) / 2;

  let currentPage = 0;

  recipients.forEach((recipient, index) => {
    const pageNum = Math.floor(index / (labelsPerRow * labelsPerCol));
    if (pageNum > currentPage) {
      doc.addPage();
      currentPage = pageNum;
    }

    const localIndex = index % (labelsPerRow * labelsPerCol);
    const col = localIndex % labelsPerRow;
    const row = Math.floor(localIndex / labelsPerRow);

    const x = marginX + col * labelWidth;
    const y = marginY + row * labelHeight;

    // Cadre de l'étiquette (pointillés)
    doc.setDrawColor(200, 200, 200);
    doc.setLineDashPattern([2, 2], 0);
    doc.rect(x, y, labelWidth, labelHeight);
    doc.setLineDashPattern([], 0);

    // Expéditeur
    doc.setFontSize(7);
    doc.setFont('helvetica', 'normal');
    doc.text(sender.nom, x + 5, y + 6);
    doc.text(`${sender.adresse}, ${sender.codePostal} ${sender.ville}`, x + 5, y + 10);

    // Mention LRAR
    if (sendType === PostalSendType.LRAR) {
      doc.setFontSize(8);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(200, 0, 0);
      doc.text('LRAR', x + labelWidth - 20, y + 8);
      doc.setTextColor(0, 0, 0);
    }

    // Destinataire
    const destX = x + labelWidth / 2;
    const destY = y + labelHeight / 2 + 5;

    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.text(recipient.nom, destX, destY, { align: 'center' });

    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text(recipient.adresse.rue, destX, destY + 6, { align: 'center' });
    doc.text(
      `${recipient.adresse.codePostal} ${recipient.adresse.ville.toUpperCase()}`,
      destX,
      destY + 12,
      { align: 'center' }
    );
  });

  const blob = doc.output('blob');
  const url = URL.createObjectURL(blob);
  const date = new Date().toISOString().split('T')[0];
  const filename = `etiquettes-a4-${date}.pdf`;

  return {
    blob,
    url,
    filename,
    count: recipients.length,
  };
}

/**
 * Exporte les adresses en CSV
 */
export function exportAddressesCSV(
  recipients: PostalRecipient[],
  sendType: PostalSendType
): string {
  const headers = ['Nom', 'Rue', 'Code Postal', 'Ville', 'Type envoi'];
  const rows = recipients.map((r) => [
    r.nom,
    r.adresse.rue,
    r.adresse.codePostal,
    r.adresse.ville,
    sendType === PostalSendType.LRAR ? 'LRAR' : 'Lettre simple',
  ]);

  const csvContent = [
    headers.join(';'),
    ...rows.map((row) => row.map((cell) => `"${cell}"`).join(';')),
  ].join('\n');

  return csvContent;
}

/**
 * Télécharge le CSV
 */
export function downloadCSV(content: string, filename: string): void {
  const blob = new Blob(['\ufeff' + content], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
