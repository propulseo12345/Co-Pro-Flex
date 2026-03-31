import { jsPDF } from 'jspdf';
import { PDF } from '../pdfLayout';
import { fmtDate } from '../helpers/formatters';
import type { EtatDatePayloadV2 } from '../../domain/types';

export function renderHeader(doc: jsPDF, payload: EtatDatePayloadV2): number {
  const pw = doc.internal.pageSize.getWidth();
  let y = PDF.margin.top;

  doc.setFontSize(PDF.fonts.title);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(PDF.colors.primary[0], PDF.colors.primary[1], PDF.colors.primary[2]);
  const title = payload.snapshot_type === 'pre' ? 'PRÉ-ÉTAT DATÉ' : 'ÉTAT DATÉ';
  doc.text(title, pw / 2, y, { align: 'center' });
  y += 7;

  doc.setFontSize(PDF.fonts.small);
  doc.setFont('helvetica', 'italic');
  doc.setTextColor(PDF.colors.textLight[0], PDF.colors.textLight[1], PDF.colors.textLight[2]);
  doc.text(payload.legal_reference, pw / 2, y, { align: 'center' });
  y += 5;
  doc.text('Établi le ' + fmtDate(payload.snapshot_date), pw / 2, y, { align: 'center' });
  y += 10;

  doc.setDrawColor(PDF.colors.primary[0], PDF.colors.primary[1], PDF.colors.primary[2]);
  doc.setLineWidth(0.5);
  doc.line(PDF.margin.left, y, pw - PDF.margin.right, y);
  y += 8;

  const addField = (label: string, value: string) => {
    doc.setFontSize(PDF.fonts.body);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(PDF.colors.text[0], PDF.colors.text[1], PDF.colors.text[2]);
    doc.text(label, PDF.margin.left + 4, y);
    doc.setFont('helvetica', 'normal');
    doc.text(value, 75, y);
    y += 6;
  };

  doc.setFontSize(PDF.fonts.sectionTitle);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(PDF.colors.primary[0], PDF.colors.primary[1], PDF.colors.primary[2]);
  doc.text('COPROPRIÉTÉ', PDF.margin.left, y);
  y += 6;
  addField('Nom :', payload.copro.name);
  addField('Adresse :', payload.copro.address);
  if (payload.copro.siret) addField('SIRET :', payload.copro.siret);
  addField('Syndic :', payload.copro.syndic_name);
  y += 3;

  doc.setFontSize(PDF.fonts.sectionTitle);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(PDF.colors.primary[0], PDF.colors.primary[1], PDF.colors.primary[2]);
  doc.text('LOT CONCERNÉ', PDF.margin.left, y);
  y += 6;
  addField('Référence :', payload.lot.ref + ' (' + payload.lot.type + ')');
  if (payload.lot.floor != null) addField('Étage :', String(payload.lot.floor));
  if (payload.lot.surface != null) addField('Surface :', payload.lot.surface + ' m²');
  addField('Tantièmes :', payload.lot.tantiemes_generaux + ' / ' + payload.lot.total_tantiemes);
  y += 3;

  doc.setFontSize(PDF.fonts.sectionTitle);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(PDF.colors.primary[0], PDF.colors.primary[1], PDF.colors.primary[2]);
  doc.text('VENDEUR', PDF.margin.left, y);
  y += 6;
  addField('Nom :', payload.seller.name);
  if (payload.seller.email) addField('Email :', payload.seller.email);
  y += 3;

  doc.setFontSize(PDF.fonts.sectionTitle);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(PDF.colors.primary[0], PDF.colors.primary[1], PDF.colors.primary[2]);
  doc.text('MUTATION', PDF.margin.left, y);
  y += 6;
  addField('Demandée le :', fmtDate(payload.mutation.requested_at));
  if (payload.mutation.notary_name) addField('Notaire :', payload.mutation.notary_name);

  return y + 5;
}
