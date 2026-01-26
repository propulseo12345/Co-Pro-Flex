import { jsPDF } from 'jspdf';
import type { ContratAssurance, DocumentAssurance } from '@/types';
import { getTypeAssuranceLabel } from '@/lib/constants/types-assurance';

interface GenerateAssuranceDocumentPDFParams {
  document: DocumentAssurance;
  assurance: ContratAssurance;
  coproprieteNom?: string;
}

const TYPE_DOCUMENT_LABELS: Record<string, string> = {
  CONTRAT: 'Contrat d\'assurance',
  CONDITIONS_PARTICULIERES: 'Conditions particulières',
  ATTESTATION: 'Attestation d\'assurance',
  AVENANT: 'Avenant au contrat',
  AUTRE: 'Document divers',
};

/**
 * Génère un PDF pour un document d'assurance
 */
export function generateAssuranceDocumentPDF({
  document,
  assurance,
  coproprieteNom = 'Copropriété',
}: GenerateAssuranceDocumentPDFParams): void {
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
  // Logo placeholder (carré bleu avec texte)
  doc.setFillColor(37, 99, 235);
  doc.rect(margin, y - 10, 40, 15, 'F');
  addText('CoProFlex', margin + 2, y, { fontSize: 10, fontStyle: 'bold', color: [255, 255, 255] });

  // Titre du document
  addText(TYPE_DOCUMENT_LABELS[document.type] || document.type, pageWidth - margin, y, {
    fontSize: 14,
    fontStyle: 'bold',
    align: 'right',
  });

  y += 20;
  drawLine(y);
  y += 15;

  // === INFORMATIONS ASSURANCE ===
  addText('INFORMATIONS DU CONTRAT', margin, y, { fontSize: 12, fontStyle: 'bold', color: [37, 99, 235] });
  y += 10;

  const infoFields = [
    { label: 'Type d\'assurance', value: getTypeAssuranceLabel(assurance.sousType) },
    { label: 'Nom du contrat', value: assurance.nom },
    { label: 'Assureur', value: assurance.assureur },
    { label: 'Numéro de police', value: assurance.numeroPolice },
    { label: 'Date de début', value: formatDate(assurance.dateDebut) },
    { label: 'Date de fin', value: formatDate(assurance.dateFin) },
    { label: 'Prime annuelle', value: formatMontant(assurance.primeAnnuelle) },
  ];

  if (assurance.franchise) {
    infoFields.push({ label: 'Franchise', value: formatMontant(assurance.franchise) });
  }

  infoFields.forEach(field => {
    addText(`${field.label} :`, margin, y, { fontSize: 10, fontStyle: 'bold' });
    addText(field.value, margin + 50, y, { fontSize: 10 });
    y += 6;
  });

  y += 10;
  drawLine(y);
  y += 15;

  // === GARANTIES ===
  if (assurance.garanties && assurance.garanties.length > 0) {
    addText('GARANTIES COUVERTES', margin, y, { fontSize: 12, fontStyle: 'bold', color: [37, 99, 235] });
    y += 10;

    assurance.garanties.forEach((garantie, index) => {
      // Petit carré vert de check
      doc.setFillColor(34, 197, 94);
      doc.rect(margin, y - 3, 4, 4, 'F');
      addText(garantie, margin + 8, y, { fontSize: 10 });
      y += 6;

      // Nouvelle colonne si besoin
      if (index === 5) {
        y -= 36; // Remonter pour 2e colonne
      }
    });

    y += 10;
    drawLine(y);
    y += 15;
  }

  // === INFORMATIONS DOCUMENT ===
  addText('INFORMATIONS DU DOCUMENT', margin, y, { fontSize: 12, fontStyle: 'bold', color: [37, 99, 235] });
  y += 10;

  addText('Nom du document :', margin, y, { fontSize: 10, fontStyle: 'bold' });
  addText(document.nom, margin + 50, y, { fontSize: 10 });
  y += 6;

  addText('Date d\'upload :', margin, y, { fontSize: 10, fontStyle: 'bold' });
  addText(formatDate(document.dateUpload), margin + 50, y, { fontSize: 10 });
  y += 6;

  addText('Type :', margin, y, { fontSize: 10, fontStyle: 'bold' });
  addText(TYPE_DOCUMENT_LABELS[document.type] || document.type, margin + 50, y, { fontSize: 10 });

  y += 20;
  drawLine(y);
  y += 15;

  // === COPROPRIÉTÉ ===
  addText('COPROPRIÉTÉ', margin, y, { fontSize: 12, fontStyle: 'bold', color: [37, 99, 235] });
  y += 10;
  addText(coproprieteNom, margin, y, { fontSize: 10 });

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

/**
 * Génère un PDF pour l'attestation d'assurance
 */
export function generateAttestationAssurancePDF(
  assurance: ContratAssurance,
  coproprieteNom?: string
): void {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 20;
  let y = 25;

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

  // === EN-TÊTE ===
  doc.setFillColor(37, 99, 235);
  doc.rect(0, 0, pageWidth, 40, 'F');

  addText('ATTESTATION D\'ASSURANCE', pageWidth / 2, 25, {
    fontSize: 18,
    fontStyle: 'bold',
    color: [255, 255, 255],
    align: 'center',
  });

  y = 55;

  // Encadré principal
  doc.setDrawColor(37, 99, 235);
  doc.setLineWidth(0.5);
  doc.rect(margin, y, pageWidth - margin * 2, 100);

  y += 15;

  // Contenu attestation
  addText('Je soussigné(e), représentant de la compagnie', margin + 10, y, { fontSize: 11 });
  y += 10;
  addText(assurance.assureur, margin + 10, y, { fontSize: 12, fontStyle: 'bold', color: [37, 99, 235] });
  y += 15;

  addText('atteste que la copropriété', margin + 10, y, { fontSize: 11 });
  y += 10;
  addText(coproprieteNom || 'Copropriété', margin + 10, y, { fontSize: 12, fontStyle: 'bold' });
  y += 15;

  addText(`est couverte par le contrat n° ${assurance.numeroPolice}`, margin + 10, y, { fontSize: 11 });
  y += 10;
  addText(`du ${formatDate(assurance.dateDebut)} au ${formatDate(assurance.dateFin)}`, margin + 10, y, { fontSize: 11 });
  y += 15;

  addText(`Prime annuelle : ${formatMontant(assurance.primeAnnuelle)}`, margin + 10, y, { fontSize: 11 });

  y += 35;

  // Garanties
  if (assurance.garanties && assurance.garanties.length > 0) {
    addText('Garanties couvertes :', margin, y, { fontSize: 12, fontStyle: 'bold' });
    y += 10;

    assurance.garanties.forEach(garantie => {
      addText(`• ${garantie}`, margin + 10, y, { fontSize: 10 });
      y += 6;
    });
  }

  // Pied de page
  const footerY = doc.internal.pageSize.getHeight() - 30;
  addText(`Fait le ${formatDate(new Date().toISOString())}`, margin, footerY, { fontSize: 10 });
  addText('Pour l\'assureur,', pageWidth - margin, footerY, { fontSize: 10, align: 'right' });
  addText('Signature', pageWidth - margin, footerY + 10, { fontSize: 10, fontStyle: 'italic', align: 'right' });

  // Téléchargement
  doc.save(`Attestation_${assurance.nom.replace(/\s+/g, '_')}.pdf`);
}

// Helpers
function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString('fr-FR', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  });
}

function formatMontant(montant: number): string {
  return new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency: 'EUR',
  }).format(montant);
}
