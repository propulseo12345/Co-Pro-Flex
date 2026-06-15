import { jsPDF } from 'jspdf';
import { PDF } from '../pdfLayout';
import { fmtDate } from '../helpers/formatters';
import type { EtatDatePayloadV2 } from '../../domain/types';

const EMPTY = '—';
const orDash = (v: string | null | undefined) => (v && v.trim() !== '' ? v : EMPTY);
const fmtPct = (n: number) => new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 2 }).format(n) + ' %';

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
  doc.text("Date d'effet : " + fmtDate(payload.effective_date), pw / 2, y, { align: 'center' });
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

  const addSectionTitle = (label: string) => {
    doc.setFontSize(PDF.fonts.sectionTitle);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(PDF.colors.primary[0], PDF.colors.primary[1], PDF.colors.primary[2]);
    doc.text(label, PDF.margin.left, y);
    y += 6;
  };

  // Copropriété
  addSectionTitle('COPROPRIÉTÉ');
  addField('Nom :', orDash(payload.copro.name));
  addField('Adresse :', orDash(payload.copro.address));
  if (payload.copro.siret) addField('SIRET :', payload.copro.siret);
  if (payload.copro.num_immatriculation) addField('N° immatriculation :', payload.copro.num_immatriculation);
  y += 3;

  // Syndic
  if (payload.syndic) {
    addSectionTitle('SYNDIC');
    addField('Nom :', orDash(payload.syndic.name));
    if (payload.syndic.address) addField('Adresse :', payload.syndic.address);
    if (payload.syndic.siret) addField('SIRET :', payload.syndic.siret);
    y += 3;
  }

  // Lot
  addSectionTitle('LOT CONCERNÉ');
  const lotType = payload.lot.type && payload.lot.type.trim() !== '' ? ' (' + payload.lot.type + ')' : '';
  addField('Référence :', orDash(payload.lot.ref) + lotType);
  if (payload.lot.floor != null) addField('Étage :', String(payload.lot.floor));
  if (payload.lot.surface != null) addField('Surface :', payload.lot.surface + ' m²');
  y += 3;

  // Vendeur(s) — cédants nommés + adresse/email du vendeur principal
  addSectionTitle(payload.cedants.length > 1 ? 'VENDEURS' : 'VENDEUR');
  if (payload.cedants.length > 0) {
    for (const c of payload.cedants) {
      addField('Cédant :', orDash(c.nom) + ' — ' + fmtPct(c.share_percent));
    }
  } else {
    addField('Nom :', orDash(payload.seller.name));
  }
  if (payload.seller.address) addField('Adresse :', payload.seller.address);
  if (payload.seller.email) addField('Email :', payload.seller.email);
  y += 3;

  // Notaire
  if (payload.notaire) {
    addSectionTitle('NOTAIRE');
    addField('Nom :', orDash(payload.notaire.name));
    if (payload.notaire.office_name) addField('Office :', payload.notaire.office_name);
    if (payload.notaire.notary_reference) addField('Référence dossier :', payload.notaire.notary_reference);
  }

  return y + 5;
}
