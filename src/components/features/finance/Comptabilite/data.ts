import { TypeDepense, OperationComptable, Depense, HistoriqueModification, MouvementNonCategorise, EtatCloture, LigneAnnexe1, LigneAnnexe2, LigneAnnexe3, LigneAnnexe4, LigneAnnexe5 } from './types';

export const TYPE_DEPENSE_LABELS: Record<TypeDepense, string> = {
  eau: 'Eau',
  electricite: 'Électricité',
  entretien: 'Entretien',
  assurance: 'Assurance',
  travaux: 'Travaux',
  menage: 'Ménage',
  ascenseur: 'Ascenseur',
  divers: 'Divers'
};

/**
 * Grand Livre Complet - Exercice 2024
 * Toutes les classes de comptes (1 à 7) avec écritures équilibrées en partie double
 */
export const MOCK_OPERATIONS: OperationComptable[] = [
  // ============================================
  // JANVIER 2024 - Ouverture exercice
  // ============================================
  // Report à nouveau des provisions
  { id: 'GL-001', date: '2024-01-01', libelle: 'A NOUVEAU - Report provisions travaux', compte: '102', compteLabel: 'Provisions pour travaux', typeCompte: 'PASSIF', debit: 0, credit: 25000.00, numeroPiece: 'AN-2024-001' },
  { id: 'GL-002', date: '2024-01-01', libelle: 'A NOUVEAU - Report fonds ALUR', compte: '105', compteLabel: 'Fonds de travaux ALUR', typeCompte: 'PASSIF', debit: 0, credit: 15000.00, numeroPiece: 'AN-2024-001' },
  { id: 'GL-003', date: '2024-01-01', libelle: 'A NOUVEAU - Report solde banque', compte: '512', compteLabel: 'Banque', typeCompte: 'ACTIF', debit: 42500.00, credit: 0, numeroPiece: 'AN-2024-001' },
  { id: 'GL-004', date: '2024-01-01', libelle: 'A NOUVEAU - Créances copropriétaires', compte: '450', compteLabel: 'Copropriétaires - Créances', typeCompte: 'ACTIF', debit: 3200.00, credit: 0, numeroPiece: 'AN-2024-001' },
  { id: 'GL-005', date: '2024-01-01', libelle: 'A NOUVEAU - Dette fournisseur Otis', compte: '401', compteLabel: 'Fournisseurs', typeCompte: 'PASSIF', debit: 0, credit: 5700.00, numeroPiece: 'AN-2024-001' },

  // Appel de fonds T1 2024
  { id: 'GL-006', date: '2024-01-05', libelle: 'APPEL DE FONDS T1 2024 - LEBLANC Marie Lot 1', compte: '450', compteLabel: 'Copropriétaires - Créances', typeCompte: 'ACTIF', debit: 1250.00, credit: 0, numeroPiece: 'AF-2024-T1-001' },
  { id: 'GL-007', date: '2024-01-05', libelle: 'APPEL DE FONDS T1 2024 - LEBLANC Marie Lot 1', compte: '701', compteLabel: 'Appels de fonds', typeCompte: 'PRODUIT', debit: 0, credit: 1250.00, numeroPiece: 'AF-2024-T1-001' },
  { id: 'GL-008', date: '2024-01-05', libelle: 'APPEL DE FONDS T1 2024 - MOREAU Pierre Lot 2', compte: '450', compteLabel: 'Copropriétaires - Créances', typeCompte: 'ACTIF', debit: 1100.00, credit: 0, numeroPiece: 'AF-2024-T1-002' },
  { id: 'GL-009', date: '2024-01-05', libelle: 'APPEL DE FONDS T1 2024 - MOREAU Pierre Lot 2', compte: '701', compteLabel: 'Appels de fonds', typeCompte: 'PRODUIT', debit: 0, credit: 1100.00, numeroPiece: 'AF-2024-T1-002' },
  { id: 'GL-010', date: '2024-01-05', libelle: 'APPEL DE FONDS T1 2024 - LAURENT Sophie Lot 3', compte: '450', compteLabel: 'Copropriétaires - Créances', typeCompte: 'ACTIF', debit: 1500.00, credit: 0, numeroPiece: 'AF-2024-T1-003' },
  { id: 'GL-011', date: '2024-01-05', libelle: 'APPEL DE FONDS T1 2024 - LAURENT Sophie Lot 3', compte: '701', compteLabel: 'Appels de fonds', typeCompte: 'PRODUIT', debit: 0, credit: 1500.00, numeroPiece: 'AF-2024-T1-003' },
  { id: 'GL-012', date: '2024-01-05', libelle: 'APPEL DE FONDS T1 2024 - DUBOIS Jean Lot 4', compte: '450', compteLabel: 'Copropriétaires - Créances', typeCompte: 'ACTIF', debit: 980.00, credit: 0, numeroPiece: 'AF-2024-T1-004' },
  { id: 'GL-013', date: '2024-01-05', libelle: 'APPEL DE FONDS T1 2024 - DUBOIS Jean Lot 4', compte: '701', compteLabel: 'Appels de fonds', typeCompte: 'PRODUIT', debit: 0, credit: 980.00, numeroPiece: 'AF-2024-T1-004' },
  { id: 'GL-014', date: '2024-01-05', libelle: 'APPEL DE FONDS T1 2024 - MARTIN Anne Lot 5', compte: '450', compteLabel: 'Copropriétaires - Créances', typeCompte: 'ACTIF', debit: 1350.00, credit: 0, numeroPiece: 'AF-2024-T1-005' },
  { id: 'GL-015', date: '2024-01-05', libelle: 'APPEL DE FONDS T1 2024 - MARTIN Anne Lot 5', compte: '701', compteLabel: 'Appels de fonds', typeCompte: 'PRODUIT', debit: 0, credit: 1350.00, numeroPiece: 'AF-2024-T1-005' },

  // Appel fonds ALUR T1
  { id: 'GL-016', date: '2024-01-05', libelle: 'APPEL FONDS ALUR T1 2024 - Tous copropriétaires', compte: '450', compteLabel: 'Copropriétaires - Créances', typeCompte: 'ACTIF', debit: 1550.00, credit: 0, numeroPiece: 'AF-ALUR-2024-T1' },
  { id: 'GL-017', date: '2024-01-05', libelle: 'APPEL FONDS ALUR T1 2024 - Tous copropriétaires', compte: '703', compteLabel: 'Fonds de travaux ALUR', typeCompte: 'PRODUIT', debit: 0, credit: 1550.00, numeroPiece: 'AF-ALUR-2024-T1' },

  // Encaissements T1
  { id: 'GL-018', date: '2024-01-15', libelle: 'VIR LEBLANC MARIE AF T1', compte: '512', compteLabel: 'Banque', typeCompte: 'ACTIF', debit: 1560.00, credit: 0, mouvementBancaireLie: 'MB-2024-001' },
  { id: 'GL-019', date: '2024-01-15', libelle: 'VIR LEBLANC MARIE AF T1', compte: '450', compteLabel: 'Copropriétaires - Créances', typeCompte: 'ACTIF', debit: 0, credit: 1560.00, mouvementBancaireLie: 'MB-2024-001' },
  { id: 'GL-020', date: '2024-01-18', libelle: 'VIR MOREAU PIERRE AF T1', compte: '512', compteLabel: 'Banque', typeCompte: 'ACTIF', debit: 1410.00, credit: 0, mouvementBancaireLie: 'MB-2024-002' },
  { id: 'GL-021', date: '2024-01-18', libelle: 'VIR MOREAU PIERRE AF T1', compte: '450', compteLabel: 'Copropriétaires - Créances', typeCompte: 'ACTIF', debit: 0, credit: 1410.00, mouvementBancaireLie: 'MB-2024-002' },
  { id: 'GL-022', date: '2024-01-20', libelle: 'VIR LAURENT SOPHIE AF T1', compte: '512', compteLabel: 'Banque', typeCompte: 'ACTIF', debit: 1810.00, credit: 0, mouvementBancaireLie: 'MB-2024-003' },
  { id: 'GL-023', date: '2024-01-20', libelle: 'VIR LAURENT SOPHIE AF T1', compte: '450', compteLabel: 'Copropriétaires - Créances', typeCompte: 'ACTIF', debit: 0, credit: 1810.00, mouvementBancaireLie: 'MB-2024-003' },

  // Facture EDF Janvier
  { id: 'GL-024', date: '2024-01-25', libelle: 'FACTURE EDF - Électricité parties communes Janvier', compte: '606', compteLabel: 'Eau et électricité', typeCompte: 'CHARGE', debit: 485.60, credit: 0, factureLiee: 'FAC-EDF-2024-001', numeroPiece: 'FAC-001' },
  { id: 'GL-025', date: '2024-01-25', libelle: 'FACTURE EDF - Électricité parties communes Janvier', compte: '401', compteLabel: 'Fournisseurs', typeCompte: 'PASSIF', debit: 0, credit: 485.60, factureLiee: 'FAC-EDF-2024-001', numeroPiece: 'FAC-001' },

  // Paiement fournisseur Otis (dette N-1)
  { id: 'GL-026', date: '2024-01-28', libelle: 'PAIEMENT OTIS - Facture maintenance 2023', compte: '401', compteLabel: 'Fournisseurs', typeCompte: 'PASSIF', debit: 5700.00, credit: 0, mouvementBancaireLie: 'MB-2024-004', numeroPiece: 'REG-001' },
  { id: 'GL-027', date: '2024-01-28', libelle: 'PAIEMENT OTIS - Facture maintenance 2023', compte: '512', compteLabel: 'Banque', typeCompte: 'ACTIF', debit: 0, credit: 5700.00, mouvementBancaireLie: 'MB-2024-004', numeroPiece: 'REG-001' },

  // ============================================
  // FÉVRIER 2024
  // ============================================
  { id: 'GL-028', date: '2024-02-05', libelle: 'VIR DUBOIS JEAN AF T1', compte: '512', compteLabel: 'Banque', typeCompte: 'ACTIF', debit: 1290.00, credit: 0, mouvementBancaireLie: 'MB-2024-005' },
  { id: 'GL-029', date: '2024-02-05', libelle: 'VIR DUBOIS JEAN AF T1', compte: '450', compteLabel: 'Copropriétaires - Créances', typeCompte: 'ACTIF', debit: 0, credit: 1290.00, mouvementBancaireLie: 'MB-2024-005' },
  { id: 'GL-030', date: '2024-02-08', libelle: 'VIR MARTIN ANNE AF T1', compte: '512', compteLabel: 'Banque', typeCompte: 'ACTIF', debit: 1660.00, credit: 0, mouvementBancaireLie: 'MB-2024-006' },
  { id: 'GL-031', date: '2024-02-08', libelle: 'VIR MARTIN ANNE AF T1', compte: '450', compteLabel: 'Copropriétaires - Créances', typeCompte: 'ACTIF', debit: 0, credit: 1660.00, mouvementBancaireLie: 'MB-2024-006' },

  // Facture Veolia Eau
  { id: 'GL-032', date: '2024-02-10', libelle: 'FACTURE VEOLIA - Eau parties communes', compte: '606', compteLabel: 'Eau et électricité', typeCompte: 'CHARGE', debit: 892.30, credit: 0, factureLiee: 'FAC-VEO-2024-001', numeroPiece: 'FAC-002' },
  { id: 'GL-033', date: '2024-02-10', libelle: 'FACTURE VEOLIA - Eau parties communes', compte: '401', compteLabel: 'Fournisseurs', typeCompte: 'PASSIF', debit: 0, credit: 892.30, factureLiee: 'FAC-VEO-2024-001', numeroPiece: 'FAC-002' },

  // Paiement EDF
  { id: 'GL-034', date: '2024-02-15', libelle: 'PAIEMENT EDF - Facture Janvier', compte: '401', compteLabel: 'Fournisseurs', typeCompte: 'PASSIF', debit: 485.60, credit: 0, mouvementBancaireLie: 'MB-2024-007', numeroPiece: 'REG-002' },
  { id: 'GL-035', date: '2024-02-15', libelle: 'PAIEMENT EDF - Facture Janvier', compte: '512', compteLabel: 'Banque', typeCompte: 'ACTIF', debit: 0, credit: 485.60, mouvementBancaireLie: 'MB-2024-007', numeroPiece: 'REG-002' },

  // Honoraires syndic T1
  { id: 'GL-036', date: '2024-02-20', libelle: 'HONORAIRES SYNDIC T1 2024 - Cabinet Dupont', compte: '622', compteLabel: 'Honoraires syndic', typeCompte: 'CHARGE', debit: 1850.00, credit: 0, factureLiee: 'FAC-SYN-2024-T1', numeroPiece: 'FAC-003' },
  { id: 'GL-037', date: '2024-02-20', libelle: 'HONORAIRES SYNDIC T1 2024 - Cabinet Dupont', compte: '401', compteLabel: 'Fournisseurs', typeCompte: 'PASSIF', debit: 0, credit: 1850.00, factureLiee: 'FAC-SYN-2024-T1', numeroPiece: 'FAC-003' },

  // ============================================
  // MARS 2024
  // ============================================
  // Facture ménage
  { id: 'GL-038', date: '2024-03-01', libelle: 'FACTURE CLEANPRO - Ménage parties communes Fév', compte: '614', compteLabel: 'Charges de personnel extérieur', typeCompte: 'CHARGE', debit: 450.00, credit: 0, factureLiee: 'FAC-CLP-2024-002', numeroPiece: 'FAC-004' },
  { id: 'GL-039', date: '2024-03-01', libelle: 'FACTURE CLEANPRO - Ménage parties communes Fév', compte: '401', compteLabel: 'Fournisseurs', typeCompte: 'PASSIF', debit: 0, credit: 450.00, factureLiee: 'FAC-CLP-2024-002', numeroPiece: 'FAC-004' },

  // Paiement Veolia
  { id: 'GL-040', date: '2024-03-05', libelle: 'PAIEMENT VEOLIA - Facture Eau', compte: '401', compteLabel: 'Fournisseurs', typeCompte: 'PASSIF', debit: 892.30, credit: 0, mouvementBancaireLie: 'MB-2024-008', numeroPiece: 'REG-003' },
  { id: 'GL-041', date: '2024-03-05', libelle: 'PAIEMENT VEOLIA - Facture Eau', compte: '512', compteLabel: 'Banque', typeCompte: 'ACTIF', debit: 0, credit: 892.30, mouvementBancaireLie: 'MB-2024-008', numeroPiece: 'REG-003' },

  // Paiement honoraires syndic
  { id: 'GL-042', date: '2024-03-10', libelle: 'PAIEMENT SYNDIC - Honoraires T1', compte: '401', compteLabel: 'Fournisseurs', typeCompte: 'PASSIF', debit: 1850.00, credit: 0, mouvementBancaireLie: 'MB-2024-009', numeroPiece: 'REG-004' },
  { id: 'GL-043', date: '2024-03-10', libelle: 'PAIEMENT SYNDIC - Honoraires T1', compte: '512', compteLabel: 'Banque', typeCompte: 'ACTIF', debit: 0, credit: 1850.00, mouvementBancaireLie: 'MB-2024-009', numeroPiece: 'REG-004' },

  // Frais bancaires T1
  { id: 'GL-044', date: '2024-03-31', libelle: 'FRAIS BANCAIRES T1 2024 - BNP Paribas', compte: '627', compteLabel: 'Services bancaires', typeCompte: 'CHARGE', debit: 45.00, credit: 0, numeroPiece: 'OD-001' },
  { id: 'GL-045', date: '2024-03-31', libelle: 'FRAIS BANCAIRES T1 2024 - BNP Paribas', compte: '512', compteLabel: 'Banque', typeCompte: 'ACTIF', debit: 0, credit: 45.00, numeroPiece: 'OD-001' },

  // Paiement CleanPro
  { id: 'GL-046', date: '2024-03-15', libelle: 'PAIEMENT CLEANPRO - Ménage Fév', compte: '401', compteLabel: 'Fournisseurs', typeCompte: 'PASSIF', debit: 450.00, credit: 0, mouvementBancaireLie: 'MB-2024-010', numeroPiece: 'REG-005' },
  { id: 'GL-047', date: '2024-03-15', libelle: 'PAIEMENT CLEANPRO - Ménage Fév', compte: '512', compteLabel: 'Banque', typeCompte: 'ACTIF', debit: 0, credit: 450.00, mouvementBancaireLie: 'MB-2024-010', numeroPiece: 'REG-005' },

  // ============================================
  // AVRIL 2024 - Appel de fonds T2
  // ============================================
  { id: 'GL-048', date: '2024-04-01', libelle: 'APPEL DE FONDS T2 2024 - LEBLANC Marie Lot 1', compte: '450', compteLabel: 'Copropriétaires - Créances', typeCompte: 'ACTIF', debit: 1250.00, credit: 0, numeroPiece: 'AF-2024-T2-001' },
  { id: 'GL-049', date: '2024-04-01', libelle: 'APPEL DE FONDS T2 2024 - LEBLANC Marie Lot 1', compte: '701', compteLabel: 'Appels de fonds', typeCompte: 'PRODUIT', debit: 0, credit: 1250.00, numeroPiece: 'AF-2024-T2-001' },
  { id: 'GL-050', date: '2024-04-01', libelle: 'APPEL DE FONDS T2 2024 - MOREAU Pierre Lot 2', compte: '450', compteLabel: 'Copropriétaires - Créances', typeCompte: 'ACTIF', debit: 1100.00, credit: 0, numeroPiece: 'AF-2024-T2-002' },
  { id: 'GL-051', date: '2024-04-01', libelle: 'APPEL DE FONDS T2 2024 - MOREAU Pierre Lot 2', compte: '701', compteLabel: 'Appels de fonds', typeCompte: 'PRODUIT', debit: 0, credit: 1100.00, numeroPiece: 'AF-2024-T2-002' },
  { id: 'GL-052', date: '2024-04-01', libelle: 'APPEL DE FONDS T2 2024 - LAURENT Sophie Lot 3', compte: '450', compteLabel: 'Copropriétaires - Créances', typeCompte: 'ACTIF', debit: 1500.00, credit: 0, numeroPiece: 'AF-2024-T2-003' },
  { id: 'GL-053', date: '2024-04-01', libelle: 'APPEL DE FONDS T2 2024 - LAURENT Sophie Lot 3', compte: '701', compteLabel: 'Appels de fonds', typeCompte: 'PRODUIT', debit: 0, credit: 1500.00, numeroPiece: 'AF-2024-T2-003' },
  { id: 'GL-054', date: '2024-04-01', libelle: 'APPEL DE FONDS T2 2024 - DUBOIS Jean Lot 4', compte: '450', compteLabel: 'Copropriétaires - Créances', typeCompte: 'ACTIF', debit: 980.00, credit: 0, numeroPiece: 'AF-2024-T2-004' },
  { id: 'GL-055', date: '2024-04-01', libelle: 'APPEL DE FONDS T2 2024 - DUBOIS Jean Lot 4', compte: '701', compteLabel: 'Appels de fonds', typeCompte: 'PRODUIT', debit: 0, credit: 980.00, numeroPiece: 'AF-2024-T2-004' },
  { id: 'GL-056', date: '2024-04-01', libelle: 'APPEL DE FONDS T2 2024 - MARTIN Anne Lot 5', compte: '450', compteLabel: 'Copropriétaires - Créances', typeCompte: 'ACTIF', debit: 1350.00, credit: 0, numeroPiece: 'AF-2024-T2-005' },
  { id: 'GL-057', date: '2024-04-01', libelle: 'APPEL DE FONDS T2 2024 - MARTIN Anne Lot 5', compte: '701', compteLabel: 'Appels de fonds', typeCompte: 'PRODUIT', debit: 0, credit: 1350.00, numeroPiece: 'AF-2024-T2-005' },

  // Appel ALUR T2
  { id: 'GL-058', date: '2024-04-01', libelle: 'APPEL FONDS ALUR T2 2024', compte: '450', compteLabel: 'Copropriétaires - Créances', typeCompte: 'ACTIF', debit: 1550.00, credit: 0, numeroPiece: 'AF-ALUR-2024-T2' },
  { id: 'GL-059', date: '2024-04-01', libelle: 'APPEL FONDS ALUR T2 2024', compte: '703', compteLabel: 'Fonds de travaux ALUR', typeCompte: 'PRODUIT', debit: 0, credit: 1550.00, numeroPiece: 'AF-ALUR-2024-T2' },

  // Encaissements T2
  { id: 'GL-060', date: '2024-04-10', libelle: 'VIR LEBLANC MARIE AF T2', compte: '512', compteLabel: 'Banque', typeCompte: 'ACTIF', debit: 1560.00, credit: 0, mouvementBancaireLie: 'MB-2024-011' },
  { id: 'GL-061', date: '2024-04-10', libelle: 'VIR LEBLANC MARIE AF T2', compte: '450', compteLabel: 'Copropriétaires - Créances', typeCompte: 'ACTIF', debit: 0, credit: 1560.00, mouvementBancaireLie: 'MB-2024-011' },
  { id: 'GL-062', date: '2024-04-12', libelle: 'VIR MOREAU PIERRE AF T2', compte: '512', compteLabel: 'Banque', typeCompte: 'ACTIF', debit: 1410.00, credit: 0, mouvementBancaireLie: 'MB-2024-012' },
  { id: 'GL-063', date: '2024-04-12', libelle: 'VIR MOREAU PIERRE AF T2', compte: '450', compteLabel: 'Copropriétaires - Créances', typeCompte: 'ACTIF', debit: 0, credit: 1410.00, mouvementBancaireLie: 'MB-2024-012' },
  { id: 'GL-064', date: '2024-04-15', libelle: 'VIR LAURENT SOPHIE AF T2', compte: '512', compteLabel: 'Banque', typeCompte: 'ACTIF', debit: 1810.00, credit: 0, mouvementBancaireLie: 'MB-2024-013' },
  { id: 'GL-065', date: '2024-04-15', libelle: 'VIR LAURENT SOPHIE AF T2', compte: '450', compteLabel: 'Copropriétaires - Créances', typeCompte: 'ACTIF', debit: 0, credit: 1810.00, mouvementBancaireLie: 'MB-2024-013' },
  { id: 'GL-066', date: '2024-04-18', libelle: 'VIR DUBOIS JEAN AF T2', compte: '512', compteLabel: 'Banque', typeCompte: 'ACTIF', debit: 1290.00, credit: 0, mouvementBancaireLie: 'MB-2024-014' },
  { id: 'GL-067', date: '2024-04-18', libelle: 'VIR DUBOIS JEAN AF T2', compte: '450', compteLabel: 'Copropriétaires - Créances', typeCompte: 'ACTIF', debit: 0, credit: 1290.00, mouvementBancaireLie: 'MB-2024-014' },
  { id: 'GL-068', date: '2024-04-20', libelle: 'VIR MARTIN ANNE AF T2', compte: '512', compteLabel: 'Banque', typeCompte: 'ACTIF', debit: 1660.00, credit: 0, mouvementBancaireLie: 'MB-2024-015' },
  { id: 'GL-069', date: '2024-04-20', libelle: 'VIR MARTIN ANNE AF T2', compte: '450', compteLabel: 'Copropriétaires - Créances', typeCompte: 'ACTIF', debit: 0, credit: 1660.00, mouvementBancaireLie: 'MB-2024-015' },

  // Facture assurance annuelle
  { id: 'GL-070', date: '2024-04-25', libelle: 'FACTURE ALLIANZ - Assurance MRI annuelle', compte: '616', compteLabel: 'Primes d\'assurance', typeCompte: 'CHARGE', debit: 4250.00, credit: 0, factureLiee: 'FAC-ALL-2024-001', numeroPiece: 'FAC-005' },
  { id: 'GL-071', date: '2024-04-25', libelle: 'FACTURE ALLIANZ - Assurance MRI annuelle', compte: '401', compteLabel: 'Fournisseurs', typeCompte: 'PASSIF', debit: 0, credit: 4250.00, factureLiee: 'FAC-ALL-2024-001', numeroPiece: 'FAC-005' },

  // ============================================
  // MAI 2024
  // ============================================
  // Paiement assurance
  { id: 'GL-072', date: '2024-05-05', libelle: 'PAIEMENT ALLIANZ - Assurance MRI', compte: '401', compteLabel: 'Fournisseurs', typeCompte: 'PASSIF', debit: 4250.00, credit: 0, mouvementBancaireLie: 'MB-2024-016', numeroPiece: 'REG-006' },
  { id: 'GL-073', date: '2024-05-05', libelle: 'PAIEMENT ALLIANZ - Assurance MRI', compte: '512', compteLabel: 'Banque', typeCompte: 'ACTIF', debit: 0, credit: 4250.00, mouvementBancaireLie: 'MB-2024-016', numeroPiece: 'REG-006' },

  // Facture maintenance ascenseur T1
  { id: 'GL-074', date: '2024-05-10', libelle: 'FACTURE OTIS - Maintenance ascenseur T1', compte: '615', compteLabel: 'Entretien et réparations', typeCompte: 'CHARGE', debit: 1890.00, credit: 0, factureLiee: 'FAC-OTS-2024-T1', numeroPiece: 'FAC-006' },
  { id: 'GL-075', date: '2024-05-10', libelle: 'FACTURE OTIS - Maintenance ascenseur T1', compte: '401', compteLabel: 'Fournisseurs', typeCompte: 'PASSIF', debit: 0, credit: 1890.00, factureLiee: 'FAC-OTS-2024-T1', numeroPiece: 'FAC-006' },

  // Facture EDF T1
  { id: 'GL-076', date: '2024-05-15', libelle: 'FACTURE EDF - Électricité T1 2024', compte: '606', compteLabel: 'Eau et électricité', typeCompte: 'CHARGE', debit: 1520.80, credit: 0, factureLiee: 'FAC-EDF-2024-T1', numeroPiece: 'FAC-007' },
  { id: 'GL-077', date: '2024-05-15', libelle: 'FACTURE EDF - Électricité T1 2024', compte: '401', compteLabel: 'Fournisseurs', typeCompte: 'PASSIF', debit: 0, credit: 1520.80, factureLiee: 'FAC-EDF-2024-T1', numeroPiece: 'FAC-007' },

  // Honoraires syndic T2
  { id: 'GL-078', date: '2024-05-20', libelle: 'HONORAIRES SYNDIC T2 2024', compte: '622', compteLabel: 'Honoraires syndic', typeCompte: 'CHARGE', debit: 1850.00, credit: 0, factureLiee: 'FAC-SYN-2024-T2', numeroPiece: 'FAC-008' },
  { id: 'GL-079', date: '2024-05-20', libelle: 'HONORAIRES SYNDIC T2 2024', compte: '401', compteLabel: 'Fournisseurs', typeCompte: 'PASSIF', debit: 0, credit: 1850.00, factureLiee: 'FAC-SYN-2024-T2', numeroPiece: 'FAC-008' },

  // ============================================
  // JUIN 2024
  // ============================================
  // Paiements fournisseurs
  { id: 'GL-080', date: '2024-06-01', libelle: 'PAIEMENT OTIS - Maintenance T1', compte: '401', compteLabel: 'Fournisseurs', typeCompte: 'PASSIF', debit: 1890.00, credit: 0, mouvementBancaireLie: 'MB-2024-017', numeroPiece: 'REG-007' },
  { id: 'GL-081', date: '2024-06-01', libelle: 'PAIEMENT OTIS - Maintenance T1', compte: '512', compteLabel: 'Banque', typeCompte: 'ACTIF', debit: 0, credit: 1890.00, mouvementBancaireLie: 'MB-2024-017', numeroPiece: 'REG-007' },
  { id: 'GL-082', date: '2024-06-05', libelle: 'PAIEMENT EDF - Électricité T1', compte: '401', compteLabel: 'Fournisseurs', typeCompte: 'PASSIF', debit: 1520.80, credit: 0, mouvementBancaireLie: 'MB-2024-018', numeroPiece: 'REG-008' },
  { id: 'GL-083', date: '2024-06-05', libelle: 'PAIEMENT EDF - Électricité T1', compte: '512', compteLabel: 'Banque', typeCompte: 'ACTIF', debit: 0, credit: 1520.80, mouvementBancaireLie: 'MB-2024-018', numeroPiece: 'REG-008' },
  { id: 'GL-084', date: '2024-06-10', libelle: 'PAIEMENT SYNDIC - Honoraires T2', compte: '401', compteLabel: 'Fournisseurs', typeCompte: 'PASSIF', debit: 1850.00, credit: 0, mouvementBancaireLie: 'MB-2024-019', numeroPiece: 'REG-009' },
  { id: 'GL-085', date: '2024-06-10', libelle: 'PAIEMENT SYNDIC - Honoraires T2', compte: '512', compteLabel: 'Banque', typeCompte: 'ACTIF', debit: 0, credit: 1850.00, mouvementBancaireLie: 'MB-2024-019', numeroPiece: 'REG-009' },

  // Frais bancaires T2
  { id: 'GL-086', date: '2024-06-30', libelle: 'FRAIS BANCAIRES T2 2024', compte: '627', compteLabel: 'Services bancaires', typeCompte: 'CHARGE', debit: 45.00, credit: 0, numeroPiece: 'OD-002' },
  { id: 'GL-087', date: '2024-06-30', libelle: 'FRAIS BANCAIRES T2 2024', compte: '512', compteLabel: 'Banque', typeCompte: 'ACTIF', debit: 0, credit: 45.00, numeroPiece: 'OD-002' },

  // Dotation provisions travaux S1
  { id: 'GL-088', date: '2024-06-30', libelle: 'DOTATION PROVISIONS TRAVAUX S1 2024', compte: '681', compteLabel: 'Dotations aux provisions', typeCompte: 'CHARGE', debit: 3000.00, credit: 0, numeroPiece: 'OD-003' },
  { id: 'GL-089', date: '2024-06-30', libelle: 'DOTATION PROVISIONS TRAVAUX S1 2024', compte: '102', compteLabel: 'Provisions pour travaux', typeCompte: 'PASSIF', debit: 0, credit: 3000.00, numeroPiece: 'OD-003' },

  // Transfert vers fonds ALUR
  { id: 'GL-090', date: '2024-06-30', libelle: 'TRANSFERT FONDS ALUR S1 2024', compte: '512', compteLabel: 'Banque', typeCompte: 'ACTIF', debit: 0, credit: 3100.00, numeroPiece: 'OD-004' },
  { id: 'GL-091', date: '2024-06-30', libelle: 'TRANSFERT FONDS ALUR S1 2024 - Placement', compte: '105', compteLabel: 'Fonds de travaux ALUR', typeCompte: 'PASSIF', debit: 0, credit: 3100.00, numeroPiece: 'OD-004' },
  { id: 'GL-092', date: '2024-06-30', libelle: 'TRANSFERT FONDS ALUR S1 2024 - Placement', compte: '532', compteLabel: 'Placements', typeCompte: 'ACTIF', debit: 6200.00, credit: 0, numeroPiece: 'OD-004' },

  // ============================================
  // JUILLET 2024 - Appel de fonds T3
  // ============================================
  { id: 'GL-093', date: '2024-07-01', libelle: 'APPEL DE FONDS T3 2024 - LEBLANC Marie Lot 1', compte: '450', compteLabel: 'Copropriétaires - Créances', typeCompte: 'ACTIF', debit: 1250.00, credit: 0, numeroPiece: 'AF-2024-T3-001' },
  { id: 'GL-094', date: '2024-07-01', libelle: 'APPEL DE FONDS T3 2024 - LEBLANC Marie Lot 1', compte: '701', compteLabel: 'Appels de fonds', typeCompte: 'PRODUIT', debit: 0, credit: 1250.00, numeroPiece: 'AF-2024-T3-001' },
  { id: 'GL-095', date: '2024-07-01', libelle: 'APPEL DE FONDS T3 2024 - MOREAU Pierre Lot 2', compte: '450', compteLabel: 'Copropriétaires - Créances', typeCompte: 'ACTIF', debit: 1100.00, credit: 0, numeroPiece: 'AF-2024-T3-002' },
  { id: 'GL-096', date: '2024-07-01', libelle: 'APPEL DE FONDS T3 2024 - MOREAU Pierre Lot 2', compte: '701', compteLabel: 'Appels de fonds', typeCompte: 'PRODUIT', debit: 0, credit: 1100.00, numeroPiece: 'AF-2024-T3-002' },
  { id: 'GL-097', date: '2024-07-01', libelle: 'APPEL DE FONDS T3 2024 - LAURENT Sophie Lot 3', compte: '450', compteLabel: 'Copropriétaires - Créances', typeCompte: 'ACTIF', debit: 1500.00, credit: 0, numeroPiece: 'AF-2024-T3-003' },
  { id: 'GL-098', date: '2024-07-01', libelle: 'APPEL DE FONDS T3 2024 - LAURENT Sophie Lot 3', compte: '701', compteLabel: 'Appels de fonds', typeCompte: 'PRODUIT', debit: 0, credit: 1500.00, numeroPiece: 'AF-2024-T3-003' },
  { id: 'GL-099', date: '2024-07-01', libelle: 'APPEL DE FONDS T3 2024 - DUBOIS Jean Lot 4', compte: '450', compteLabel: 'Copropriétaires - Créances', typeCompte: 'ACTIF', debit: 980.00, credit: 0, numeroPiece: 'AF-2024-T3-004' },
  { id: 'GL-100', date: '2024-07-01', libelle: 'APPEL DE FONDS T3 2024 - DUBOIS Jean Lot 4', compte: '701', compteLabel: 'Appels de fonds', typeCompte: 'PRODUIT', debit: 0, credit: 980.00, numeroPiece: 'AF-2024-T3-004' },
  { id: 'GL-101', date: '2024-07-01', libelle: 'APPEL DE FONDS T3 2024 - MARTIN Anne Lot 5', compte: '450', compteLabel: 'Copropriétaires - Créances', typeCompte: 'ACTIF', debit: 1350.00, credit: 0, numeroPiece: 'AF-2024-T3-005' },
  { id: 'GL-102', date: '2024-07-01', libelle: 'APPEL DE FONDS T3 2024 - MARTIN Anne Lot 5', compte: '701', compteLabel: 'Appels de fonds', typeCompte: 'PRODUIT', debit: 0, credit: 1350.00, numeroPiece: 'AF-2024-T3-005' },

  // Appel ALUR T3
  { id: 'GL-103', date: '2024-07-01', libelle: 'APPEL FONDS ALUR T3 2024', compte: '450', compteLabel: 'Copropriétaires - Créances', typeCompte: 'ACTIF', debit: 1550.00, credit: 0, numeroPiece: 'AF-ALUR-2024-T3' },
  { id: 'GL-104', date: '2024-07-01', libelle: 'APPEL FONDS ALUR T3 2024', compte: '703', compteLabel: 'Fonds de travaux ALUR', typeCompte: 'PRODUIT', debit: 0, credit: 1550.00, numeroPiece: 'AF-ALUR-2024-T3' },

  // Encaissements T3
  { id: 'GL-105', date: '2024-07-10', libelle: 'VIR LEBLANC MARIE AF T3', compte: '512', compteLabel: 'Banque', typeCompte: 'ACTIF', debit: 1560.00, credit: 0, mouvementBancaireLie: 'MB-2024-020' },
  { id: 'GL-106', date: '2024-07-10', libelle: 'VIR LEBLANC MARIE AF T3', compte: '450', compteLabel: 'Copropriétaires - Créances', typeCompte: 'ACTIF', debit: 0, credit: 1560.00, mouvementBancaireLie: 'MB-2024-020' },
  { id: 'GL-107', date: '2024-07-12', libelle: 'VIR MOREAU PIERRE AF T3', compte: '512', compteLabel: 'Banque', typeCompte: 'ACTIF', debit: 1410.00, credit: 0, mouvementBancaireLie: 'MB-2024-021' },
  { id: 'GL-108', date: '2024-07-12', libelle: 'VIR MOREAU PIERRE AF T3', compte: '450', compteLabel: 'Copropriétaires - Créances', typeCompte: 'ACTIF', debit: 0, credit: 1410.00, mouvementBancaireLie: 'MB-2024-021' },
  { id: 'GL-109', date: '2024-07-15', libelle: 'VIR LAURENT SOPHIE AF T3', compte: '512', compteLabel: 'Banque', typeCompte: 'ACTIF', debit: 1810.00, credit: 0, mouvementBancaireLie: 'MB-2024-022' },
  { id: 'GL-110', date: '2024-07-15', libelle: 'VIR LAURENT SOPHIE AF T3', compte: '450', compteLabel: 'Copropriétaires - Créances', typeCompte: 'ACTIF', debit: 0, credit: 1810.00, mouvementBancaireLie: 'MB-2024-022' },
  { id: 'GL-111', date: '2024-07-18', libelle: 'VIR DUBOIS JEAN AF T3', compte: '512', compteLabel: 'Banque', typeCompte: 'ACTIF', debit: 1290.00, credit: 0, mouvementBancaireLie: 'MB-2024-023' },
  { id: 'GL-112', date: '2024-07-18', libelle: 'VIR DUBOIS JEAN AF T3', compte: '450', compteLabel: 'Copropriétaires - Créances', typeCompte: 'ACTIF', debit: 0, credit: 1290.00, mouvementBancaireLie: 'MB-2024-023' },
  { id: 'GL-113', date: '2024-07-20', libelle: 'VIR MARTIN ANNE AF T3', compte: '512', compteLabel: 'Banque', typeCompte: 'ACTIF', debit: 1660.00, credit: 0, mouvementBancaireLie: 'MB-2024-024' },
  { id: 'GL-114', date: '2024-07-20', libelle: 'VIR MARTIN ANNE AF T3', compte: '450', compteLabel: 'Copropriétaires - Créances', typeCompte: 'ACTIF', debit: 0, credit: 1660.00, mouvementBancaireLie: 'MB-2024-024' },

  // ============================================
  // AOÛT 2024
  // ============================================
  // Facture maintenance ascenseur T2
  { id: 'GL-115', date: '2024-08-05', libelle: 'FACTURE OTIS - Maintenance ascenseur T2', compte: '615', compteLabel: 'Entretien et réparations', typeCompte: 'CHARGE', debit: 1890.00, credit: 0, factureLiee: 'FAC-OTS-2024-T2', numeroPiece: 'FAC-009' },
  { id: 'GL-116', date: '2024-08-05', libelle: 'FACTURE OTIS - Maintenance ascenseur T2', compte: '401', compteLabel: 'Fournisseurs', typeCompte: 'PASSIF', debit: 0, credit: 1890.00, factureLiee: 'FAC-OTS-2024-T2', numeroPiece: 'FAC-009' },

  // Honoraires syndic T3
  { id: 'GL-117', date: '2024-08-15', libelle: 'HONORAIRES SYNDIC T3 2024', compte: '622', compteLabel: 'Honoraires syndic', typeCompte: 'CHARGE', debit: 1850.00, credit: 0, factureLiee: 'FAC-SYN-2024-T3', numeroPiece: 'FAC-010' },
  { id: 'GL-118', date: '2024-08-15', libelle: 'HONORAIRES SYNDIC T3 2024', compte: '401', compteLabel: 'Fournisseurs', typeCompte: 'PASSIF', debit: 0, credit: 1850.00, factureLiee: 'FAC-SYN-2024-T3', numeroPiece: 'FAC-010' },

  // Paiements
  { id: 'GL-119', date: '2024-08-20', libelle: 'PAIEMENT OTIS - Maintenance T2', compte: '401', compteLabel: 'Fournisseurs', typeCompte: 'PASSIF', debit: 1890.00, credit: 0, mouvementBancaireLie: 'MB-2024-025', numeroPiece: 'REG-010' },
  { id: 'GL-120', date: '2024-08-20', libelle: 'PAIEMENT OTIS - Maintenance T2', compte: '512', compteLabel: 'Banque', typeCompte: 'ACTIF', debit: 0, credit: 1890.00, mouvementBancaireLie: 'MB-2024-025', numeroPiece: 'REG-010' },
  { id: 'GL-121', date: '2024-08-25', libelle: 'PAIEMENT SYNDIC - Honoraires T3', compte: '401', compteLabel: 'Fournisseurs', typeCompte: 'PASSIF', debit: 1850.00, credit: 0, mouvementBancaireLie: 'MB-2024-026', numeroPiece: 'REG-011' },
  { id: 'GL-122', date: '2024-08-25', libelle: 'PAIEMENT SYNDIC - Honoraires T3', compte: '512', compteLabel: 'Banque', typeCompte: 'ACTIF', debit: 0, credit: 1850.00, mouvementBancaireLie: 'MB-2024-026', numeroPiece: 'REG-011' },

  // ============================================
  // SEPTEMBRE 2024
  // ============================================
  // Facture EDF T2
  { id: 'GL-123', date: '2024-09-05', libelle: 'FACTURE EDF - Électricité T2 2024', compte: '606', compteLabel: 'Eau et électricité', typeCompte: 'CHARGE', debit: 1380.50, credit: 0, factureLiee: 'FAC-EDF-2024-T2', numeroPiece: 'FAC-011' },
  { id: 'GL-124', date: '2024-09-05', libelle: 'FACTURE EDF - Électricité T2 2024', compte: '401', compteLabel: 'Fournisseurs', typeCompte: 'PASSIF', debit: 0, credit: 1380.50, factureLiee: 'FAC-EDF-2024-T2', numeroPiece: 'FAC-011' },

  // Facture Veolia eau S1
  { id: 'GL-125', date: '2024-09-10', libelle: 'FACTURE VEOLIA - Eau S1 2024', compte: '606', compteLabel: 'Eau et électricité', typeCompte: 'CHARGE', debit: 1785.60, credit: 0, factureLiee: 'FAC-VEO-2024-S1', numeroPiece: 'FAC-012' },
  { id: 'GL-126', date: '2024-09-10', libelle: 'FACTURE VEOLIA - Eau S1 2024', compte: '401', compteLabel: 'Fournisseurs', typeCompte: 'PASSIF', debit: 0, credit: 1785.60, factureLiee: 'FAC-VEO-2024-S1', numeroPiece: 'FAC-012' },

  // Paiements
  { id: 'GL-127', date: '2024-09-15', libelle: 'PAIEMENT EDF - Électricité T2', compte: '401', compteLabel: 'Fournisseurs', typeCompte: 'PASSIF', debit: 1380.50, credit: 0, mouvementBancaireLie: 'MB-2024-027', numeroPiece: 'REG-012' },
  { id: 'GL-128', date: '2024-09-15', libelle: 'PAIEMENT EDF - Électricité T2', compte: '512', compteLabel: 'Banque', typeCompte: 'ACTIF', debit: 0, credit: 1380.50, mouvementBancaireLie: 'MB-2024-027', numeroPiece: 'REG-012' },
  { id: 'GL-129', date: '2024-09-20', libelle: 'PAIEMENT VEOLIA - Eau S1', compte: '401', compteLabel: 'Fournisseurs', typeCompte: 'PASSIF', debit: 1785.60, credit: 0, mouvementBancaireLie: 'MB-2024-028', numeroPiece: 'REG-013' },
  { id: 'GL-130', date: '2024-09-20', libelle: 'PAIEMENT VEOLIA - Eau S1', compte: '512', compteLabel: 'Banque', typeCompte: 'ACTIF', debit: 0, credit: 1785.60, mouvementBancaireLie: 'MB-2024-028', numeroPiece: 'REG-013' },

  // Frais bancaires T3
  { id: 'GL-131', date: '2024-09-30', libelle: 'FRAIS BANCAIRES T3 2024', compte: '627', compteLabel: 'Services bancaires', typeCompte: 'CHARGE', debit: 45.00, credit: 0, numeroPiece: 'OD-005' },
  { id: 'GL-132', date: '2024-09-30', libelle: 'FRAIS BANCAIRES T3 2024', compte: '512', compteLabel: 'Banque', typeCompte: 'ACTIF', debit: 0, credit: 45.00, numeroPiece: 'OD-005' },

  // ============================================
  // OCTOBRE 2024 - Appel de fonds T4
  // ============================================
  { id: 'GL-133', date: '2024-10-01', libelle: 'APPEL DE FONDS T4 2024 - LEBLANC Marie Lot 1', compte: '450', compteLabel: 'Copropriétaires - Créances', typeCompte: 'ACTIF', debit: 1250.00, credit: 0, numeroPiece: 'AF-2024-T4-001' },
  { id: 'GL-134', date: '2024-10-01', libelle: 'APPEL DE FONDS T4 2024 - LEBLANC Marie Lot 1', compte: '701', compteLabel: 'Appels de fonds', typeCompte: 'PRODUIT', debit: 0, credit: 1250.00, numeroPiece: 'AF-2024-T4-001' },
  { id: 'GL-135', date: '2024-10-01', libelle: 'APPEL DE FONDS T4 2024 - MOREAU Pierre Lot 2', compte: '450', compteLabel: 'Copropriétaires - Créances', typeCompte: 'ACTIF', debit: 1100.00, credit: 0, numeroPiece: 'AF-2024-T4-002' },
  { id: 'GL-136', date: '2024-10-01', libelle: 'APPEL DE FONDS T4 2024 - MOREAU Pierre Lot 2', compte: '701', compteLabel: 'Appels de fonds', typeCompte: 'PRODUIT', debit: 0, credit: 1100.00, numeroPiece: 'AF-2024-T4-002' },
  { id: 'GL-137', date: '2024-10-01', libelle: 'APPEL DE FONDS T4 2024 - LAURENT Sophie Lot 3', compte: '450', compteLabel: 'Copropriétaires - Créances', typeCompte: 'ACTIF', debit: 1500.00, credit: 0, numeroPiece: 'AF-2024-T4-003' },
  { id: 'GL-138', date: '2024-10-01', libelle: 'APPEL DE FONDS T4 2024 - LAURENT Sophie Lot 3', compte: '701', compteLabel: 'Appels de fonds', typeCompte: 'PRODUIT', debit: 0, credit: 1500.00, numeroPiece: 'AF-2024-T4-003' },
  { id: 'GL-139', date: '2024-10-01', libelle: 'APPEL DE FONDS T4 2024 - DUBOIS Jean Lot 4', compte: '450', compteLabel: 'Copropriétaires - Créances', typeCompte: 'ACTIF', debit: 980.00, credit: 0, numeroPiece: 'AF-2024-T4-004' },
  { id: 'GL-140', date: '2024-10-01', libelle: 'APPEL DE FONDS T4 2024 - DUBOIS Jean Lot 4', compte: '701', compteLabel: 'Appels de fonds', typeCompte: 'PRODUIT', debit: 0, credit: 980.00, numeroPiece: 'AF-2024-T4-004' },
  { id: 'GL-141', date: '2024-10-01', libelle: 'APPEL DE FONDS T4 2024 - MARTIN Anne Lot 5', compte: '450', compteLabel: 'Copropriétaires - Créances', typeCompte: 'ACTIF', debit: 1350.00, credit: 0, numeroPiece: 'AF-2024-T4-005' },
  { id: 'GL-142', date: '2024-10-01', libelle: 'APPEL DE FONDS T4 2024 - MARTIN Anne Lot 5', compte: '701', compteLabel: 'Appels de fonds', typeCompte: 'PRODUIT', debit: 0, credit: 1350.00, numeroPiece: 'AF-2024-T4-005' },

  // Appel ALUR T4
  { id: 'GL-143', date: '2024-10-01', libelle: 'APPEL FONDS ALUR T4 2024', compte: '450', compteLabel: 'Copropriétaires - Créances', typeCompte: 'ACTIF', debit: 1550.00, credit: 0, numeroPiece: 'AF-ALUR-2024-T4' },
  { id: 'GL-144', date: '2024-10-01', libelle: 'APPEL FONDS ALUR T4 2024', compte: '703', compteLabel: 'Fonds de travaux ALUR', typeCompte: 'PRODUIT', debit: 0, credit: 1550.00, numeroPiece: 'AF-ALUR-2024-T4' },

  // Encaissements T4
  { id: 'GL-145', date: '2024-10-10', libelle: 'VIR LEBLANC MARIE AF T4', compte: '512', compteLabel: 'Banque', typeCompte: 'ACTIF', debit: 1560.00, credit: 0, mouvementBancaireLie: 'MB-2024-029' },
  { id: 'GL-146', date: '2024-10-10', libelle: 'VIR LEBLANC MARIE AF T4', compte: '450', compteLabel: 'Copropriétaires - Créances', typeCompte: 'ACTIF', debit: 0, credit: 1560.00, mouvementBancaireLie: 'MB-2024-029' },
  { id: 'GL-147', date: '2024-10-12', libelle: 'VIR MOREAU PIERRE AF T4', compte: '512', compteLabel: 'Banque', typeCompte: 'ACTIF', debit: 1410.00, credit: 0, mouvementBancaireLie: 'MB-2024-030' },
  { id: 'GL-148', date: '2024-10-12', libelle: 'VIR MOREAU PIERRE AF T4', compte: '450', compteLabel: 'Copropriétaires - Créances', typeCompte: 'ACTIF', debit: 0, credit: 1410.00, mouvementBancaireLie: 'MB-2024-030' },
  { id: 'GL-149', date: '2024-10-15', libelle: 'VIR LAURENT SOPHIE AF T4', compte: '512', compteLabel: 'Banque', typeCompte: 'ACTIF', debit: 1810.00, credit: 0, mouvementBancaireLie: 'MB-2024-031' },
  { id: 'GL-150', date: '2024-10-15', libelle: 'VIR LAURENT SOPHIE AF T4', compte: '450', compteLabel: 'Copropriétaires - Créances', typeCompte: 'ACTIF', debit: 0, credit: 1810.00, mouvementBancaireLie: 'MB-2024-031' },
  { id: 'GL-151', date: '2024-10-18', libelle: 'VIR DUBOIS JEAN AF T4', compte: '512', compteLabel: 'Banque', typeCompte: 'ACTIF', debit: 1290.00, credit: 0, mouvementBancaireLie: 'MB-2024-032' },
  { id: 'GL-152', date: '2024-10-18', libelle: 'VIR DUBOIS JEAN AF T4', compte: '450', compteLabel: 'Copropriétaires - Créances', typeCompte: 'ACTIF', debit: 0, credit: 1290.00, mouvementBancaireLie: 'MB-2024-032' },
  { id: 'GL-153', date: '2024-10-20', libelle: 'VIR MARTIN ANNE AF T4', compte: '512', compteLabel: 'Banque', typeCompte: 'ACTIF', debit: 1660.00, credit: 0, mouvementBancaireLie: 'MB-2024-033' },
  { id: 'GL-154', date: '2024-10-20', libelle: 'VIR MARTIN ANNE AF T4', compte: '450', compteLabel: 'Copropriétaires - Créances', typeCompte: 'ACTIF', debit: 0, credit: 1660.00, mouvementBancaireLie: 'MB-2024-033' },

  // ============================================
  // NOVEMBRE 2024
  // ============================================
  // Facture maintenance ascenseur T3
  { id: 'GL-155', date: '2024-11-05', libelle: 'FACTURE OTIS - Maintenance ascenseur T3', compte: '615', compteLabel: 'Entretien et réparations', typeCompte: 'CHARGE', debit: 1890.00, credit: 0, factureLiee: 'FAC-OTS-2024-T3', numeroPiece: 'FAC-013' },
  { id: 'GL-156', date: '2024-11-05', libelle: 'FACTURE OTIS - Maintenance ascenseur T3', compte: '401', compteLabel: 'Fournisseurs', typeCompte: 'PASSIF', debit: 0, credit: 1890.00, factureLiee: 'FAC-OTS-2024-T3', numeroPiece: 'FAC-013' },

  // Honoraires syndic T4
  { id: 'GL-157', date: '2024-11-10', libelle: 'HONORAIRES SYNDIC T4 2024', compte: '622', compteLabel: 'Honoraires syndic', typeCompte: 'CHARGE', debit: 1850.00, credit: 0, factureLiee: 'FAC-SYN-2024-T4', numeroPiece: 'FAC-014' },
  { id: 'GL-158', date: '2024-11-10', libelle: 'HONORAIRES SYNDIC T4 2024', compte: '401', compteLabel: 'Fournisseurs', typeCompte: 'PASSIF', debit: 0, credit: 1850.00, factureLiee: 'FAC-SYN-2024-T4', numeroPiece: 'FAC-014' },

  // Paiements
  { id: 'GL-159', date: '2024-11-15', libelle: 'PAIEMENT OTIS - Maintenance T3', compte: '401', compteLabel: 'Fournisseurs', typeCompte: 'PASSIF', debit: 1890.00, credit: 0, mouvementBancaireLie: 'MB-2024-034', numeroPiece: 'REG-014' },
  { id: 'GL-160', date: '2024-11-15', libelle: 'PAIEMENT OTIS - Maintenance T3', compte: '512', compteLabel: 'Banque', typeCompte: 'ACTIF', debit: 0, credit: 1890.00, mouvementBancaireLie: 'MB-2024-034', numeroPiece: 'REG-014' },
  { id: 'GL-161', date: '2024-11-20', libelle: 'PAIEMENT SYNDIC - Honoraires T4', compte: '401', compteLabel: 'Fournisseurs', typeCompte: 'PASSIF', debit: 1850.00, credit: 0, mouvementBancaireLie: 'MB-2024-035', numeroPiece: 'REG-015' },
  { id: 'GL-162', date: '2024-11-20', libelle: 'PAIEMENT SYNDIC - Honoraires T4', compte: '512', compteLabel: 'Banque', typeCompte: 'ACTIF', debit: 0, credit: 1850.00, mouvementBancaireLie: 'MB-2024-035', numeroPiece: 'REG-015' },

  // ============================================
  // DÉCEMBRE 2024
  // ============================================
  // Facture EDF T3-T4
  { id: 'GL-163', date: '2024-12-05', libelle: 'FACTURE EDF - Électricité T3-T4 2024', compte: '606', compteLabel: 'Eau et électricité', typeCompte: 'CHARGE', debit: 2890.40, credit: 0, factureLiee: 'FAC-EDF-2024-T34', numeroPiece: 'FAC-015' },
  { id: 'GL-164', date: '2024-12-05', libelle: 'FACTURE EDF - Électricité T3-T4 2024', compte: '401', compteLabel: 'Fournisseurs', typeCompte: 'PASSIF', debit: 0, credit: 2890.40, factureLiee: 'FAC-EDF-2024-T34', numeroPiece: 'FAC-015' },

  // Facture Veolia S2
  { id: 'GL-165', date: '2024-12-10', libelle: 'FACTURE VEOLIA - Eau S2 2024', compte: '606', compteLabel: 'Eau et électricité', typeCompte: 'CHARGE', debit: 1920.80, credit: 0, factureLiee: 'FAC-VEO-2024-S2', numeroPiece: 'FAC-016' },
  { id: 'GL-166', date: '2024-12-10', libelle: 'FACTURE VEOLIA - Eau S2 2024', compte: '401', compteLabel: 'Fournisseurs', typeCompte: 'PASSIF', debit: 0, credit: 1920.80, factureLiee: 'FAC-VEO-2024-S2', numeroPiece: 'FAC-016' },

  // Facture maintenance ascenseur T4
  { id: 'GL-167', date: '2024-12-12', libelle: 'FACTURE OTIS - Maintenance ascenseur T4', compte: '615', compteLabel: 'Entretien et réparations', typeCompte: 'CHARGE', debit: 1890.00, credit: 0, factureLiee: 'FAC-OTS-2024-T4', numeroPiece: 'FAC-017' },
  { id: 'GL-168', date: '2024-12-12', libelle: 'FACTURE OTIS - Maintenance ascenseur T4', compte: '401', compteLabel: 'Fournisseurs', typeCompte: 'PASSIF', debit: 0, credit: 1890.00, factureLiee: 'FAC-OTS-2024-T4', numeroPiece: 'FAC-017' },

  // Paiements
  { id: 'GL-169', date: '2024-12-15', libelle: 'PAIEMENT EDF - Électricité T3-T4', compte: '401', compteLabel: 'Fournisseurs', typeCompte: 'PASSIF', debit: 2890.40, credit: 0, mouvementBancaireLie: 'MB-2024-036', numeroPiece: 'REG-016' },
  { id: 'GL-170', date: '2024-12-15', libelle: 'PAIEMENT EDF - Électricité T3-T4', compte: '512', compteLabel: 'Banque', typeCompte: 'ACTIF', debit: 0, credit: 2890.40, mouvementBancaireLie: 'MB-2024-036', numeroPiece: 'REG-016' },
  { id: 'GL-171', date: '2024-12-18', libelle: 'PAIEMENT VEOLIA - Eau S2', compte: '401', compteLabel: 'Fournisseurs', typeCompte: 'PASSIF', debit: 1920.80, credit: 0, mouvementBancaireLie: 'MB-2024-037', numeroPiece: 'REG-017' },
  { id: 'GL-172', date: '2024-12-18', libelle: 'PAIEMENT VEOLIA - Eau S2', compte: '512', compteLabel: 'Banque', typeCompte: 'ACTIF', debit: 0, credit: 1920.80, mouvementBancaireLie: 'MB-2024-037', numeroPiece: 'REG-017' },
  { id: 'GL-173', date: '2024-12-20', libelle: 'PAIEMENT OTIS - Maintenance T4', compte: '401', compteLabel: 'Fournisseurs', typeCompte: 'PASSIF', debit: 1890.00, credit: 0, mouvementBancaireLie: 'MB-2024-038', numeroPiece: 'REG-018' },
  { id: 'GL-174', date: '2024-12-20', libelle: 'PAIEMENT OTIS - Maintenance T4', compte: '512', compteLabel: 'Banque', typeCompte: 'ACTIF', debit: 0, credit: 1890.00, mouvementBancaireLie: 'MB-2024-038', numeroPiece: 'REG-018' },

  // Frais bancaires T4
  { id: 'GL-175', date: '2024-12-31', libelle: 'FRAIS BANCAIRES T4 2024', compte: '627', compteLabel: 'Services bancaires', typeCompte: 'CHARGE', debit: 45.00, credit: 0, numeroPiece: 'OD-006' },
  { id: 'GL-176', date: '2024-12-31', libelle: 'FRAIS BANCAIRES T4 2024', compte: '512', compteLabel: 'Banque', typeCompte: 'ACTIF', debit: 0, credit: 45.00, numeroPiece: 'OD-006' },

  // Dotation provisions travaux S2
  { id: 'GL-177', date: '2024-12-31', libelle: 'DOTATION PROVISIONS TRAVAUX S2 2024', compte: '681', compteLabel: 'Dotations aux provisions', typeCompte: 'CHARGE', debit: 3000.00, credit: 0, numeroPiece: 'OD-007' },
  { id: 'GL-178', date: '2024-12-31', libelle: 'DOTATION PROVISIONS TRAVAUX S2 2024', compte: '102', compteLabel: 'Provisions pour travaux', typeCompte: 'PASSIF', debit: 0, credit: 3000.00, numeroPiece: 'OD-007' },

  // Transfert vers fonds ALUR S2
  { id: 'GL-179', date: '2024-12-31', libelle: 'TRANSFERT FONDS ALUR S2 2024', compte: '512', compteLabel: 'Banque', typeCompte: 'ACTIF', debit: 0, credit: 3100.00, numeroPiece: 'OD-008' },
  { id: 'GL-180', date: '2024-12-31', libelle: 'TRANSFERT FONDS ALUR S2 2024 - Placement', compte: '105', compteLabel: 'Fonds de travaux ALUR', typeCompte: 'PASSIF', debit: 0, credit: 3100.00, numeroPiece: 'OD-008' },
  { id: 'GL-181', date: '2024-12-31', libelle: 'TRANSFERT FONDS ALUR S2 2024 - Placement', compte: '532', compteLabel: 'Placements', typeCompte: 'ACTIF', debit: 6200.00, credit: 0, numeroPiece: 'OD-008' },

  // Intérêts placements
  { id: 'GL-182', date: '2024-12-31', libelle: 'INTÉRÊTS PLACEMENTS 2024 - Fonds ALUR', compte: '532', compteLabel: 'Placements', typeCompte: 'ACTIF', debit: 185.50, credit: 0, numeroPiece: 'OD-009' },
  { id: 'GL-183', date: '2024-12-31', libelle: 'INTÉRÊTS PLACEMENTS 2024 - Fonds ALUR', compte: '76', compteLabel: 'Produits financiers', typeCompte: 'PRODUIT', debit: 0, credit: 185.50, numeroPiece: 'OD-009' },
];

export const MOCK_DEPENSES: Depense[] = [
  { id: 'DEP-001', date: '2024-01-25', libelle: 'Électricité parties communes Janvier', fournisseur: 'EDF', montant: 485.60, typeDepense: 'electricite', compte: '606', compteLabel: 'Eau et électricité', factureLiee: 'FAC-EDF-2024-001', budgetPrevu: 500.00, budgetLie: 'BUDGET-FONCT-2024' },
  { id: 'DEP-002', date: '2024-02-10', libelle: 'Eau parties communes', fournisseur: 'Veolia', montant: 892.30, typeDepense: 'eau', compte: '606', compteLabel: 'Eau et électricité', factureLiee: 'FAC-VEO-2024-001', budgetPrevu: 950.00, budgetLie: 'BUDGET-FONCT-2024' },
  { id: 'DEP-003', date: '2024-02-20', libelle: 'Honoraires syndic T1 2024', fournisseur: 'Cabinet Dupont', montant: 1850.00, typeDepense: 'divers', compte: '622', compteLabel: 'Honoraires syndic', factureLiee: 'FAC-SYN-2024-T1', budgetPrevu: 1850.00, budgetLie: 'BUDGET-FONCT-2024' },
  { id: 'DEP-004', date: '2024-03-01', libelle: 'Ménage parties communes Février', fournisseur: 'CleanPro Services', montant: 450.00, typeDepense: 'menage', compte: '614', compteLabel: 'Charges de personnel extérieur', factureLiee: 'FAC-CLP-2024-002', budgetPrevu: 450.00, budgetLie: 'BUDGET-FONCT-2024' },
  { id: 'DEP-005', date: '2024-04-25', libelle: 'Assurance MRI annuelle', fournisseur: 'Allianz Assurances', montant: 4250.00, typeDepense: 'assurance', compte: '616', compteLabel: 'Primes d\'assurance', factureLiee: 'FAC-ALL-2024-001', budgetPrevu: 4250.00, budgetLie: 'BUDGET-FONCT-2024' },
  { id: 'DEP-006', date: '2024-05-10', libelle: 'Maintenance ascenseur T1', fournisseur: 'Otis Ascenseurs', montant: 1890.00, typeDepense: 'ascenseur', compte: '615', compteLabel: 'Entretien et réparations', factureLiee: 'FAC-OTS-2024-T1', budgetPrevu: 2000.00, budgetLie: 'BUDGET-FONCT-2024' },
  { id: 'DEP-007', date: '2024-05-15', libelle: 'Électricité T1 2024', fournisseur: 'EDF', montant: 1520.80, typeDepense: 'electricite', compte: '606', compteLabel: 'Eau et électricité', factureLiee: 'FAC-EDF-2024-T1', budgetPrevu: 1500.00, budgetLie: 'BUDGET-FONCT-2024' },
  { id: 'DEP-008', date: '2024-05-20', libelle: 'Honoraires syndic T2 2024', fournisseur: 'Cabinet Dupont', montant: 1850.00, typeDepense: 'divers', compte: '622', compteLabel: 'Honoraires syndic', factureLiee: 'FAC-SYN-2024-T2', budgetPrevu: 1850.00, budgetLie: 'BUDGET-FONCT-2024' },
  { id: 'DEP-009', date: '2024-08-05', libelle: 'Maintenance ascenseur T2', fournisseur: 'Otis Ascenseurs', montant: 1890.00, typeDepense: 'ascenseur', compte: '615', compteLabel: 'Entretien et réparations', factureLiee: 'FAC-OTS-2024-T2', budgetPrevu: 2000.00, budgetLie: 'BUDGET-FONCT-2024' },
  { id: 'DEP-010', date: '2024-08-15', libelle: 'Honoraires syndic T3 2024', fournisseur: 'Cabinet Dupont', montant: 1850.00, typeDepense: 'divers', compte: '622', compteLabel: 'Honoraires syndic', factureLiee: 'FAC-SYN-2024-T3', budgetPrevu: 1850.00, budgetLie: 'BUDGET-FONCT-2024' },
  { id: 'DEP-011', date: '2024-09-05', libelle: 'Électricité T2 2024', fournisseur: 'EDF', montant: 1380.50, typeDepense: 'electricite', compte: '606', compteLabel: 'Eau et électricité', factureLiee: 'FAC-EDF-2024-T2', budgetPrevu: 1500.00, budgetLie: 'BUDGET-FONCT-2024' },
  { id: 'DEP-012', date: '2024-09-10', libelle: 'Eau S1 2024', fournisseur: 'Veolia', montant: 1785.60, typeDepense: 'eau', compte: '606', compteLabel: 'Eau et électricité', factureLiee: 'FAC-VEO-2024-S1', budgetPrevu: 1800.00, budgetLie: 'BUDGET-FONCT-2024' },
  { id: 'DEP-013', date: '2024-11-05', libelle: 'Maintenance ascenseur T3', fournisseur: 'Otis Ascenseurs', montant: 1890.00, typeDepense: 'ascenseur', compte: '615', compteLabel: 'Entretien et réparations', factureLiee: 'FAC-OTS-2024-T3', budgetPrevu: 2000.00, budgetLie: 'BUDGET-FONCT-2024' },
  { id: 'DEP-014', date: '2024-11-10', libelle: 'Honoraires syndic T4 2024', fournisseur: 'Cabinet Dupont', montant: 1850.00, typeDepense: 'divers', compte: '622', compteLabel: 'Honoraires syndic', factureLiee: 'FAC-SYN-2024-T4', budgetPrevu: 1850.00, budgetLie: 'BUDGET-FONCT-2024' },
  { id: 'DEP-015', date: '2024-12-05', libelle: 'Électricité T3-T4 2024', fournisseur: 'EDF', montant: 2890.40, typeDepense: 'electricite', compte: '606', compteLabel: 'Eau et électricité', factureLiee: 'FAC-EDF-2024-T34', budgetPrevu: 3000.00, budgetLie: 'BUDGET-FONCT-2024' },
  { id: 'DEP-016', date: '2024-12-10', libelle: 'Eau S2 2024', fournisseur: 'Veolia', montant: 1920.80, typeDepense: 'eau', compte: '606', compteLabel: 'Eau et électricité', factureLiee: 'FAC-VEO-2024-S2', budgetPrevu: 1900.00, budgetLie: 'BUDGET-FONCT-2024' },
  { id: 'DEP-017', date: '2024-12-12', libelle: 'Maintenance ascenseur T4', fournisseur: 'Otis Ascenseurs', montant: 1890.00, typeDepense: 'ascenseur', compte: '615', compteLabel: 'Entretien et réparations', factureLiee: 'FAC-OTS-2024-T4', budgetPrevu: 2000.00, budgetLie: 'BUDGET-FONCT-2024' },
];

export const MOCK_MOUVEMENTS_NON_CATEGORISES: MouvementNonCategorise[] = [
  { id: 'MNC-001', date: '2024-12-22', libelle: 'VIREMENT INCONNU REF:XYZ123', montant: 250.00, type: 'ENTREE' },
  { id: 'MNC-002', date: '2024-12-19', libelle: 'PRELEVEMENT SEPA DIVERS', montant: 89.50, type: 'SORTIE' },
];

export const MOCK_HISTORIQUE: HistoriqueModification[] = [
  { id: 'H-001', date: '2024-12-20T14:32:00', utilisateur: 'Jean Dupont', action: 'CATEGORISATION', elementType: 'OPERATION', elementId: 'GL-145', description: 'Catégorisation du mouvement bancaire', nouvelleValeur: '450 - Copropriétaires' },
  { id: 'H-002', date: '2024-12-18T10:15:00', utilisateur: 'Marie Martin', action: 'VALIDATION', elementType: 'DEPENSE', elementId: 'DEP-015', description: 'Validation de la facture EDF T3-T4' },
  { id: 'H-003', date: '2024-12-15T16:45:00', utilisateur: 'Jean Dupont', action: 'MODIFICATION', elementType: 'OPERATION', elementId: 'GL-163', description: 'Modification du libellé', ancienneValeur: 'FACTURE EDF', nouvelleValeur: 'FACTURE EDF - Électricité T3-T4 2024' },
  { id: 'H-004', date: '2024-12-12T09:00:00', utilisateur: 'Marie Martin', action: 'CREATION', elementType: 'DEPENSE', elementId: 'DEP-017', description: 'Création de la dépense maintenance ascenseur T4' },
  { id: 'H-005', date: '2024-12-10T11:20:00', utilisateur: 'Jean Dupont', action: 'CATEGORISATION', elementType: 'OPERATION', elementId: 'GL-153', description: 'Catégorisation appel de fonds Martin Anne T4', nouvelleValeur: '450 - Copropriétaires' },
];

export const MOCK_ETAT_CLOTURE: EtatCloture = {
  annee: 2024,
  estCloturee: false,
  mouvementsNonCategorises: 2,
  alertes: ['2 mouvements bancaires non catégorisés', '1 facture en attente de validation comptable']
};

// ============================================
// ANNEXES COMPTABLES (Décret n°2005-240)
// ============================================

/**
 * Annexe 1 - État financier après répartition
 * Situation de trésorerie et créances/dettes
 */
export const MOCK_ANNEXE_1: LigneAnnexe1[] = [
  // ACTIF
  { id: 'A1-001', rubrique: 'Banque', montant: 38245.50, montantN1: 42500.00, type: 'actif' },
  { id: 'A1-002', rubrique: 'Placements', montant: 12585.50, montantN1: 6200.00, type: 'actif' },
  { id: 'A1-003', rubrique: 'Créances copropriétaires', montant: 2450.00, montantN1: 3200.00, type: 'actif' },
  { id: 'A1-004', rubrique: 'Charges à répartir', montant: 0, montantN1: 0, type: 'actif' },
  // PASSIF
  { id: 'A1-005', rubrique: 'Provisions pour travaux décidés', montant: 31000.00, montantN1: 25000.00, type: 'passif' },
  { id: 'A1-006', rubrique: 'Fonds de travaux ALUR (art. 14-2)', montant: 21200.00, montantN1: 15000.00, type: 'passif' },
  { id: 'A1-007', rubrique: 'Dettes fournisseurs', montant: 0, montantN1: 5700.00, type: 'passif' },
  { id: 'A1-008', rubrique: 'Avances copropriétaires', montant: 1081.00, montantN1: 1200.00, type: 'passif' },
];

/**
 * Annexe 2 - Compte de gestion général
 * Synthèse charges/produits exercice
 */
export const MOCK_ANNEXE_2: LigneAnnexe2[] = [
  // Charges courantes
  { id: 'A2-001', compte: '606', libelle: 'Eau et électricité', budgetVote: 9150.00, depensesReelles: 10876.00, ecart: -1726.00, pourcentageRealisation: 118.86, categorie: 'charges-courantes' },
  { id: 'A2-002', compte: '614', libelle: 'Personnel extérieur (ménage)', budgetVote: 5400.00, depensesReelles: 450.00, ecart: 4950.00, pourcentageRealisation: 8.33, categorie: 'charges-courantes' },
  { id: 'A2-003', compte: '615', libelle: 'Entretien et réparations', budgetVote: 8000.00, depensesReelles: 7560.00, ecart: 440.00, pourcentageRealisation: 94.50, categorie: 'charges-courantes' },
  { id: 'A2-004', compte: '616', libelle: "Primes d'assurance", budgetVote: 4250.00, depensesReelles: 4250.00, ecart: 0, pourcentageRealisation: 100.00, categorie: 'charges-courantes' },
  { id: 'A2-005', compte: '622', libelle: 'Honoraires syndic', budgetVote: 7400.00, depensesReelles: 7400.00, ecart: 0, pourcentageRealisation: 100.00, categorie: 'charges-courantes' },
  { id: 'A2-006', compte: '627', libelle: 'Services bancaires', budgetVote: 200.00, depensesReelles: 180.00, ecart: 20.00, pourcentageRealisation: 90.00, categorie: 'charges-courantes' },
  // Charges travaux et provisions
  { id: 'A2-007', compte: '681', libelle: 'Dotations aux provisions', budgetVote: 6000.00, depensesReelles: 6000.00, ecart: 0, pourcentageRealisation: 100.00, categorie: 'charges-travaux' },
  // Produits
  { id: 'A2-008', compte: '701', libelle: 'Appels de fonds courants', budgetVote: 24720.00, depensesReelles: 24720.00, ecart: 0, pourcentageRealisation: 100.00, categorie: 'produits' },
  { id: 'A2-009', compte: '703', libelle: 'Fonds de travaux ALUR', budgetVote: 6200.00, depensesReelles: 6200.00, ecart: 0, pourcentageRealisation: 100.00, categorie: 'produits' },
  { id: 'A2-010', compte: '76', libelle: 'Produits financiers', budgetVote: 100.00, depensesReelles: 185.50, ecart: 85.50, pourcentageRealisation: 185.50, categorie: 'produits' },
];

/**
 * Annexe 3 - Compte de gestion pour opérations courantes
 * Répartition par clé
 */
export const MOCK_ANNEXE_3: LigneAnnexe3[] = [
  { id: 'A3-001', compte: '606', libelle: 'Eau', cleRepartition: 'Tantièmes généraux', montantTotal: 4598.70, montantN1: 4250.00 },
  { id: 'A3-002', compte: '606', libelle: 'Électricité parties communes', cleRepartition: 'Tantièmes généraux', montantTotal: 6277.30, montantN1: 5800.00 },
  { id: 'A3-003', compte: '614', libelle: 'Ménage parties communes', cleRepartition: 'Tantièmes généraux', montantTotal: 450.00, montantN1: 5400.00 },
  { id: 'A3-004', compte: '615', libelle: 'Maintenance ascenseur', cleRepartition: 'Tantièmes ascenseur', montantTotal: 7560.00, montantN1: 7200.00 },
  { id: 'A3-005', compte: '616', libelle: "Assurance MRI", cleRepartition: 'Tantièmes généraux', montantTotal: 4250.00, montantN1: 4100.00 },
  { id: 'A3-006', compte: '622', libelle: 'Honoraires syndic', cleRepartition: 'Tantièmes généraux', montantTotal: 7400.00, montantN1: 7200.00 },
  { id: 'A3-007', compte: '627', libelle: 'Frais bancaires', cleRepartition: 'Tantièmes généraux', montantTotal: 180.00, montantN1: 160.00 },
];

/**
 * Annexe 4 - Compte de gestion travaux et opérations exceptionnelles
 */
export const MOCK_ANNEXE_4: LigneAnnexe4[] = [
  { id: 'A4-001', operationId: 'TRAV-2023-001', libelle: 'Ravalement façade', dateDebut: '2023-06-15', dateFin: '2023-09-30', budgetVote: 45000.00, depensesEngagees: 45000.00, depensesReglees: 45000.00, soldeAFinancer: 0, statut: 'terminee' },
  { id: 'A4-002', operationId: 'TRAV-2024-001', libelle: 'Réfection toiture partielle', dateDebut: '2024-04-01', budgetVote: 18000.00, depensesEngagees: 15200.00, depensesReglees: 10000.00, soldeAFinancer: 8000.00, statut: 'en-cours' },
  { id: 'A4-003', operationId: 'TRAV-2025-001', libelle: 'Mise aux normes ascenseur', dateDebut: '2025-03-01', budgetVote: 25000.00, depensesEngagees: 0, depensesReglees: 0, soldeAFinancer: 25000.00, statut: 'a-venir' },
];

/**
 * Annexe 5 - État des dettes et créances
 */
export const MOCK_ANNEXE_5: LigneAnnexe5[] = [
  // Créances copropriétaires
  { id: 'A5-001', tiers: 'LEBLANC Marie - Lot 1', typeTiers: 'coproprietaire', nature: 'Appels de fonds impayés', dateOrigine: '2024-10-01', montantInitial: 310.00, montantRestant: 310.00, type: 'creance', anciennete: 113 },
  { id: 'A5-002', tiers: 'DUBOIS Jean - Lot 4', typeTiers: 'coproprietaire', nature: 'Appels de fonds impayés', dateOrigine: '2024-07-01', dateEcheance: '2024-08-01', montantInitial: 1290.00, montantRestant: 890.00, type: 'creance', anciennete: 205 },
  { id: 'A5-003', tiers: 'MARTIN Anne - Lot 5', typeTiers: 'coproprietaire', nature: 'Appels de fonds impayés', dateOrigine: '2024-10-01', montantInitial: 1660.00, montantRestant: 1250.00, type: 'creance', anciennete: 113 },
  // Avances copropriétaires
  { id: 'A5-004', tiers: 'LAURENT Sophie - Lot 3', typeTiers: 'coproprietaire', nature: 'Avance sur charges', dateOrigine: '2024-01-15', montantInitial: 500.00, montantRestant: 500.00, type: 'dette', anciennete: 372 },
  { id: 'A5-005', tiers: 'MOREAU Pierre - Lot 2', typeTiers: 'coproprietaire', nature: 'Avance sur charges', dateOrigine: '2024-06-01', montantInitial: 581.00, montantRestant: 581.00, type: 'dette', anciennete: 235 },
  // Dettes fournisseurs
  { id: 'A5-006', tiers: 'Otis Ascenseurs', typeTiers: 'fournisseur', nature: 'Facture maintenance T4', dateOrigine: '2024-12-12', dateEcheance: '2025-01-12', montantInitial: 1890.00, montantRestant: 0, type: 'dette', anciennete: 41 },
];
