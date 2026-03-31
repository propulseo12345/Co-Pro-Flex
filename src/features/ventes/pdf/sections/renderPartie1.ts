import { jsPDF } from 'jspdf';
import { PDF } from '../pdfLayout';
import { fmtEuro, fmtDateShort } from '../helpers/formatters';
import { renderSectionTitle } from '../helpers/renderSectionTitle';
import { renderTable } from '../helpers/renderTable';
import type { EtatDatePayloadV2 } from '../../domain/types';

export function renderPartie1(doc: jsPDF, p1: EtatDatePayloadV2['partie1_vendeur_doit']): number {
  doc.addPage();
  let y = PDF.margin.top;

  doc.setFontSize(PDF.fonts.subtitle);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(PDF.colors.text[0], PDF.colors.text[1], PDF.colors.text[2]);
  doc.text('PARTIE 1 — Sommes dues par le vendeur au syndicat', PDF.margin.left, y);
  y += 10;

  y = renderSectionTitle(doc, y, 'Provisions exigibles — Budget prévisionnel');
  y = renderTable(doc, y,
    [{ label: 'Libellé', width: 35 }, { label: 'Échéance', width: 20 }, { label: 'Dû', width: 15, align: 'right' }, { label: 'Payé', width: 15, align: 'right' }, { label: 'Reste', width: 15, align: 'right' }],
    p1.provisions_budget.detail.map(d => [d.label, fmtDateShort(d.due_date), fmtEuro(d.amount_due), fmtEuro(d.amount_paid), fmtEuro(d.remaining)])
  );

  y = renderSectionTitle(doc, y, 'Provisions exigibles — Travaux');
  y = renderTable(doc, y,
    [{ label: 'Libellé', width: 35 }, { label: 'Échéance', width: 20 }, { label: 'Dû', width: 15, align: 'right' }, { label: 'Payé', width: 15, align: 'right' }, { label: 'Reste', width: 15, align: 'right' }],
    p1.provisions_travaux.detail.map(d => [d.label, fmtDateShort(d.due_date), fmtEuro(d.amount_due), fmtEuro(d.amount_paid), fmtEuro(d.remaining)])
  );

  y = renderSectionTitle(doc, y, 'Arriérés — Exercices antérieurs');
  y = renderTable(doc, y,
    [{ label: 'Période', width: 60 }, { label: 'Montant', width: 40, align: 'right' }],
    p1.arrieres.detail.map(d => [d.period_label, fmtEuro(d.amount)])
  );

  y = renderSectionTitle(doc, y, 'Emprunts collectifs — Part du lot');
  y = renderTable(doc, y,
    [{ label: 'Emprunt', width: 30 }, { label: 'Prêteur', width: 20 }, { label: 'Total', width: 16, align: 'right' }, { label: 'Part', width: 17, align: 'right' }, { label: 'Reste', width: 17, align: 'right' }],
    p1.emprunts_collectifs.detail.map(d => [d.label, d.lender, fmtEuro(d.total_loan), fmtEuro(d.seller_share), fmtEuro(d.remaining)])
  );

  y = renderSectionTitle(doc, y, 'Avances exigibles');
  y = renderTable(doc, y,
    [{ label: 'Libellé', width: 50 }, { label: 'Dû', width: 25, align: 'right' }, { label: 'Payé', width: 25, align: 'right' }],
    p1.avances_exigibles.detail.map(d => [d.label, fmtEuro(d.amount_due), fmtEuro(d.amount_paid)])
  );

  y += 5;
  doc.setFontSize(PDF.fonts.sectionTitle);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(PDF.colors.text[0], PDF.colors.text[1], PDF.colors.text[2]);
  doc.text('TOTAL Partie 1 :', PDF.margin.left + 4, y);
  if (p1.total > 0) {
    doc.setTextColor(PDF.colors.danger[0], PDF.colors.danger[1], PDF.colors.danger[2]);
  }
  doc.text(fmtEuro(p1.total), PDF.margin.left + PDF.contentWidth - 2, y, { align: 'right' });

  return y + 8;
}
