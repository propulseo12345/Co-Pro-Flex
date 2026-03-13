import { jsPDF } from 'jspdf';
import type {
  ImpayeComplet,
  HistoriqueActionType,
  CoproprietaireImpaye,
} from '@/types/models/impaye';

interface RelanceParams {
  type: HistoriqueActionType;
  coproprietaire: CoproprietaireImpaye;
  lot: string;
  batiment: string;
  montant: number;
  periode: string;
  dateEcheance: string;
  dateRelancePrecedente?: string;
  copropriete?: string;
}

const formatDate = (dateString: string): string => {
  return new Date(dateString).toLocaleDateString('fr-FR', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  });
};

const formatMontant = (montant: number): string => {
  return montant.toLocaleString('fr-FR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
};

// Générateur de PDF pour les différents types de relances
function generateRelancePDFContent(doc: jsPDF, params: RelanceParams): void {
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 20;
  let y = 30;

  // En-tête avec le logo/nom du syndic
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(37, 99, 235);
  doc.text('COPRO MANAGER', margin, y);
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100, 100, 100);
  y += 5;
  doc.text('Syndic de Copropriété', margin, y);
  y += 4;
  doc.text('123 Avenue de la Gestion', margin, y);
  y += 4;
  doc.text('75001 Paris', margin, y);
  y += 4;
  doc.text('Tél: 01 23 45 67 89', margin, y);

  // Date à droite
  doc.setTextColor(0, 0, 0);
  doc.text(`Paris, le ${formatDate(new Date().toISOString())}`, pageWidth - margin, 30, {
    align: 'right',
  });

  y += 20;

  // Destinataire
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.text(params.coproprietaire.nom, pageWidth - margin - 60, y);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  y += 5;
  const adresseLines = doc.splitTextToSize(params.coproprietaire.adresse, 60);
  doc.text(adresseLines, pageWidth - margin - 60, y);
  y += adresseLines.length * 5 + 15;

  // Type de lettre
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);

  switch (params.type) {
    case 'relance_amiable_1':
      doc.text('Objet : Rappel de paiement - Charges de copropriété', margin, y);
      break;
    case 'relance_amiable_2':
      doc.setTextColor(234, 88, 12);
      doc.text('Objet : DEUXIÈME RAPPEL - Charges de copropriété impayées', margin, y);
      doc.setTextColor(0, 0, 0);
      break;
    case 'mise_en_demeure':
      doc.setTextColor(220, 38, 38);
      doc.text('Objet : MISE EN DEMEURE', margin, y);
      doc.setTextColor(0, 0, 0);
      y += 6;
      doc.setFontSize(9);
      doc.setFont('helvetica', 'italic');
      doc.text('Lettre recommandée avec accusé de réception', margin, y);
      break;
    default:
      doc.text('Objet : Relance de paiement', margin, y);
  }

  y += 15;

  // Corps de la lettre
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);

  const contentWidth = pageWidth - margin * 2;

  // Salutation
  doc.text('Madame, Monsieur,', margin, y);
  y += 10;

  // Contenu selon le type
  let paragraphes: string[] = [];

  switch (params.type) {
    case 'relance_amiable_1':
      paragraphes = [
        `Nous vous informons que votre compte présente un solde débiteur correspondant aux charges de copropriété pour la période ${params.periode}.`,
        `Le montant dû s'élève à ${formatMontant(params.montant)} €, dont l'échéance était fixée au ${formatDate(params.dateEcheance)}.`,
        `Nous vous remercions de bien vouloir procéder au règlement de cette somme dans un délai de 15 jours à compter de la réception de ce courrier.`,
        `En cas de difficulté de paiement, nous vous invitons à prendre contact avec notre service afin d'étudier ensemble les solutions possibles (échelonnement, délais de paiement...).`,
      ];
      break;

    case 'relance_amiable_2':
      paragraphes = [
        params.dateRelancePrecedente
          ? `Malgré notre précédent rappel du ${formatDate(params.dateRelancePrecedente)}, nous constatons que votre compte présente toujours un solde débiteur.`
          : `Malgré notre précédent rappel, nous constatons que votre compte présente toujours un solde débiteur.`,
        `Le montant restant dû s'élève à ${formatMontant(params.montant)} € pour la période ${params.periode}.`,
        `Nous vous demandons instamment de régulariser votre situation sous 8 jours à compter de la réception de ce courrier.`,
        `À défaut de règlement dans ce délai, nous serons contraints d'engager une procédure de recouvrement qui entraînera des frais supplémentaires à votre charge (frais de mise en demeure, frais d'huissier, intérêts de retard).`,
        `Nous restons à votre disposition pour tout arrangement amiable.`,
      ];
      break;

    case 'mise_en_demeure':
      paragraphes = [
        `Par la présente, nous vous mettons formellement en demeure de régler la somme de ${formatMontant(params.montant)} € correspondant aux charges de copropriété impayées.`,
        `Période concernée : ${params.periode}`,
        `Conformément aux dispositions de l'article 19 de la loi du 10 juillet 1965 fixant le statut de la copropriété, cette mise en demeure vaut commandement de payer.`,
        `À défaut de règlement intégral dans un délai de 8 jours à compter de la réception de la présente, nous transmettrons sans autre avis le dossier à notre conseil juridique aux fins de recouvrement judiciaire.`,
        `Dans cette hypothèse, les frais de procédure seront intégralement à votre charge, en sus des intérêts de retard calculés au taux légal à compter de la date d'exigibilité.`,
        `Nous vous rappelons que le défaut de paiement des charges peut également entraîner la suspension de votre droit de vote en assemblée générale.`,
      ];
      break;

    default:
      paragraphes = [
        `Nous vous rappelons que votre compte présente un solde débiteur de ${formatMontant(params.montant)} €.`,
        `Nous vous remercions de bien vouloir procéder au règlement dans les meilleurs délais.`,
      ];
  }

  // Écriture des paragraphes
  for (const paragraphe of paragraphes) {
    const lines = doc.splitTextToSize(paragraphe, contentWidth);
    doc.text(lines, margin, y);
    y += lines.length * 5 + 5;
  }

  y += 5;

  // Formule de politesse
  doc.text("Veuillez agréer, Madame, Monsieur, l'expression de nos salutations distinguées.", margin, y);
  y += 20;

  // Signature
  doc.setFont('helvetica', 'bold');
  doc.text('Le Syndic', pageWidth - margin - 40, y);
  doc.setFont('helvetica', 'normal');
  y += 5;
  doc.text('Copro Manager', pageWidth - margin - 40, y);

  // Encadré récapitulatif en bas
  y = doc.internal.pageSize.getHeight() - 60;
  doc.setFillColor(248, 250, 252);
  doc.rect(margin, y, contentWidth, 45, 'F');
  doc.setDrawColor(226, 232, 240);
  doc.rect(margin, y, contentWidth, 45, 'S');

  y += 8;
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.text('RÉCAPITULATIF', margin + 5, y);
  y += 7;
  doc.setFont('helvetica', 'normal');
  doc.text(`Lot : ${params.lot} - ${params.batiment}`, margin + 5, y);
  y += 5;
  doc.text(`Période : ${params.periode}`, margin + 5, y);
  y += 5;
  doc.text(`Date d'échéance : ${formatDate(params.dateEcheance)}`, margin + 5, y);
  y += 5;
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(220, 38, 38);
  doc.text(`Montant dû : ${formatMontant(params.montant)} €`, margin + 5, y);

  // Pied de page
  doc.setFontSize(8);
  doc.setTextColor(156, 163, 175);
  doc.setFont('helvetica', 'normal');
  doc.text(
    'Copro Manager - Document généré automatiquement',
    pageWidth / 2,
    doc.internal.pageSize.getHeight() - 10,
    { align: 'center' }
  );
}

// Générer et télécharger le PDF
export function generateRelancePDF(params: RelanceParams): jsPDF {
  const doc = new jsPDF();
  generateRelancePDFContent(doc, params);

  const typeLabel = {
    relance_amiable_1: 'relance_1',
    relance_amiable_2: 'relance_2',
    mise_en_demeure: 'mise_en_demeure',
  };

  return doc;
}

// Générer et retourner l'URL blob pour prévisualisation
export function previewRelancePDF(params: RelanceParams): string {
  const doc = new jsPDF();
  generateRelancePDFContent(doc, params);
  const blob = doc.output('blob');
  return URL.createObjectURL(blob);
}

// Générer le contenu texte pour un email
export function generateEmailContent(params: RelanceParams): { objet: string; corps: string } {
  let objet = '';
  let corps = '';

  switch (params.type) {
    case 'relance_amiable_1':
      objet = 'Rappel de paiement - Charges de copropriété';
      corps = `Madame, Monsieur,

Nous vous informons que votre compte présente un solde débiteur correspondant aux charges de copropriété.

Montant dû : ${formatMontant(params.montant)} €
Période concernée : ${params.periode}
Date d'échéance initiale : ${formatDate(params.dateEcheance)}
Lot : ${params.lot} - ${params.batiment}

Nous vous remercions de bien vouloir procéder au règlement de cette somme dans les meilleurs délais.

En cas de difficulté de paiement, nous vous invitons à prendre contact avec notre service afin d'étudier ensemble les solutions possibles.

Veuillez agréer, Madame, Monsieur, l'expression de nos salutations distinguées.

Le Syndic
Copro Manager`;
      break;

    case 'relance_amiable_2':
      objet = 'DEUXIÈME RAPPEL - Charges de copropriété impayées';
      corps = `Madame, Monsieur,

${params.dateRelancePrecedente ? `Malgré notre précédent rappel du ${formatDate(params.dateRelancePrecedente)}, nous constatons que votre compte présente toujours un solde débiteur.` : 'Malgré notre précédent rappel, nous constatons que votre compte présente toujours un solde débiteur.'}

Montant dû : ${formatMontant(params.montant)} €
Période concernée : ${params.periode}

Nous vous demandons instamment de régulariser votre situation sous 8 jours à compter de la réception de cet email.

À défaut, nous serons contraints d'engager une procédure de recouvrement qui entraînera des frais supplémentaires à votre charge.

Veuillez agréer, Madame, Monsieur, l'expression de nos salutations distinguées.

Le Syndic
Copro Manager`;
      break;

    case 'mise_en_demeure':
      objet = 'MISE EN DEMEURE - Procédure de recouvrement';
      corps = `Madame, Monsieur,

Par la présente, nous vous mettons en demeure de régler la somme de ${formatMontant(params.montant)} € correspondant aux charges de copropriété impayées.

Période concernée : ${params.periode}

Conformément aux dispositions de l'article 19 de la loi du 10 juillet 1965, cette mise en demeure vaut commandement de payer.

À défaut de règlement intégral dans un délai de 8 jours, nous transmettrons le dossier à notre conseil juridique aux fins de recouvrement judiciaire.

Les frais de procédure seront intégralement à votre charge, en sus des intérêts de retard au taux légal.

Veuillez agréer, Madame, Monsieur, l'expression de nos salutations distinguées.

Le Syndic
Copro Manager

---
Ce document tient lieu de mise en demeure au sens juridique du terme.
Un courrier recommandé avec accusé de réception vous sera également adressé.`;
      break;

    default:
      objet = 'Relance de paiement';
      corps = `Madame, Monsieur,

Nous vous rappelons que votre compte présente un solde débiteur de ${formatMontant(params.montant)} €.

Nous vous remercions de bien vouloir procéder au règlement dans les meilleurs délais.

Cordialement,

Le Syndic
Copro Manager`;
  }

  return { objet, corps };
}

// Export des impayés en PDF
export function generateImpayesExportPDF(impayes: ImpayeComplet[]): jsPDF {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 20;
  let y = 20;

  // En-tête
  doc.setFontSize(20);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(37, 99, 235);
  doc.text('COPRO MANAGER', pageWidth / 2, y, { align: 'center' });
  y += 10;

  doc.setFontSize(16);
  doc.setTextColor(0, 0, 0);
  doc.text('ÉTAT DES IMPAYÉS', pageWidth / 2, y, { align: 'center' });
  y += 8;

  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100, 100, 100);
  doc.text(`Généré le ${formatDate(new Date().toISOString())}`, pageWidth / 2, y, { align: 'center' });
  y += 15;

  // Statistiques
  const montantTotal = impayes.reduce((sum, i) => sum + i.montant, 0);
  const nbMiseEnDemeure = impayes.filter((i) => i.statut === 'mise_en_demeure').length;
  const nbContentieux = impayes.filter((i) => i.statut === 'contentieux').length;

  doc.setFillColor(241, 245, 249);
  doc.rect(margin, y, pageWidth - margin * 2, 25, 'F');

  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(0, 0, 0);
  doc.text('Résumé:', margin + 5, y + 10);
  doc.setFont('helvetica', 'normal');
  doc.text(`${impayes.length} dossiers`, margin + 35, y + 10);
  doc.text(`Montant total: ${formatMontant(montantTotal)} €`, margin + 80, y + 10);
  doc.text(`Mise en demeure: ${nbMiseEnDemeure}`, margin + 5, y + 18);
  doc.text(`Contentieux: ${nbContentieux}`, margin + 60, y + 18);
  y += 35;

  // Tableau
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
  doc.text('Nom', margin + 2, y + 7);
  doc.text('Lot', margin + 50, y + 7);
  doc.text('Montant', margin + 80, y + 7);
  doc.text('Statut', margin + 110, y + 7);
  doc.text('Échéance', margin + 145, y + 7);
  y += 14;

  // Lignes
  impayes.forEach((impaye, index) => {
    checkNewPage(12);

    if (index % 2 === 0) {
      doc.setFillColor(248, 250, 252);
      doc.rect(margin, y - 4, pageWidth - margin * 2, 10, 'F');
    }

    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(0, 0, 0);

    doc.text(impaye.coproprietaire.nom.substring(0, 25), margin + 2, y);
    doc.text(`${impaye.lot}`, margin + 50, y);
    doc.text(`${formatMontant(impaye.montant)} €`, margin + 80, y);

    // Statut avec couleur
    const statutLabels: Record<string, string> = {
      en_retard: 'En retard',
      relance_amiable_1: 'Relance 1',
      relance_amiable_2: 'Relance 2',
      mise_en_demeure: 'Mise en demeure',
      contentieux: 'Contentieux',
      regle: 'Réglé',
    };
    doc.text(statutLabels[impaye.statut] || impaye.statut, margin + 110, y);
    doc.text(formatDate(impaye.dateEcheance), margin + 145, y);

    y += 8;
  });

  // Pied de page
  const totalPages = doc.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(156, 163, 175);
    doc.text(`Page ${i}/${totalPages}`, pageWidth - margin, pageHeight - 10, { align: 'right' });
    doc.text('Copro Manager - Document confidentiel', margin, pageHeight - 10);
  }

  return doc;
}

// Export CSV des impayés
export function generateImpayesExportCSV(impayes: ImpayeComplet[]): void {
  const headers = [
    'Nom',
    'Email',
    'Téléphone',
    'Adresse',
    'Lot',
    'Bâtiment',
    'Montant Initial',
    'Montant Dû',
    'Période',
    'Type',
    'Statut',
    'Date Échéance',
    'Jours de Retard',
  ];

  const rows = impayes.map((impaye) => {
    const joursRetard = Math.floor(
      (new Date().getTime() - new Date(impaye.dateEcheance).getTime()) / (1000 * 60 * 60 * 24)
    );
    const statutLabels: Record<string, string> = {
      en_retard: 'En retard',
      relance_amiable_1: 'Relance amiable 1',
      relance_amiable_2: 'Relance amiable 2',
      mise_en_demeure: 'Mise en demeure',
      contentieux: 'Contentieux',
      regle: 'Réglé',
    };

    return [
      impaye.coproprietaire.nom,
      impaye.coproprietaire.email,
      impaye.coproprietaire.telephone,
      impaye.coproprietaire.adresse,
      impaye.lot,
      impaye.batiment,
      impaye.montantInitial.toString(),
      impaye.montant.toString(),
      impaye.periode,
      impaye.type,
      statutLabels[impaye.statut] || impaye.statut,
      new Date(impaye.dateEcheance).toLocaleDateString('fr-FR'),
      joursRetard.toString(),
    ];
  });

  const csvContent =
    '\uFEFF' +
    [headers.join(';'), ...rows.map((row) => row.map((cell) => `"${cell}"`).join(';'))].join('\n');

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `impayes_export_${new Date().toISOString().split('T')[0]}.csv`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
