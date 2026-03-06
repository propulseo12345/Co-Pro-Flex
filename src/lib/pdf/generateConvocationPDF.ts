/**
 * Générateur PDF pour les convocations d'AG
 *
 * Génère un PDF conforme aux exigences légales françaises
 * avec mise en page A4, ordre du jour complet et mentions obligatoires.
 */

import { jsPDF } from 'jspdf';
import type { AGData, Resolution } from '@/hooks/modules/useConvocationData';
import { resolveResolutionText } from '@/lib/utils/variable-resolution';
import {
  AGFormat,
  AG_FORMAT_LABELS,
  requiresAdresse,
  requiresVisioUrl,
  detectVisioProvider,
  VISIO_PROVIDER_LABELS,
  getVisioInstructions,
} from '@/types';
import { renderAllAnnexes, type AnnexeAccountingData } from './annexe-pdf-tables';

export interface ConvocationPDFParams {
  agData: AGData;
  resolutions: Resolution[];
  copropriete: {
    nom: string;
    adresse: string;
  };
  syndic: {
    nom: string;
    adresse: string;
  };
  annexes?: string[];
  annexesStructured?: ConvocationAnnexePDF[];
  accountingData?: AnnexeAccountingData | null;
  version?: number;
}

export interface ConvocationAnnexePDF {
  label: string;
  category: 'legal' | 'comptable' | 'contextuel';
  obligatoire: boolean;
}

export interface ConvocationPDFResult {
  blob: Blob;
  url: string;
  version: number;
  generatedAt: string;
}

const MARGIN = 20;
const PAGE_WIDTH = 210; // A4
const PAGE_HEIGHT = 297;
const CONTENT_WIDTH = PAGE_WIDTH - MARGIN * 2;

/**
 * Génère le PDF de convocation et retourne un Blob + URL
 */
export function generateConvocationPDF(params: ConvocationPDFParams): ConvocationPDFResult {
  const { agData, resolutions, copropriete, syndic, annexes = [], annexesStructured, accountingData, version = 1 } = params;

  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  let y = MARGIN;

  // Helpers
  const addText = (
    text: string,
    x: number,
    yPos: number,
    options?: {
      fontSize?: number;
      fontStyle?: 'normal' | 'bold' | 'italic';
      color?: [number, number, number];
      align?: 'left' | 'center' | 'right';
      maxWidth?: number;
    }
  ): number => {
    const { fontSize = 10, fontStyle = 'normal', color = [0, 0, 0], align = 'left', maxWidth } = options || {};

    doc.setFontSize(fontSize);
    doc.setFont('helvetica', fontStyle);
    doc.setTextColor(color[0], color[1], color[2]);

    if (maxWidth) {
      const lines = doc.splitTextToSize(text, maxWidth);
      doc.text(lines, x, yPos, { align });
      return lines.length * (fontSize * 0.4);
    }

    doc.text(text, x, yPos, { align });
    return fontSize * 0.4;
  };

  const addSection = (title: string): void => {
    y += 8;
    doc.setFillColor(37, 99, 235); // primary-600
    doc.rect(MARGIN, y, CONTENT_WIDTH, 8, 'F');
    addText(title, MARGIN + 4, y + 5.5, { fontSize: 11, fontStyle: 'bold', color: [255, 255, 255] });
    y += 14;
  };

  const checkNewPage = (neededSpace: number): void => {
    if (y + neededSpace > PAGE_HEIGHT - 30) {
      doc.addPage();
      y = MARGIN;
    }
  };

  // === EN-TÊTE ===
  // Logo / Nom copropriété
  addText(copropriete.nom.toUpperCase(), PAGE_WIDTH / 2, y, {
    fontSize: 14,
    fontStyle: 'bold',
    align: 'center',
  });
  y += 6;
  addText(copropriete.adresse, PAGE_WIDTH / 2, y, {
    fontSize: 9,
    color: [100, 116, 139],
    align: 'center',
  });
  y += 12;

  // Titre principal
  const typeLabel = agData.type === 'ORDINAIRE' ? 'ORDINAIRE' :
                    agData.type === 'URGENTE' ? 'URGENTE' : 'EXTRAORDINAIRE';
  addText(`CONVOCATION À L'ASSEMBLÉE GÉNÉRALE ${typeLabel}`, PAGE_WIDTH / 2, y, {
    fontSize: 16,
    fontStyle: 'bold',
    align: 'center',
  });
  y += 10;

  // Badge version
  if (version > 1) {
    doc.setFillColor(245, 158, 11); // warning
    doc.roundedRect(PAGE_WIDTH / 2 - 15, y, 30, 6, 1, 1, 'F');
    addText(`Version ${version}`, PAGE_WIDTH / 2, y + 4.2, {
      fontSize: 8,
      fontStyle: 'bold',
      color: [255, 255, 255],
      align: 'center',
    });
    y += 10;
  }

  // Date de génération
  const generatedAt = new Date().toISOString();
  addText(`Document généré le ${new Date().toLocaleDateString('fr-FR')} à ${new Date().toLocaleTimeString('fr-FR')}`, PAGE_WIDTH / 2, y, {
    fontSize: 8,
    color: [156, 163, 175],
    align: 'center',
  });
  y += 12;

  // === INFORMATIONS DE L'AG ===
  addSection('INFORMATIONS DE L\'ASSEMBLÉE');

  const dateFormatted = new Date(agData.date).toLocaleDateString('fr-FR', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  const format = (agData.format as AGFormat) || AGFormat.PRESENTIEL;
  const formatLabel = AG_FORMAT_LABELS[format] || 'Présentiel';

  addText(`Date : ${dateFormatted}`, MARGIN, y, { fontStyle: 'bold' });
  y += 6;
  addText(`Heure : ${agData.heure}`, MARGIN, y);
  y += 6;
  addText(`Format : ${formatLabel}`, MARGIN, y);
  y += 8;

  // Lieu si présentiel ou mixte
  if (requiresAdresse(format)) {
    const adresseStr = typeof agData.adresse === 'string'
      ? agData.adresse
      : agData.adresseComplete || `${agData.adresse.rue}, ${agData.adresse.codePostal} ${agData.adresse.ville}`;
    const lieuStr = typeof agData.adresse === 'object' ? agData.adresse.nomLieu : agData.lieu;

    addText('Lieu de réunion :', MARGIN, y, { fontStyle: 'bold' });
    y += 5;
    addText(lieuStr || 'Lieu de l\'assemblée', MARGIN + 4, y);
    y += 5;
    addText(adresseStr, MARGIN + 4, y);
    y += 8;
  }

  // Visio si concerné
  if (requiresVisioUrl(format) && agData.visioUrl) {
    const provider = agData.visioProvider || detectVisioProvider(agData.visioUrl);
    const providerLabel = VISIO_PROVIDER_LABELS[provider as keyof typeof VISIO_PROVIDER_LABELS] || 'Visioconférence';
    const instructions = getVisioInstructions(provider as Parameters<typeof getVisioInstructions>[0]);

    addText(`Participation à distance (${providerLabel}) :`, MARGIN, y, { fontStyle: 'bold' });
    y += 5;
    addText(`Lien de connexion : ${agData.visioUrl}`, MARGIN + 4, y, { fontSize: 9 });
    y += 5;
    const instrHeight = addText(instructions, MARGIN + 4, y, { fontSize: 8, color: [100, 116, 139], maxWidth: CONTENT_WIDTH - 8 });
    y += instrHeight + 4;
  }

  // === ORDRE DU JOUR ===
  checkNewPage(30);
  addSection('ORDRE DU JOUR');

  resolutions.forEach((resolution, index) => {
    checkNewPage(25);

    // Numéro et titre
    addText(`${index + 1}. ${resolution.titre}`, MARGIN, y, { fontStyle: 'bold', fontSize: 10 });
    y += 6;

    // Texte résolu
    const resolvedText = resolveResolutionText(resolution.texte, resolution.variables, true);
    const textHeight = addText(resolvedText, MARGIN + 4, y, { fontSize: 9, maxWidth: CONTENT_WIDTH - 8 });
    y += textHeight + 2;

    // Majorité requise
    doc.setFillColor(241, 245, 249);
    doc.roundedRect(MARGIN + 4, y, 60, 5, 1, 1, 'F');
    addText(`Vote : ${resolution.majorite}`, MARGIN + 6, y + 3.5, { fontSize: 8, color: [71, 85, 105] });
    y += 10;
  });

  // === MODALITÉS DE PARTICIPATION ===
  checkNewPage(50);
  addSection('MODALITÉS DE PARTICIPATION');

  const modalites = [
    '• Assister personnellement à l\'assemblée',
    '• Vous faire représenter par un mandataire de votre choix muni d\'un pouvoir',
    '• Voter par correspondance en remplissant le formulaire joint',
  ];

  addText('Conformément à la loi du 10 juillet 1965, vous pouvez :', MARGIN, y);
  y += 8;

  modalites.forEach((modalite) => {
    addText(modalite, MARGIN + 4, y, { fontSize: 9 });
    y += 5;
  });
  y += 4;

  // === MENTIONS LÉGALES ===
  checkNewPage(40);
  addSection('MENTIONS LÉGALES OBLIGATOIRES');

  const mentions = [
    'Cette convocation est établie conformément aux articles 7 à 17 du décret n°67-223 du 17 mars 1967.',
    'Le délai de convocation est de 21 jours minimum avant la date de l\'assemblée (article 9).',
    'Les documents préparatoires sont à votre disposition au siège du syndic.',
    'Tout copropriétaire peut proposer des questions à inscrire à l\'ordre du jour jusqu\'au délai prévu par le règlement.',
  ];

  mentions.forEach((mention) => {
    const h = addText(`• ${mention}`, MARGIN, y, { fontSize: 8, color: [100, 116, 139], maxWidth: CONTENT_WIDTH });
    y += h + 3;
  });

  // === DOCUMENTS ANNEXÉS ===
  if (annexesStructured && annexesStructured.length > 0) {
    checkNewPage(40);
    addSection('DOCUMENTS ANNEXÉS À LA CONVOCATION');

    const CATEGORY_LABELS: Record<string, string> = {
      legal: 'Documents obligatoires',
      comptable: 'Annexes comptables',
      contextuel: 'Documents complémentaires',
    };
    const categoryOrder: Array<'legal' | 'comptable' | 'contextuel'> = ['legal', 'comptable', 'contextuel'];

    const grouped = annexesStructured.reduce<Record<string, ConvocationAnnexePDF[]>>((acc, a) => {
      if (!acc[a.category]) acc[a.category] = [];
      acc[a.category].push(a);
      return acc;
    }, {});

    let docIndex = 1;
    categoryOrder.forEach((cat) => {
      const items = grouped[cat];
      if (!items || items.length === 0) return;

      checkNewPage(20);

      // Sous-titre de catégorie
      doc.setFillColor(241, 245, 249);
      doc.rect(MARGIN, y, CONTENT_WIDTH, 6, 'F');
      addText(CATEGORY_LABELS[cat].toUpperCase(), MARGIN + 3, y + 4.2, {
        fontSize: 8,
        fontStyle: 'bold',
        color: [71, 85, 105],
      });
      y += 10;

      items.forEach((item) => {
        checkNewPage(10);

        // Numéro + label
        addText(`${docIndex}. ${item.label}`, MARGIN + 4, y, { fontSize: 9, fontStyle: 'normal' });

        // Badge obligatoire
        if (item.obligatoire) {
          const labelWidth = doc.getTextWidth(`${docIndex}. ${item.label}`);
          const badgeX = MARGIN + 4 + labelWidth + 3;
          doc.setFillColor(37, 99, 235);
          doc.roundedRect(badgeX, y - 3.2, 18, 4.5, 1, 1, 'F');
          addText('obligatoire', badgeX + 1.5, y, { fontSize: 6, color: [255, 255, 255] });
        }

        y += 6;
        docIndex++;
      });

      y += 2;
    });

    y += 2;
  } else if (annexes.length > 0) {
    checkNewPage(30);
    addSection('DOCUMENTS ANNEXÉS');

    annexes.forEach((annexe, index) => {
      addText(`${index + 1}. ${annexe}`, MARGIN + 4, y, { fontSize: 9 });
      y += 5;
    });
    y += 4;
  }

  // === SIGNATURE SYNDIC ===
  checkNewPage(35);
  y += 10;
  addText('Le Syndic,', PAGE_WIDTH - MARGIN - 50, y, { align: 'right' });
  y += 15;
  addText(syndic.nom, PAGE_WIDTH - MARGIN - 50, y, { fontStyle: 'bold', align: 'right' });
  y += 5;
  addText(syndic.adresse, PAGE_WIDTH - MARGIN - 50, y, { fontSize: 8, color: [100, 116, 139], align: 'right' });

  // === ANNEXES COMPTABLES (tableaux complets) ===
  if (accountingData) {
    renderAllAnnexes(doc, accountingData);
  }

  // === PIED DE PAGE SUR TOUTES LES PAGES ===
  const totalPages = doc.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(156, 163, 175);
    doc.text(`Page ${i}/${totalPages}`, PAGE_WIDTH - MARGIN, PAGE_HEIGHT - 10, { align: 'right' });
    doc.text(`${copropriete.nom} - Convocation AG ${typeLabel}`, MARGIN, PAGE_HEIGHT - 10);
    if (version > 1) {
      doc.text(`v${version}`, PAGE_WIDTH / 2, PAGE_HEIGHT - 10, { align: 'center' });
    }
  }

  // Générer le blob
  const blob = doc.output('blob');
  const url = URL.createObjectURL(blob);

  return {
    blob,
    url,
    version,
    generatedAt,
  };
}

/**
 * Télécharge directement le PDF
 */
export function downloadConvocationPDF(params: ConvocationPDFParams, filename?: string): void {
  const result = generateConvocationPDF(params);
  const link = document.createElement('a');
  link.href = result.url;
  link.download = filename || `convocation_ag_${params.agData.type.toLowerCase()}_v${params.version || 1}.pdf`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(result.url);
}
