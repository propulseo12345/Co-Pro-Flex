import { jsPDF } from 'jspdf';
import type { Vente, VenteDocument, HistoriqueItem, OrdreService, WorkflowStep } from '@/components/features/ventes/VenteDetail/types';
import { WORKFLOW_STEPS } from '@/components/features/ventes/VenteDetail/constants';
import { getStatutStyle, getOsStatutLabel, getWorkflowStepIndex } from '@/components/features/ventes/VenteDetail/utils';

interface GeneratePDFParams {
  vente: Vente;
  documents: VenteDocument[];
  historique: HistoriqueItem[];
  linkedOrdresService: OrdreService[];
}

export function generateVentePDF({
  vente,
  documents,
  historique,
  linkedOrdresService
}: GeneratePDFParams): jsPDF {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 20;
  let y = 20;

  const currentStepIndex = getWorkflowStepIndex(vente.etapeWorkflow);

  const addText = (
    text: string,
    x: number,
    yPos: number,
    options?: { fontSize?: number; fontStyle?: string; color?: number[] }
  ) => {
    doc.setFontSize(options?.fontSize || 10);
    if (options?.fontStyle) {
      doc.setFont('helvetica', options.fontStyle);
    } else {
      doc.setFont('helvetica', 'normal');
    }
    if (options?.color) {
      doc.setTextColor(options.color[0], options.color[1], options.color[2]);
    } else {
      doc.setTextColor(0, 0, 0);
    }
    doc.text(text, x, yPos);
  };

  const addSection = (title: string) => {
    y += 8;
    doc.setFillColor(79, 70, 229);
    doc.rect(margin, y, pageWidth - margin * 2, 8, 'F');
    addText(title, margin + 4, y + 6, { fontSize: 11, fontStyle: 'bold', color: [255, 255, 255] });
    y += 14;
  };

  const checkNewPage = (neededSpace: number) => {
    if (y + neededSpace > doc.internal.pageSize.getHeight() - 20) {
      doc.addPage();
      y = 20;
    }
  };

  // === PAGE 1: Informations générales ===
  addText('FICHE DE VENTE', pageWidth / 2, y, { fontSize: 18, fontStyle: 'bold' });
  doc.setFontSize(10);
  doc.text(
    `Générée le ${new Date().toLocaleDateString('fr-FR')} à ${new Date().toLocaleTimeString('fr-FR')}`,
    pageWidth / 2,
    y + 8,
    { align: 'center' }
  );
  y += 20;

  // Lot
  addSection('INFORMATIONS DU LOT');
  addText(`Lot : ${vente.lotId}`, margin, y);
  addText(`Type : ${vente.lotType.charAt(0).toUpperCase() + vente.lotType.slice(1)}`, margin + 80, y);
  addText(
    `Statut : ${vente.statut === 'en_cours' ? 'En cours' : vente.statut === 'finalise' ? 'Finalisé' : 'Annulé'}`,
    margin + 140,
    y
  );
  y += 10;

  // Vendeur
  addSection('VENDEUR');
  addText(`Nom : ${vente.vendeur.nom}`, margin, y);
  y += 6;
  addText(`Email : ${vente.vendeur.email}`, margin, y);
  addText(`Téléphone : ${vente.vendeur.telephone}`, margin + 90, y);
  y += 6;
  if (vente.vendeur.impayes > 0) {
    addText(`Impayés : ${vente.vendeur.impayes.toLocaleString('fr-FR')} €`, margin, y, {
      color: [220, 38, 38]
    });
    y += 6;
  }

  // Acquéreur
  addSection('ACQUÉREUR');
  addText(`Nom : ${vente.acquereur.nom}`, margin, y);
  y += 6;
  addText(`Email : ${vente.acquereur.email}`, margin, y);
  addText(`Téléphone : ${vente.acquereur.telephone}`, margin + 90, y);
  y += 6;

  // Notaire
  addSection('NOTAIRE');
  addText(`Nom : ${vente.notaire.nom}`, margin, y);
  y += 6;
  addText(`Email : ${vente.notaire.email}`, margin, y);
  addText(`Téléphone : ${vente.notaire.telephone}`, margin + 90, y);
  y += 6;

  // Dates
  addSection('DATES CLÉS');
  addText(`Date de compromis : ${new Date(vente.dateCompromis).toLocaleDateString('fr-FR')}`, margin, y);
  y += 6;
  if (vente.dateActeAuthentique) {
    addText(
      `Date acte authentique : ${new Date(vente.dateActeAuthentique).toLocaleDateString('fr-FR')}`,
      margin,
      y
    );
    y += 6;
  }
  if (vente.dateNotificationArt6) {
    addText(
      `Notification Art. 6 : ${new Date(vente.dateNotificationArt6).toLocaleDateString('fr-FR')}`,
      margin,
      y
    );
    y += 6;
  }
  addText(`Date de création : ${new Date(vente.dateCreation).toLocaleDateString('fr-FR')}`, margin, y);
  y += 6;

  // Notes
  if (vente.observations || vente.notesInternes) {
    addSection('NOTES');
    if (vente.observations) {
      addText(`Observations : ${vente.observations}`, margin, y);
      y += 6;
    }
    if (vente.notesInternes) {
      addText(`Notes internes : ${vente.notesInternes}`, margin, y);
      y += 6;
    }
  }

  // === PAGE 2: Workflow & Documents ===
  doc.addPage();
  y = 20;

  // Workflow
  addSection('ÉTAT DU WORKFLOW');
  const etapeLabel = WORKFLOW_STEPS.find(s => s.id === vente.etapeWorkflow)?.label || vente.etapeWorkflow;
  addText(`Étape actuelle : ${etapeLabel}`, margin, y, { fontStyle: 'bold' });
  y += 8;

  WORKFLOW_STEPS.forEach((step, index) => {
    const isCompleted = index < currentStepIndex;
    const isCurrent = step.id === vente.etapeWorkflow;
    const status = isCompleted ? '✓' : isCurrent ? '→' : '○';
    const color = isCompleted ? [16, 185, 129] : isCurrent ? [2, 132, 199] : [156, 163, 175];
    addText(`${status} ${step.label}`, margin + 4, y, { color: color as [number, number, number] });
    y += 6;
  });

  // Documents
  y += 4;
  addSection('DOCUMENTS');

  // En-tête tableau
  doc.setFillColor(241, 245, 249);
  doc.rect(margin, y, pageWidth - margin * 2, 8, 'F');
  addText('Document', margin + 2, y + 6, { fontStyle: 'bold', fontSize: 9 });
  addText('Statut', margin + 80, y + 6, { fontStyle: 'bold', fontSize: 9 });
  addText('Date génération', margin + 110, y + 6, { fontStyle: 'bold', fontSize: 9 });
  addText('Signataire', margin + 145, y + 6, { fontStyle: 'bold', fontSize: 9 });
  y += 10;

  documents.forEach(docItem => {
    checkNewPage(8);
    const statutLabel = getStatutStyle(docItem.statut).label;
    addText(docItem.nom + (docItem.obligatoire ? ' *' : ''), margin + 2, y, { fontSize: 9 });
    addText(statutLabel, margin + 80, y, { fontSize: 9 });
    addText(
      docItem.dateGeneration ? new Date(docItem.dateGeneration).toLocaleDateString('fr-FR') : '-',
      margin + 110,
      y,
      { fontSize: 9 }
    );
    addText(docItem.signePar || '-', margin + 145, y, { fontSize: 9 });
    y += 7;
  });

  // === PAGE 3: OS & Historique ===
  doc.addPage();
  y = 20;

  // Ordres de service
  addSection('ORDRES DE SERVICE LIÉS');
  if (linkedOrdresService.length === 0) {
    addText('Aucun ordre de service lié', margin, y);
    y += 6;
  } else {
    linkedOrdresService.forEach(os => {
      checkNewPage(12);
      addText(`• ${os.titre}`, margin, y, { fontStyle: 'bold', fontSize: 9 });
      y += 5;
      addText(
        `  Fournisseur : ${os.fournisseur} | Date : ${new Date(os.date).toLocaleDateString('fr-FR')} | Statut : ${getOsStatutLabel(os.statut)}`,
        margin,
        y,
        { fontSize: 8 }
      );
      y += 7;
    });
  }

  // Historique
  y += 4;
  addSection('HISTORIQUE');
  historique.slice(0, 15).forEach(item => {
    checkNewPage(12);
    const date = new Date(item.date).toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
    addText(`${date} - ${item.auteur}`, margin, y, {
      fontStyle: 'bold',
      fontSize: 8,
      color: [100, 116, 139]
    });
    y += 5;
    addText(item.description, margin + 4, y, { fontSize: 9 });
    y += 8;
  });

  // Pied de page sur toutes les pages
  const totalPages = doc.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(156, 163, 175);
    doc.text(`Page ${i}/${totalPages}`, pageWidth - margin, doc.internal.pageSize.getHeight() - 10, {
      align: 'right'
    });
    doc.text('Copro Manager - Document confidentiel', margin, doc.internal.pageSize.getHeight() - 10);
  }

  return doc;
}
