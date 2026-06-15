import { jsPDF } from 'jspdf';
import { PDF } from '../pdfLayout';
import { fmtEuro } from '../helpers/formatters';
import { renderTable } from '../helpers/renderTable';
import type { EtatDatePayloadV2 } from '../../domain/types';

export function renderPartie1(doc: jsPDF, p1: EtatDatePayloadV2['partie_1_sommes_dues_vendeur']): number {
  doc.addPage();
  let y = PDF.margin.top;

  doc.setFontSize(PDF.fonts.subtitle);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(PDF.colors.text[0], PDF.colors.text[1], PDF.colors.text[2]);
  doc.text('PARTIE 1 — ' + p1.label, PDF.margin.left, y);
  y += 10;

  y = renderTable(doc, y,
    [{ label: 'Compte', width: 20 }, { label: 'Nature', width: 55 }, { label: 'Montant', width: 25, align: 'right' }],
    p1.items.map(it => [it.code, it.nature, fmtEuro(it.amount)])
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
