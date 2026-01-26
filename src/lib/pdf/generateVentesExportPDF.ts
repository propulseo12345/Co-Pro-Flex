import { jsPDF } from 'jspdf';
import type { Vente } from '@/types/models/vente';

interface ExportOptions {
  includeDetails: boolean;
  includeHistorique: boolean;
  onlyEnCours: boolean;
}

const formatDate = (dateString: string | undefined): string => {
  if (!dateString) return '-';
  return new Date(dateString).toLocaleDateString('fr-FR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
};

const getStatutLabel = (statut: Vente['statut']): string => {
  switch (statut) {
    case 'EN_COURS':
      return 'En cours';
    case 'TERMINEE':
      return 'Finalisé';
    case 'ANNULEE':
      return 'Annulé';
    default:
      return statut;
  }
};

const getWorkflowLabel = (etape: string): string => {
  const labels: Record<string, string> = {
    creation: 'Création',
    generation: 'Génération docs',
    signature: 'Signature',
    transmission: 'Transmission',
    notification: 'Notification Art.6',
  };
  return labels[etape] || etape;
};

export function generateVentesExportPDF(
  ventes: Vente[],
  options: ExportOptions = { includeDetails: true, includeHistorique: true, onlyEnCours: false }
): void {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 20;
  let y = 20;

  // Filtrer si nécessaire
  const filteredVentes = options.onlyEnCours
    ? ventes.filter((v) => v.statut === 'EN_COURS')
    : ventes;

  // En-tête
  doc.setFontSize(20);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(37, 99, 235);
  doc.text('COPRO MANAGER', pageWidth / 2, y, { align: 'center' });
  y += 10;

  doc.setFontSize(16);
  doc.setTextColor(0, 0, 0);
  doc.text('EXPORT DES VENTES', pageWidth / 2, y, { align: 'center' });
  y += 8;

  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100, 100, 100);
  const today = new Date().toLocaleDateString('fr-FR', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  });
  doc.text(`Généré le ${today}`, pageWidth / 2, y, { align: 'center' });
  y += 8;
  doc.text(`${filteredVentes.length} vente(s)`, pageWidth / 2, y, { align: 'center' });
  y += 15;

  // Ligne de séparation
  doc.setDrawColor(37, 99, 235);
  doc.setLineWidth(0.5);
  doc.line(margin, y, pageWidth - margin, y);
  y += 15;

  // Statistiques
  const stats = {
    enCours: filteredVentes.filter((v) => v.statut === 'EN_COURS').length,
    terminees: filteredVentes.filter((v) => v.statut === 'TERMINEE').length,
    annulees: filteredVentes.filter((v) => v.statut === 'ANNULEE').length,
  };

  doc.setFillColor(241, 245, 249);
  doc.rect(margin, y, pageWidth - margin * 2, 20, 'F');

  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(0, 0, 0);
  doc.text('Résumé:', margin + 4, y + 8);

  doc.setFont('helvetica', 'normal');
  doc.text(`En cours: ${stats.enCours}`, margin + 40, y + 8);
  doc.text(`Finalisées: ${stats.terminees}`, margin + 80, y + 8);
  doc.text(`Annulées: ${stats.annulees}`, margin + 130, y + 8);
  y += 30;

  // Tableau des ventes
  const checkNewPage = (needed: number) => {
    if (y + needed > pageHeight - 20) {
      doc.addPage();
      y = 20;
    }
  };

  // En-tête du tableau
  doc.setFillColor(37, 99, 235);
  doc.rect(margin, y, pageWidth - margin * 2, 10, 'F');
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(255, 255, 255);
  doc.text('Lot', margin + 2, y + 7);
  doc.text('Vendeur', margin + 30, y + 7);
  doc.text('Acquéreur', margin + 70, y + 7);
  doc.text('Statut', margin + 110, y + 7);
  doc.text('Étape', margin + 140, y + 7);
  y += 14;

  // Lignes du tableau
  filteredVentes.forEach((vente, index) => {
    checkNewPage(options.includeDetails ? 30 : 12);

    // Fond alterné
    if (index % 2 === 0) {
      doc.setFillColor(248, 250, 252);
      doc.rect(margin, y - 4, pageWidth - margin * 2, options.includeDetails ? 25 : 10, 'F');
    }

    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(0, 0, 0);

    // Ligne principale
    doc.text(vente.lotIds.join(', ').substring(0, 15), margin + 2, y);
    doc.text(vente.vendeur.substring(0, 20), margin + 30, y);
    doc.text((vente.acquereur || '-').substring(0, 20), margin + 70, y);
    doc.text(getStatutLabel(vente.statut), margin + 110, y);
    doc.text(getWorkflowLabel(vente.etapeWorkflow), margin + 140, y);

    if (options.includeDetails) {
      y += 7;
      doc.setFontSize(8);
      doc.setTextColor(100, 100, 100);
      const details = [
        vente.notaire ? `Notaire: ${vente.notaire}` : null,
        vente.dateCompromis ? `Compromis: ${formatDate(vente.dateCompromis)}` : null,
        vente.dateActeAuthentique ? `Acte: ${formatDate(vente.dateActeAuthentique)}` : null,
      ]
        .filter(Boolean)
        .join(' | ');
      doc.text(details, margin + 2, y);
      y += 12;
    } else {
      y += 8;
    }
  });

  // Pied de page sur toutes les pages
  const totalPages = doc.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(156, 163, 175);
    doc.text(`Page ${i}/${totalPages}`, pageWidth - margin, pageHeight - 10, {
      align: 'right',
    });
    doc.text('Copro Manager - Document confidentiel', margin, pageHeight - 10);
  }

  // Sauvegarder
  const fileName = `ventes_export_${new Date().toISOString().split('T')[0]}.pdf`;
  doc.save(fileName);
}

// Fonction pour générer un export Excel (CSV)
export function generateVentesExportCSV(ventes: Vente[]): void {
  const headers = ['Lot', 'Type', 'Vendeur', 'Acquéreur', 'Notaire', 'Statut', 'Étape', 'Date Compromis', 'Date Acte', 'Date Création'];

  const rows = ventes.map((vente) => [
    vente.lotIds.join(' / '),
    vente.lotTypes.join(' / '),
    vente.vendeur,
    vente.acquereur || '',
    vente.notaire || '',
    getStatutLabel(vente.statut),
    getWorkflowLabel(vente.etapeWorkflow),
    formatDate(vente.dateCompromis),
    formatDate(vente.dateActeAuthentique),
    formatDate(vente.dateCreation),
  ]);

  const csvContent =
    '\uFEFF' + // BOM for Excel UTF-8
    [headers.join(';'), ...rows.map((row) => row.map((cell) => `"${cell}"`).join(';'))].join('\n');

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `ventes_export_${new Date().toISOString().split('T')[0]}.csv`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
