import { jsPDF } from 'jspdf';
import type { DocumentTechnique } from '@/types';

interface GenerateDocumentTechniquePDFParams {
  document: DocumentTechnique;
  coproprieteNom?: string;
}

const TYPE_DOCUMENT_LABELS: Record<string, string> = {
  DTA: 'Dossier Technique Amiante',
  DIAGNOSTIC_PLOMB: 'Diagnostic Plomb',
  DIAGNOSTIC_ELECTRICITE: 'Diagnostic Électricité',
  DIAGNOSTIC_GAZ: 'Diagnostic Gaz',
  DPE_COLLECTIF: 'DPE Collectif',
  CONTROLE_ASCENSEUR: 'Contrôle Ascenseur',
  CONTROLE_EXTINCTEURS: 'Contrôle Extincteurs',
  CONTROLE_CHAUFFERIE: 'Contrôle Chaufferie',
  RAPPORT_SECURITE: 'Rapport Sécurité',
  GARANTIE_DECENNALE: 'Garantie Décennale',
  GARANTIE_PARFAIT_ACHEVEMENT: 'Garantie Parfait Achèvement',
};

/**
 * Génère un PDF pour un document technique
 */
export function generateDocumentTechniquePDF({
  document,
  coproprieteNom = 'Copropriété',
}: GenerateDocumentTechniquePDFParams): void {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 20;
  let y = 25;

  // Helper pour ajouter du texte
  const addText = (
    text: string,
    x: number,
    yPos: number,
    options?: { fontSize?: number; fontStyle?: string; color?: number[]; align?: 'left' | 'center' | 'right' }
  ) => {
    doc.setFontSize(options?.fontSize || 10);
    doc.setFont('helvetica', options?.fontStyle || 'normal');
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

  // Helper pour tracer une ligne
  const drawLine = (yPos: number, color: number[] = [229, 231, 235]) => {
    doc.setDrawColor(color[0], color[1], color[2]);
    doc.line(margin, yPos, pageWidth - margin, yPos);
  };

  // === EN-TÊTE ===
  doc.setFillColor(37, 99, 235);
  doc.rect(0, 0, pageWidth, 40, 'F');

  addText('DOCUMENT TECHNIQUE', pageWidth / 2, 20, {
    fontSize: 16,
    fontStyle: 'bold',
    color: [255, 255, 255],
    align: 'center',
  });

  addText(TYPE_DOCUMENT_LABELS[document.type] || document.type, pageWidth / 2, 30, {
    fontSize: 12,
    color: [219, 234, 254],
    align: 'center',
  });

  y = 55;

  // === INFORMATIONS DOCUMENT ===
  addText('INFORMATIONS DU DOCUMENT', margin, y, { fontSize: 12, fontStyle: 'bold', color: [37, 99, 235] });
  y += 12;

  const infoFields = [
    { label: 'Nom', value: document.nom },
    { label: 'Type', value: TYPE_DOCUMENT_LABELS[document.type] || document.type },
    { label: 'Copropriété', value: coproprieteNom },
  ];

  if (document.dateValidite) {
    infoFields.push({
      label: 'Date de validité',
      value: formatDate(document.dateValidite),
    });

    const isExpired = new Date(document.dateValidite) < new Date();
    const isExpiringSoon = !isExpired &&
      new Date(document.dateValidite) <= new Date(Date.now() + 90 * 24 * 60 * 60 * 1000);

    if (isExpired) {
      infoFields.push({ label: 'Statut', value: 'EXPIRÉ' });
    } else if (isExpiringSoon) {
      infoFields.push({ label: 'Statut', value: 'Échéance proche' });
    } else {
      infoFields.push({ label: 'Statut', value: 'Valide' });
    }
  }

  infoFields.forEach(field => {
    addText(`${field.label} :`, margin, y, { fontSize: 10, fontStyle: 'bold' });
    addText(field.value, margin + 45, y, { fontSize: 10 });
    y += 7;
  });

  y += 10;
  drawLine(y);
  y += 15;

  // === OBSERVATIONS ===
  if (document.observations) {
    addText('OBSERVATIONS', margin, y, { fontSize: 12, fontStyle: 'bold', color: [37, 99, 235] });
    y += 12;

    // Découper les observations en lignes
    const lines = doc.splitTextToSize(document.observations, pageWidth - margin * 2);
    lines.forEach((line: string) => {
      addText(line, margin, y, { fontSize: 10 });
      y += 6;
    });

    y += 10;
    drawLine(y);
    y += 15;
  }

  // === CONTENU PLACEHOLDER ===
  addText('CONTENU DU DOCUMENT', margin, y, { fontSize: 12, fontStyle: 'bold', color: [37, 99, 235] });
  y += 12;

  // Encadré avec contenu placeholder
  doc.setDrawColor(229, 231, 235);
  doc.setLineWidth(0.5);
  doc.rect(margin, y, pageWidth - margin * 2, 60);

  y += 25;
  addText('Le contenu détaillé du document serait affiché ici.', pageWidth / 2, y, {
    fontSize: 10,
    color: [107, 114, 128],
    align: 'center',
  });
  y += 10;
  addText('En production, ce PDF contiendrait le document original', pageWidth / 2, y, {
    fontSize: 10,
    color: [107, 114, 128],
    align: 'center',
  });
  y += 10;
  addText('téléchargé depuis le serveur.', pageWidth / 2, y, {
    fontSize: 10,
    color: [107, 114, 128],
    align: 'center',
  });

  // === PIED DE PAGE ===
  const footerY = doc.internal.pageSize.getHeight() - 20;
  drawLine(footerY - 5, [209, 213, 219]);
  addText(`Document généré le ${formatDate(new Date().toISOString())}`, pageWidth / 2, footerY, {
    fontSize: 8,
    color: [107, 114, 128],
    align: 'center',
  });
  addText('CoProFlex - Gestion de copropriété', pageWidth / 2, footerY + 5, {
    fontSize: 8,
    color: [107, 114, 128],
    align: 'center',
  });

  // Téléchargement
  const fileName = `${document.nom.replace(/\s+/g, '_')}.pdf`;
  doc.save(fileName);
}

// Helper
function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString('fr-FR', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  });
}
