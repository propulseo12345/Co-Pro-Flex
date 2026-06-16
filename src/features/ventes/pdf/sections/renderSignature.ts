import { jsPDF } from 'jspdf';
import { PDF } from '../pdfLayout';
import { fmtEuro } from '../helpers/formatters';
import type { EtatDatePayloadV2 } from '../../domain/types';

/**
 * « Fait à <lieu>, le <date> » — date d'effet de l'état daté. Si le lieu (adresse du syndic) est
 * inconnu, on n'invente PAS de ville (mention juridiquement opposable) : « Fait le <date> ».
 */
function mentionSignature(lieu: string | null, dateStr: string): string {
  const d = new Date(dateStr);
  const dateFmt = Number.isNaN(d.getTime())
    ? dateStr
    : d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });
  return lieu && lieu.trim() !== '' ? `Fait à ${lieu}, le ${dateFmt}` : `Fait le ${dateFmt}`;
}

/**
 * Bloc signature du syndic — version V2 (texte seul, sans image : le PDF est généré AVANT la
 * signature physique). On affiche le nom du syndic, la mention « Fait à…, le… » et une zone de
 * signature vierge à signer/cacheter.
 */
export function addSignatureBlock(
  doc: jsPDF,
  y: number,
  syndic: EtatDatePayloadV2['syndic'],
  effectiveDate: string,
): number {
  const pageWidth = doc.internal.pageSize.getWidth();
  const name = syndic?.name && syndic.name.trim() !== '' ? syndic.name : 'Le syndic';
  const lieu = syndic?.address && syndic.address.trim() !== '' ? syndic.address : null;

  doc.setFontSize(PDF.fonts.body);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(PDF.colors.text[0], PDF.colors.text[1], PDF.colors.text[2]);
  doc.text(name, PDF.margin.left, y);
  y += 5;

  doc.setFontSize(PDF.fonts.small);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(PDF.colors.textLight[0], PDF.colors.textLight[1], PDF.colors.textLight[2]);
  doc.text('Syndic de copropriété', PDF.margin.left, y);
  y += 5;

  doc.setFont('helvetica', 'italic');
  doc.text(mentionSignature(lieu, effectiveDate), PDF.margin.left, y);
  y += 14;

  // Zone de signature vierge (le syndic signe après génération).
  doc.setDrawColor(180, 180, 180);
  doc.setLineWidth(0.4);
  doc.line(pageWidth - 90, y, pageWidth - PDF.margin.right, y);
  y += 5;
  doc.setFontSize(PDF.fonts.tiny);
  doc.setTextColor(150, 150, 150);
  doc.text('Signature et cachet du syndic', pageWidth - 90, y);

  return y + 8;
}

/**
 * Certificat — état des sommes dues (Art. 20-II, loi n°65-557). Nouvelle page.
 *
 * L'attestation est CONDITIONNELLE au solde réel (Partie 1 du payload = sommes dues PAR le vendeur) :
 * non-opposition uniquement si rien n'est dû ; sinon mention des sommes restant dues + droit
 * d'opposition. On ne certifie JAMAIS à tort que le vendeur est à jour.
 */
export function renderCertificatArt20(doc: jsPDF, payload: EtatDatePayloadV2): number {
  doc.addPage();
  const pageWidth = doc.internal.pageSize.getWidth();
  let y = PDF.margin.top;

  // Titre
  doc.setFontSize(PDF.fonts.subtitle);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(PDF.colors.primary[0], PDF.colors.primary[1], PDF.colors.primary[2]);
  doc.text('CERTIFICAT — ÉTAT DES SOMMES DUES (Art. 20-II, loi n°65-557)', pageWidth / 2, y, {
    align: 'center',
  });
  y += 12;

  const section = (title: string) => {
    doc.setFillColor(PDF.colors.bgSection[0], PDF.colors.bgSection[1], PDF.colors.bgSection[2]);
    doc.rect(PDF.margin.left, y, PDF.contentWidth, 8, 'F');
    doc.setFontSize(PDF.fonts.sectionTitle);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(PDF.colors.primary[0], PDF.colors.primary[1], PDF.colors.primary[2]);
    doc.text(title, PDF.margin.left + 3, y + 6);
    y += 14;
  };
  const line = (label: string, value: string) => {
    doc.setFontSize(PDF.fonts.body);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(PDF.colors.text[0], PDF.colors.text[1], PDF.colors.text[2]);
    doc.text(label, PDF.margin.left + 3, y);
    doc.setFont('helvetica', 'normal');
    doc.text(value, PDF.margin.left + 55, y);
    y += 7;
  };

  // Lot
  section('IDENTIFICATION DU LOT');
  line('Lot :', payload.lot.ref ?? '-');
  line('Type :', payload.lot.type ?? '-');
  y += 3;

  // Cédant(s) — tous les propriétaires actifs du lot (H2 multi-cédants).
  section('VENDEUR(S) — COPROPRIÉTAIRE(S) CÉDANT(S)');
  if (payload.cedants.length === 0) {
    line('Nom :', payload.seller.name ?? '-');
  } else {
    for (const c of payload.cedants) {
      line('Nom :', `${c.nom} (${c.share_percent} %)`);
    }
  }
  y += 3;

  // Acquéreur — non confirmé à la génération de l'état daté.
  section('ACQUÉREUR — COPROPRIÉTAIRE CESSIONNAIRE');
  line('Nom :', "En attente de confirmation de l'acquéreur");
  y += 5;

  // Attestation conditionnelle au solde réel.
  section('ATTESTATION DU SYNDIC');
  doc.setFontSize(PDF.fonts.body);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(PDF.colors.text[0], PDF.colors.text[1], PDF.colors.text[2]);

  const due = payload.partie_1_sommes_dues_vendeur.total;
  const attestation =
    due > 0.005
      ? `Le syndic de la copropriété soussigné déclare que le copropriétaire cédant reste devoir la somme de ${fmtEuro(
          due,
        )} au titre des charges et provisions exigibles à la date d'effet.\n\nConformément à l'article 20-II de la loi n°65-557 du 10 juillet 1965, le syndic pourra former opposition au versement des fonds entre les mains du notaire afin d'obtenir le paiement des sommes restant dues.\n\nLe présent certificat est valable pour la mutation en cours et ne peut être utilisé pour aucune autre transaction.`
      : `Le syndic de la copropriété soussigné atteste qu'aucune somme n'est due par le copropriétaire cédant au titre des charges et provisions exigibles à la date d'effet.\n\nEn conséquence, le syndic ne forme pas opposition au versement des fonds, conformément à l'article 20-II de la loi n°65-557 du 10 juillet 1965.\n\nLe présent certificat est valable pour la mutation en cours et ne peut être utilisé pour aucune autre transaction.`;

  const lines = doc.splitTextToSize(attestation, PDF.contentWidth - 6);
  doc.text(lines, PDF.margin.left + 3, y);
  y += lines.length * 5 + 12;

  // Garde de pagination : le bloc signature (~55 mm) ne doit pas déborder en bas de page
  // (cas multi-cédants + texte débiteur long). Sinon, nouvelle page.
  const pageH = doc.internal.pageSize.getHeight();
  if (y + 55 > pageH - PDF.margin.bottom) {
    doc.addPage();
    y = PDF.margin.top;
  }

  // Signature du syndic.
  section('SIGNATURE DU SYNDIC');
  y += 2;
  y = addSignatureBlock(doc, y, payload.syndic, payload.effective_date);

  return y;
}
