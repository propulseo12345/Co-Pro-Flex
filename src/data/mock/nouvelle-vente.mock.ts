export interface DocumentOption {
  id: string;
  nom: string;
  description: string;
  obligatoire: boolean;
}

export const MOCK_COPROPRIETAIRES = [
  { id: '1', nom: 'Martin DUPONT', lots: ['Lot 10', 'Lot 15'], email: 'martin.dupont@email.com', telephone: '06 12 34 56 78' },
  { id: '2', nom: 'Sophie LEBLANC', lots: ['Lot 8'], email: 'sophie.leblanc@email.com', telephone: '06 23 45 67 89' },
  { id: '3', nom: 'Pierre MARTIN', lots: ['Lot 22'], email: 'pierre.martin@email.com', telephone: '06 34 56 78 90' },
  { id: '4', nom: 'Claire ROUSSEAU', lots: ['Lot 5', 'Lot 12'], email: 'claire.rousseau@email.com', telephone: '06 45 67 89 01' }
];

export const MOCK_LOTS = [
  { id: 'Lot 5', type: 'appartement', proprietaire: 'Claire ROUSSEAU', tantiemes: 150 },
  { id: 'Lot 8', type: 'parking', proprietaire: 'Sophie LEBLANC', tantiemes: 25 },
  { id: 'Lot 10', type: 'appartement', proprietaire: 'Martin DUPONT', tantiemes: 180 },
  { id: 'Lot 12', type: 'cave', proprietaire: 'Claire ROUSSEAU', tantiemes: 15 },
  { id: 'Lot 15', type: 'appartement', proprietaire: 'Martin DUPONT', tantiemes: 200 },
  { id: 'Lot 22', type: 'cave', proprietaire: 'Pierre MARTIN', tantiemes: 20 }
];

export const MOCK_NOTAIRES = [
  { id: '1', nom: 'Me. BERNARD', email: 'bernard@notaire.fr', telephone: '01 23 45 67 89', adresse: '15 rue des Notaires, 75001 Paris' },
  { id: '2', nom: 'Me. DUBOIS', email: 'dubois@notaire.fr', telephone: '01 23 45 67 90', adresse: '28 avenue du Droit, 75002 Paris' },
  { id: '3', nom: 'Me. MOREAU', email: 'moreau@notaire.fr', telephone: '01 23 45 67 91', adresse: '42 boulevard Justice, 75003 Paris' }
];

export const MOCK_ORDRES_SERVICE = [
  { id: '1', titre: 'Réparation toiture - Lot 10', date: '2025-10-15', statut: 'CLOTURE' },
  { id: '2', titre: 'Plomberie salle de bain - Lot 15', date: '2025-09-20', statut: 'EN_COURS' },
  { id: '3', titre: 'Électricité tableau - Lot 10', date: '2025-08-10', statut: 'CLOTURE' },
  { id: '4', titre: 'Serrure porte cave - Lot 12', date: '2025-11-05', statut: 'CLOTURE' }
];

export const DOCUMENTS_DISPONIBLES: DocumentOption[] = [
  { id: 'pre_etat_date', nom: 'Pré-état daté', description: 'Document préparatoire pour le compromis', obligatoire: true },
  { id: 'etat_date', nom: 'État daté', description: 'État des charges et provisions', obligatoire: true },
  { id: 'certificat_art20', nom: 'Certificat article 20', description: 'Certificat de non-opposition à la vente', obligatoire: true },
  { id: 'carnet_entretien', nom: 'Carnet d\'entretien', description: 'Historique des travaux et entretiens', obligatoire: false },
  { id: 'reglement_copro', nom: 'Règlement de copropriété', description: 'Règlement et ses modificatifs', obligatoire: false },
  { id: 'pv_ag', nom: 'PV des 3 dernières AG', description: 'Procès-verbaux des assemblées générales', obligatoire: false },
  { id: 'diagnostics', nom: 'Diagnostics techniques', description: 'DPE, amiante, plomb, etc.', obligatoire: false }
];
