import { jsPDF } from 'jspdf';
import { PDF } from '../pdfLayout';
import { fmtDate } from '../helpers/formatters';
import { renderTable } from '../helpers/renderTable';
import type { EtatDatePayloadV2 } from '../../domain/types';

const fmtNum = (n: number) => new Intl.NumberFormat('fr-FR').format(n);
const fmtPct = (n: number) => new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 4 }).format(n) + ' %';

export function renderAnnexe(
  doc: jsPDF,
  annexe: EtatDatePayloadV2['annexe_quote_part'],
  syndic: EtatDatePayloadV2['syndic'],
  effectiveDate: string,
): number {
  doc.addPage();
  let y = PDF.margin.top;

  doc.setFontSize(PDF.fonts.subtitle);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(PDF.colors.text[0], PDF.colors.text[1], PDF.colors.text[2]);
  doc.text('ANNEXE — ' + annexe.label, PDF.margin.left, y);
  y += 10;

  y = renderTable(doc, y,
    [{ label: 'Base de calcul', width: 75, align: 'left' }, { label: 'Valeur', width: 25, align: 'right' }],
    [
      ['Tantièmes du lot', fmtNum(annexe.tantiemes_lot)],
      ['Tantièmes totaux de la copropriété', fmtNum(annexe.tantiemes_total)],
      ['Quote-part du lot', fmtPct(annexe.owner_share_pct)],
    ]
  );

  y += 10;
  doc.setDrawColor(PDF.colors.border[0], PDF.colors.border[1], PDF.colors.border[2]);
  doc.line(PDF.margin.left, y, PDF.margin.left + PDF.contentWidth, y);
  y += 8;

  doc.setFontSize(PDF.fonts.small);
  doc.setFont('helvetica', 'italic');
  doc.setTextColor(PDF.colors.textLight[0], PDF.colors.textLight[1], PDF.colors.textLight[2]);
  const syndicName = syndic?.name && syndic.name.trim() !== '' ? syndic.name : 'le syndic';
  doc.text("Établi le " + fmtDate(effectiveDate) + ' par ' + syndicName, PDF.margin.left, y);
  y += 5;
  doc.text("Les sommes mentionnées sont à jour à la date d'effet du présent état.", PDF.margin.left, y);

  return y + 10;
}
