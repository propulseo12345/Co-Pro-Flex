/**
 * Renderers PDF pour les annexes comptables 1-5
 *
 * Design: Institutional Elegance (coherent avec generateConvocationPDF)
 * - En-tete avec filets dores et titre Times
 * - Tableaux avec en-tete navy, lignes fines, alternance subtile
 * - Lignes de totaux accentuees en navy
 */

import type { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import type {
  AnnexeData1,
  AnnexeData2,
  AnnexeData3,
  AnnexeData4,
  AnnexeData5,
} from '@/components/features/finance/Comptabilite/types';

// ════════════════════════════════════════════════════════════
// DESIGN SYSTEM (matching convocation)
// ════════════════════════════════════════════════════════════

const MARGIN = 22;
const PW = 210;
const CW = PW - MARGIN * 2;

type RGB = [number, number, number];

const NAVY: RGB = [26, 42, 74];
const NAVY_MID: RGB = [55, 78, 120];
const GOLD: RGB = [178, 136, 54];
const TEXT: RGB = [33, 37, 41];
const TEXT_SEC: RGB = [100, 116, 139];
const BG_ALT: RGB = [249, 250, 252];
const BG_TOTAL: RGB = [234, 238, 245];
const BORDER_TBL: RGB = [220, 225, 230];
const WHITE: RGB = [255, 255, 255];

// ════════════════════════════════════════════════════════════
// HELPERS
// ════════════════════════════════════════════════════════════

function fmt(n: number): string {
  return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' })
    .format(n)
    .replace(/\u202F/g, ' ');
}

/**
 * En-tete d'une page annexe: filets dores + titre Times + sous-titre
 */
function addAnnexeHeader(
  doc: jsPDF,
  annexeNum: number,
  title: string,
  coproName: string,
  exercice: string,
  y: number
): number {
  // Top gold line
  doc.setDrawColor(...GOLD);
  doc.setLineWidth(0.5);
  doc.line(MARGIN, y, MARGIN + CW, y);
  y += 7;

  // Annexe number + title (Times, formal)
  doc.setFont('times', 'bold');
  doc.setFontSize(13);
  doc.setTextColor(...NAVY);
  doc.text(`Annexe ${annexeNum}`, MARGIN, y);

  // Title on the right of the number
  doc.setFont('times', 'normal');
  doc.setFontSize(13);
  doc.setTextColor(...NAVY_MID);
  const numW = doc.getTextWidth(`Annexe ${annexeNum}`);
  doc.text(`  \u2014  ${title}`, MARGIN + numW, y);
  y += 6;

  // Copro name + exercice
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(...TEXT_SEC);
  doc.text(`${coproName}  \u00B7  Exercice ${exercice}`, MARGIN, y);
  y += 4;

  // Bottom gold line
  doc.setDrawColor(...GOLD);
  doc.setLineWidth(0.5);
  doc.line(MARGIN, y, MARGIN + CW, y);
  y += 10;

  return y;
}

/**
 * Sous-titre de section dans une annexe
 */
function addSubTitle(doc: jsPDF, title: string, y: number): number {
  // Gold accent + navy text
  doc.setFillColor(...GOLD);
  doc.rect(MARGIN, y, 1.2, 5.5, 'F');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(...NAVY);
  doc.text(title, MARGIN + 4.5, y + 4);

  // Thin underline
  doc.setDrawColor(229, 231, 235);
  doc.setLineWidth(0.1);
  doc.line(MARGIN, y + 7, MARGIN + CW, y + 7);

  return y + 11;
}

interface TableResult {
  finalY: number;
}

/**
 * Tableau autoTable avec style institutionnel
 */
function renderTable(
  doc: jsPDF,
  startY: number,
  head: string[][],
  body: (string | { content: string; styles?: Record<string, unknown> })[][],
  options?: { totalRows?: number }
): TableResult {
  const totalRows = options?.totalRows ?? 0;

  autoTable(doc, {
    startY,
    margin: { left: MARGIN, right: MARGIN },
    head,
    body,
    theme: 'grid',
    styles: {
      fontSize: 7.5,
      cellPadding: { top: 2, right: 3, bottom: 2, left: 3 },
      lineColor: BORDER_TBL,
      lineWidth: 0.12,
      textColor: TEXT,
      font: 'helvetica',
    },
    headStyles: {
      fillColor: NAVY,
      textColor: WHITE,
      fontStyle: 'bold',
      fontSize: 7,
      cellPadding: { top: 2.5, right: 3, bottom: 2.5, left: 3 },
    },
    alternateRowStyles: {
      fillColor: BG_ALT,
    },
    columnStyles: {
      0: { cellWidth: 'auto' },
    },
    didParseCell(data) {
      // Right-align numbers (all columns except first)
      if (data.column.index > 0 && data.section === 'body') {
        data.cell.styles.halign = 'right';
      }
      if (data.column.index > 0 && data.section === 'head') {
        data.cell.styles.halign = 'right';
      }
      // Styled total rows
      if (totalRows > 0 && data.section === 'body') {
        const rowCount = body.length;
        if (data.row.index >= rowCount - totalRows) {
          data.cell.styles.fontStyle = 'bold';
          data.cell.styles.fillColor = BG_TOTAL;
          data.cell.styles.textColor = NAVY;
        }
      }
    },
  });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const finalY = (doc as any).lastAutoTable?.finalY ?? startY + 20;
  return { finalY };
}

/**
 * Bloc de total general en bas d'annexe
 */
function addGeneralTotal(doc: jsPDF, lines: [string, string][], y: number): number {
  // Background card for totals
  const h = lines.length * 6 + 6;
  doc.setFillColor(244, 246, 250);
  doc.roundedRect(MARGIN, y - 2, CW, h, 1.5, 1.5, 'F');
  doc.setDrawColor(...NAVY);
  doc.setLineWidth(0.3);
  doc.line(MARGIN, y - 2, MARGIN, y - 2 + h); // Left navy accent

  let ly = y + 3;
  lines.forEach(([label, value]) => {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(...NAVY);
    doc.text(label, MARGIN + 5, ly);
    doc.text(value, MARGIN + CW - 4, ly, { align: 'right' });
    ly += 6;
  });

  return y + h + 4;
}

// ════════════════════════════════════════════════════════════
// ANNEXE 1 - Etat financier apres repartition
// ════════════════════════════════════════════════════════════

export function renderAnnexe1(
  doc: jsPDF,
  data: AnnexeData1,
  exercice: string,
  coproName: string
): number {
  doc.addPage();
  let y = MARGIN;
  y = addAnnexeHeader(doc, 1, 'Etat financier apres repartition', coproName, exercice, y);

  // Section I - Tresorerie
  y = addSubTitle(doc, 'I - SITUATION FINANCIERE ET TRESORERIE', y);

  const tresoBody = data.section_i.tresorerie.map((r) => [
    `${r.compte} - ${r.libelle}`,
    fmt(r.exercice_precedent),
    fmt(r.exercice_clos),
  ]);
  tresoBody.push([
    'Total tresorerie',
    fmt(data.section_i.total_tresorerie.exercice_precedent),
    fmt(data.section_i.total_tresorerie.exercice_clos),
  ]);

  let result = renderTable(
    doc,
    y,
    [['Tresorerie', 'Ex. precedent', 'Ex. clos']],
    tresoBody,
    { totalRows: 1 }
  );
  y = result.finalY + 5;

  // Provisions
  const provBody = data.section_i.provisions.map((r) => [
    `${r.compte} - ${r.libelle}`,
    fmt(r.exercice_precedent),
    fmt(r.exercice_clos),
  ]);
  provBody.push([
    'Total provisions',
    fmt(data.section_i.total_provisions.exercice_precedent),
    fmt(data.section_i.total_provisions.exercice_clos),
  ]);

  result = renderTable(
    doc,
    y,
    [['Provisions et avances', 'Ex. precedent', 'Ex. clos']],
    provBody,
    { totalRows: 1 }
  );
  y = result.finalY + 8;

  // Section II - Creances et dettes
  y = addSubTitle(doc, 'II - CREANCES ET DETTES', y);

  const creancesBody = data.section_ii.creances.map((r) => [
    `${r.compte} - ${r.libelle}`,
    fmt(r.exercice_precedent),
    fmt(r.exercice_clos),
  ]);
  creancesBody.push([
    'Total creances',
    fmt(data.section_ii.total_creances.exercice_precedent),
    fmt(data.section_ii.total_creances.exercice_clos),
  ]);

  result = renderTable(
    doc,
    y,
    [['Creances', 'Ex. precedent', 'Ex. clos']],
    creancesBody,
    { totalRows: 1 }
  );
  y = result.finalY + 5;

  const dettesBody = data.section_ii.dettes.map((r) => [
    `${r.compte} - ${r.libelle}`,
    fmt(r.exercice_precedent),
    fmt(r.exercice_clos),
  ]);
  dettesBody.push([
    'Total dettes',
    fmt(data.section_ii.total_dettes.exercice_precedent),
    fmt(data.section_ii.total_dettes.exercice_clos),
  ]);

  result = renderTable(
    doc,
    y,
    [['Dettes', 'Ex. precedent', 'Ex. clos']],
    dettesBody,
    { totalRows: 1 }
  );
  y = result.finalY + 8;

  // Total general
  y = addGeneralTotal(doc, [
    ['Total general creances', fmt(data.total_general_creances.exercice_clos)],
    ['Total general dettes', fmt(data.total_general_dettes.exercice_clos)],
  ], y);

  return y;
}

// ════════════════════════════════════════════════════════════
// ANNEXE 2 - Compte de gestion general
// ════════════════════════════════════════════════════════════

export function renderAnnexe2(
  doc: jsPDF,
  data: AnnexeData2,
  exercice: string,
  coproName: string,
  periodLabels: {
    exPrecedent: string;
    exClosBudget: string;
    exClosRealise: string;
    bpEnCours: string;
    bpAVoter: string;
  }
): number {
  doc.addPage();
  let y = MARGIN;
  y = addAnnexeHeader(doc, 2, 'Compte de gestion general', coproName, exercice, y);

  const head5 = [
    [
      '',
      periodLabels.exPrecedent,
      periodLabels.exClosBudget,
      periodLabels.exClosRealise,
      periodLabels.bpEnCours,
      periodLabels.bpAVoter,
    ],
  ];

  // Charges courantes
  y = addSubTitle(doc, 'CHARGES POUR OPERATIONS COURANTES', y);

  const chargesBody = data.charges_courantes.map((r) => [
    r.compte ? `${r.compte} ${r.libelle || ''}` : r.libelle || '',
    fmt(r.ex_precedent_approuve),
    fmt(r.ex_clos_budget_vote),
    fmt(r.ex_clos_realise),
    fmt(r.bp_en_cours_vote),
    fmt(r.bp_a_voter),
  ]);
  chargesBody.push([
    'Sous-total charges',
    fmt(data.sous_total_charges.ex_precedent_approuve),
    fmt(data.sous_total_charges.ex_clos_budget_vote),
    fmt(data.sous_total_charges.ex_clos_realise),
    fmt(data.sous_total_charges.bp_en_cours_vote),
    fmt(data.sous_total_charges.bp_a_voter),
  ]);
  chargesBody.push([
    'Total I',
    fmt(data.total_i_charges.ex_precedent_approuve),
    fmt(data.total_i_charges.ex_clos_budget_vote),
    fmt(data.total_i_charges.ex_clos_realise),
    fmt(data.total_i_charges.bp_en_cours_vote),
    fmt(data.total_i_charges.bp_a_voter),
  ]);

  let result = renderTable(doc, y, head5, chargesBody, { totalRows: 2 });
  y = result.finalY + 8;

  // Produits courants
  y = addSubTitle(doc, 'PRODUITS POUR OPERATIONS COURANTES', y);

  const produitsBody = data.produits_courants.map((r) => [
    r.compte ? `${r.compte} ${r.libelle || ''}` : r.libelle || '',
    fmt(r.ex_precedent_approuve),
    fmt(r.ex_clos_budget_vote),
    fmt(r.ex_clos_realise),
    fmt(r.bp_en_cours_vote),
    fmt(r.bp_a_voter),
  ]);
  produitsBody.push([
    'Sous-total produits',
    fmt(data.sous_total_produits.ex_precedent_approuve),
    fmt(data.sous_total_produits.ex_clos_budget_vote),
    fmt(data.sous_total_produits.ex_clos_realise),
    fmt(data.sous_total_produits.bp_en_cours_vote),
    fmt(data.sous_total_produits.bp_a_voter),
  ]);

  result = renderTable(doc, y, head5, produitsBody, { totalRows: 1 });
  y = result.finalY + 8;

  // Charges travaux (si presentes)
  if (data.charges_travaux.length > 0) {
    y = addSubTitle(doc, 'CHARGES POUR TRAVAUX ET OPERATIONS EXCEPTIONNELLES', y);

    const travauxBody = data.charges_travaux.map((r) => [
      r.compte ? `${r.compte} ${r.libelle || ''}` : r.libelle || '',
      fmt(r.ex_precedent_approuve),
      fmt(r.ex_clos_budget_vote),
      fmt(r.ex_clos_realise),
    ]);

    result = renderTable(
      doc,
      y,
      [['', periodLabels.exPrecedent, periodLabels.exClosBudget, periodLabels.exClosRealise]],
      travauxBody
    );
    y = result.finalY + 4;
  }

  return y;
}

// ════════════════════════════════════════════════════════════
// ANNEXE 3 - Operations courantes par cle
// ════════════════════════════════════════════════════════════

export function renderAnnexe3(
  doc: jsPDF,
  data: AnnexeData3,
  exercice: string,
  coproName: string,
  periodLabels: {
    exPrecedent: string;
    exClosBudget: string;
    exClosRealise: string;
    bpEnCours: string;
    bpAVoter: string;
  }
): number {
  doc.addPage();
  let y = MARGIN;
  y = addAnnexeHeader(
    doc,
    3,
    'Compte de gestion par cle de repartition',
    coproName,
    exercice,
    y
  );

  const head5 = [
    [
      '',
      periodLabels.exPrecedent,
      periodLabels.exClosBudget,
      periodLabels.exClosRealise,
      periodLabels.bpEnCours,
      periodLabels.bpAVoter,
    ],
  ];

  data.cles.forEach((cle) => {
    if (y > 235) {
      doc.addPage();
      y = MARGIN;
    }

    y = addSubTitle(doc, cle.nom, y);

    const body = cle.lignes.map((r) => [
      r.compte ? `${r.compte} ${r.libelle || ''}` : r.libelle || '',
      fmt(r.ex_precedent_approuve),
      fmt(r.ex_clos_budget_vote),
      fmt(r.ex_clos_realise),
      fmt(r.bp_en_cours_vote),
      fmt(r.bp_a_voter),
    ]);
    body.push([
      'Total charges',
      fmt(cle.total_charges.ex_precedent_approuve),
      fmt(cle.total_charges.ex_clos_budget_vote),
      fmt(cle.total_charges.ex_clos_realise),
      fmt(cle.total_charges.bp_en_cours_vote),
      fmt(cle.total_charges.bp_a_voter),
    ]);
    body.push([
      'Total net',
      fmt(cle.total_net.ex_precedent_approuve),
      fmt(cle.total_net.ex_clos_budget_vote),
      fmt(cle.total_net.ex_clos_realise),
      fmt(cle.total_net.bp_en_cours_vote),
      fmt(cle.total_net.bp_a_voter),
    ]);

    const result = renderTable(doc, y, head5, body, { totalRows: 2 });
    y = result.finalY + 8;
  });

  // Total general
  y = addGeneralTotal(doc, [
    ['Total general realise', fmt(data.total_general.ex_clos_realise)],
  ], y);

  return y;
}

// ════════════════════════════════════════════════════════════
// ANNEXE 4 - Travaux et operations exceptionnelles
// ════════════════════════════════════════════════════════════

export function renderAnnexe4(
  doc: jsPDF,
  data: AnnexeData4,
  exercice: string,
  coproName: string
): number {
  doc.addPage();
  let y = MARGIN;
  y = addAnnexeHeader(
    doc,
    4,
    'Travaux art. 14-2 et operations exceptionnelles',
    coproName,
    exercice,
    y
  );

  const body = data.operations.map((op) => [
    op.libelle,
    fmt(op.depenses_votees),
    fmt(op.depenses_realisees),
    fmt(op.provisions_appelees),
    fmt(op.solde),
  ]);
  body.push([
    'Total',
    fmt(data.total.depenses_votees),
    fmt(data.total.depenses_realisees),
    fmt(data.total.provisions_appelees),
    fmt(data.total.solde),
  ]);

  const result = renderTable(
    doc,
    y,
    [['Operation', 'Depenses votees', 'Depenses realisees', 'Provisions appelees', 'Solde']],
    body,
    { totalRows: 1 }
  );

  return result.finalY + 8;
}

// ════════════════════════════════════════════════════════════
// ANNEXE 5 - Travaux votes non clotures
// ════════════════════════════════════════════════════════════

export function renderAnnexe5(
  doc: jsPDF,
  data: AnnexeData5,
  exercice: string,
  coproName: string
): number {
  doc.addPage();
  let y = MARGIN;
  y = addAnnexeHeader(
    doc,
    5,
    'Travaux art. 14-2 votes non clotures',
    coproName,
    exercice,
    y
  );

  const body = data.operations.map((op) => [
    op.libelle,
    fmt(op.travaux_votes_a),
    fmt(op.travaux_payes_b),
    fmt(op.travaux_realises_c),
    fmt(op.appels_recus_d),
    fmt(op.solde_attente_e),
    fmt(op.subventions_f),
  ]);
  body.push([
    'Total',
    fmt(data.total.travaux_votes_a),
    fmt(data.total.travaux_payes_b),
    fmt(data.total.travaux_realises_c),
    fmt(data.total.appels_recus_d),
    fmt(data.total.solde_attente_e),
    fmt(data.total.subventions_f),
  ]);

  const result = renderTable(
    doc,
    y,
    [
      [
        'Operation',
        'Votes (A)',
        'Payes (B)',
        'Realises (C)',
        'Appels (D)',
        'Solde (E)',
        'Subventions (F)',
      ],
    ],
    body,
    { totalRows: 1 }
  );

  return result.finalY + 8;
}

// ════════════════════════════════════════════════════════════
// TYPES
// ════════════════════════════════════════════════════════════

export interface AnnexeAccountingData {
  annexe1?: AnnexeData1 | null;
  annexe2?: AnnexeData2 | null;
  annexe3?: AnnexeData3 | null;
  annexe4?: AnnexeData4 | null;
  annexe5?: AnnexeData5 | null;
  exercice: string;
  coproName: string;
  periodLabels?: {
    exPrecedent: string;
    exClosBudget: string;
    exClosRealise: string;
    bpEnCours: string;
    bpAVoter: string;
  };
}

/**
 * Rend toutes les annexes comptables disponibles dans le PDF
 */
export function renderAllAnnexes(doc: jsPDF, accounting: AnnexeAccountingData): void {
  const { exercice, coproName, periodLabels } = accounting;
  const defaultLabels = {
    exPrecedent: 'Ex. N-1',
    exClosBudget: 'Budget vote',
    exClosRealise: 'Realise',
    bpEnCours: 'BP en cours',
    bpAVoter: 'BP a voter',
  };
  const labels = periodLabels || defaultLabels;

  if (accounting.annexe1) {
    renderAnnexe1(doc, accounting.annexe1, exercice, coproName);
  }
  if (accounting.annexe2) {
    renderAnnexe2(doc, accounting.annexe2, exercice, coproName, labels);
  }
  if (accounting.annexe3) {
    renderAnnexe3(doc, accounting.annexe3, exercice, coproName, labels);
  }
  if (accounting.annexe4) {
    renderAnnexe4(doc, accounting.annexe4, exercice, coproName);
  }
  if (accounting.annexe5) {
    renderAnnexe5(doc, accounting.annexe5, exercice, coproName);
  }
}
