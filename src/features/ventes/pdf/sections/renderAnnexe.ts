import { jsPDF } from 'jspdf';
import { PDF } from '../pdfLayout';
import { fmtEuro, fmtDate, fmtDateShort } from '../helpers/formatters';
import { renderSectionTitle } from '../helpers/renderSectionTitle';
import { renderTable } from '../helpers/renderTable';
import type { EtatDatePayloadV2 } from '../../domain/types';

const NATURE_LABELS: Record<string, string> = { litigation: 'Contentieux', recovery: 'Recouvrement', other: 'Autre' };
const STATUS_LABELS: Record<string, string> = { pending: 'En attente', in_progress: 'En cours', closed: 'Clôturé', won: 'Gagné', lost: 'Perdu' };

export function renderAnnexe(doc: jsPDF, annexe: EtatDatePayloadV2['annexe'], copro: EtatDatePayloadV2['copro'], snapshotDate: string): number {
  doc.addPage();
  let y = PDF.margin.top;

  doc.setFontSize(PDF.fonts.subtitle);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(PDF.colors.text[0], PDF.colors.text[1], PDF.colors.text[2]);
  doc.text('ANNEXE', PDF.margin.left, y);
  y += 10;

  y = renderSectionTitle(doc, y, 'Historique des charges — 2 derniers exercices');
  y = renderTable(doc, y,
    [{ label: 'Exercice', width: 30 }, { label: 'Prévisionnel', width: 23, align: 'right' }, { label: 'Hors budget', width: 23, align: 'right' }, { label: 'Total', width: 24, align: 'right' }],
    annexe.historique_charges.map(h => [h.period_label, fmtEuro(h.budget_previsionnel), fmtEuro(h.hors_budget), fmtEuro(h.total)])
  );

  y = renderSectionTitle(doc, y, 'Procédures judiciaires en cours');
  if (annexe.procedures_judiciaires.length === 0) {
    doc.setFontSize(PDF.fonts.body);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(PDF.colors.text[0], PDF.colors.text[1], PDF.colors.text[2]);
    doc.text('Aucune procédure en cours.', PDF.margin.left + 4, y);
    y += 8;
  } else {
    y = renderTable(doc, y,
      [{ label: 'Objet', width: 25 }, { label: 'Nature', width: 15 }, { label: 'Partie adverse', width: 20 }, { label: 'Enjeu', width: 15, align: 'right' }, { label: 'Statut', width: 12 }, { label: 'Tribunal', width: 13 }],
      annexe.procedures_judiciaires.map(p => [p.title, NATURE_LABELS[p.nature] || p.nature, p.opposing_party, fmtEuro(p.amount_at_stake), STATUS_LABELS[p.status] || p.status, p.court])
    );
  }

  if (annexe.recent_transactions.length > 0) {
    y = renderSectionTitle(doc, y, 'Dernières opérations du compte');
    y = renderTable(doc, y,
      [{ label: 'Date', width: 15 }, { label: 'Type', width: 12 }, { label: 'Libellé', width: 33 }, { label: 'Débit', width: 13, align: 'right' }, { label: 'Crédit', width: 13, align: 'right' }, { label: 'Solde', width: 14, align: 'right' }],
      annexe.recent_transactions.map(t => [
        fmtDateShort(t.line_date),
        t.line_type === 'call' ? 'Appel' : 'Paiement',
        t.label,
        t.debit > 0 ? fmtEuro(t.debit) : '-',
        t.credit > 0 ? fmtEuro(t.credit) : '-',
        fmtEuro(t.running_balance),
      ])
    );
  }

  y += 10;
  doc.setDrawColor(PDF.colors.border[0], PDF.colors.border[1], PDF.colors.border[2]);
  doc.line(PDF.margin.left, y, PDF.margin.left + PDF.contentWidth, y);
  y += 8;

  doc.setFontSize(PDF.fonts.small);
  doc.setFont('helvetica', 'italic');
  doc.setTextColor(PDF.colors.textLight[0], PDF.colors.textLight[1], PDF.colors.textLight[2]);
  doc.text('Établi le ' + fmtDate(snapshotDate) + ' par ' + copro.syndic_name, PDF.margin.left, y);
  y += 5;
  doc.text("Les sommes mentionnées sont à jour à la date d'établissement du présent état.", PDF.margin.left, y);

  return y + 10;
}
