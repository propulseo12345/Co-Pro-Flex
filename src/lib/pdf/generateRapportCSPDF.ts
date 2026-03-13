/**
 * Génération du PDF pour le Rapport d'activité du Conseil Syndical
 *
 * Ce fichier génère un PDF formaté pour:
 * - L'annexe à la convocation
 * - L'annexe au PV
 * - L'export individuel du rapport
 */

import { jsPDF } from 'jspdf';
import { RapportActiviteCS } from '@/types/models/conseil-syndical';

interface GenerateRapportCSPDFParams {
  rapport: RapportActiviteCS;
  nomCopropriete?: string;
  adresseCopropriete?: string;
}

interface GeneratedPDF {
  blob: Blob;
  filename: string;
}

/**
 * Utilitaire pour supprimer les balises HTML
 */
function stripHtml(html: string): string {
  return html.replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim();
}

/**
 * Génère le PDF du rapport d'activité du Conseil Syndical
 */
export function generateRapportCSPDF({
  rapport,
  nomCopropriete = 'Copropriété',
  adresseCopropriete = '',
}: GenerateRapportCSPDFParams): jsPDF {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 20;
  const contentWidth = pageWidth - margin * 2;
  let y = margin;

  // Fonction utilitaire pour ajouter du texte
  const addText = (
    text: string,
    x: number,
    yPos: number,
    options?: {
      fontSize?: number;
      fontStyle?: 'normal' | 'bold' | 'italic';
      color?: [number, number, number];
      align?: 'left' | 'center' | 'right';
    }
  ): number => {
    doc.setFontSize(options?.fontSize || 10);
    doc.setFont('helvetica', options?.fontStyle || 'normal');

    if (options?.color) {
      doc.setTextColor(options.color[0], options.color[1], options.color[2]);
    } else {
      doc.setTextColor(0, 0, 0);
    }

    if (options?.align) {
      const alignX = options.align === 'center' ? pageWidth / 2 : options.align === 'right' ? pageWidth - margin : x;
      doc.text(text, alignX, yPos, { align: options.align });
    } else {
      doc.text(text, x, yPos);
    }

    return yPos;
  };

  // Fonction pour ajouter un paragraphe avec retour à la ligne automatique
  const addParagraph = (text: string, x: number, yPos: number, maxWidth: number): number => {
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(0, 0, 0);

    const lines = doc.splitTextToSize(text, maxWidth);

    for (const line of lines) {
      if (yPos > pageHeight - 25) {
        doc.addPage();
        yPos = margin;
      }
      doc.text(line, x, yPos);
      yPos += 5;
    }

    return yPos;
  };

  // Fonction pour vérifier si on a besoin d'une nouvelle page
  const checkNewPage = (neededSpace: number): void => {
    if (y + neededSpace > pageHeight - 25) {
      doc.addPage();
      y = margin;
    }
  };

  // Fonction pour ajouter un titre de section
  const addSectionTitle = (title: string): void => {
    checkNewPage(20);
    y += 8;
    doc.setFillColor(37, 99, 235); // primary-600
    doc.rect(margin, y, contentWidth, 8, 'F');
    addText(title.toUpperCase(), margin + 4, y + 6, {
      fontSize: 11,
      fontStyle: 'bold',
      color: [255, 255, 255],
    });
    y += 14;
  };

  // Fonction pour ajouter une sous-section
  const addSubsectionTitle = (title: string): void => {
    checkNewPage(15);
    y += 4;
    doc.setDrawColor(200, 200, 200);
    doc.line(margin, y, pageWidth - margin, y);
    y += 6;
    addText(title, margin, y, { fontSize: 11, fontStyle: 'bold' });
    y += 8;
  };

  // ============================================
  // EN-TÊTE DU DOCUMENT
  // ============================================

  // Titre principal
  addText('RAPPORT D\'ACTIVITÉ', pageWidth / 2, y, {
    fontSize: 18,
    fontStyle: 'bold',
    align: 'center',
  });
  y += 8;

  addText('DU CONSEIL SYNDICAL', pageWidth / 2, y, {
    fontSize: 16,
    fontStyle: 'bold',
    align: 'center',
  });
  y += 12;

  // Période
  const periodeDebut = rapport.periodeDebut.toLocaleDateString('fr-FR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
  const periodeFin = rapport.periodeFin.toLocaleDateString('fr-FR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

  addText(`Période du ${periodeDebut} au ${periodeFin}`, pageWidth / 2, y, {
    fontSize: 12,
    align: 'center',
    color: [100, 100, 100],
  });
  y += 15;

  // Nom de la copropriété
  if (nomCopropriete) {
    addText(nomCopropriete, pageWidth / 2, y, {
      fontSize: 12,
      fontStyle: 'bold',
      align: 'center',
    });
    y += 6;
  }

  if (adresseCopropriete) {
    addText(adresseCopropriete, pageWidth / 2, y, {
      fontSize: 10,
      align: 'center',
      color: [100, 100, 100],
    });
    y += 6;
  }

  // Ligne séparatrice
  y += 5;
  doc.setDrawColor(37, 99, 235);
  doc.setLineWidth(0.5);
  doc.line(margin + 40, y, pageWidth - margin - 40, y);
  y += 10;

  // ============================================
  // INTRODUCTION / RÉSUMÉ
  // ============================================

  if (rapport.introduction) {
    addSectionTitle('Résumé');
    y = addParagraph(stripHtml(rapport.introduction), margin, y, contentWidth);
    y += 5;
  }

  // ============================================
  // CONTENU PRINCIPAL
  // ============================================

  if (rapport.contenu) {
    addSectionTitle('Rapport détaillé');
    y = addParagraph(stripHtml(rapport.contenu), margin, y, contentWidth);
    y += 5;
  }

  // ============================================
  // SECTIONS ADDITIONNELLES
  // ============================================

  if (rapport.sections.length > 0) {
    addSectionTitle('Points complémentaires');

    const sortedSections = [...rapport.sections].sort((a, b) => a.ordre - b.ordre);

    for (const section of sortedSections) {
      addSubsectionTitle(section.titre);
      if (section.contenu) {
        y = addParagraph(stripHtml(section.contenu), margin, y, contentWidth);
      } else {
        addText('(Aucun détail)', margin, y, { color: [150, 150, 150] });
        y += 6;
      }
      y += 3;
    }
  }

  // ============================================
  // LISTE DES ANNEXES
  // ============================================

  if (rapport.annexes.length > 0) {
    addSectionTitle('Annexes jointes');

    for (let i = 0; i < rapport.annexes.length; i++) {
      const annexe = rapport.annexes[i];
      checkNewPage(10);

      addText(`${i + 1}. ${annexe.nom}`, margin + 5, y, { fontStyle: 'bold' });
      y += 5;

      if (annexe.description) {
        addText(annexe.description, margin + 10, y, {
          fontSize: 9,
          color: [100, 100, 100],
        });
        y += 5;
      }

      y += 2;
    }
  }

  // ============================================
  // PIED DE PAGE
  // ============================================

  checkNewPage(30);
  y += 10;
  doc.setDrawColor(200, 200, 200);
  doc.line(margin, y, pageWidth - margin, y);
  y += 8;

  addText('Le présent rapport sera soumis à l\'approbation de l\'assemblée générale', margin, y, {
    fontSize: 9,
    color: [100, 100, 100],
  });
  y += 5;

  addText('conformément aux dispositions de la loi du 10 juillet 1965.', margin, y, {
    fontSize: 9,
    color: [100, 100, 100],
  });

  // ============================================
  // NUMÉROTATION DES PAGES
  // ============================================

  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(150, 150, 150);
    doc.text(`Page ${i} / ${pageCount}`, pageWidth / 2, pageHeight - 10, { align: 'center' });

    // Date de génération en bas à droite
    doc.text(
      `Généré le ${new Date().toLocaleDateString('fr-FR')}`,
      pageWidth - margin,
      pageHeight - 10,
      { align: 'right' }
    );
  }

  // ============================================
  // GÉNÉRATION DU FICHIER
  // ============================================

  return doc;
}

/**
 * Génère et télécharge le PDF du rapport
 */
export function downloadRapportCSPDF(params: GenerateRapportCSPDFParams): void {
  const doc = generateRapportCSPDF(params);
  const annee = params.rapport.periodeFin.getFullYear();
  doc.save(`Rapport_CS_${annee}.pdf`);
}

/**
 * Génère le PDF pour l'annexe de convocation
 * Format simplifié pour intégration dans la convocation
 */
export function generateRapportCSAnnexePDF(params: GenerateRapportCSPDFParams): jsPDF {
  return generateRapportCSPDF(params);
}
