/**
 * Renderers PDF pour les annexes comptables 1-5
 * Utilise jspdf-autotable pour les tableaux
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

const MARGIN = 20;
const PAGE_WIDTH = 210;
const CONTENT_WIDTH = PAGE_WIDTH - MARGIN * 2;

function fmt(n: number): string {
  return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(n);
}

function addAnnexeTitle(doc: jsPDF, title: string, subtitle: string, y: number): number {
  doc.setFillColor(37, 99, 235);
  doc.rect(MARGIN, y, CONTENT_WIDTH, 9, 'F');
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(255, 255, 255);
  doc.text(title, MARGIN + 4, y + 6.5);
  y += 13;

  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100, 116, 139);
  doc.text(subtitle, MARGIN, y);
  y += 8;

  return y;
}

function addSubTitle(doc: jsPDF, title: string, y: number): number {
  doc.setFillColor(241, 245, 249);
  doc.rect(MARGIN, y, CONTENT_WIDTH, 7, 'F');
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(71, 85, 105);
  doc.text(title, MARGIN + 3, y + 5);
  return y + 10;
}

interface TableResult {
  finalY: number;
}

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
      cellPadding: 2,
      lineColor: [220, 220, 220],
      lineWidth: 0.2,
      textColor: [30, 30, 30],
    },
    headStyles: {
      fillColor: [241, 245, 249],
      textColor: [51, 65, 85],
      fontStyle: 'bold',
      fontSize: 7,
    },
    columnStyles: {
      0: { cellWidth: 'auto' },
    },
    didParseCell(data) {
      // Align numbers right
      if (data.column.index > 0 && data.section === 'body') {
        data.cell.styles.halign = 'right';
      }
      if (data.column.index > 0 && data.section === 'head') {
        data.cell.styles.halign = 'right';
      }
      // Bold total rows
      if (totalRows > 0 && data.section === 'body') {
        const rowCount = body.length;
        if (data.row.index >= rowCount - totalRows) {
          data.cell.styles.fontStyle = 'bold';
          data.cell.styles.fillColor = [237, 242, 247];
        }
      }
    },
  });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const finalY = (doc as any).lastAutoTable?.finalY ?? startY + 20;
  return { finalY };
}

// =============================================
// ANNEXE 1 - État financier après répartition
// =============================================

export function renderAnnexe1(doc: jsPDF, data: AnnexeData1, exercice: string, coproName: string): number {
  doc.addPage();
  let y = MARGIN;
  y = addAnnexeTitle(doc, `Annexe 1 : État financier après répartition`, `${coproName} — Exercice ${exercice}`, y);

  // Section I - Trésorerie
  y = addSubTitle(doc, 'I - SITUATION FINANCIÈRE ET TRÉSORERIE', y);

  const tresoBody = data.section_i.tresorerie.map((r) => [
    `${r.compte} - ${r.libelle}`, fmt(r.exercice_precedent), fmt(r.exercice_clos),
  ]);
  tresoBody.push(['Total trésorerie', fmt(data.section_i.total_tresorerie.exercice_precedent), fmt(data.section_i.total_tresorerie.exercice_clos)]);

  let result = renderTable(doc, y,
    [['Trésorerie', 'Ex. précédent', 'Ex. clos']],
    tresoBody,
    { totalRows: 1 }
  );
  y = result.finalY + 4;

  // Provisions
  const provBody = data.section_i.provisions.map((r) => [
    `${r.compte} - ${r.libelle}`, fmt(r.exercice_precedent), fmt(r.exercice_clos),
  ]);
  provBody.push(['Total provisions', fmt(data.section_i.total_provisions.exercice_precedent), fmt(data.section_i.total_provisions.exercice_clos)]);

  result = renderTable(doc, y,
    [['Provisions et avances', 'Ex. précédent', 'Ex. clos']],
    provBody,
    { totalRows: 1 }
  );
  y = result.finalY + 6;

  // Section II - Créances et dettes
  y = addSubTitle(doc, 'II - CRÉANCES ET DETTES', y);

  const creancesBody = data.section_ii.creances.map((r) => [
    `${r.compte} - ${r.libelle}`, fmt(r.exercice_precedent), fmt(r.exercice_clos),
  ]);
  creancesBody.push(['Total créances', fmt(data.section_ii.total_creances.exercice_precedent), fmt(data.section_ii.total_creances.exercice_clos)]);

  result = renderTable(doc, y,
    [['Créances', 'Ex. précédent', 'Ex. clos']],
    creancesBody,
    { totalRows: 1 }
  );
  y = result.finalY + 4;

  const dettesBody = data.section_ii.dettes.map((r) => [
    `${r.compte} - ${r.libelle}`, fmt(r.exercice_precedent), fmt(r.exercice_clos),
  ]);
  dettesBody.push(['Total dettes', fmt(data.section_ii.total_dettes.exercice_precedent), fmt(data.section_ii.total_dettes.exercice_clos)]);

  result = renderTable(doc, y,
    [['Dettes', 'Ex. précédent', 'Ex. clos']],
    dettesBody,
    { totalRows: 1 }
  );
  y = result.finalY + 6;

  // Total général
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(37, 99, 235);
  doc.text(`Total général créances : ${fmt(data.total_general_creances.exercice_clos)}`, MARGIN, y);
  y += 5;
  doc.text(`Total général dettes : ${fmt(data.total_general_dettes.exercice_clos)}`, MARGIN, y);

  return y + 8;
}

// =============================================
// ANNEXE 2 - Compte de gestion général
// =============================================

export function renderAnnexe2(
  doc: jsPDF,
  data: AnnexeData2,
  exercice: string,
  coproName: string,
  periodLabels: { exPrecedent: string; exClosBudget: string; exClosRealise: string; bpEnCours: string; bpAVoter: string }
): number {
  doc.addPage();
  let y = MARGIN;
  y = addAnnexeTitle(doc, `Annexe 2 : Compte de gestion général`, `${coproName} — Exercice ${exercice}`, y);

  const head5 = [['', periodLabels.exPrecedent, periodLabels.exClosBudget, periodLabels.exClosRealise, periodLabels.bpEnCours, periodLabels.bpAVoter]];

  // Charges courantes
  y = addSubTitle(doc, 'CHARGES POUR OPÉRATIONS COURANTES', y);

  const chargesBody = data.charges_courantes.map((r) => [
    r.compte ? `${r.compte} ${r.libelle || ''}` : (r.libelle || ''),
    fmt(r.ex_precedent_approuve), fmt(r.ex_clos_budget_vote), fmt(r.ex_clos_realise),
    fmt(r.bp_en_cours_vote), fmt(r.bp_a_voter),
  ]);
  chargesBody.push([
    'Sous-total charges',
    fmt(data.sous_total_charges.ex_precedent_approuve), fmt(data.sous_total_charges.ex_clos_budget_vote),
    fmt(data.sous_total_charges.ex_clos_realise), fmt(data.sous_total_charges.bp_en_cours_vote),
    fmt(data.sous_total_charges.bp_a_voter),
  ]);
  chargesBody.push([
    'Total I',
    fmt(data.total_i_charges.ex_precedent_approuve), fmt(data.total_i_charges.ex_clos_budget_vote),
    fmt(data.total_i_charges.ex_clos_realise), fmt(data.total_i_charges.bp_en_cours_vote),
    fmt(data.total_i_charges.bp_a_voter),
  ]);

  let result = renderTable(doc, y, head5, chargesBody, { totalRows: 2 });
  y = result.finalY + 6;

  // Produits courants
  y = addSubTitle(doc, 'PRODUITS POUR OPÉRATIONS COURANTES', y);

  const produitsBody = data.produits_courants.map((r) => [
    r.compte ? `${r.compte} ${r.libelle || ''}` : (r.libelle || ''),
    fmt(r.ex_precedent_approuve), fmt(r.ex_clos_budget_vote), fmt(r.ex_clos_realise),
    fmt(r.bp_en_cours_vote), fmt(r.bp_a_voter),
  ]);
  produitsBody.push([
    'Sous-total produits',
    fmt(data.sous_total_produits.ex_precedent_approuve), fmt(data.sous_total_produits.ex_clos_budget_vote),
    fmt(data.sous_total_produits.ex_clos_realise), fmt(data.sous_total_produits.bp_en_cours_vote),
    fmt(data.sous_total_produits.bp_a_voter),
  ]);

  result = renderTable(doc, y, head5, produitsBody, { totalRows: 1 });
  y = result.finalY + 6;

  // Charges travaux (si présentes)
  if (data.charges_travaux.length > 0) {
    y = addSubTitle(doc, 'CHARGES POUR TRAVAUX ET OPÉRATIONS EXCEPTIONNELLES', y);

    const travauxBody = data.charges_travaux.map((r) => [
      r.compte ? `${r.compte} ${r.libelle || ''}` : (r.libelle || ''),
      fmt(r.ex_precedent_approuve), fmt(r.ex_clos_budget_vote), fmt(r.ex_clos_realise),
    ]);

    result = renderTable(doc, y,
      [['', periodLabels.exPrecedent, periodLabels.exClosBudget, periodLabels.exClosRealise]],
      travauxBody
    );
    y = result.finalY + 4;
  }

  return y;
}

// =============================================
// ANNEXE 3 - Opérations courantes par clé
// =============================================

export function renderAnnexe3(
  doc: jsPDF,
  data: AnnexeData3,
  exercice: string,
  coproName: string,
  periodLabels: { exPrecedent: string; exClosBudget: string; exClosRealise: string; bpEnCours: string; bpAVoter: string }
): number {
  doc.addPage();
  let y = MARGIN;
  y = addAnnexeTitle(doc, `Annexe 3 : Compte de gestion par clé de répartition`, `${coproName} — Exercice ${exercice}`, y);

  const head5 = [['', periodLabels.exPrecedent, periodLabels.exClosBudget, periodLabels.exClosRealise, periodLabels.bpEnCours, periodLabels.bpAVoter]];

  data.cles.forEach((cle) => {
    // Vérifier si on a assez de place, sinon nouvelle page
    if (y > 240) {
      doc.addPage();
      y = MARGIN;
    }

    y = addSubTitle(doc, cle.nom, y);

    const body = cle.lignes.map((r) => [
      r.compte ? `${r.compte} ${r.libelle || ''}` : (r.libelle || ''),
      fmt(r.ex_precedent_approuve), fmt(r.ex_clos_budget_vote), fmt(r.ex_clos_realise),
      fmt(r.bp_en_cours_vote), fmt(r.bp_a_voter),
    ]);
    body.push([
      'Total charges', fmt(cle.total_charges.ex_precedent_approuve), fmt(cle.total_charges.ex_clos_budget_vote),
      fmt(cle.total_charges.ex_clos_realise), fmt(cle.total_charges.bp_en_cours_vote), fmt(cle.total_charges.bp_a_voter),
    ]);
    body.push([
      'Total net', fmt(cle.total_net.ex_precedent_approuve), fmt(cle.total_net.ex_clos_budget_vote),
      fmt(cle.total_net.ex_clos_realise), fmt(cle.total_net.bp_en_cours_vote), fmt(cle.total_net.bp_a_voter),
    ]);

    const result = renderTable(doc, y, head5, body, { totalRows: 2 });
    y = result.finalY + 6;
  });

  // Total général
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(37, 99, 235);
  doc.text(`Total général réalisé : ${fmt(data.total_general.ex_clos_realise)}`, MARGIN, y);

  return y + 8;
}

// =============================================
// ANNEXE 4 - Travaux et opérations exceptionnelles
// =============================================

export function renderAnnexe4(doc: jsPDF, data: AnnexeData4, exercice: string, coproName: string): number {
  doc.addPage();
  let y = MARGIN;
  y = addAnnexeTitle(doc, `Annexe 4 : Travaux art. 14-2 et opérations exceptionnelles`, `${coproName} — Exercice ${exercice}`, y);

  const body = data.operations.map((op) => [
    op.libelle, fmt(op.depenses_votees), fmt(op.depenses_realisees),
    fmt(op.provisions_appelees), fmt(op.solde),
  ]);
  body.push([
    'Total', fmt(data.total.depenses_votees), fmt(data.total.depenses_realisees),
    fmt(data.total.provisions_appelees), fmt(data.total.solde),
  ]);

  const result = renderTable(doc, y,
    [['Opération', 'Dépenses votées', 'Dépenses réalisées', 'Provisions appelées', 'Solde']],
    body,
    { totalRows: 1 }
  );

  return result.finalY + 8;
}

// =============================================
// ANNEXE 5 - Travaux votés non clôturés
// =============================================

export function renderAnnexe5(doc: jsPDF, data: AnnexeData5, exercice: string, coproName: string): number {
  doc.addPage();
  let y = MARGIN;
  y = addAnnexeTitle(doc, `Annexe 5 : Travaux art. 14-2 votés non clôturés`, `${coproName} — Exercice ${exercice}`, y);

  const body = data.operations.map((op) => [
    op.libelle, fmt(op.travaux_votes_a), fmt(op.travaux_payes_b),
    fmt(op.travaux_realises_c), fmt(op.appels_recus_d),
    fmt(op.solde_attente_e), fmt(op.subventions_f),
  ]);
  body.push([
    'Total', fmt(data.total.travaux_votes_a), fmt(data.total.travaux_payes_b),
    fmt(data.total.travaux_realises_c), fmt(data.total.appels_recus_d),
    fmt(data.total.solde_attente_e), fmt(data.total.subventions_f),
  ]);

  const result = renderTable(doc, y,
    [['Opération', 'Votés (A)', 'Payés (B)', 'Réalisés (C)', 'Appels (D)', 'Solde (E)', 'Subventions (F)']],
    body,
    { totalRows: 1 }
  );

  return result.finalY + 8;
}

// =============================================
// Types pour les données consolidées
// =============================================

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
    exClosBudget: 'Budget voté',
    exClosRealise: 'Réalisé',
    bpEnCours: 'BP en cours',
    bpAVoter: 'BP à voter',
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
