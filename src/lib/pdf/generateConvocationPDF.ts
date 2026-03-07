/**
 * Generateur PDF pour les convocations d'AG
 *
 * Design: Institutional Elegance
 * - Palette navy + or chaud
 * - Times pour les titres formels, Helvetica pour le corps
 * - Filets decoratifs fins, cartes avec fond subtil
 * - Badges de vote contrastes, mise en page aeree
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
import { insertRenderedPages } from './pdf-document-renderer';

// ════════════════════════════════════════════════════════════
// INTERFACES
// ════════════════════════════════════════════════════════════

export interface ConvocationPDFParams {
  agData: AGData;
  resolutions: Resolution[];
  copropriete: { nom: string; adresse: string };
  syndic: { nom: string; adresse: string };
  annexes?: string[];
  annexesStructured?: ConvocationAnnexePDF[];
  accountingData?: AnnexeAccountingData | null;
  uploadedDocPages?: import('./pdf-document-renderer').RenderedPage[];
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

// ════════════════════════════════════════════════════════════
// DESIGN SYSTEM
// ════════════════════════════════════════════════════════════

const MARGIN = 22;
const PW = 210;
const PH = 297;
const CW = PW - MARGIN * 2;

type RGB = [number, number, number];

const NAVY: RGB = [26, 42, 74];
const NAVY_MID: RGB = [55, 78, 120];
const GOLD: RGB = [178, 136, 54];
const GOLD_MUTED: RGB = [208, 186, 140];
const TEXT: RGB = [33, 37, 41];
const TEXT_SEC: RGB = [100, 116, 139];
const TEXT_MUTED: RGB = [156, 163, 175];
const BG_CARD: RGB = [247, 248, 250];
const BG_SUB: RGB = [241, 244, 248];
const BORDER: RGB = [209, 213, 219];
const BORDER_LT: RGB = [229, 231, 235];
const WHITE: RGB = [255, 255, 255];

// ════════════════════════════════════════════════════════════
// HELPERS
// ════════════════════════════════════════════════════════════

function hr(doc: jsPDF, y: number, color: RGB = BORDER, w = 0.2) {
  doc.setDrawColor(...color);
  doc.setLineWidth(w);
  doc.line(MARGIN, y, MARGIN + CW, y);
}

function txt(
  doc: jsPDF,
  text: string,
  x: number,
  y: number,
  opts: {
    f?: 'helvetica' | 'times';
    s?: 'normal' | 'bold' | 'italic';
    sz?: number;
    c?: RGB;
    a?: 'left' | 'center' | 'right';
    mw?: number;
  } = {}
): number {
  const { f = 'helvetica', s = 'normal', sz = 10, c = TEXT, a = 'left', mw } = opts;
  // Remplacer U+202F (espace fine insécable) par espace normal — jsPDF le rend comme "/"
  const safe = text.replace(/\u202F/g, ' ');
  doc.setFont(f, s);
  doc.setFontSize(sz);
  doc.setTextColor(...c);
  if (mw) {
    const lines = doc.splitTextToSize(safe, mw);
    doc.text(lines, x, y, { align: a });
    return lines.length * sz * 0.4;
  }
  doc.text(safe, x, y, { align: a });
  return sz * 0.4;
}

function sectionHeader(doc: jsPDF, title: string, y: number): number {
  // Gold accent bar on the left
  doc.setFillColor(...GOLD);
  doc.rect(MARGIN, y, 1.5, 6, 'F');

  // Title in navy
  txt(doc, title.toUpperCase(), MARGIN + 5.5, y + 4.2, {
    s: 'bold',
    sz: 9.5,
    c: NAVY,
  });

  // Thin underline
  hr(doc, y + 8, BORDER_LT, 0.15);

  return y + 14;
}

function checkPage(doc: jsPDF, y: number, need: number): number {
  if (y + need > PH - 28) {
    doc.addPage();
    return MARGIN;
  }
  return y;
}

// ════════════════════════════════════════════════════════════
// MAIN GENERATOR
// ════════════════════════════════════════════════════════════

export function generateConvocationPDF(params: ConvocationPDFParams): ConvocationPDFResult {
  const {
    agData,
    resolutions,
    copropriete,
    syndic,
    annexes = [],
    annexesStructured,
    accountingData,
    uploadedDocPages,
    version = 1,
  } = params;

  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  let y = MARGIN;

  const typeLabel =
    agData.type === 'ORDINAIRE'
      ? 'ORDINAIRE'
      : agData.type === 'URGENTE'
        ? 'URGENTE'
        : 'EXTRAORDINAIRE';

  // ── EN-TETE ─────────────────────────────────────────────

  // Decorative gold line
  hr(doc, y, GOLD, 0.5);
  y += 8;

  // Copropriete name (Times, formal)
  txt(doc, copropriete.nom.toUpperCase(), PW / 2, y, {
    f: 'times',
    s: 'bold',
    sz: 15,
    c: NAVY,
    a: 'center',
  });
  y += 6;

  // Address
  txt(doc, copropriete.adresse, PW / 2, y, {
    sz: 8.5,
    c: TEXT_SEC,
    a: 'center',
  });
  y += 5;

  // Decorative gold line
  hr(doc, y, GOLD, 0.5);
  y += 12;

  // Main title
  txt(doc, 'CONVOCATION A L\'ASSEMBLEE GENERALE', PW / 2, y, {
    f: 'times',
    s: 'bold',
    sz: 17,
    c: NAVY,
    a: 'center',
  });
  y += 7;
  txt(doc, typeLabel, PW / 2, y, {
    f: 'times',
    s: 'bold',
    sz: 13,
    c: NAVY_MID,
    a: 'center',
  });
  y += 8;

  // Version badge
  if (version > 1) {
    doc.setFillColor(...GOLD);
    doc.roundedRect(PW / 2 - 14, y - 1, 28, 6, 1.5, 1.5, 'F');
    txt(doc, `Version ${version}`, PW / 2, y + 3.5, {
      sz: 7.5,
      s: 'bold',
      c: WHITE,
      a: 'center',
    });
    y += 9;
  }

  // Generation date
  const generatedAt = new Date().toISOString();
  const dateStr = new Date().toLocaleDateString('fr-FR');
  const timeStr = new Date().toLocaleTimeString('fr-FR');
  txt(doc, `Document genere le ${dateStr} a ${timeStr}`, PW / 2, y, {
    sz: 7.5,
    c: TEXT_MUTED,
    a: 'center',
  });
  y += 14;

  // ── INFORMATIONS DE L'ASSEMBLEE ─────────────────────────

  y = sectionHeader(doc, 'Informations de l\'assemblee', y);

  const format = (agData.format as AGFormat) || AGFormat.PRESENTIEL;
  const formatLabel = AG_FORMAT_LABELS[format] || 'Presentiel';
  const dateFormatted = new Date(agData.date).toLocaleDateString('fr-FR', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  // Build info fields
  const infoFields: [string, string][] = [
    ['Date', dateFormatted],
    ['Heure', agData.heure],
    ['Format', formatLabel],
  ];

  let lieuStr = '';
  let adresseStr = '';
  if (requiresAdresse(format)) {
    adresseStr =
      typeof agData.adresse === 'string'
        ? agData.adresse
        : agData.adresseComplete ||
          `${agData.adresse.rue}, ${agData.adresse.codePostal} ${agData.adresse.ville}`;
    lieuStr = typeof agData.adresse === 'object' ? agData.adresse.nomLieu : agData.lieu;
    infoFields.push(['Lieu', lieuStr || 'Lieu de l\'assemblee']);
    infoFields.push(['Adresse', adresseStr]);
  }

  let visioProvider = '';
  let visioInstructions = '';
  if (requiresVisioUrl(format) && agData.visioUrl) {
    const provider = agData.visioProvider || detectVisioProvider(agData.visioUrl);
    visioProvider =
      VISIO_PROVIDER_LABELS[provider as keyof typeof VISIO_PROVIDER_LABELS] || 'Visioconference';
    visioInstructions = getVisioInstructions(
      provider as Parameters<typeof getVisioInstructions>[0]
    );
    infoFields.push([visioProvider, agData.visioUrl]);
  }

  // Card background
  const cardH = infoFields.length * 7 + 10 + (visioInstructions ? 8 : 0);
  doc.setFillColor(...BG_CARD);
  doc.roundedRect(MARGIN, y, CW, cardH, 2, 2, 'F');
  doc.setDrawColor(...BORDER);
  doc.setLineWidth(0.15);
  doc.roundedRect(MARGIN, y, CW, cardH, 2, 2, 'S');

  // Left accent stripe inside card
  doc.setFillColor(...GOLD_MUTED);
  doc.rect(MARGIN, y, 0.8, cardH, 'F');

  let cy = y + 7;
  const labelX = MARGIN + 6;
  const valueX = MARGIN + 34;

  infoFields.forEach(([label, value]) => {
    txt(doc, label, labelX, cy, { sz: 8.5, s: 'bold', c: NAVY_MID });
    txt(doc, value, valueX, cy, { sz: 9, c: TEXT });
    cy += 7;
  });

  // Visio instructions (if any)
  if (visioInstructions) {
    const h = txt(doc, visioInstructions, valueX, cy, {
      sz: 7.5,
      c: TEXT_SEC,
      mw: CW - 38,
    });
    cy += h + 2;
  }

  y += cardH + 10;

  // ── ORDRE DU JOUR ───────────────────────────────────────

  y = checkPage(doc, y, 30);
  y = sectionHeader(doc, 'Ordre du jour', y);

  resolutions.forEach((resolution, index) => {
    y = checkPage(doc, y, 24);

    // Number in navy circle-like treatment
    const num = String(index + 1);
    doc.setFillColor(...NAVY);
    doc.circle(MARGIN + 3, y - 0.5, 3, 'F');
    txt(doc, num, MARGIN + 3, y + 0.8, {
      sz: 7.5,
      s: 'bold',
      c: WHITE,
      a: 'center',
    });

    // Title
    txt(doc, resolution.titre, MARGIN + 9, y, {
      sz: 10,
      s: 'bold',
      c: TEXT,
    });
    y += 5.5;

    // Resolved text
    const resolvedText = resolveResolutionText(resolution.texte, resolution.variables, true);
    const textH = txt(doc, resolvedText, MARGIN + 9, y, {
      sz: 8.5,
      c: TEXT_SEC,
      mw: CW - 13,
    });
    y += textH + 2.5;

    // Vote badge (outlined pill)
    const badgeLabel = resolution.majorite;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7);
    const bw = doc.getTextWidth(badgeLabel) + 6;
    doc.setDrawColor(...NAVY_MID);
    doc.setLineWidth(0.25);
    doc.roundedRect(MARGIN + 9, y - 2.5, bw, 5, 1.2, 1.2, 'S');
    txt(doc, badgeLabel, MARGIN + 12, y + 0.8, {
      sz: 7,
      s: 'bold',
      c: NAVY_MID,
    });

    y += 9;
  });

  // ── MODALITES DE PARTICIPATION ──────────────────────────

  y = checkPage(doc, y, 45);
  y = sectionHeader(doc, 'Modalites de participation', y);

  txt(doc, 'Conformement a la loi du 10 juillet 1965, vous pouvez :', MARGIN, y, {
    sz: 9.5,
    c: TEXT,
  });
  y += 8;

  const modalites = [
    'Assister personnellement a l\'assemblee',
    'Vous faire representer par un mandataire de votre choix muni d\'un pouvoir',
    'Voter par correspondance en remplissant le formulaire joint',
  ];

  modalites.forEach((m) => {
    // Small gold bullet
    doc.setFillColor(...GOLD);
    doc.circle(MARGIN + 3, y - 1, 1, 'F');
    txt(doc, m, MARGIN + 7, y, { sz: 9, c: TEXT_SEC });
    y += 6;
  });
  y += 4;

  // ── MENTIONS LEGALES ────────────────────────────────────

  y = checkPage(doc, y, 40);
  y = sectionHeader(doc, 'Mentions legales obligatoires', y);

  // Light background for the legal block
  const mentions = [
    'Cette convocation est etablie conformement aux articles 7 a 17 du decret n\u00B067-223 du 17 mars 1967.',
    'Le delai de convocation est de 21 jours minimum avant la date de l\'assemblee (article 9).',
    'Les documents preparatoires sont a votre disposition au siege du syndic.',
    'Tout coproprietaire peut proposer des questions a inscrire a l\'ordre du jour jusqu\'au delai prevu par le reglement.',
  ];

  // Render in a subtle card
  const mentionH = mentions.length * 7 + 6;
  doc.setFillColor(...BG_CARD);
  doc.roundedRect(MARGIN, y - 2, CW, mentionH, 1.5, 1.5, 'F');

  let my = y + 2;
  mentions.forEach((mention) => {
    txt(doc, `\u2022  ${mention}`, MARGIN + 4, my, {
      sz: 7.5,
      c: TEXT_SEC,
      mw: CW - 8,
    });
    my += 7;
  });
  y += mentionH + 6;

  // ── DOCUMENTS ANNEXES ───────────────────────────────────

  if (annexesStructured && annexesStructured.length > 0) {
    y = checkPage(doc, y, 40);
    y = sectionHeader(doc, 'Documents annexes a la convocation', y);

    const CATEGORY_LABELS: Record<string, string> = {
      legal: 'Documents obligatoires',
      comptable: 'Annexes comptables',
      contextuel: 'Documents complementaires',
    };
    const categoryOrder: Array<'legal' | 'comptable' | 'contextuel'> = [
      'legal',
      'comptable',
      'contextuel',
    ];

    const grouped = annexesStructured.reduce<Record<string, ConvocationAnnexePDF[]>>((acc, a) => {
      if (!acc[a.category]) acc[a.category] = [];
      acc[a.category].push(a);
      return acc;
    }, {});

    let docIndex = 1;
    categoryOrder.forEach((cat) => {
      const items = grouped[cat];
      if (!items || items.length === 0) return;

      y = checkPage(doc, y, 18);

      // Category sub-header
      doc.setFillColor(...BG_SUB);
      doc.rect(MARGIN, y, CW, 6, 'F');
      // Left accent on sub-header
      doc.setFillColor(...NAVY);
      doc.rect(MARGIN, y, CW, 0.4, 'F');

      txt(doc, CATEGORY_LABELS[cat].toUpperCase(), MARGIN + 4, y + 4.2, {
        sz: 7.5,
        s: 'bold',
        c: NAVY,
      });
      y += 10;

      items.forEach((item) => {
        y = checkPage(doc, y, 8);

        // Number + label
        txt(doc, `${docIndex}.`, MARGIN + 4, y, { sz: 8.5, c: TEXT_MUTED });
        txt(doc, item.label, MARGIN + 11, y, { sz: 8.5, c: TEXT });

        y += 6;
        docIndex++;
      });

      y += 3;
    });

    y += 2;
  } else if (annexes.length > 0) {
    y = checkPage(doc, y, 30);
    y = sectionHeader(doc, 'Documents annexes', y);

    annexes.forEach((annexe, index) => {
      txt(doc, `${index + 1}. ${annexe}`, MARGIN + 4, y, { sz: 9, c: TEXT });
      y += 5.5;
    });
    y += 4;
  }

  // ── SIGNATURE SYNDIC ────────────────────────────────────

  y = checkPage(doc, y, 45);
  y += 12;

  // Signature block (right-aligned)
  const sigX = PW - MARGIN;
  txt(doc, 'Le Syndic,', sigX, y, { sz: 10, c: TEXT, a: 'right' });
  y += 18;

  // Signature line
  doc.setDrawColor(...BORDER);
  doc.setLineWidth(0.2);
  doc.line(sigX - 55, y, sigX, y);
  y += 5;

  txt(doc, syndic.nom, sigX, y, { s: 'bold', sz: 10, c: NAVY, a: 'right' });
  y += 5;
  txt(doc, syndic.adresse, sigX, y, { sz: 8, c: TEXT_SEC, a: 'right' });

  // ── ANNEXES COMPTABLES ──────────────────────────────────

  if (accountingData) {
    renderAllAnnexes(doc, accountingData);
  }

  // ── DOCUMENTS UPLOADES ────────────────────────────────

  if (uploadedDocPages && uploadedDocPages.length > 0) {
    insertRenderedPages(doc, uploadedDocPages);
  }

  // ── PIED DE PAGE ────────────────────────────────────────

  const totalPages = doc.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);

    // Thin rule
    doc.setDrawColor(...BORDER_LT);
    doc.setLineWidth(0.15);
    doc.line(MARGIN, PH - 16, MARGIN + CW, PH - 16);

    // Left: copro + AG type
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.setTextColor(...TEXT_MUTED);
    doc.text(`${copropriete.nom}  \u00B7  Convocation AG ${typeLabel}`, MARGIN, PH - 11);

    // Right: page number
    doc.text(`${i} / ${totalPages}`, MARGIN + CW, PH - 11, { align: 'right' });

    // Center: version (if > 1)
    if (version > 1) {
      doc.setTextColor(...GOLD);
      doc.setFont('helvetica', 'bold');
      doc.text(`v${version}`, PW / 2, PH - 11, { align: 'center' });
    }
  }

  // Generate blob
  const blob = doc.output('blob');
  const url = URL.createObjectURL(blob);

  return { blob, url, version, generatedAt };
}

/**
 * Telecharge directement le PDF
 */
export function downloadConvocationPDF(params: ConvocationPDFParams, filename?: string): void {
  const result = generateConvocationPDF(params);
  const link = document.createElement('a');
  link.href = result.url;
  link.download =
    filename || `convocation_ag_${params.agData.type.toLowerCase()}_v${params.version || 1}.pdf`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(result.url);
}
