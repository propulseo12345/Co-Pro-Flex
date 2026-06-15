import { jsPDF } from 'jspdf';
import { PDF } from '../pdfLayout';
import { fmtEuro } from '../helpers/formatters';
import { renderTable } from '../helpers/renderTable';
import type { EtatDatePayloadV2 } from '../../domain/types';

export function renderPartie3(doc: jsPDF, p3: EtatDatePayloadV2['partie_3_charge_acquereur']): number {
  doc.addPage();
  let y = PDF.margin.top;

  doc.setFontSize(PDF.fonts.subtitle);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(PDF.colors.text[0], PDF.colors.text[1], PDF.colors.text[2]);
  doc.text('PARTIE 3 — ' + p3.label, PDF.margin.left, y);
  y += 10;

  y = renderTable(doc, y,
    [{ label: 'Nature', width: 75, align: 'left' }, { label: 'Montant', width: 25, align: 'right' }],
    [
      ['Reconstitution des avances', fmtEuro(p3.reconstitution_avances)],
      ['Provisions appelées non échues', fmtEuro(p3.provisions_appelees_non_echues)],
      ['Provisions votées non appelées — courant', fmtEuro(p3.provisions_votees_non_appelees_courant)],
      ['Provisions votées non appelées — travaux', fmtEuro(p3.provisions_votees_non_appelees_travaux)],
      ['Cotisation ALUR à venir', fmtEuro(p3.alur_a_venir)],
    ]
  );

  if (p3.alur_note && p3.alur_note.trim() !== '') {
    doc.setFontSize(PDF.fonts.small);
    doc.setFont('helvetica', 'italic');
    doc.setTextColor(PDF.colors.textLight[0], PDF.colors.textLight[1], PDF.colors.textLight[2]);
    const lines = doc.splitTextToSize(p3.alur_note, PDF.contentWidth - 8);
    doc.text(lines, PDF.margin.left + 4, y);
    y += lines.length * 5 + 3;
  }

  y += 5;
  doc.setFontSize(PDF.fonts.sectionTitle);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(PDF.colors.text[0], PDF.colors.text[1], PDF.colors.text[2]);
  doc.text('TOTAL Partie 3 :', PDF.margin.left + 4, y);
  doc.text(fmtEuro(p3.total), PDF.margin.left + PDF.contentWidth - 2, y, { align: 'right' });

  return y + 8;
}
