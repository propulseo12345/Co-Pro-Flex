'use client';

import { useState, useCallback, useMemo } from 'react';
import type { IEtatDate, IEtatDateRequest, TypeEtatDate } from '@/types/models/etat-date';

// Mock data pour lots et copropriétaires
const MOCK_LOTS = [
  { id: 'lot-1', numero: '101', type: 'APPARTEMENT', etage: 1, surface: 75, tantiemesGeneraux: 150, coproprietaireId: 'copro-1' },
  { id: 'lot-2', numero: '102', type: 'APPARTEMENT', etage: 1, surface: 60, tantiemesGeneraux: 120, coproprietaireId: 'copro-2' },
  { id: 'lot-3', numero: '201', type: 'APPARTEMENT', etage: 2, surface: 85, tantiemesGeneraux: 180, coproprietaireId: 'copro-3' },
  { id: 'lot-4', numero: 'P01', type: 'PARKING', surface: 12, tantiemesGeneraux: 25, coproprietaireId: 'copro-1' },
  { id: 'lot-5', numero: 'C01', type: 'CAVE', surface: 8, tantiemesGeneraux: 15, coproprietaireId: 'copro-2' },
];

const MOCK_COPROPRIETAIRES = [
  { id: 'copro-1', nom: 'DUPONT', prenom: 'Jean', email: 'jean.dupont@email.com', adresse: '12 rue de la Paix, 75001 Paris' },
  { id: 'copro-2', nom: 'MARTIN', prenom: 'Marie', email: 'marie.martin@email.com', adresse: '25 avenue des Champs, 75008 Paris' },
  { id: 'copro-3', nom: 'BERNARD', prenom: 'Pierre', email: 'pierre.bernard@email.com', adresse: '8 boulevard Haussmann, 75009 Paris' },
];

function generateMockEtatDate(request: IEtatDateRequest): IEtatDate {
  const lot = MOCK_LOTS.find(l => l.id === request.lotId);
  const copro = MOCK_COPROPRIETAIRES.find(c => c.id === request.coproprietaireId);

  if (!lot || !copro) {
    throw new Error('Lot ou copropriétaire non trouvé');
  }

  const now = new Date().toISOString();
  const tantiemesTotal = MOCK_LOTS.reduce((sum, l) => sum + l.tantiemesGeneraux, 0);
  const quotePart = lot.tantiemesGeneraux / tantiemesTotal;

  return {
    id: `etat-${Date.now()}`,
    type: request.type,
    dateGeneration: now,
    dateReference: request.dateReference,
    lot: {
      id: lot.id,
      numero: lot.numero,
      type: lot.type,
      etage: lot.etage,
      surface: lot.surface,
      tantiemesGeneraux: lot.tantiemesGeneraux,
    },
    coproprietaire: {
      id: copro.id,
      nom: copro.nom,
      prenom: copro.prenom,
      adresse: copro.adresse,
    },
    copropriete: {
      nom: 'Résidence Les Lilas',
      adresse: '15 rue des Lilas, 75011 Paris',
      syndic: 'Cabinet Immobilier Paris',
      dateCreation: '1985-03-15',
      nombreLots: MOCK_LOTS.length,
    },
    situationFinanciere: {
      soldeCompteProprietaire: -245.50,
      chargesAppelees: 3600.00,
      chargesPayees: 3354.50,
      chargesRestantes: 245.50,
      avanceTresorerie: 150.00,
      fondsTravauxVerse: 1200.00,
      fondsTravauxAppele: 1500.00,
      fondsTravauxRestant: 300.00,
    },
    budgetCourant: {
      annee: new Date().getFullYear(),
      montantTotal: 45000.00,
      quotePartLot: 45000.00 * quotePart,
    },
    travauxEnCours: [
      {
        id: 'trav-1',
        designation: 'Ravalement façade',
        montantVote: 85000.00,
        montantAppele: 42500.00,
        montantRestant: 42500.00,
        quotePartLot: 85000.00 * quotePart,
        dateAG: '2024-06-15',
      },
      {
        id: 'trav-2',
        designation: 'Réfection toiture',
        montantVote: 35000.00,
        montantAppele: 35000.00,
        montantRestant: 0,
        quotePartLot: 35000.00 * quotePart,
        dateAG: '2023-06-10',
      },
    ],
    proceduresEnCours: request.type === 'ETAT_DATE' ? [
      {
        id: 'proc-1',
        type: 'CONTENTIEUX',
        description: 'Litige avec entreprise ravalement (malfaçons)',
        montant: 12500.00,
        dateDebut: '2024-09-01',
      },
    ] : [],
    observations: request.type === 'ETAT_DATE'
      ? 'Le syndic certifie l\'exactitude des informations ci-dessus à la date de référence indiquée.'
      : 'Pré-état daté établi sans valeur contractuelle. L\'état daté définitif sera établi à la date de la vente.',
  };
}

export interface UseEtatsDateReturn {
  lots: typeof MOCK_LOTS;
  coproprietaires: typeof MOCK_COPROPRIETAIRES;
  selectedLotId: string | null;
  selectedCoproprietaireId: string | null;
  dateReference: string;
  typeDocument: TypeEtatDate;
  etatGenere: IEtatDate | null;
  isGenerating: boolean;
  error: string | null;
  setSelectedLotId: (id: string | null) => void;
  setDateReference: (date: string) => void;
  setTypeDocument: (type: TypeEtatDate) => void;
  genererEtatDate: () => Promise<void>;
  resetForm: () => void;
  exportHTML: () => string;
}

export function useEtatsDate(): UseEtatsDateReturn {
  const [selectedLotId, setSelectedLotId] = useState<string | null>(null);
  const [dateReference, setDateReference] = useState<string>(
    new Date().toISOString().split('T')[0]
  );
  const [typeDocument, setTypeDocument] = useState<TypeEtatDate>('PRE_ETAT_DATE');
  const [etatGenere, setEtatGenere] = useState<IEtatDate | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const selectedCoproprietaireId = useMemo(() => {
    if (!selectedLotId) return null;
    const lot = MOCK_LOTS.find(l => l.id === selectedLotId);
    return lot?.coproprietaireId || null;
  }, [selectedLotId]);

  const genererEtatDate = useCallback(async () => {
    if (!selectedLotId || !selectedCoproprietaireId) {
      setError('Veuillez sélectionner un lot');
      return;
    }

    setIsGenerating(true);
    setError(null);

    try {
      // Simulate async operation
      await new Promise(resolve => setTimeout(resolve, 800));

      const etat = generateMockEtatDate({
        type: typeDocument,
        lotId: selectedLotId,
        coproprietaireId: selectedCoproprietaireId,
        dateReference,
      });

      setEtatGenere(etat);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur lors de la génération');
    } finally {
      setIsGenerating(false);
    }
  }, [selectedLotId, selectedCoproprietaireId, typeDocument, dateReference]);

  const resetForm = useCallback(() => {
    setSelectedLotId(null);
    setDateReference(new Date().toISOString().split('T')[0]);
    setTypeDocument('PRE_ETAT_DATE');
    setEtatGenere(null);
    setError(null);
  }, []);

  const exportHTML = useCallback((): string => {
    if (!etatGenere) return '';

    const formatDate = (d: string) => new Date(d).toLocaleDateString('fr-FR');
    const formatMontant = (m: number) => m.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' });
    const typeLabel = etatGenere.type === 'PRE_ETAT_DATE' ? 'Pré-État Daté' : 'État Daté';

    return `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${typeLabel} - Lot ${etatGenere.lot.numero}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: 'Segoe UI', Arial, sans-serif; font-size: 12px; line-height: 1.5; color: #1a1a2e; padding: 40px; max-width: 210mm; margin: 0 auto; }
    h1 { font-size: 22px; color: #2563eb; text-align: center; margin-bottom: 8px; text-transform: uppercase; letter-spacing: 1px; }
    h2 { font-size: 14px; color: #475569; border-bottom: 2px solid #2563eb; padding-bottom: 6px; margin: 24px 0 12px; text-transform: uppercase; }
    h3 { font-size: 12px; color: #64748b; margin: 12px 0 8px; }
    .header { text-align: center; margin-bottom: 32px; padding-bottom: 16px; border-bottom: 3px double #e2e8f0; }
    .subtitle { color: #64748b; font-size: 13px; }
    .date-ref { background: #f8fafc; padding: 8px 16px; border-radius: 4px; display: inline-block; margin-top: 8px; font-weight: 600; }
    .section { margin-bottom: 20px; }
    .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-bottom: 16px; }
    .card { background: #f8fafc; padding: 12px 16px; border-radius: 6px; border-left: 3px solid #2563eb; }
    .card-title { font-weight: 600; color: #334155; font-size: 11px; text-transform: uppercase; margin-bottom: 4px; }
    .card-value { font-size: 13px; color: #1e293b; }
    table { width: 100%; border-collapse: collapse; margin: 12px 0; }
    th { background: #f1f5f9; padding: 10px 12px; text-align: left; font-size: 11px; text-transform: uppercase; color: #475569; border-bottom: 2px solid #cbd5e1; }
    td { padding: 10px 12px; border-bottom: 1px solid #e2e8f0; }
    .text-right { text-align: right; }
    .text-center { text-align: center; }
    .montant { font-family: 'Consolas', monospace; font-weight: 600; }
    .montant-positif { color: #16a34a; }
    .montant-negatif { color: #dc2626; }
    .total-row { background: #f1f5f9; font-weight: 600; }
    .observations { background: #fffbeb; padding: 16px; border-radius: 6px; border-left: 4px solid #f59e0b; margin-top: 20px; font-style: italic; }
    .footer { margin-top: 40px; padding-top: 20px; border-top: 2px solid #e2e8f0; display: flex; justify-content: space-between; }
    .signature-block { width: 45%; }
    .signature-line { border-bottom: 1px solid #334155; margin-top: 60px; }
    .signature-label { font-size: 11px; color: #64748b; margin-top: 4px; }
    @media print { body { padding: 20px; } @page { margin: 15mm; } }
  </style>
</head>
<body>
  <div class="header">
    <h1>${typeLabel}</h1>
    <p class="subtitle">Article 10-1 du décret n° 67-223 du 17 mars 1967</p>
    <p class="date-ref">Date de référence : ${formatDate(etatGenere.dateReference)}</p>
  </div>

  <div class="section">
    <h2>1. Identification du lot</h2>
    <div class="grid">
      <div class="card">
        <div class="card-title">Lot n°</div>
        <div class="card-value">${etatGenere.lot.numero} - ${etatGenere.lot.type}</div>
      </div>
      <div class="card">
        <div class="card-title">Tantièmes généraux</div>
        <div class="card-value">${etatGenere.lot.tantiemesGeneraux} / 1000</div>
      </div>
      ${etatGenere.lot.surface ? `<div class="card"><div class="card-title">Surface</div><div class="card-value">${etatGenere.lot.surface} m²</div></div>` : ''}
      ${etatGenere.lot.etage !== undefined ? `<div class="card"><div class="card-title">Étage</div><div class="card-value">${etatGenere.lot.etage === 0 ? 'RDC' : etatGenere.lot.etage}</div></div>` : ''}
    </div>
  </div>

  <div class="section">
    <h2>2. Identification du copropriétaire vendeur</h2>
    <div class="grid">
      <div class="card">
        <div class="card-title">Nom</div>
        <div class="card-value">${etatGenere.coproprietaire.prenom} ${etatGenere.coproprietaire.nom}</div>
      </div>
      <div class="card">
        <div class="card-title">Adresse</div>
        <div class="card-value">${etatGenere.coproprietaire.adresse || 'Non renseignée'}</div>
      </div>
    </div>
  </div>

  <div class="section">
    <h2>3. Identification de la copropriété</h2>
    <div class="grid">
      <div class="card">
        <div class="card-title">Nom</div>
        <div class="card-value">${etatGenere.copropriete.nom}</div>
      </div>
      <div class="card">
        <div class="card-title">Adresse</div>
        <div class="card-value">${etatGenere.copropriete.adresse}</div>
      </div>
      <div class="card">
        <div class="card-title">Syndic</div>
        <div class="card-value">${etatGenere.copropriete.syndic}</div>
      </div>
      <div class="card">
        <div class="card-title">Nombre de lots</div>
        <div class="card-value">${etatGenere.copropriete.nombreLots}</div>
      </div>
    </div>
  </div>

  <div class="section">
    <h2>4. Situation financière du copropriétaire vendeur</h2>
    <table>
      <thead>
        <tr>
          <th>Désignation</th>
          <th class="text-right">Montant</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td>Charges appelées (exercice en cours)</td>
          <td class="text-right montant">${formatMontant(etatGenere.situationFinanciere.chargesAppelees)}</td>
        </tr>
        <tr>
          <td>Charges payées</td>
          <td class="text-right montant montant-positif">${formatMontant(etatGenere.situationFinanciere.chargesPayees)}</td>
        </tr>
        <tr>
          <td>Charges restant dues</td>
          <td class="text-right montant ${etatGenere.situationFinanciere.chargesRestantes > 0 ? 'montant-negatif' : ''}">${formatMontant(etatGenere.situationFinanciere.chargesRestantes)}</td>
        </tr>
        <tr>
          <td>Avance de trésorerie</td>
          <td class="text-right montant">${formatMontant(etatGenere.situationFinanciere.avanceTresorerie)}</td>
        </tr>
        <tr class="total-row">
          <td>Solde du compte copropriétaire</td>
          <td class="text-right montant ${etatGenere.situationFinanciere.soldeCompteProprietaire >= 0 ? 'montant-positif' : 'montant-negatif'}">${formatMontant(etatGenere.situationFinanciere.soldeCompteProprietaire)}</td>
        </tr>
      </tbody>
    </table>

    <h3>Fonds travaux (article 14-2 loi du 10 juillet 1965)</h3>
    <table>
      <thead>
        <tr>
          <th>Désignation</th>
          <th class="text-right">Montant</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td>Montant appelé</td>
          <td class="text-right montant">${formatMontant(etatGenere.situationFinanciere.fondsTravauxAppele)}</td>
        </tr>
        <tr>
          <td>Montant versé</td>
          <td class="text-right montant montant-positif">${formatMontant(etatGenere.situationFinanciere.fondsTravauxVerse)}</td>
        </tr>
        <tr class="total-row">
          <td>Reste à verser</td>
          <td class="text-right montant ${etatGenere.situationFinanciere.fondsTravauxRestant > 0 ? 'montant-negatif' : ''}">${formatMontant(etatGenere.situationFinanciere.fondsTravauxRestant)}</td>
        </tr>
      </tbody>
    </table>
  </div>

  <div class="section">
    <h2>5. Budget prévisionnel</h2>
    <table>
      <thead>
        <tr>
          <th>Exercice</th>
          <th class="text-right">Budget total</th>
          <th class="text-right">Quote-part du lot</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td>${etatGenere.budgetCourant.annee}</td>
          <td class="text-right montant">${formatMontant(etatGenere.budgetCourant.montantTotal)}</td>
          <td class="text-right montant">${formatMontant(etatGenere.budgetCourant.quotePartLot)}</td>
        </tr>
      </tbody>
    </table>
  </div>

  ${etatGenere.travauxEnCours.length > 0 ? `
  <div class="section">
    <h2>6. Travaux votés</h2>
    <table>
      <thead>
        <tr>
          <th>Désignation</th>
          <th class="text-center">Date AG</th>
          <th class="text-right">Montant voté</th>
          <th class="text-right">Quote-part lot</th>
          <th class="text-right">Reste à appeler</th>
        </tr>
      </thead>
      <tbody>
        ${etatGenere.travauxEnCours.map(t => `
        <tr>
          <td>${t.designation}</td>
          <td class="text-center">${formatDate(t.dateAG)}</td>
          <td class="text-right montant">${formatMontant(t.montantVote)}</td>
          <td class="text-right montant">${formatMontant(t.quotePartLot)}</td>
          <td class="text-right montant">${formatMontant(t.montantRestant)}</td>
        </tr>
        `).join('')}
      </tbody>
    </table>
  </div>
  ` : ''}

  ${etatGenere.proceduresEnCours.length > 0 ? `
  <div class="section">
    <h2>7. Procédures en cours</h2>
    <table>
      <thead>
        <tr>
          <th>Type</th>
          <th>Description</th>
          <th class="text-center">Date début</th>
          <th class="text-right">Montant</th>
        </tr>
      </thead>
      <tbody>
        ${etatGenere.proceduresEnCours.map(p => `
        <tr>
          <td>${p.type}</td>
          <td>${p.description}</td>
          <td class="text-center">${formatDate(p.dateDebut)}</td>
          <td class="text-right montant">${p.montant ? formatMontant(p.montant) : '-'}</td>
        </tr>
        `).join('')}
      </tbody>
    </table>
  </div>
  ` : ''}

  ${etatGenere.observations ? `
  <div class="observations">
    <strong>Observations :</strong><br>
    ${etatGenere.observations}
  </div>
  ` : ''}

  <div class="footer">
    <div class="signature-block">
      <p>Fait à Paris, le ${formatDate(etatGenere.dateGeneration)}</p>
      <div class="signature-line"></div>
      <p class="signature-label">Le Syndic</p>
    </div>
    <div class="signature-block text-right">
      <p>Document généré par CoProFlex</p>
      <p class="signature-label">Réf: ${etatGenere.id}</p>
    </div>
  </div>
</body>
</html>`;
  }, [etatGenere]);

  return {
    lots: MOCK_LOTS,
    coproprietaires: MOCK_COPROPRIETAIRES,
    selectedLotId,
    selectedCoproprietaireId,
    dateReference,
    typeDocument,
    etatGenere,
    isGenerating,
    error,
    setSelectedLotId,
    setDateReference,
    setTypeDocument,
    genererEtatDate,
    resetForm,
    exportHTML,
  };
}
