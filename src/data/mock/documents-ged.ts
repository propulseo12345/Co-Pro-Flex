import type { Document } from '@/types/models/document';
import type { NiveauConfidentialite } from '@/types/enums/misc';

/**
 * Données mockées GED complètes pour une copropriété de 28 lots
 * Simulation réaliste sur 10 années avec toutes les catégories de documents
 */

// ============================================================================
// TYPES POUR L'ARBORESCENCE
// ============================================================================

export interface GEDFolder {
  id: string;
  nom: string;
  parentId: string | null;
  icon?: string;
  color?: string;
  ordre: number;
}

export interface DocumentWithFolder extends Document {
  dossierId?: string;
  confidentialite?: NiveauConfidentialite | string;
}

// ============================================================================
// STRUCTURE DES DOSSIERS
// ============================================================================

export const GED_FOLDERS: GEDFolder[] = [
  // Dossiers racine
  { id: 'assemblees', nom: 'Assemblées Générales', parentId: null, icon: 'Users', color: '#3B82F6', ordre: 1 },
  { id: 'documents-legaux', nom: 'Documents Légaux', parentId: null, icon: 'Scale', color: '#8B5CF6', ordre: 2 },
  { id: 'contrats', nom: 'Contrats', parentId: null, icon: 'FileSignature', color: '#10B981', ordre: 3 },
  { id: 'factures', nom: 'Factures & Devis', parentId: null, icon: 'Receipt', color: '#F59E0B', ordre: 4 },
  { id: 'diagnostics', nom: 'Diagnostics & Contrôles', parentId: null, icon: 'ClipboardCheck', color: '#EF4444', ordre: 5 },
  { id: 'plans', nom: 'Plans & Schémas', parentId: null, icon: 'Map', color: '#06B6D4', ordre: 6 },
  { id: 'correspondances', nom: 'Correspondances', parentId: null, icon: 'Mail', color: '#EC4899', ordre: 7 },
  { id: 'maintenance', nom: 'Maintenance', parentId: null, icon: 'Wrench', color: '#F97316', ordre: 8 },
  { id: 'photos', nom: 'Photos', parentId: null, icon: 'Image', color: '#84CC16', ordre: 9 },
  { id: 'comptabilite', nom: 'Comptabilité', parentId: null, icon: 'Calculator', color: '#6366F1', ordre: 10 },

  // Sous-dossiers Assemblées Générales
  { id: 'ag-2024', nom: '2024', parentId: 'assemblees', ordre: 1 },
  { id: 'ag-2023', nom: '2023', parentId: 'assemblees', ordre: 2 },
  { id: 'ag-2022', nom: '2022', parentId: 'assemblees', ordre: 3 },
  { id: 'ag-2021', nom: '2021', parentId: 'assemblees', ordre: 4 },
  { id: 'ag-2020', nom: '2020', parentId: 'assemblees', ordre: 5 },
  { id: 'ag-archives', nom: 'Archives (2015-2019)', parentId: 'assemblees', ordre: 6 },

  // Sous-dossiers Documents Légaux
  { id: 'reglements', nom: 'Règlements', parentId: 'documents-legaux', ordre: 1 },
  { id: 'modificatifs', nom: 'Modificatifs', parentId: 'documents-legaux', ordre: 2 },
  { id: 'fiches-immeuble', nom: 'Fiches Immeuble', parentId: 'documents-legaux', ordre: 3 },

  // Sous-dossiers Contrats
  { id: 'ctr-assurances', nom: 'Assurances', parentId: 'contrats', ordre: 1 },
  { id: 'ctr-syndic', nom: 'Syndic', parentId: 'contrats', ordre: 2 },
  { id: 'ctr-maintenance', nom: 'Maintenance', parentId: 'contrats', ordre: 3 },
  { id: 'ctr-prestataires', nom: 'Prestataires', parentId: 'contrats', ordre: 4 },
  { id: 'ctr-travaux', nom: 'Travaux', parentId: 'contrats', ordre: 5 },
  { id: 'ctr-archives', nom: 'Archives', parentId: 'contrats', ordre: 6 },

  // Sous-dossiers Maintenance
  { id: 'ctr-ascenseur', nom: 'Ascenseur', parentId: 'ctr-maintenance', ordre: 1 },
  { id: 'ctr-chauffage', nom: 'Chauffage', parentId: 'ctr-maintenance', ordre: 2 },
  { id: 'ctr-vmc', nom: 'VMC', parentId: 'ctr-maintenance', ordre: 3 },
  { id: 'ctr-extincteurs', nom: 'Sécurité Incendie', parentId: 'ctr-maintenance', ordre: 4 },
  { id: 'ctr-interphone', nom: 'Interphone', parentId: 'ctr-maintenance', ordre: 5 },

  // Sous-dossiers Prestataires
  { id: 'ctr-menage', nom: 'Nettoyage', parentId: 'ctr-prestataires', ordre: 1 },
  { id: 'ctr-gardiennage', nom: 'Gardiennage', parentId: 'ctr-prestataires', ordre: 2 },
  { id: 'ctr-espaces-verts', nom: 'Espaces Verts', parentId: 'ctr-prestataires', ordre: 3 },

  // Sous-dossiers Factures
  { id: 'fac-2024', nom: '2024', parentId: 'factures', ordre: 1 },
  { id: 'fac-2023', nom: '2023', parentId: 'factures', ordre: 2 },
  { id: 'fac-devis', nom: 'Devis en cours', parentId: 'factures', ordre: 3 },

  // Sous-dossiers Factures 2024
  { id: 'fac-2024-energie', nom: 'Énergie', parentId: 'fac-2024', ordre: 1 },
  { id: 'fac-2024-eau', nom: 'Eau', parentId: 'fac-2024', ordre: 2 },
  { id: 'fac-2024-prestataires', nom: 'Prestataires', parentId: 'fac-2024', ordre: 3 },
  { id: 'fac-2024-travaux', nom: 'Travaux', parentId: 'fac-2024', ordre: 4 },
  { id: 'fac-2024-assurance', nom: 'Assurance', parentId: 'fac-2024', ordre: 5 },

  // Sous-dossiers Diagnostics
  { id: 'diag-reglementaires', nom: 'Diagnostics Réglementaires', parentId: 'diagnostics', ordre: 1 },
  { id: 'diag-controles', nom: 'Contrôles Périodiques', parentId: 'diagnostics', ordre: 2 },
  { id: 'diag-securite', nom: 'Sécurité', parentId: 'diagnostics', ordre: 3 },

  // Sous-dossiers Plans
  { id: 'plans-batiment', nom: 'Plans Bâtiment', parentId: 'plans', ordre: 1 },
  { id: 'plans-reseaux', nom: 'Réseaux Techniques', parentId: 'plans', ordre: 2 },
  { id: 'plans-securite', nom: 'Sécurité', parentId: 'plans', ordre: 3 },

  // Sous-dossiers Correspondances
  { id: 'corr-officielles', nom: 'Courriers Officiels', parentId: 'correspondances', ordre: 1 },
  { id: 'corr-contentieux', nom: 'Contentieux', parentId: 'correspondances', ordre: 2 },
  { id: 'corr-info-copro', nom: 'Informations Copropriétaires', parentId: 'correspondances', ordre: 3 },
  { id: 'corr-cs', nom: 'Conseil Syndical', parentId: 'correspondances', ordre: 4 },

  // Sous-dossiers Maintenance (Ordres de Service)
  { id: 'maint-os-2024', nom: 'Ordres de Service 2024', parentId: 'maintenance', ordre: 1 },
  { id: 'maint-os-2023', nom: 'Ordres de Service 2023', parentId: 'maintenance', ordre: 2 },

  // Sous-dossiers Comptabilité
  { id: 'compta-budgets', nom: 'Budgets', parentId: 'comptabilite', ordre: 1 },
  { id: 'compta-appels', nom: 'Appels de Fonds', parentId: 'comptabilite', ordre: 2 },
  { id: 'compta-charges', nom: 'États des Charges', parentId: 'comptabilite', ordre: 3 },
  { id: 'compta-repartition', nom: 'Répartitions', parentId: 'comptabilite', ordre: 4 },

  // Sous-dossiers Photos
  { id: 'photos-travaux', nom: 'Travaux', parentId: 'photos', ordre: 1 },
  { id: 'photos-sinistres', nom: 'Sinistres', parentId: 'photos', ordre: 2 },
  { id: 'photos-immeuble', nom: 'Immeuble', parentId: 'photos', ordre: 3 },
];

// ============================================================================
// PV D'ASSEMBLÉES GÉNÉRALES (10 dernières années)
// ============================================================================
const PV_AG_DOCUMENTS: DocumentWithFolder[] = [
  // AG Ordinaires annuelles
  { id: 'pv-ag-2024', nom: 'PV AG Ordinaire 2024.pdf', type: 'PDF', categorie: 'PV_AG', dateAjout: '2024-06-15', taille: '4.2 Mo', dossierId: 'ag-2024' },
  { id: 'pv-ag-2023', nom: 'PV AG Ordinaire 2023.pdf', type: 'PDF', categorie: 'PV_AG', dateAjout: '2023-05-20', taille: '3.8 Mo', dossierId: 'ag-2023' },
  { id: 'pv-ag-2022', nom: 'PV AG Ordinaire 2022.pdf', type: 'PDF', categorie: 'PV_AG', dateAjout: '2022-05-18', taille: '3.5 Mo', dossierId: 'ag-2022' },
  { id: 'pv-ag-2021', nom: 'PV AG Ordinaire 2021.pdf', type: 'PDF', categorie: 'PV_AG', dateAjout: '2021-06-12', taille: '3.1 Mo', dossierId: 'ag-2021' },
  { id: 'pv-ag-2020', nom: 'PV AG Ordinaire 2020.pdf', type: 'PDF', categorie: 'PV_AG', dateAjout: '2020-09-25', taille: '2.9 Mo', dossierId: 'ag-2020' },
  { id: 'pv-ag-2019', nom: 'PV AG Ordinaire 2019.pdf', type: 'PDF', categorie: 'PV_AG', dateAjout: '2019-05-22', taille: '3.2 Mo', dossierId: 'ag-archives' },
  { id: 'pv-ag-2018', nom: 'PV AG Ordinaire 2018.pdf', type: 'PDF', categorie: 'PV_AG', dateAjout: '2018-05-16', taille: '2.8 Mo', dossierId: 'ag-archives' },
  { id: 'pv-ag-2017', nom: 'PV AG Ordinaire 2017.pdf', type: 'PDF', categorie: 'PV_AG', dateAjout: '2017-05-24', taille: '2.6 Mo', dossierId: 'ag-archives' },
  { id: 'pv-ag-2016', nom: 'PV AG Ordinaire 2016.pdf', type: 'PDF', categorie: 'PV_AG', dateAjout: '2016-05-19', taille: '2.5 Mo', dossierId: 'ag-archives' },
  { id: 'pv-ag-2015', nom: 'PV AG Ordinaire 2015.pdf', type: 'PDF', categorie: 'PV_AG', dateAjout: '2015-05-21', taille: '2.3 Mo', dossierId: 'ag-archives' },
  // AG Extraordinaires
  { id: 'pv-age-2023', nom: 'PV AG Extraordinaire - Ravalement 2023.pdf', type: 'PDF', categorie: 'PV_AG', dateAjout: '2023-10-15', taille: '2.1 Mo', dossierId: 'ag-2023' },
  { id: 'pv-age-2021', nom: 'PV AG Extraordinaire - Ascenseur 2021.pdf', type: 'PDF', categorie: 'PV_AG', dateAjout: '2021-11-28', taille: '1.9 Mo', dossierId: 'ag-2021' },
  { id: 'pv-age-2019', nom: 'PV AG Extraordinaire - Chauffage 2019.pdf', type: 'PDF', categorie: 'PV_AG', dateAjout: '2019-09-14', taille: '1.8 Mo', dossierId: 'ag-archives' },
  // Convocations
  { id: 'convoc-ag-2024', nom: 'Convocation AG 2024.pdf', type: 'PDF', categorie: 'PV_AG', dateAjout: '2024-05-01', taille: '0.8 Mo', dossierId: 'ag-2024' },
  { id: 'convoc-ag-2023', nom: 'Convocation AG 2023.pdf', type: 'PDF', categorie: 'PV_AG', dateAjout: '2023-04-06', taille: '0.7 Mo', dossierId: 'ag-2023' },
];

// ============================================================================
// RÈGLEMENTS ET DOCUMENTS LÉGAUX
// ============================================================================
const REGLEMENTS_DOCUMENTS: DocumentWithFolder[] = [
  { id: 'reg-copro', nom: 'Règlement de copropriété.pdf', type: 'PDF', categorie: 'REGLEMENT', dateAjout: '2010-03-15', taille: '8.5 Mo', dossierId: 'reglements' },
  { id: 'reg-interieur', nom: 'Règlement intérieur.pdf', type: 'PDF', categorie: 'REGLEMENT', dateAjout: '2019-06-20', taille: '1.2 Mo', dossierId: 'reglements' },
  { id: 'edd', nom: 'État descriptif de division.pdf', type: 'PDF', categorie: 'REGLEMENT', dateAjout: '2010-03-15', taille: '12.3 Mo', dossierId: 'reglements' },
  { id: 'mod-reg-2022', nom: 'Modificatif règlement - Parking vélos 2022.pdf', type: 'PDF', categorie: 'REGLEMENT', dateAjout: '2022-07-10', taille: '0.9 Mo', dossierId: 'modificatifs' },
  { id: 'mod-reg-2018', nom: 'Modificatif règlement - Local poubelles 2018.pdf', type: 'PDF', categorie: 'REGLEMENT', dateAjout: '2018-09-22', taille: '0.7 Mo', dossierId: 'modificatifs' },
  { id: 'carnet-entretien', nom: 'Carnet d\'entretien de l\'immeuble.pdf', type: 'PDF', categorie: 'REGLEMENT', dateAjout: '2024-01-15', taille: '3.4 Mo', dossierId: 'fiches-immeuble' },
  { id: 'fiche-synthetique', nom: 'Fiche synthétique copropriété 2024.pdf', type: 'PDF', categorie: 'REGLEMENT', dateAjout: '2024-02-01', taille: '0.5 Mo', dossierId: 'fiches-immeuble' },
];

// ============================================================================
// CONTRATS (Assurances, Maintenance, Prestataires)
// ============================================================================
const CONTRATS_DOCUMENTS: DocumentWithFolder[] = [
  // Assurances
  { id: 'ctr-assur-2024', nom: 'Contrat Assurance Immeuble 2024-2025.pdf', type: 'PDF', categorie: 'CONTRAT', dateAjout: '2024-01-01', taille: '2.8 Mo', dossierId: 'ctr-assurances' },
  { id: 'ctr-assur-2023', nom: 'Contrat Assurance Immeuble 2023-2024.pdf', type: 'PDF', categorie: 'CONTRAT', dateAjout: '2023-01-01', taille: '2.6 Mo', dossierId: 'ctr-assurances' },
  { id: 'ctr-assur-2022', nom: 'Contrat Assurance Immeuble 2022-2023.pdf', type: 'PDF', categorie: 'CONTRAT', dateAjout: '2022-01-01', taille: '2.5 Mo', dossierId: 'ctr-assurances' },
  { id: 'attestation-assur-2024', nom: 'Attestation Assurance RC 2024.pdf', type: 'PDF', categorie: 'CONTRAT', dateAjout: '2024-01-15', taille: '0.3 Mo', dossierId: 'ctr-assurances' },
  // Syndic
  { id: 'ctr-syndic-2024', nom: 'Contrat Syndic Bénévole 2024-2027.pdf', type: 'PDF', categorie: 'CONTRAT', dateAjout: '2024-06-15', taille: '1.5 Mo', dossierId: 'ctr-syndic' },
  { id: 'ctr-syndic-2021', nom: 'Contrat Syndic Bénévole 2021-2024.pdf', type: 'PDF', categorie: 'CONTRAT', dateAjout: '2021-06-12', taille: '1.4 Mo', dossierId: 'ctr-syndic' },
  // Ascenseur
  { id: 'ctr-ascenseur-2023', nom: 'Contrat Maintenance Ascenseur OTIS 2023-2026.pdf', type: 'PDF', categorie: 'CONTRAT', dateAjout: '2023-04-01', taille: '3.2 Mo', dossierId: 'ctr-ascenseur' },
  { id: 'ctr-ascenseur-2020', nom: 'Contrat Maintenance Ascenseur OTIS 2020-2023.pdf', type: 'PDF', categorie: 'CONTRAT', dateAjout: '2020-04-01', taille: '2.9 Mo', dossierId: 'ctr-ascenseur' },
  // Chauffage
  { id: 'ctr-chauffage-2024', nom: 'Contrat Entretien Chaudière ENGIE 2024-2025.pdf', type: 'PDF', categorie: 'CONTRAT', dateAjout: '2024-09-01', taille: '1.8 Mo', dossierId: 'ctr-chauffage' },
  { id: 'ctr-chauffage-2023', nom: 'Contrat Entretien Chaudière ENGIE 2023-2024.pdf', type: 'PDF', categorie: 'CONTRAT', dateAjout: '2023-09-01', taille: '1.7 Mo', dossierId: 'ctr-chauffage' },
  // Ménage / Gardiennage
  { id: 'ctr-menage-2024', nom: 'Contrat Nettoyage Parties Communes 2024.pdf', type: 'PDF', categorie: 'CONTRAT', dateAjout: '2024-01-01', taille: '1.1 Mo', dossierId: 'ctr-menage' },
  { id: 'ctr-gardien-2022', nom: 'Contrat Gardiennage 2022-2025.pdf', type: 'PDF', categorie: 'CONTRAT', dateAjout: '2022-01-01', taille: '2.1 Mo', dossierId: 'ctr-gardiennage' },
  // Espaces verts
  { id: 'ctr-jardin-2024', nom: 'Contrat Entretien Espaces Verts 2024.pdf', type: 'PDF', categorie: 'CONTRAT', dateAjout: '2024-03-01', taille: '0.9 Mo', dossierId: 'ctr-espaces-verts' },
  // Extincteurs / Sécurité
  { id: 'ctr-extincteurs-2023', nom: 'Contrat Maintenance Extincteurs 2023-2025.pdf', type: 'PDF', categorie: 'CONTRAT', dateAjout: '2023-06-01', taille: '0.8 Mo', dossierId: 'ctr-extincteurs' },
  // VMC
  { id: 'ctr-vmc-2024', nom: 'Contrat Entretien VMC 2024-2025.pdf', type: 'PDF', categorie: 'CONTRAT', dateAjout: '2024-02-01', taille: '0.7 Mo', dossierId: 'ctr-vmc' },
  // Interphone / Digicode
  { id: 'ctr-interphone-2022', nom: 'Contrat Maintenance Interphone 2022-2027.pdf', type: 'PDF', categorie: 'CONTRAT', dateAjout: '2022-11-01', taille: '1.0 Mo', dossierId: 'ctr-interphone' },
  // Ravalement
  { id: 'ctr-ravalement-2024', nom: 'Marché Travaux Ravalement 2024-2025.pdf', type: 'PDF', categorie: 'CONTRAT', dateAjout: '2024-03-15', taille: '5.2 Mo', dossierId: 'ctr-travaux' },
  // Anciens contrats archivés
  { id: 'ctr-ancien-elec', nom: 'Contrat Électricité Parties Communes (archivé).pdf', type: 'PDF', categorie: 'CONTRAT', dateAjout: '2020-01-01', taille: '1.2 Mo', dossierId: 'ctr-archives' },
];

// ============================================================================
// FACTURES (Année en cours + historique)
// ============================================================================
const FACTURES_DOCUMENTS: DocumentWithFolder[] = [
  // Factures électricité 2024
  { id: 'fac-elec-2024-12', nom: 'Facture EDF Décembre 2024.pdf', type: 'PDF', categorie: 'FACTURE', dateAjout: '2024-12-15', taille: '0.4 Mo', dossierId: 'fac-2024-energie' },
  { id: 'fac-elec-2024-11', nom: 'Facture EDF Novembre 2024.pdf', type: 'PDF', categorie: 'FACTURE', dateAjout: '2024-11-18', taille: '0.4 Mo', dossierId: 'fac-2024-energie' },
  { id: 'fac-elec-2024-10', nom: 'Facture EDF Octobre 2024.pdf', type: 'PDF', categorie: 'FACTURE', dateAjout: '2024-10-22', taille: '0.4 Mo', dossierId: 'fac-2024-energie' },
  { id: 'fac-elec-2024-09', nom: 'Facture EDF Septembre 2024.pdf', type: 'PDF', categorie: 'FACTURE', dateAjout: '2024-09-16', taille: '0.4 Mo', dossierId: 'fac-2024-energie' },
  { id: 'fac-elec-2024-08', nom: 'Facture EDF Août 2024.pdf', type: 'PDF', categorie: 'FACTURE', dateAjout: '2024-08-19', taille: '0.4 Mo', dossierId: 'fac-2024-energie' },
  { id: 'fac-elec-2024-07', nom: 'Facture EDF Juillet 2024.pdf', type: 'PDF', categorie: 'FACTURE', dateAjout: '2024-07-17', taille: '0.4 Mo', dossierId: 'fac-2024-energie' },
  { id: 'fac-elec-2024-06', nom: 'Facture EDF Juin 2024.pdf', type: 'PDF', categorie: 'FACTURE', dateAjout: '2024-06-18', taille: '0.4 Mo', dossierId: 'fac-2024-energie' },
  { id: 'fac-elec-2024-05', nom: 'Facture EDF Mai 2024.pdf', type: 'PDF', categorie: 'FACTURE', dateAjout: '2024-05-20', taille: '0.4 Mo', dossierId: 'fac-2024-energie' },
  { id: 'fac-elec-2024-04', nom: 'Facture EDF Avril 2024.pdf', type: 'PDF', categorie: 'FACTURE', dateAjout: '2024-04-15', taille: '0.4 Mo', dossierId: 'fac-2024-energie' },
  { id: 'fac-elec-2024-03', nom: 'Facture EDF Mars 2024.pdf', type: 'PDF', categorie: 'FACTURE', dateAjout: '2024-03-18', taille: '0.4 Mo', dossierId: 'fac-2024-energie' },
  { id: 'fac-elec-2024-02', nom: 'Facture EDF Février 2024.pdf', type: 'PDF', categorie: 'FACTURE', dateAjout: '2024-02-19', taille: '0.4 Mo', dossierId: 'fac-2024-energie' },
  { id: 'fac-elec-2024-01', nom: 'Facture EDF Janvier 2024.pdf', type: 'PDF', categorie: 'FACTURE', dateAjout: '2024-01-17', taille: '0.4 Mo', dossierId: 'fac-2024-energie' },
  // Factures gaz/chauffage 2024
  { id: 'fac-gaz-2024-12', nom: 'Facture Engie Gaz Décembre 2024.pdf', type: 'PDF', categorie: 'FACTURE', dateAjout: '2024-12-20', taille: '0.5 Mo', dossierId: 'fac-2024-energie' },
  { id: 'fac-gaz-2024-11', nom: 'Facture Engie Gaz Novembre 2024.pdf', type: 'PDF', categorie: 'FACTURE', dateAjout: '2024-11-22', taille: '0.5 Mo', dossierId: 'fac-2024-energie' },
  { id: 'fac-gaz-2024-10', nom: 'Facture Engie Gaz Octobre 2024.pdf', type: 'PDF', categorie: 'FACTURE', dateAjout: '2024-10-23', taille: '0.5 Mo', dossierId: 'fac-2024-energie' },
  { id: 'fac-gaz-2024-09', nom: 'Facture Engie Gaz Septembre 2024.pdf', type: 'PDF', categorie: 'FACTURE', dateAjout: '2024-09-21', taille: '0.5 Mo', dossierId: 'fac-2024-energie' },
  { id: 'fac-gaz-2024-08', nom: 'Facture Engie Gaz Août 2024.pdf', type: 'PDF', categorie: 'FACTURE', dateAjout: '2024-08-22', taille: '0.5 Mo', dossierId: 'fac-2024-energie' },
  { id: 'fac-gaz-2024-07', nom: 'Facture Engie Gaz Juillet 2024.pdf', type: 'PDF', categorie: 'FACTURE', dateAjout: '2024-07-20', taille: '0.5 Mo', dossierId: 'fac-2024-energie' },
  // Factures eau 2024 (trimestrielles)
  { id: 'fac-eau-2024-t4', nom: 'Facture Eau T4 2024.pdf', type: 'PDF', categorie: 'FACTURE', dateAjout: '2024-12-10', taille: '0.6 Mo', dossierId: 'fac-2024-eau' },
  { id: 'fac-eau-2024-t3', nom: 'Facture Eau T3 2024.pdf', type: 'PDF', categorie: 'FACTURE', dateAjout: '2024-09-12', taille: '0.6 Mo', dossierId: 'fac-2024-eau' },
  { id: 'fac-eau-2024-t2', nom: 'Facture Eau T2 2024.pdf', type: 'PDF', categorie: 'FACTURE', dateAjout: '2024-06-11', taille: '0.6 Mo', dossierId: 'fac-2024-eau' },
  { id: 'fac-eau-2024-t1', nom: 'Facture Eau T1 2024.pdf', type: 'PDF', categorie: 'FACTURE', dateAjout: '2024-03-13', taille: '0.6 Mo', dossierId: 'fac-2024-eau' },
  // Factures assurance
  { id: 'fac-assur-2024', nom: 'Prime Assurance Immeuble 2024.pdf', type: 'PDF', categorie: 'FACTURE', dateAjout: '2024-01-05', taille: '0.8 Mo', dossierId: 'fac-2024-assurance' },
  { id: 'fac-assur-2023', nom: 'Prime Assurance Immeuble 2023.pdf', type: 'PDF', categorie: 'FACTURE', dateAjout: '2023-01-05', taille: '0.7 Mo', dossierId: 'fac-2023' },
  // Factures prestataires
  { id: 'fac-ascenseur-2024-s2', nom: 'Facture Maintenance Ascenseur S2 2024.pdf', type: 'PDF', categorie: 'FACTURE', dateAjout: '2024-07-01', taille: '0.5 Mo', dossierId: 'fac-2024-prestataires' },
  { id: 'fac-ascenseur-2024-s1', nom: 'Facture Maintenance Ascenseur S1 2024.pdf', type: 'PDF', categorie: 'FACTURE', dateAjout: '2024-01-02', taille: '0.5 Mo', dossierId: 'fac-2024-prestataires' },
  { id: 'fac-menage-2024-12', nom: 'Facture Nettoyage Décembre 2024.pdf', type: 'PDF', categorie: 'FACTURE', dateAjout: '2024-12-28', taille: '0.3 Mo', dossierId: 'fac-2024-prestataires' },
  { id: 'fac-menage-2024-11', nom: 'Facture Nettoyage Novembre 2024.pdf', type: 'PDF', categorie: 'FACTURE', dateAjout: '2024-11-29', taille: '0.3 Mo', dossierId: 'fac-2024-prestataires' },
  { id: 'fac-menage-2024-10', nom: 'Facture Nettoyage Octobre 2024.pdf', type: 'PDF', categorie: 'FACTURE', dateAjout: '2024-10-30', taille: '0.3 Mo', dossierId: 'fac-2024-prestataires' },
  { id: 'fac-jardinage-2024-t2', nom: 'Facture Entretien Jardin T2 2024.pdf', type: 'PDF', categorie: 'FACTURE', dateAjout: '2024-06-30', taille: '0.4 Mo', dossierId: 'fac-2024-prestataires' },
  { id: 'fac-jardinage-2024-t1', nom: 'Facture Entretien Jardin T1 2024.pdf', type: 'PDF', categorie: 'FACTURE', dateAjout: '2024-03-31', taille: '0.4 Mo', dossierId: 'fac-2024-prestataires' },
  // Factures travaux
  { id: 'fac-ravalement-acompte1', nom: 'Facture Ravalement - Acompte 1 (30%).pdf', type: 'PDF', categorie: 'FACTURE', dateAjout: '2024-04-15', taille: '1.2 Mo', dossierId: 'fac-2024-travaux' },
  { id: 'fac-ravalement-acompte2', nom: 'Facture Ravalement - Acompte 2 (40%).pdf', type: 'PDF', categorie: 'FACTURE', dateAjout: '2024-08-20', taille: '1.3 Mo', dossierId: 'fac-2024-travaux' },
  { id: 'fac-plomberie-2024', nom: 'Facture Réparation Fuite Chaufferie.pdf', type: 'PDF', categorie: 'FACTURE', dateAjout: '2024-02-28', taille: '0.4 Mo', dossierId: 'fac-2024-travaux' },
  { id: 'fac-serrurier-2024', nom: 'Facture Remplacement Serrure Hall.pdf', type: 'PDF', categorie: 'FACTURE', dateAjout: '2024-05-10', taille: '0.3 Mo', dossierId: 'fac-2024-travaux' },
  { id: 'fac-electricien-2024', nom: 'Facture Dépannage Électrique Parking.pdf', type: 'PDF', categorie: 'FACTURE', dateAjout: '2024-07-22', taille: '0.4 Mo', dossierId: 'fac-2024-travaux' },
  // Devis
  { id: 'devis-toiture-2024', nom: 'Devis Réfection Toiture Partielle 2024.pdf', type: 'PDF', categorie: 'FACTURE', dateAjout: '2024-09-05', taille: '1.8 Mo', dossierId: 'fac-devis' },
  { id: 'devis-peinture-hall-2024', nom: 'Devis Peinture Hall d\'entrée 2024.pdf', type: 'PDF', categorie: 'FACTURE', dateAjout: '2024-10-10', taille: '0.6 Mo', dossierId: 'fac-devis' },
  // Factures années précédentes
  { id: 'fac-elec-2023-annual', nom: 'Récapitulatif Factures EDF 2023.pdf', type: 'PDF', categorie: 'FACTURE', dateAjout: '2024-01-10', taille: '1.5 Mo', dossierId: 'fac-2023' },
  { id: 'fac-eau-2023-annual', nom: 'Récapitulatif Factures Eau 2023.pdf', type: 'PDF', categorie: 'FACTURE', dateAjout: '2024-01-10', taille: '1.2 Mo', dossierId: 'fac-2023' },
];

// ============================================================================
// DIAGNOSTICS
// ============================================================================
const DIAGNOSTICS_DOCUMENTS: DocumentWithFolder[] = [
  { id: 'diag-dta', nom: 'Dossier Technique Amiante (DTA).pdf', type: 'PDF', categorie: 'DIAGNOSTIC', dateAjout: '2023-05-15', taille: '8.5 Mo', dossierId: 'diag-reglementaires' },
  { id: 'diag-plomb', nom: 'Diagnostic Plomb Parties Communes.pdf', type: 'PDF', categorie: 'DIAGNOSTIC', dateAjout: '2023-06-10', taille: '4.2 Mo', dossierId: 'diag-reglementaires' },
  { id: 'diag-elec', nom: 'Diagnostic Électrique Parties Communes.pdf', type: 'PDF', categorie: 'DIAGNOSTIC', dateAjout: '2024-10-05', taille: '3.8 Mo', dossierId: 'diag-reglementaires' },
  { id: 'diag-gaz', nom: 'Diagnostic Gaz - Chaufferie Collective.pdf', type: 'PDF', categorie: 'DIAGNOSTIC', dateAjout: '2024-08-20', taille: '2.9 Mo', dossierId: 'diag-reglementaires' },
  { id: 'diag-dpe', nom: 'DPE Collectif Immeuble.pdf', type: 'PDF', categorie: 'DIAGNOSTIC', dateAjout: '2022-03-22', taille: '5.1 Mo', dossierId: 'diag-reglementaires' },
  { id: 'diag-ascenseur-2024', nom: 'Rapport Contrôle Technique Ascenseur 2024.pdf', type: 'PDF', categorie: 'DIAGNOSTIC', dateAjout: '2024-06-15', taille: '2.3 Mo', dossierId: 'diag-controles' },
  { id: 'diag-ascenseur-2023', nom: 'Rapport Contrôle Technique Ascenseur 2023.pdf', type: 'PDF', categorie: 'DIAGNOSTIC', dateAjout: '2023-06-12', taille: '2.2 Mo', dossierId: 'diag-controles' },
  { id: 'diag-extincteurs-2024', nom: 'PV Vérification Extincteurs 2024.pdf', type: 'PDF', categorie: 'DIAGNOSTIC', dateAjout: '2024-04-30', taille: '1.1 Mo', dossierId: 'diag-securite' },
  { id: 'diag-chaufferie-2024', nom: 'Rapport Contrôle Chaufferie 2024.pdf', type: 'PDF', categorie: 'DIAGNOSTIC', dateAjout: '2024-12-10', taille: '1.8 Mo', dossierId: 'diag-controles' },
  { id: 'diag-desenfumage', nom: 'Rapport Contrôle Désenfumage.pdf', type: 'PDF', categorie: 'DIAGNOSTIC', dateAjout: '2024-03-25', taille: '1.5 Mo', dossierId: 'diag-securite' },
  { id: 'diag-securite', nom: 'Rapport de Sécurité Incendie.pdf', type: 'PDF', categorie: 'DIAGNOSTIC', dateAjout: '2023-11-15', taille: '3.2 Mo', dossierId: 'diag-securite' },
  { id: 'diag-termites', nom: 'État Parasitaire - Termites.pdf', type: 'PDF', categorie: 'DIAGNOSTIC', dateAjout: '2022-09-18', taille: '2.0 Mo', dossierId: 'diag-reglementaires' },
];

// ============================================================================
// PLANS ET DOCUMENTS TECHNIQUES
// ============================================================================
const PLANS_DOCUMENTS: DocumentWithFolder[] = [
  { id: 'plan-masse', nom: 'Plan Masse Copropriété.pdf', type: 'PDF', categorie: 'PLAN', dateAjout: '2010-03-15', taille: '15.2 Mo', dossierId: 'plans-batiment' },
  { id: 'plan-rdc', nom: 'Plan RDC - Parties Communes.pdf', type: 'PDF', categorie: 'PLAN', dateAjout: '2010-03-15', taille: '8.3 Mo', dossierId: 'plans-batiment' },
  { id: 'plan-sous-sol', nom: 'Plan Sous-sol Parking.pdf', type: 'PDF', categorie: 'PLAN', dateAjout: '2010-03-15', taille: '6.8 Mo', dossierId: 'plans-batiment' },
  { id: 'plan-etage-type', nom: 'Plan Étage Type.pdf', type: 'PDF', categorie: 'PLAN', dateAjout: '2010-03-15', taille: '5.4 Mo', dossierId: 'plans-batiment' },
  { id: 'plan-toiture', nom: 'Plan Toiture.pdf', type: 'PDF', categorie: 'PLAN', dateAjout: '2010-03-15', taille: '4.1 Mo', dossierId: 'plans-batiment' },
  { id: 'plan-reseau-eau', nom: 'Schéma Réseau Eau.pdf', type: 'PDF', categorie: 'PLAN', dateAjout: '2015-06-20', taille: '3.5 Mo', dossierId: 'plans-reseaux' },
  { id: 'plan-reseau-elec', nom: 'Schéma Électrique Parties Communes.pdf', type: 'PDF', categorie: 'PLAN', dateAjout: '2018-04-12', taille: '4.2 Mo', dossierId: 'plans-reseaux' },
  { id: 'plan-chauffage', nom: 'Schéma Réseau Chauffage.pdf', type: 'PDF', categorie: 'PLAN', dateAjout: '2019-09-30', taille: '3.8 Mo', dossierId: 'plans-reseaux' },
  { id: 'plan-evacuation', nom: 'Plan Évacuation Incendie.pdf', type: 'PDF', categorie: 'PLAN', dateAjout: '2020-02-15', taille: '2.1 Mo', dossierId: 'plans-securite' },
];

// ============================================================================
// CORRESPONDANCES
// ============================================================================
const CORRESPONDANCES_DOCUMENTS: DocumentWithFolder[] = [
  { id: 'courr-mairie-2024', nom: 'Courrier Mairie - Autorisation Ravalement.pdf', type: 'PDF', categorie: 'CORRESPONDANCE', dateAjout: '2024-02-20', taille: '0.8 Mo', dossierId: 'corr-officielles' },
  { id: 'courr-impot-2024', nom: 'Notification Taxe Foncière 2024.pdf', type: 'PDF', categorie: 'CORRESPONDANCE', dateAjout: '2024-10-15', taille: '0.4 Mo', dossierId: 'corr-officielles' },
  { id: 'courr-assur-sinistre', nom: 'Déclaration Sinistre Dégât des Eaux Lot 12.pdf', type: 'PDF', categorie: 'CORRESPONDANCE', dateAjout: '2024-03-08', taille: '1.2 Mo', dossierId: 'corr-officielles' },
  { id: 'courr-assur-indemnisation', nom: 'Lettre Indemnisation Sinistre Lot 12.pdf', type: 'PDF', categorie: 'CORRESPONDANCE', dateAjout: '2024-05-22', taille: '0.6 Mo', dossierId: 'corr-officielles' },
  { id: 'med-relance1-lot8', nom: 'Mise en demeure Impayés Lot 8 - Relance 1.pdf', type: 'PDF', categorie: 'CORRESPONDANCE', dateAjout: '2024-04-15', taille: '0.5 Mo', dossierId: 'corr-contentieux' },
  { id: 'med-relance2-lot8', nom: 'Mise en demeure Impayés Lot 8 - Relance 2.pdf', type: 'PDF', categorie: 'CORRESPONDANCE', dateAjout: '2024-06-02', taille: '0.5 Mo', dossierId: 'corr-contentieux' },
  { id: 'courr-huissier-lot8', nom: 'Commandement de payer Lot 8.pdf', type: 'PDF', categorie: 'CORRESPONDANCE', dateAjout: '2024-08-10', taille: '0.9 Mo', dossierId: 'corr-contentieux' },
  { id: 'courr-avocat-2024', nom: 'Consultation Avocat - Litige Lot 15.pdf', type: 'PDF', categorie: 'CORRESPONDANCE', dateAjout: '2024-09-25', taille: '1.5 Mo', dossierId: 'corr-contentieux' },
  { id: 'courr-notaire-vente', nom: 'Attestation Notaire - Vente Lot 22.pdf', type: 'PDF', categorie: 'CORRESPONDANCE', dateAjout: '2024-11-08', taille: '0.7 Mo', dossierId: 'corr-officielles' },
  { id: 'info-copro-q4-2024', nom: 'Information Copropriétaires Q4 2024.pdf', type: 'PDF', categorie: 'CORRESPONDANCE', dateAjout: '2024-12-01', taille: '1.8 Mo', dossierId: 'corr-info-copro' },
  { id: 'info-copro-q3-2024', nom: 'Information Copropriétaires Q3 2024.pdf', type: 'PDF', categorie: 'CORRESPONDANCE', dateAjout: '2024-09-01', taille: '1.6 Mo', dossierId: 'corr-info-copro' },
  { id: 'info-copro-q2-2024', nom: 'Information Copropriétaires Q2 2024.pdf', type: 'PDF', categorie: 'CORRESPONDANCE', dateAjout: '2024-06-01', taille: '1.5 Mo', dossierId: 'corr-info-copro' },
  { id: 'compte-rendu-cs-2024-12', nom: 'Compte-rendu Conseil Syndical Décembre 2024.pdf', type: 'PDF', categorie: 'CORRESPONDANCE', dateAjout: '2024-12-18', taille: '0.9 Mo', dossierId: 'corr-cs' },
  { id: 'compte-rendu-cs-2024-09', nom: 'Compte-rendu Conseil Syndical Septembre 2024.pdf', type: 'PDF', categorie: 'CORRESPONDANCE', dateAjout: '2024-09-20', taille: '0.8 Mo', dossierId: 'corr-cs' },
  { id: 'compte-rendu-cs-2024-06', nom: 'Compte-rendu Conseil Syndical Juin 2024.pdf', type: 'PDF', categorie: 'CORRESPONDANCE', dateAjout: '2024-06-22', taille: '0.8 Mo', dossierId: 'corr-cs' },
];

// ============================================================================
// PHOTOS
// ============================================================================
const PHOTOS_DOCUMENTS: DocumentWithFolder[] = [
  { id: 'photo-facade-avant', nom: 'Photo Façade Avant Ravalement.jpg', type: 'IMAGE', categorie: 'PHOTO', dateAjout: '2024-03-01', taille: '2.5 Mo', dossierId: 'photos-travaux' },
  { id: 'photo-facade-apres', nom: 'Photo Façade Après Ravalement.jpg', type: 'IMAGE', categorie: 'PHOTO', dateAjout: '2024-11-15', taille: '2.8 Mo', dossierId: 'photos-travaux' },
  { id: 'photo-hall-renovation', nom: 'Photo Hall Après Rénovation.jpg', type: 'IMAGE', categorie: 'PHOTO', dateAjout: '2023-08-10', taille: '1.8 Mo', dossierId: 'photos-travaux' },
  { id: 'photo-jardin', nom: 'Photo Jardin Résidence.jpg', type: 'IMAGE', categorie: 'PHOTO', dateAjout: '2024-07-15', taille: '2.1 Mo', dossierId: 'photos-immeuble' },
  { id: 'photo-sinistre-lot12', nom: 'Photos Sinistre Dégât Eaux Lot 12.zip', type: 'AUTRE', categorie: 'PHOTO', dateAjout: '2024-03-08', taille: '8.5 Mo', dossierId: 'photos-sinistres' },
  { id: 'photo-fissure-parking', nom: 'Photo Fissure Parking Sous-sol.jpg', type: 'IMAGE', categorie: 'PHOTO', dateAjout: '2024-02-20', taille: '1.5 Mo', dossierId: 'photos-sinistres' },
  { id: 'photo-chaudiere', nom: 'Photo Chaufferie - Chaudière Collective.jpg', type: 'IMAGE', categorie: 'PHOTO', dateAjout: '2024-01-12', taille: '1.2 Mo', dossierId: 'photos-immeuble' },
];

// ============================================================================
// ORDRES DE SERVICE
// ============================================================================
const ORDRES_SERVICE_DOCUMENTS: DocumentWithFolder[] = [
  { id: 'os-2024-001', nom: 'OS n°2024-001 - Réparation Ascenseur.pdf', type: 'PDF', categorie: 'ORDRE_SERVICE', dateAjout: '2024-01-18', taille: '0.4 Mo', dossierId: 'maint-os-2024' },
  { id: 'os-2024-002', nom: 'OS n°2024-002 - Fuite Chaufferie.pdf', type: 'PDF', categorie: 'ORDRE_SERVICE', dateAjout: '2024-02-25', taille: '0.5 Mo', dossierId: 'maint-os-2024' },
  { id: 'os-2024-003', nom: 'OS n°2024-003 - Remplacement Serrure Hall.pdf', type: 'PDF', categorie: 'ORDRE_SERVICE', dateAjout: '2024-05-05', taille: '0.3 Mo', dossierId: 'maint-os-2024' },
  { id: 'os-2024-004', nom: 'OS n°2024-004 - Élagage Arbre Jardin.pdf', type: 'PDF', categorie: 'ORDRE_SERVICE', dateAjout: '2024-06-10', taille: '0.4 Mo', dossierId: 'maint-os-2024' },
  { id: 'os-2024-005', nom: 'OS n°2024-005 - Dépannage Électrique Parking.pdf', type: 'PDF', categorie: 'ORDRE_SERVICE', dateAjout: '2024-07-20', taille: '0.4 Mo', dossierId: 'maint-os-2024' },
  { id: 'os-2024-006', nom: 'OS n°2024-006 - Débouchage Canalisation.pdf', type: 'PDF', categorie: 'ORDRE_SERVICE', dateAjout: '2024-09-12', taille: '0.3 Mo', dossierId: 'maint-os-2024' },
  { id: 'os-2024-007', nom: 'OS n°2024-007 - Réparation Interphone.pdf', type: 'PDF', categorie: 'ORDRE_SERVICE', dateAjout: '2024-10-28', taille: '0.4 Mo', dossierId: 'maint-os-2024' },
  { id: 'os-2024-008', nom: 'OS n°2024-008 - Nettoyage VMC.pdf', type: 'PDF', categorie: 'ORDRE_SERVICE', dateAjout: '2024-11-05', taille: '0.3 Mo', dossierId: 'maint-os-2024' },
  { id: 'os-2023-archive', nom: 'Récapitulatif Ordres de Service 2023.pdf', type: 'PDF', categorie: 'ORDRE_SERVICE', dateAjout: '2024-01-05', taille: '2.1 Mo', dossierId: 'maint-os-2023' },
];

// ============================================================================
// AUTRES DOCUMENTS
// ============================================================================
const AUTRES_DOCUMENTS: DocumentWithFolder[] = [
  { id: 'budget-prev-2025', nom: 'Budget Prévisionnel 2025.pdf', type: 'PDF', categorie: 'AUTRE', dateAjout: '2024-06-15', taille: '1.8 Mo', dossierId: 'compta-budgets' },
  { id: 'budget-prev-2024', nom: 'Budget Prévisionnel 2024.pdf', type: 'PDF', categorie: 'AUTRE', dateAjout: '2023-06-20', taille: '1.6 Mo', dossierId: 'compta-budgets' },
  { id: 'appel-fonds-q4-2024', nom: 'Appel de Fonds Q4 2024.pdf', type: 'PDF', categorie: 'AUTRE', dateAjout: '2024-10-01', taille: '0.8 Mo', dossierId: 'compta-appels' },
  { id: 'appel-fonds-q3-2024', nom: 'Appel de Fonds Q3 2024.pdf', type: 'PDF', categorie: 'AUTRE', dateAjout: '2024-07-01', taille: '0.8 Mo', dossierId: 'compta-appels' },
  { id: 'appel-fonds-q2-2024', nom: 'Appel de Fonds Q2 2024.pdf', type: 'PDF', categorie: 'AUTRE', dateAjout: '2024-04-01', taille: '0.8 Mo', dossierId: 'compta-appels' },
  { id: 'appel-fonds-q1-2024', nom: 'Appel de Fonds Q1 2024.pdf', type: 'PDF', categorie: 'AUTRE', dateAjout: '2024-01-01', taille: '0.8 Mo', dossierId: 'compta-appels' },
  { id: 'appel-travaux-ravalement', nom: 'Appel Exceptionnel Travaux Ravalement.pdf', type: 'PDF', categorie: 'AUTRE', dateAjout: '2024-03-01', taille: '1.2 Mo', dossierId: 'compta-appels' },
  { id: 'etat-charges-2023', nom: 'État des Charges 2023.pdf', type: 'PDF', categorie: 'AUTRE', dateAjout: '2024-02-15', taille: '2.5 Mo', dossierId: 'compta-charges' },
  { id: 'etat-charges-2022', nom: 'État des Charges 2022.pdf', type: 'PDF', categorie: 'AUTRE', dateAjout: '2023-02-10', taille: '2.3 Mo', dossierId: 'compta-charges' },
  { id: 'repartition-tantiemes', nom: 'Tableau Répartition Tantièmes.xlsx', type: 'AUTRE', categorie: 'AUTRE', dateAjout: '2020-03-15', taille: '0.5 Mo', dossierId: 'compta-repartition' },
  { id: 'liste-copro-2024', nom: 'Liste Copropriétaires 2024.pdf', type: 'PDF', categorie: 'AUTRE', dateAjout: '2024-01-15', taille: '0.6 Mo', dossierId: 'compta-repartition' },
  { id: 'garantie-decennale', nom: 'Attestation Garantie Décennale Ravalement.pdf', type: 'PDF', categorie: 'AUTRE', dateAjout: '2024-11-20', taille: '0.9 Mo', dossierId: 'ctr-travaux' },
];

// ============================================================================
// EXPORT PRINCIPAL - CONSOLIDATION DE TOUS LES DOCUMENTS
// ============================================================================

/**
 * Collection complète des documents GED
 * Total: 142 documents réalistes pour une copropriété de 28 lots
 */
export const MOCK_DOCUMENTS_GED: DocumentWithFolder[] = [
  ...PV_AG_DOCUMENTS,
  ...REGLEMENTS_DOCUMENTS,
  ...CONTRATS_DOCUMENTS,
  ...FACTURES_DOCUMENTS,
  ...DIAGNOSTICS_DOCUMENTS,
  ...PLANS_DOCUMENTS,
  ...CORRESPONDANCES_DOCUMENTS,
  ...PHOTOS_DOCUMENTS,
  ...ORDRES_SERVICE_DOCUMENTS,
  ...AUTRES_DOCUMENTS,
];

/**
 * Fonction utilitaire pour obtenir le chemin complet d'un dossier (fil d'Ariane)
 */
export function getFolderPath(folderId: string): GEDFolder[] {
  const path: GEDFolder[] = [];
  let currentFolder = GED_FOLDERS.find(f => f.id === folderId);

  while (currentFolder) {
    path.unshift(currentFolder);
    currentFolder = currentFolder.parentId
      ? GED_FOLDERS.find(f => f.id === currentFolder!.parentId)
      : undefined;
  }

  return path;
}

/**
 * Fonction utilitaire pour obtenir les sous-dossiers d'un dossier
 */
export function getSubFolders(parentId: string | null): GEDFolder[] {
  return GED_FOLDERS
    .filter(f => f.parentId === parentId)
    .sort((a, b) => a.ordre - b.ordre);
}

/**
 * Fonction utilitaire pour obtenir les documents d'un dossier
 */
export function getDocumentsInFolder(folderId: string): DocumentWithFolder[] {
  return MOCK_DOCUMENTS_GED.filter(d => d.dossierId === folderId);
}

/**
 * Fonction utilitaire pour compter les documents dans un dossier et ses sous-dossiers
 */
export function countDocumentsInFolderRecursive(folderId: string): number {
  const directDocs = MOCK_DOCUMENTS_GED.filter(d => d.dossierId === folderId).length;
  const subFolders = getSubFolders(folderId);
  const subFolderDocs = subFolders.reduce((acc, sf) => acc + countDocumentsInFolderRecursive(sf.id), 0);
  return directDocs + subFolderDocs;
}

/**
 * Statistiques par catégorie pour la page GED
 */
export const MOCK_DOCUMENTS_STATS = {
  total: MOCK_DOCUMENTS_GED.length,
  parCategorie: {
    PV_AG: PV_AG_DOCUMENTS.length,
    REGLEMENT: REGLEMENTS_DOCUMENTS.length,
    CONTRAT: CONTRATS_DOCUMENTS.length,
    FACTURE: FACTURES_DOCUMENTS.length,
    DIAGNOSTIC: DIAGNOSTICS_DOCUMENTS.length,
    PLAN: PLANS_DOCUMENTS.length,
    CORRESPONDANCE: CORRESPONDANCES_DOCUMENTS.length,
    PHOTO: PHOTOS_DOCUMENTS.length,
    ORDRE_SERVICE: ORDRES_SERVICE_DOCUMENTS.length,
    AUTRE: AUTRES_DOCUMENTS.length,
  },
  tailleTotal: '185.2 Mo',
  derniereModification: '2024-12-28',
};

/**
 * Liste des catégories avec labels français
 */
export const DOCUMENT_CATEGORIES = [
  { value: 'TOUS', label: 'Tous les documents', count: MOCK_DOCUMENTS_GED.length },
  { value: 'PV_AG', label: 'PV d\'Assemblées Générales', count: PV_AG_DOCUMENTS.length },
  { value: 'REGLEMENT', label: 'Règlements', count: REGLEMENTS_DOCUMENTS.length },
  { value: 'CONTRAT', label: 'Contrats', count: CONTRATS_DOCUMENTS.length },
  { value: 'FACTURE', label: 'Factures & Devis', count: FACTURES_DOCUMENTS.length },
  { value: 'DIAGNOSTIC', label: 'Diagnostics', count: DIAGNOSTICS_DOCUMENTS.length },
  { value: 'PLAN', label: 'Plans', count: PLANS_DOCUMENTS.length },
  { value: 'CORRESPONDANCE', label: 'Correspondances', count: CORRESPONDANCES_DOCUMENTS.length },
  { value: 'PHOTO', label: 'Photos', count: PHOTOS_DOCUMENTS.length },
  { value: 'ORDRE_SERVICE', label: 'Ordres de Service', count: ORDRES_SERVICE_DOCUMENTS.length },
  { value: 'AUTRE', label: 'Autres documents', count: AUTRES_DOCUMENTS.length },
];

/**
 * Documents obligatoires manquants (checklist)
 */
export const DOCUMENTS_OBLIGATOIRES_CHECKLIST = [
  { type: 'REGLEMENT', nom: 'Règlement de copropriété', present: true },
  { type: 'REGLEMENT', nom: 'État descriptif de division', present: true },
  { type: 'REGLEMENT', nom: 'Carnet d\'entretien', present: true },
  { type: 'DIAGNOSTIC', nom: 'DTA (Amiante)', present: true },
  { type: 'DIAGNOSTIC', nom: 'DPE Collectif', present: true },
  { type: 'DIAGNOSTIC', nom: 'Diagnostic Électrique', present: true },
  { type: 'PV_AG', nom: 'PV AG année en cours', present: true },
  { type: 'CONTRAT', nom: 'Contrat Assurance', present: true },
  { type: 'CONTRAT', nom: 'Contrat Syndic', present: true },
  { type: 'PLAN', nom: 'Plan Évacuation Incendie', present: true },
];
