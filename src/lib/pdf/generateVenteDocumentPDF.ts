import { jsPDF } from 'jspdf';
import type { Vente, VenteDocument } from '@/components/features/ventes/VenteDetail/types';

interface DocumentGeneratorParams {
  vente: Vente;
  document: VenteDocument;
}

// Fonction utilitaire pour formater les dates
const formatDate = (dateString: string | undefined): string => {
  if (!dateString) return '-';
  return new Date(dateString).toLocaleDateString('fr-FR', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  });
};

// Fonction utilitaire pour ajouter un en-tête
const addHeader = (doc: jsPDF, title: string, subtitle: string, date: string): number => {
  const pageWidth = doc.internal.pageSize.getWidth();
  let y = 20;

  // Logo/Titre
  doc.setFontSize(20);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(37, 99, 235);
  doc.text('COPRO MANAGER', pageWidth / 2, y, { align: 'center' });
  y += 10;

  // Titre du document
  doc.setFontSize(16);
  doc.setTextColor(0, 0, 0);
  doc.text(title, pageWidth / 2, y, { align: 'center' });
  y += 8;

  // Sous-titre
  doc.setFontSize(11);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100, 100, 100);
  doc.text(subtitle, pageWidth / 2, y, { align: 'center' });
  y += 8;

  // Date
  doc.setFontSize(10);
  doc.text(`Document généré le ${date}`, pageWidth / 2, y, { align: 'center' });
  y += 15;

  // Ligne de séparation
  doc.setDrawColor(37, 99, 235);
  doc.setLineWidth(0.5);
  doc.line(20, y, pageWidth - 20, y);
  y += 10;

  return y;
};

// Fonction utilitaire pour ajouter une section
const addSection = (doc: jsPDF, y: number, title: string): number => {
  doc.setFillColor(241, 245, 249);
  doc.rect(20, y, doc.internal.pageSize.getWidth() - 40, 8, 'F');
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(37, 99, 235);
  doc.text(title, 24, y + 6);
  return y + 14;
};

// Fonction utilitaire pour ajouter une ligne de texte
const addLine = (doc: jsPDF, y: number, label: string, value: string): number => {
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(0, 0, 0);
  doc.text(label, 24, y);
  doc.setFont('helvetica', 'normal');
  doc.text(value, 80, y);
  return y + 7;
};

// Fonction pour générer la mention de signature
const genererMentionSignature = (lieu: string, date: Date): string => {
  const dateFormatee = date.toLocaleDateString('fr-FR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
  return `Fait à ${lieu}, le ${dateFormatee}`;
};

// Fonction pour ajouter le bloc signature avec image dans le PDF
const addSignatureBlock = (
  doc: jsPDF,
  y: number,
  document: VenteDocument
): number => {
  const pageWidth = doc.internal.pageSize.getWidth();

  if (document.signePar && document.dateSignature && document.signatureData) {
    // Configuration du bloc signature
    const signatureX = pageWidth - 90; // Position à droite
    const signatureWidth = 60;
    const signatureHeight = 25;

    // Ajouter l'image de la signature
    try {
      doc.addImage(
        document.signatureData,
        'PNG',
        signatureX,
        y,
        signatureWidth,
        signatureHeight
      );
      y += signatureHeight + 3;
    } catch {
      // Si erreur avec l'image, on continue sans
      y += 5;
    }

    // Nom et qualité du signataire
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(30, 58, 95);
    doc.text(document.signePar, signatureX, y);
    y += 5;

    // Rôle du signataire
    if (document.signataireRole) {
      doc.setFontSize(8);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(100, 100, 100);
      doc.text(document.signataireRole, signatureX, y);
      y += 5;
    }

    // Mention "Fait à..., le..."
    const lieu = document.lieuSignature || 'Paris';
    const dateSignature = new Date(document.dateSignature);
    const mention = genererMentionSignature(lieu, dateSignature);
    doc.setFontSize(8);
    doc.setFont('helvetica', 'italic');
    doc.setTextColor(80, 80, 80);
    doc.text(mention, signatureX, y);
    y += 8;

  } else if (document.signePar && document.dateSignature) {
    // Signature sans image (fallback)
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(0, 0, 0);
    doc.text(`Signé par : ${document.signePar}`, 24, y);
    y += 6;
    doc.text(`Date de signature : ${formatDate(document.dateSignature)}`, 24, y);
    y += 8;
  } else {
    // En attente de signature
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(0, 0, 0);
    doc.text('En attente de signature', 24, y);
    y += 20;

    // Zone de signature vide
    doc.setDrawColor(180, 180, 180);
    doc.setLineWidth(0.5);
    doc.line(pageWidth - 90, y, pageWidth - 20, y);
    y += 5;
    doc.setFontSize(8);
    doc.setTextColor(150, 150, 150);
    doc.text('Signature', pageWidth - 90, y);
    y += 10;

    doc.line(pageWidth - 90, y, pageWidth - 20, y);
    y += 5;
    doc.text('Date', pageWidth - 90, y);
    y += 10;

    doc.line(pageWidth - 90, y, pageWidth - 20, y);
    y += 5;
    doc.text('Lieu', pageWidth - 90, y);
  }

  return y;
};

// Générateur PRÉ-ÉTAT DATÉ
function generatePreEtatDate(doc: jsPDF, vente: Vente, document: VenteDocument): void {
  const pageWidth = doc.internal.pageSize.getWidth();
  const today = formatDate(new Date().toISOString());

  let y = addHeader(doc, 'PRÉ-ÉTAT DATÉ', `Lot ${vente.lotId}`, today);

  // Section Lot
  y = addSection(doc, y, 'IDENTIFICATION DU LOT');
  y = addLine(doc, y, 'Lot :', vente.lotId);
  y = addLine(doc, y, 'Type :', vente.lotType.charAt(0).toUpperCase() + vente.lotType.slice(1));
  y += 5;

  // Section Vendeur
  y = addSection(doc, y, 'VENDEUR');
  y = addLine(doc, y, 'Nom :', vente.vendeur.nom);
  y = addLine(doc, y, 'Email :', vente.vendeur.email);
  y = addLine(doc, y, 'Téléphone :', vente.vendeur.telephone);
  if (vente.vendeur.impayes > 0) {
    doc.setTextColor(220, 38, 38);
    y = addLine(doc, y, 'Impayés :', `${vente.vendeur.impayes.toLocaleString('fr-FR')} €`);
    doc.setTextColor(0, 0, 0);
  } else {
    y = addLine(doc, y, 'Impayés :', 'Aucun');
  }
  y += 5;

  // Section Acquéreur
  y = addSection(doc, y, 'ACQUÉREUR');
  y = addLine(doc, y, 'Nom :', vente.acquereur.nom);
  y = addLine(doc, y, 'Email :', vente.acquereur.email);
  y = addLine(doc, y, 'Téléphone :', vente.acquereur.telephone);
  y += 5;

  // Section Dates
  y = addSection(doc, y, 'DATES PRÉVISIONNELLES');
  y = addLine(doc, y, 'Compromis :', formatDate(vente.dateCompromis));
  y = addLine(doc, y, 'Acte authentique :', vente.dateActeAuthentique ? formatDate(vente.dateActeAuthentique) : 'À définir');
  y += 10;

  // Mention légale
  doc.setFontSize(9);
  doc.setFont('helvetica', 'italic');
  doc.setTextColor(100, 100, 100);
  const mention = 'Ce document est établi en application de l\'article 10-1 de la loi n°65-557 du 10 juillet 1965. Il constitue un état préparatoire au pré-état daté et permet d\'informer l\'acquéreur des charges de copropriété.';
  const lines = doc.splitTextToSize(mention, pageWidth - 48);
  doc.text(lines, 24, y);
  y += lines.length * 5 + 10;

  // Signature avec image
  y = addSection(doc, y, 'SIGNATURE DU SYNDIC');
  y += 5;
  y = addSignatureBlock(doc, y, document);
}

// Générateur ÉTAT DATÉ
function generateEtatDate(doc: jsPDF, vente: Vente, document: VenteDocument): void {
  const pageWidth = doc.internal.pageSize.getWidth();
  const today = formatDate(new Date().toISOString());

  let y = addHeader(doc, 'ÉTAT DATÉ', `Lot ${vente.lotId}`, today);

  // Section Lot
  y = addSection(doc, y, 'IDENTIFICATION DU LOT');
  y = addLine(doc, y, 'Lot :', vente.lotId);
  y = addLine(doc, y, 'Type :', vente.lotType.charAt(0).toUpperCase() + vente.lotType.slice(1));
  y += 5;

  // Section Charges
  y = addSection(doc, y, 'ÉTAT DES CHARGES');
  y = addLine(doc, y, 'Budget prévisionnel :', '12 500,00 €');
  y = addLine(doc, y, 'Quote-part annuelle :', '1 875,00 €');
  y = addLine(doc, y, 'Charges courantes :', 'À jour');
  y = addLine(doc, y, 'Provisions exigibles :', '468,75 €');
  y += 5;

  // Section Travaux
  y = addSection(doc, y, 'TRAVAUX VOTÉS ET PROVISIONS');
  y = addLine(doc, y, 'Travaux votés :', 'Ravalement façade - 85 000,00 €');
  y = addLine(doc, y, 'Quote-part lot :', '4 250,00 €');
  y = addLine(doc, y, 'Montant versé :', '2 125,00 €');
  y = addLine(doc, y, 'Solde à verser :', '2 125,00 €');
  y += 5;

  // Section Fonds ALUR
  y = addSection(doc, y, 'FONDS DE TRAVAUX (ALUR)');
  y = addLine(doc, y, 'Montant constitué :', '1 500,00 €');
  y = addLine(doc, y, 'Cotisation annuelle :', '375,00 €');
  y += 5;

  // Section Procédures
  y = addSection(doc, y, 'PROCÉDURES EN COURS');
  y = addLine(doc, y, 'Contentieux :', 'Aucun');
  y = addLine(doc, y, 'Sinistres :', 'Aucun');
  y += 10;

  // Mention légale
  doc.setFontSize(9);
  doc.setFont('helvetica', 'italic');
  doc.setTextColor(100, 100, 100);
  const mention = 'Ce document est établi conformément aux dispositions de l\'article 5 du décret n°67-223 du 17 mars 1967. Les sommes mentionnées sont à jour à la date d\'établissement du présent état.';
  const lines = doc.splitTextToSize(mention, pageWidth - 48);
  doc.text(lines, 24, y);
  y += lines.length * 5 + 10;

  // Signature avec image
  y = addSection(doc, y, 'SIGNATURE DU SYNDIC');
  y += 5;
  y = addSignatureBlock(doc, y, document);
}

// Générateur CERTIFICAT ARTICLE 20-II
function generateCertificatArt20(doc: jsPDF, vente: Vente, document: VenteDocument): void {
  const pageWidth = doc.internal.pageSize.getWidth();
  const today = formatDate(new Date().toISOString());

  let y = addHeader(doc, 'CERTIFICAT ARTICLE 20-II', 'Attestation de non-opposition', today);

  // Section Lot
  y = addSection(doc, y, 'IDENTIFICATION DU LOT');
  y = addLine(doc, y, 'Lot :', vente.lotId);
  y = addLine(doc, y, 'Type :', vente.lotType.charAt(0).toUpperCase() + vente.lotType.slice(1));
  y += 5;

  // Section Vendeur
  y = addSection(doc, y, 'VENDEUR (COPROPRIÉTAIRE CÉDANT)');
  y = addLine(doc, y, 'Nom :', vente.vendeur.nom);
  y += 5;

  // Section Acquéreur
  y = addSection(doc, y, 'ACQUÉREUR (COPROPRIÉTAIRE CESSIONNAIRE)');
  y = addLine(doc, y, 'Nom :', vente.acquereur.nom);
  y += 10;

  // Attestation
  y = addSection(doc, y, 'ATTESTATION');
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(0, 0, 0);

  const attestation = `Le syndic de la copropriété soussigné atteste que le copropriétaire vendeur est à jour de ses charges de copropriété et qu'aucune somme n'est due au titre des charges et provisions.

En conséquence, le syndic ne fait pas opposition à la mutation du lot désigné ci-dessus, conformément aux dispositions de l'article 20 de la loi n°65-557 du 10 juillet 1965.

Ce certificat est valable pour la vente en cours et ne peut être utilisé pour aucune autre transaction.`;

  const lines = doc.splitTextToSize(attestation, pageWidth - 48);
  doc.text(lines, 24, y);
  y += lines.length * 6 + 15;

  // Signature avec image
  y = addSection(doc, y, 'SIGNATURE DU SYNDIC');
  y += 5;
  y = addSignatureBlock(doc, y, document);
}

// Générateur DIAGNOSTICS TECHNIQUES
function generateDiagnostics(doc: jsPDF, vente: Vente, document: VenteDocument): void {
  const pageWidth = doc.internal.pageSize.getWidth();
  const today = formatDate(new Date().toISOString());

  let y = addHeader(doc, 'DIAGNOSTICS TECHNIQUES', `Lot ${vente.lotId}`, today);

  // Section Lot
  y = addSection(doc, y, 'IDENTIFICATION DU LOT');
  y = addLine(doc, y, 'Lot :', vente.lotId);
  y = addLine(doc, y, 'Type :', vente.lotType.charAt(0).toUpperCase() + vente.lotType.slice(1));
  y += 5;

  // Section DPE
  y = addSection(doc, y, 'DIAGNOSTIC DE PERFORMANCE ÉNERGÉTIQUE (DPE)');
  y = addLine(doc, y, 'Classe énergie :', 'D (201-250 kWh/m²/an)');
  y = addLine(doc, y, 'Classe climat :', 'E (36-55 kg CO2/m²/an)');
  y = addLine(doc, y, 'Date de réalisation :', '15/06/2024');
  y = addLine(doc, y, 'Validité :', '10 ans');
  y += 5;

  // Section Amiante
  y = addSection(doc, y, 'DIAGNOSTIC AMIANTE');
  y = addLine(doc, y, 'Résultat :', 'Absence d\'amiante détectée');
  y = addLine(doc, y, 'Date de réalisation :', '15/06/2024');
  y += 5;

  // Section Plomb
  y = addSection(doc, y, 'DIAGNOSTIC PLOMB (CREP)');
  y = addLine(doc, y, 'Résultat :', 'Absence de plomb');
  y = addLine(doc, y, 'Date de réalisation :', '15/06/2024');
  y += 5;

  // Section Électricité
  y = addSection(doc, y, 'DIAGNOSTIC ÉLECTRICITÉ');
  y = addLine(doc, y, 'Résultat :', 'Installation conforme');
  y = addLine(doc, y, 'Anomalies :', 'Aucune');
  y = addLine(doc, y, 'Validité :', '3 ans');
  y += 5;

  // Section Gaz
  y = addSection(doc, y, 'DIAGNOSTIC GAZ');
  y = addLine(doc, y, 'Résultat :', 'Installation conforme');
  y = addLine(doc, y, 'Anomalies :', 'Aucune');
  y = addLine(doc, y, 'Validité :', '3 ans');
  y += 10;

  // Mention
  doc.setFontSize(9);
  doc.setFont('helvetica', 'italic');
  doc.setTextColor(100, 100, 100);
  doc.text('Document récapitulatif - Les rapports détaillés sont joints au dossier de vente.', 24, y);
}

// Générateur générique pour autres documents
function generateGenericDocument(doc: jsPDF, vente: Vente, document: VenteDocument): void {
  const pageWidth = doc.internal.pageSize.getWidth();
  const today = formatDate(new Date().toISOString());

  let y = addHeader(doc, document.nom.toUpperCase(), `Lot ${vente.lotId}`, today);

  // Section Lot
  y = addSection(doc, y, 'IDENTIFICATION DU LOT');
  y = addLine(doc, y, 'Lot :', vente.lotId);
  y = addLine(doc, y, 'Type :', vente.lotType.charAt(0).toUpperCase() + vente.lotType.slice(1));
  y += 5;

  // Section Vente
  y = addSection(doc, y, 'INFORMATIONS DE LA VENTE');
  y = addLine(doc, y, 'Vendeur :', vente.vendeur.nom);
  y = addLine(doc, y, 'Acquéreur :', vente.acquereur.nom);
  y = addLine(doc, y, 'Notaire :', vente.notaire.nom);
  y = addLine(doc, y, 'Date compromis :', formatDate(vente.dateCompromis));
  y += 10;

  // Section Document
  y = addSection(doc, y, 'DÉTAILS DU DOCUMENT');
  y = addLine(doc, y, 'Type :', document.nom);
  y = addLine(doc, y, 'Statut :', document.statut === 'signe' ? 'Signé' : document.statut === 'en_attente' ? 'En attente' : 'Disponible');
  if (document.dateGeneration) {
    y = addLine(doc, y, 'Généré le :', formatDate(document.dateGeneration));
  }
  if (document.signePar && document.dateSignature) {
    y = addLine(doc, y, 'Signé par :', document.signePar);
    y = addLine(doc, y, 'Date signature :', formatDate(document.dateSignature));
  }
}

// Fonction principale d'export
export function generateVenteDocumentPDF({ vente, document }: DocumentGeneratorParams): void {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();

  // Sélectionner le générateur approprié
  switch (document.type) {
    case 'pre_etat_date':
      generatePreEtatDate(doc, vente, document);
      break;
    case 'etat_date':
      generateEtatDate(doc, vente, document);
      break;
    case 'certificat_art20':
      generateCertificatArt20(doc, vente, document);
      break;
    case 'diagnostic':
      generateDiagnostics(doc, vente, document);
      break;
    default:
      generateGenericDocument(doc, vente, document);
  }

  // Pied de page
  const totalPages = doc.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(156, 163, 175);
    doc.text(`Page ${i}/${totalPages}`, pageWidth - 20, doc.internal.pageSize.getHeight() - 10, {
      align: 'right',
    });
    doc.text('Copro Manager - Document confidentiel', 20, doc.internal.pageSize.getHeight() - 10);
  }

  // Sauvegarder
  const fileName = `${document.type}_${vente.lotId.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.pdf`;
  doc.save(fileName);
}

// Fonction pour prévisualiser le document (retourne un blob URL)
export function previewVenteDocumentPDF({ vente, document }: DocumentGeneratorParams): string {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();

  // Sélectionner le générateur approprié
  switch (document.type) {
    case 'pre_etat_date':
      generatePreEtatDate(doc, vente, document);
      break;
    case 'etat_date':
      generateEtatDate(doc, vente, document);
      break;
    case 'certificat_art20':
      generateCertificatArt20(doc, vente, document);
      break;
    case 'diagnostic':
      generateDiagnostics(doc, vente, document);
      break;
    default:
      generateGenericDocument(doc, vente, document);
  }

  // Pied de page
  const totalPages = doc.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(156, 163, 175);
    doc.text(`Page ${i}/${totalPages}`, pageWidth - 20, doc.internal.pageSize.getHeight() - 10, {
      align: 'right',
    });
    doc.text('Copro Manager - Document confidentiel', 20, doc.internal.pageSize.getHeight() - 10);
  }

  // Retourner un blob URL pour l'affichage
  return doc.output('bloburl').toString();
}
