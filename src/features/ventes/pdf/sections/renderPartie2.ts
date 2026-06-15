import { jsPDF } from 'jspdf';
import { PDF } from '../pdfLayout';
import { fmtEuro } from '../helpers/formatters';
import { renderTable } from '../helpers/renderTable';
import type { EtatDatePayloadV2 } from '../../domain/types';

export function renderPartie2(doc: jsPDF, p2: EtatDatePayloadV2['partie_2_dues_par_syndicat']): number {
  doc.addPage();
  let y = PDF.margin.top;

  doc.setFontSize(PDF.fonts.subtitle);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(PDF.colors.text[0], PDF.colors.text[1], PDF.colors.text[2]);
  doc.text('PARTIE 2 — ' + p2.label, PDF.margin.left, y);
  y += 10;

  y = renderTable(doc, y,
    [{ label: 'Compte', width: 20 }, { label: 'Nature', width: 55 }, { label: 'Montant', width: 25, align: 'right' }],
    p2.items.map(it => [it.code, it.nature, fmtEuro(it.amount)])
  );

  if (p2.note && p2.note.trim() !== '') {
    doc.setFontSize(PDF.fonts.small);
    doc.setFont('helvetica', 'italic');
    doc.setTextColor(PDF.colors.textLight[0], PDF.colors.textLight[1], PDF.colors.textLight[2]);
    const lines = doc.splitTextToSize(p2.note, PDF.contentWidth - 8);
    doc.text(lines, PDF.margin.left + 4, y);
    y += lines.length * 5 + 3;
  }

  y += 5;
  doc.setFontSize(PDF.fonts.sectionTitle);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(PDF.colors.text[0], PDF.colors.text[1], PDF.colors.text[2]);
  doc.text('TOTAL Partie 2 :', PDF.margin.left + 4, y);
  doc.setTextColor(PDF.colors.success[0], PDF.colors.success[1], PDF.colors.success[2]);
  doc.text(fmtEuro(p2.total), PDF.margin.left + PDF.contentWidth - 2, y, { align: 'right' });

  return y + 8;
}
